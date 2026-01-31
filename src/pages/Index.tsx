import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";
import { Dashboard } from "@/components/Dashboard";
import { RoomDirectory } from "@/components/RoomDirectory";
import { Reports } from "@/components/Reports";
import { TenantManagement } from "@/components/TenantManagement";
import { MonthlyRentSheet } from "@/components/MonthlyRentSheet";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { AuditHistorySheet } from "@/components/AuditHistorySheet";
import { DashboardSkeleton, RentSheetSkeleton } from "@/components/skeletons";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useRooms } from "@/hooks/useRooms";
import { usePG } from "@/contexts/PGContext";
import { PGSwitcher, OnboardingFlow } from "@/components/pg";
import { SubscriptionBadge } from "@/components/subscription";
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
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import appLogo from "@/assets/pg-logo.png";

const Index = () => {
  const { rooms, isLoading } = useRooms();
  const { needsSetup, isLoading: pgLoading, refreshPGs, currentPG } = usePG();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historySheetOpen, setHistorySheetOpen] = useState(false);

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
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    const { error } = await signOut();
    // Navigate to auth page regardless of error (session may already be invalid)
    toast.success("Signed out successfully");
    navigate("/auth");
  };

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
  };

  // Show onboarding flow for new users without PGs
  if (needsSetup && !pgLoading) {
    return <OnboardingFlow onComplete={() => refreshPGs()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        {/* Header - Horizontal scrollable */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-4">
          <div className="inline-flex items-center gap-2 min-w-max">
            <PGSwitcher />
            <SubscriptionBadge />
            <MonthYearPicker />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => window.open("https://pocket-parenthood-pro.vercel.app/bills", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <NetworkStatusIndicator />
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setHistorySheetOpen(true)} title="Activity History">
              <History className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
              {isAdmin ? (
                <Shield className="h-4 w-4 text-primary-foreground" />
              ) : (
                <User className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
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

          <div {...swipeHandlers} {...pullToRefreshHandlers} className="touch-pan-y">
            {/* Pull to Refresh Indicator */}
            <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} progress={progress} />

            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {isLoading ? <DashboardSkeleton /> : <Dashboard rooms={rooms} onStartRentCycle={() => {}} />}
            </TabsContent>

            <TabsContent value="rooms" className="space-y-6 mt-6">
              <RoomDirectory rooms={rooms} onViewDetails={handleViewDetails} />
            </TabsContent>

            <TabsContent value="rent-sheet" className="space-y-6 mt-6">
              {isLoading ? <RentSheetSkeleton /> : <MonthlyRentSheet rooms={rooms} />}
            </TabsContent>

            <TabsContent value="reports" className="space-y-6 mt-6">
              <Reports rooms={rooms} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Tenant Management Dialog */}
        {selectedRoom && (
          <TenantManagement room={selectedRoom} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
        )}

        {/* Activity History Sheet */}
        <AuditHistorySheet open={historySheetOpen} onOpenChange={setHistorySheetOpen} />
      </div>
    </div>
  );
};
export default Index;
