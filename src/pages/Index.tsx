import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from '@/components/Dashboard';
import { RoomDirectory } from '@/components/RoomDirectory';
import { Reports } from '@/components/Reports';
import { TenantManagement } from '@/components/TenantManagement';
import { MonthlyRentSheet } from '@/components/MonthlyRentSheet';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { useRooms } from '@/hooks/useRooms';
import { Room } from '@/types';
import { LayoutDashboard, Building, FileBarChart, Receipt, LogOut, Shield, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMonthContext } from '@/contexts/MonthContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Index = () => {
  const { rooms, isLoading } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { selectedMonth, selectedYear } = useMonthContext();
  const { signOut, isAdmin, role } = useAuth();
  const navigate = useNavigate();

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleSignOut = async () => {
    const { error } = await signOut();
    // Navigate to auth page regardless of error (session may already be invalid)
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
  };

  // Update selected room when rooms data changes
  useEffect(() => {
    if (selectedRoom) {
      const updatedRoom = rooms.find(r => r.roomNo === selectedRoom.roomNo);
      if (updatedRoom) {
        setSelectedRoom(updatedRoom);
      }
    }
  }, [rooms, selectedRoom]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">PG</h1>
             <MonthYearPicker />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {months[selectedMonth - 1]} {selectedYear}
            </div>
            <ThemeToggle />
            <div className="flex items-center gap-1">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                {isAdmin ? <Shield className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4 text-primary-foreground" />}
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
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
        </Tabs>

        {/* Tenant Management Dialog */}
        {selectedRoom && (
          <TenantManagement
            room={selectedRoom}
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
