import { useState, useEffect, lazy, Suspense, useMemo, useRef, useCallback } from "react";
// Lazy load Settings page
const SettingsPage = lazy(() => import("@/components/SettingsPage").then(m => ({ default: m.SettingsPage })));
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";
import { Dashboard } from "@/components/Dashboard";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { DashboardSkeleton, RentSheetSkeleton, ListSkeleton, CardSkeleton } from "@/components/skeletons";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useRooms } from "@/hooks/useRooms";
import { usePG } from "@/contexts/PGContext";

// Lazy load non-critical tab components
import { RoomDirectory } from "@/components/RoomDirectory";
const MonthlyRentSheet = lazy(() => import("@/components/MonthlyRentSheet").then(m => ({ default: m.MonthlyRentSheet })));
const TenantManagement = lazy(() => import("@/components/TenantManagement").then(m => ({ default: m.TenantManagement })));
const SecurityDepositCard = lazy(() => import("@/components/SecurityDepositCard").then(m => ({ default: m.SecurityDepositCard })));
const PaymentReconciliation = lazy(() => import("@/components/PaymentReconciliation").then(m => ({ default: m.PaymentReconciliation })));
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { PGSwitcher, OnboardingFlow } from "@/components/pg";
import { Room } from "@/types";
import { useRentCalculations } from "@/hooks/useRentCalculations";
import {
  Home,
  Loader2,
  Building,
  Settings,
  Wallet,
  Menu,
  Mic,
} from "lucide-react";
import { BedDouble } from "@/components/icons/BedDouble";
import { ReceiptIndianRupee } from "@/components/icons/ReceiptIndianRupee";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { Button } from "@/components/ui/button";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { BottomNav } from "@/components/layout/BottomNav";
import { useActiveTab } from "@/contexts/ActiveTabContext";
import { RentProvider } from '@/contexts/RentContext';
import { SubscriptionBadge } from "@/components/subscription";

const Index = () => {
  const { rooms, isLoading, error: roomsError } = useRooms();
  const { needsSetup, isLoading: pgLoading, refreshPGs, currentPG, canCreatePG } = usePG();
  // Prefetch payments data early so Dashboard doesn't show spinners
  const { isLoading: paymentsLoading } = useTenantPayments();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [autoScrollToAdd, setAutoScrollToAdd] = useState(false);
  const [searchParams] = useSearchParams();
  const { setActiveTab: setContextTab } = useActiveTab();
  const [activeTab, setActiveTabLocal] = useState(searchParams.get('tab') || 'dashboard');
  const setActiveTab = (tab: string) => {
    setActiveTabLocal(tab);
    setContextTab(tab);
    // Close all open dialogs/sheets when switching tabs
    setIsDialogOpen(false);
    setSelectedRoom(null);
    // Reset scroll position so the new tab starts at the top
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Swiggy-style header: hide on scroll down, show on scroll up
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const currentScrollY = container.scrollTop;
    const delta = currentScrollY - lastScrollY.current;
    // Swiggy-style: respond instantly to scroll direction with a tiny threshold
    if (currentScrollY < 10) {
      setHeaderVisible(true);
    } else if (delta > 2) {
      setHeaderVisible(false);
    } else if (delta < -2) {
      setHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  }, []);

  // Sync active tab from URL when searchParams change (e.g. from BottomNav inside dialogs)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Handle same tab click / any tab click stack reset
  useEffect(() => {
    const handleTabClick = () => {
      setIsDialogOpen(false);
      setSelectedRoom(null);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    };
    window.addEventListener('tab-click', handleTabClick);
    return () => window.removeEventListener('tab-click', handleTabClick);
  }, []);

  // Pull to refresh
  const { isRefreshing, pullDistance, pullToRefreshHandlers, progress } = usePullToRefresh();

  // Tab order for swipe navigation
  const tabOrder = ["dashboard", "rooms", "rent-sheet", "reconciliation", "settings"];
  const { swipeHandlers } = useSwipeTabs({
    tabs: tabOrder,
    currentTab: activeTab,
    onTabChange: setActiveTab,
  });
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments = [] } = useTenantPayments();
  const { rentCollected, pendingRent } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  const navItems = useMemo(
    () => [
      { value: "dashboard", label: "Home", icon: Home },
      { value: "rooms", label: "Rooms", icon: BedDouble },
      { value: "rent-sheet", label: "Rent", icon: ReceiptIndianRupee },
      { value: "reconciliation", label: "Payments", icon: Wallet },
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
        ((g.payment_entries as Array<{ mode?: string; amount?: number }>) || []).forEach(entry => {
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
  const { isAuthenticated, isLoading: authLoading, isNewSignup } = useAuth();
  const navigate = useNavigate();


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
      console.warn('[Index] User not authenticated, redirecting to onboarding');
      navigate('/onboarding');
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



  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
    setAutoScrollToAdd(false);
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

  // Only force automatic setup redirect for explicit new signups (isNewSignup)
  if (needsSetup && isNewSignup) {
    if (canCreatePG) return <Navigate to="/setup/property" replace />;
    return <OnboardingFlow onComplete={() => { sessionStorage.removeItem('isNewSignup'); refreshPGs(); }} />;
  }

  const apiErrorMessage = roomsError ? (roomsError as Error).message : null;

  return (
    <RentProvider selectedMonth={selectedMonth} selectedYear={selectedYear}>
      <div className="flex flex-col h-screen bg-background">
      {/* Status bar spacer — fills the notch/camera area with theme blue on native Android */}
      <div className="w-full bg-[#0e6ce7] shrink-0" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      <div className="flex-1 overflow-y-auto pb-36" ref={scrollContainerRef} onScroll={handleScroll}>
      <div className={`sticky top-0 z-40 border-b border-border/60 bg-background transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-3 py-1 sm:px-4">
          {/* Left: Hostel logo / Switcher, Month Picker, and PG details */}
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

          {/* Right: subscription status and full-page app menu */}
          <div className="flex items-center gap-2">
            <SubscriptionBadge />
            <Button
              size="icon"
              className="relative h-9 w-9 rounded-xl border border-primary/20 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
              title="Open app menu"
              aria-label="Open app menu"
              onClick={() => navigate("/menu")}
            >
              <Menu className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300 ring-2 ring-primary" />
            </Button>
          </div>
        </div>
      </div>

      {apiErrorMessage && (
        <div className="mx-auto w-full max-w-screen-2xl px-3 pt-4 sm:px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load data: {apiErrorMessage}
          </div>
        </div>
      )}



      <div className="mx-auto w-full max-w-screen-2xl px-1.5 py-1 sm:px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div {...swipeHandlers} {...pullToRefreshHandlers} className="touch-pan-y">
            {/* Pull to Refresh Indicator */}
            <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} progress={progress} />

            <TabsContent value="dashboard" forceMount className="mt-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              {isLoading ? (
                <DashboardSkeleton />
              ) : (
                <Dashboard 
                  rooms={rooms} 
                  onStartRentCycle={() => {}} 
                  onQuickAddTenant={(room) => {
                    setActiveTab("rooms");
                    setSelectedRoom(room);
                    setIsDialogOpen(true);
                    setAutoScrollToAdd(true);
                  }}
                  onNavigateToRent={() => {
                    setActiveTab("rent-sheet");
                    setTimeout(() => {
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = 0;
                      }
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }, 50);
                  }}
                  onNavigateToTab={setActiveTab}
                />
              )}
            </TabsContent>

            <TabsContent value="rooms" forceMount className="mt-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<CardSkeleton />}>
                {isLoading ? <CardSkeleton /> : <RoomDirectory rooms={rooms} onViewDetails={handleViewDetails} />}
              </Suspense>
            </TabsContent>

            <TabsContent value="rent-sheet" forceMount className="mt-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<RentSheetSkeleton />}>
                {isLoading ? <RentSheetSkeleton /> : <MonthlyRentSheet rooms={rooms} />}
              </Suspense>
            </TabsContent>

            <TabsContent value="reconciliation" forceMount className="mt-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<RentSheetSkeleton />}>
                <PaymentReconciliation standalone />
              </Suspense>
            </TabsContent>

            <TabsContent value="settings" forceMount className="mt-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<ListSkeleton />}>
                <SettingsPage rooms={rooms} />
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
            <TenantManagement 
              room={selectedRoom} 
              isOpen={isDialogOpen} 
              onClose={() => {
                setIsDialogOpen(false);
                setAutoScrollToAdd(false);
              }} 
              autoScrollToAdd={autoScrollToAdd}
            />
          </Suspense>
        )}

      </div>
      </div>

      {activeTab === "dashboard" && (
        <Button
          size="icon"
          className="fixed right-4 z-[54] h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-500/30 hover:from-violet-600 hover:to-indigo-700"
          style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
          title="Open Voice Assistant"
          aria-label="Open Voice Assistant"
          onClick={() => navigate("/voice")}
        >
          <Mic className="h-6 w-6" />
        </Button>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </RentProvider>
  );
};
export default Index;
