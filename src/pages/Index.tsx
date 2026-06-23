import { useState, useEffect, lazy, Suspense, useMemo } from "react";
// Lazy load Settings page
const SettingsPage = lazy(() => import("@/components/SettingsPage").then(m => ({ default: m.SettingsPage })));
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";
import { Dashboard } from "@/components/Dashboard";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { DashboardSkeleton, RentSheetSkeleton } from "@/components/skeletons";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useRooms } from "@/hooks/useRooms";
import { usePG } from "@/contexts/PGContext";

// Lazy load non-critical tab components
const RoomDirectory = lazy(() => import("@/components/RoomDirectory").then(m => ({ default: m.RoomDirectory })));
const Reports = lazy(() => import("@/components/Reports").then(m => ({ default: m.Reports })));
const MonthlyRentSheet = lazy(() => import("@/components/MonthlyRentSheet").then(m => ({ default: m.MonthlyRentSheet })));
const TenantManagement = lazy(() => import("@/components/TenantManagement").then(m => ({ default: m.TenantManagement })));
const AuditHistorySheet = lazy(() => import("@/components/AuditHistorySheet").then(m => ({ default: m.AuditHistorySheet })));
const SecurityDepositCard = lazy(() => import("@/components/SecurityDepositCard").then(m => ({ default: m.SecurityDepositCard })));
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { PGSwitcher, OnboardingFlow } from "@/components/pg";
import { SubscriptionDetailsSheet, AdminPaymentApproval } from "@/components/subscription";
import { Room } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Building,
  FileBarChart,
  Receipt,
  LogOut,
  History,
  CreditCard,
  Loader2,
  Mic,
  Bell,
  Settings,
} from "lucide-react";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BottomNav } from "@/components/layout/BottomNav";
import { useActiveTab } from "@/contexts/ActiveTabContext";

const Index = () => {
  const { rooms, isLoading, error: roomsError } = useRooms();
  const { needsSetup, isLoading: pgLoading, refreshPGs, currentPG } = usePG();
  // Prefetch payments data early so Dashboard doesn't show spinners
  const { isLoading: paymentsLoading } = useTenantPayments();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const { setActiveTab: setContextTab } = useActiveTab();
  const [activeTab, setActiveTabLocal] = useState(searchParams.get('tab') || 'dashboard');
  const setActiveTab = (tab: string) => {
    setActiveTabLocal(tab);
    setContextTab(tab);
    // Close all open dialogs/sheets when switching tabs
    setIsDialogOpen(false);
    setSelectedRoom(null);
    setSubscriptionSheetOpen(false);
    setHistorySheetOpen(false);
    setAdminApprovalOpen(false);
  };
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [adminApprovalOpen, setAdminApprovalOpen] = useState(false);

  // Sync active tab from URL when searchParams change (e.g. from BottomNav inside dialogs)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Pull to refresh
  const { isRefreshing, pullDistance, pullToRefreshHandlers, progress } = usePullToRefresh();

  // Tab order for swipe navigation
  const tabOrder = ["dashboard", "rooms", "rent-sheet", "reports", "settings"];
  const { swipeHandlers } = useSwipeTabs({
    tabs: tabOrder,
    currentTab: activeTab,
    onTabChange: setActiveTab,
  });
  const { selectedMonth, selectedYear } = useMonthContext();
  const navItems = useMemo(
    () => [
      { value: "dashboard", label: "Home", icon: LayoutDashboard },
      { value: "rooms", label: "Rooms", icon: Building },
      { value: "rent-sheet", label: "Rent", icon: Receipt },
      { value: "reports", label: "Reports", icon: FileBarChart },
      { value: "settings", label: "Settings", icon: Settings },
    ],
    [],
  );
  const activeNavItem = navItems.find((item) => item.value === activeTab) ?? navItems[0];

  // Prefetch day guest revenue so it loads with other dashboard cards
  useQuery({
    queryKey: ['day-guest-revenue', selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0 };
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const { data, error } = await supabase
        .from('day_guests')
        .select('total_amount, payment_status, amount_paid, payment_entries, rooms!inner(pg_id)')
        .eq('rooms.pg_id', currentPG.id)
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);
      if (error) return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0 };
      const collected = data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
      const pending = data.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);
      let upi = 0, cash = 0;
      data.forEach(g => {
        ((g.payment_entries as any[]) || []).forEach(entry => {
          if (entry.mode === 'upi') upi += entry.amount || 0;
          else if (entry.mode === 'cash') cash += entry.amount || 0;
        });
      });
      return { collected, pending, count: data.length, upi, cash };
    },
    enabled: !!currentPG?.id,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
  const { signOut, isAdmin, isAuthenticated, isLoading: authLoading, user, isNewSignup } = useAuth();
  const [dataError, setDataError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch pending approval count for admin badge
  const { data: pendingApprovalCount = 0 } = useQuery({
    queryKey: ['pending-approval-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000, // refresh every 30s
  });
  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    // Full page reload to clear all cached state
    window.location.href = "/auth";
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[Index] getSession error', error);
      }
      console.debug('[Index] session check', { userId: data.session?.user?.id ?? null });
    });
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.warn('[Index] User not authenticated, redirecting to auth');
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Update selected room when rooms data changes
  useEffect(() => {
    if (selectedRoom) {
      const updatedRoom = rooms.find((r) => r.roomNo === selectedRoom.roomNo);
      if (updatedRoom) {
        setSelectedRoom(updatedRoom);
      }
    }
  }, [rooms, selectedRoom]);

  useEffect(() => {
    if (!isLoading && !pgLoading) {
      if (!currentPG?.id) {
        setDataError('No PG selected');
        console.warn('[Index] No current PG selected');
      } else if (rooms.length === 0) {
        setDataError('No rooms found');
        console.warn('[Index] Rooms empty for PG', { pgId: currentPG.id });
      } else {
        setDataError(null);
      }
    }
  }, [isLoading, pgLoading, currentPG?.id, rooms.length]);

  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
  };

  // Show loading state only for new signups
  if (pgLoading && isNewSignup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          {/* Animated Spinner */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <Loader2 className="h-20 w-20 animate-spin text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Building className="h-10 w-10 text-primary/40" />
              </div>
            </div>
          </div>
          
          {/* Loading Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Setting up your PG</h2>
            <p className="text-muted-foreground text-sm animate-pulse">
              Loading your property details and subscription info...
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="space-y-1">
            <div className="flex gap-1 justify-center">
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding flow for any user who has no PGs (new signup or returning user)
  if (needsSetup) {
    return <OnboardingFlow onComplete={() => { sessionStorage.removeItem('isNewSignup'); refreshPGs(); }} />;
  }

  const apiErrorMessage = roomsError ? (roomsError as Error).message : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b border-border/60 bg-background">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-3 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PGSwitcher />
            <MonthYearPicker />
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-bold leading-tight sm:text-base">
                  {currentPG?.name || "PG Management"}
                </h1>
                <NetworkStatusIndicator />
              </div>
              <p className="truncate text-xs text-muted-foreground">{activeNavItem.label} · {selectedMonth}/{selectedYear}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => setAdminApprovalOpen(true)}
                title="Payment approvals"
              >
                <Bell className="h-4 w-4" />
                {pendingApprovalCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {pendingApprovalCount > 9 ? "9+" : pendingApprovalCount}
                  </span>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSubscriptionSheetOpen(true)} title="Subscription">
              <CreditCard className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setHistorySheetOpen(true)} title="Activity">
              <History className="h-4 w-4" />
            </Button>
            <ThemeToggle className="h-9 w-9" />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      {apiErrorMessage && (
        <div className="mx-auto w-full max-w-screen-2xl px-3 pt-4 sm:px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load data: {apiErrorMessage}
          </div>
        </div>
      )}

      {dataError && (
        <div className="mx-auto w-full max-w-screen-2xl px-3 pt-4 sm:px-4">
          <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-3 text-sm text-muted-foreground">
            No Data Found
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-screen-2xl px-1.5 py-3 sm:px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div {...swipeHandlers} {...pullToRefreshHandlers} className="touch-pan-y">
            {/* Pull to Refresh Indicator */}
            <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} progress={progress} />

            <TabsContent value="dashboard" className="mt-3 space-y-4">
              {isLoading ? <DashboardSkeleton /> : <Dashboard rooms={rooms} onStartRentCycle={() => {}} />}
            </TabsContent>

            <TabsContent value="rooms" className="mt-3 space-y-4">
              <Suspense fallback={<DashboardSkeleton />}>
                <RoomDirectory rooms={rooms} onViewDetails={handleViewDetails} />
              </Suspense>
            </TabsContent>

            <TabsContent value="rent-sheet" className="mt-3 space-y-4">
              <Suspense fallback={<RentSheetSkeleton />}>
                {isLoading ? <RentSheetSkeleton /> : <MonthlyRentSheet rooms={rooms} />}
              </Suspense>
            </TabsContent>

            <TabsContent value="reports" className="mt-3 space-y-4">
              <Suspense fallback={<DashboardSkeleton />}>
                <Reports rooms={rooms} />
              </Suspense>
            </TabsContent>

            <TabsContent value="settings" className="mt-3 space-y-4">
              <Suspense fallback={<DashboardSkeleton />}>
                <SettingsPage />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>

        {/* Always-mounted host to ensure Security Deposit opens from any tab */}
        <Suspense fallback={null}>
          <SecurityDepositCard rooms={rooms} showSummaryCard={false} enableExternalTriggers />
        </Suspense>

        {/* Tenant Management Dialog */}
        {selectedRoom && (
          <Suspense fallback={null}>
            <TenantManagement room={selectedRoom} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
          </Suspense>
        )}

        {/* Activity History Sheet */}
        <Suspense fallback={null}>
          <AuditHistorySheet open={historySheetOpen} onOpenChange={setHistorySheetOpen} />
        </Suspense>

        {/* Subscription Details Sheet */}
        <SubscriptionDetailsSheet open={subscriptionSheetOpen} onOpenChange={setSubscriptionSheetOpen} />

        {/* Admin Payment Approval Sheet */}
        <AdminPaymentApproval open={adminApprovalOpen} onOpenChange={setAdminApprovalOpen} />

        {/* Floating Voice Assistant button - only shown on Home tab */}
        {activeTab === "dashboard" && (
          <button
            aria-label="Open voice assistant"
            onClick={() => navigate('/voice')}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform active:scale-95 sm:bottom-6 sm:h-14 sm:w-14"
          >
            <Mic className="h-6 w-6" />
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          </button>
        )}
      </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
export default Index;
