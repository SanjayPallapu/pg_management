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
import { PropertySwitcher } from "@/components/PropertySwitcher";
import { useRooms } from "@/hooks/useRooms";
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
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historySheetOpen, setHistorySheetOpen] = useState(false);

  // Tab order for swipe navigation
  const tabOrder = ["dashboard", "rooms", "rent-sheet", "reports"];
  const { swipeHandlers } = useSwipeTabs({
    tabs: tabOrder,
    currentTab: activeTab,
    onTabChange: setActiveTab,
  });
  const { selectedMonth, selectedYear } = useMonthContext();
  const { signOut, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const handleSignOut = async () => {
    const { error } = await signOut();
    // Navigate to auth page regardless of error (session may already be invalid)
    toast.success("Signed out successfully");
    navigate("/auth");
  };
  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
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
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 overflow-visible">
            <img src={appLogo} alt="Amma logo" className="h-14 w-auto" decoding="async" />
            <PropertySwitcher />
            <MonthYearPicker />
          </div>
          <div className="flex items-center gap-2 mx-0 px-px pl-0">
            <div className="text-sm text-muted-foreground px-[11px] pl-0 pr-0 pt-0 pb-0 mr-0 ml-[9px] mx-0">
              {months[selectedMonth - 1]} {selectedYear}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open("https://pocket-parenthood-pro.vercel.app/bills", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setHistorySheetOpen(true)} title="Activity History">
              <History className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="sticky top-0 z-50 bg-background grid w-full grid-cols-4 lg:w-[500px] shadow-sm border-b">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="rent-sheet" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Rent Sheet
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <div {...swipeHandlers} className="touch-pan-y">
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              <Dashboard rooms={rooms} onStartRentCycle={() => {}} />
            </TabsContent>

            <TabsContent value="rooms" className="space-y-6 mt-6">
              <RoomDirectory rooms={rooms} onViewDetails={handleViewDetails} />
            </TabsContent>

            <TabsContent value="rent-sheet" className="space-y-6 mt-6">
              <MonthlyRentSheet rooms={rooms} />
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
