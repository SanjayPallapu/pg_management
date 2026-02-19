import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SubscriptionBadge, SubscriptionDetailsSheet, AdminPaymentApproval } from "@/components/subscription";
import { Room } from "@/types";
import {
  LayoutDashboard,
  Building,
  FileBarChart,
  Receipt,
  LogOut,
  Shield,
  User,
  History,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import appLogo from "@/assets/pg-logo.png";

const Index = () => {
  const { rooms, isLoading, error: roomsError } = useRooms();
  const { needsSetup, isLoading: pgLoading, refreshPGs, currentPG } = usePG();
  // Prefetch payments data early so Dashboard doesn't show spinners
  const { isLoading: paymentsLoading } = useTenantPayments();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [adminApprovalOpen, setAdminApprovalOpen] = useState(false);

  // Pull to refresh
  const { isRefreshing, pullDistance, pullToRefreshHandlers, progress } = usePullToRefresh();

  // Tab order for swipe navigation
  const tabOrder = ["dashboard", "rooms", "rent-sheet", "reports"];
  const { swipeHandlers } = useSwipeTabs({
    tabs: tabOrder,
    currentTab: activeTab,
    onTabChange: setActiveTab,
  });
  const { selectedMonth, selectedYear } = useMonthContext();
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
  const { signOut, isAdmin, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [dataError, setDataError] = useState<string | null>(null);
  const navigate = useNavigate();
  const handleSignOut = async () => {
    const { error } = await signOut();
    // Navigate to auth page regardless of error (session may already be invalid)
    toast.success("Signed out successfully");
    navigate("/auth");
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

  // Show loading state while fetching PG data
  if (pgLoading) {
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

  // Show onboarding flow for new users without PGs
  if (needsSetup) {
    return <OnboardingFlow onComplete={() => refreshPGs()} />;
  }

  const apiErrorMessage = roomsError ? (roomsError as Error).message : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 pt-3 pb-2">
          {/* Header - Horizontal scrollable */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-2">
            <div className="inline-flex items-center gap-2 min-w-max">
              <PGSwitcher />
              <MonthYearPicker />
              {/* External link - admin only */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => window.open("https://pocket-parenthood-pro.vercel.app/bills", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <NetworkStatusIndicator />
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setHistorySheetOpen(true)} title="Activity History">
                <History className="h-4 w-4" />
              </Button>
              <SubscriptionBadge />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 flex-shrink-0" 
                onClick={() => setSubscriptionSheetOpen(true)} 
                title="Subscription Details"
              >
                <CreditCard className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 flex-shrink-0 text-xs"
                  onClick={() => setAdminApprovalOpen(true)}
                >
                  Approvals
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSignOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tabs - fixed width grid */}
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5 px-2 py-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex items-center gap-1.5 px-2 py-2">
                <Building className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Rooms</span>
              </TabsTrigger>
              <TabsTrigger value="rent-sheet" className="flex items-center gap-1.5 px-2 py-2">
                <Receipt className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Rent</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-1.5 px-2 py-2">
                <FileBarChart className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Reports</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {apiErrorMessage && (
        <div className="container mx-auto px-4 pt-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load data: {apiErrorMessage}
          </div>
        </div>
      )}

      {dataError && (
        <div className="container mx-auto px-4 pt-4">
          <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-3 text-sm text-muted-foreground">
            No Data Found
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div {...swipeHandlers} {...pullToRefreshHandlers} className="touch-pan-y">
            {/* Pull to Refresh Indicator */}
            <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} progress={progress} />

            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {isLoading ? <DashboardSkeleton /> : <Dashboard rooms={rooms} onStartRentCycle={() => {}} />}
            </TabsContent>

            <TabsContent value="rooms" className="space-y-6 mt-6">
              <Suspense fallback={<DashboardSkeleton />}>
                <RoomDirectory rooms={rooms} onViewDetails={handleViewDetails} />
              </Suspense>
            </TabsContent>

            <TabsContent value="rent-sheet" className="space-y-6 mt-6">
              <Suspense fallback={<RentSheetSkeleton />}>
                {isLoading ? <RentSheetSkeleton /> : <MonthlyRentSheet rooms={rooms} />}
              </Suspense>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6 mt-6">
              <Suspense fallback={<DashboardSkeleton />}>
                <Reports rooms={rooms} />
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
      </div>
    </div>
  );
};
export default Index;
