import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  CreditCard,
  FileText,
  Users,
  ChevronUp,
  ChevronDown,
  UserPlus,
  UserCheck,
  MessageCircle,
  Phone,
  Receipt,
  MessageSquare,
  Bell,
  Sparkles,
  Wallet,
  PartyPopper,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Room } from "@/types";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { DayGuest } from "@/hooks/useDayGuests";
import { WhatsAppReceiptDialog } from "./WhatsAppReceiptDialog";
import { PaymentReminderDialog } from "./PaymentReminderDialog";
import { WelcomeDialog } from "./WelcomeDialog";
import { format, differenceInDays } from "date-fns";
import {
  isTenantActiveInMonth,
  isTenantActiveNow,
  tenantJoinedInMonth,
  tenantLeftInMonth,
  parseDateOnly,
} from "@/utils/dateOnly";

// Helper to check if tenant joined within last 5 days
const isNewTenant = (startDate: string): boolean => {
  const joinDate = parseDateOnly(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceJoining = differenceInDays(today, joinDate);
  return daysSinceJoining >= 0 && daysSinceJoining <= 5;
};
interface RoomCardProps {
  room: Room;
  onViewDetails: (room: Room) => void;
  onEditRoom?: (room: Room) => void;
  dayGuests?: DayGuest[];
}
export const RoomCard = ({ room, onViewDetails, onEditRoom, dayGuests = [] }: RoomCardProps) => {
  const { payments, markWhatsappSent } = useTenantPayments();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { isAdmin, isStaff } = useAuth();
  const canManageTenants = isAdmin || isStaff;
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    forMonth: string;
    roomNo: string;
    sharingType: string;
    amount: number;
    amountPaid?: number;
    balance: number;
  } | null>(null);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    roomNo: string;
    sharingType: string;
    monthlyRent: number;
  } | null>(null);
  const [receiptData, setReceiptData] = useState<{
    tenantName: string;
    tenantPhone: string;
    paymentMode: string;
    paymentDate: string;
    joiningDate: string;
    forMonth: string;
    roomNo: string;
    sharingType: string;
    amount: number;
    amountPaid: number;
    isFullPayment: boolean;
    remainingBalance?: number;
    tenantId: string;
  } | null>(null);
  const months = [
    {
      value: 1,
      label: "January",
    },
    {
      value: 2,
      label: "February",
    },
    {
      value: 3,
      label: "March",
    },
    {
      value: 4,
      label: "April",
    },
    {
      value: 5,
      label: "May",
    },
    {
      value: 6,
      label: "June",
    },
    {
      value: 7,
      label: "July",
    },
    {
      value: 8,
      label: "August",
    },
    {
      value: 9,
      label: "September",
    },
    {
      value: 10,
      label: "October",
    },
    {
      value: 11,
      label: "November",
    },
    {
      value: 12,
      label: "December",
    },
  ];

  const isSelectedCurrentMonth = (() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  })();

  // Filter day guests for current month - only show guests whose stay is not over
  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const currentGuests = dayGuests.filter((guest) => {
    // Date-only strings must be parsed as local dates to avoid timezone shifts
    const fromDate = parseDateOnly(guest.from_date);
    const toDate = parseDateOnly(guest.to_date);
    // Only show in room card if guest is currently staying (today is between from_date and to_date inclusive)
    // For past months, show all guests that were present during that month
    if (isSelectedCurrentMonth) {
      // Current month: only show active guests (to_date >= today)
      return fromDate <= today && toDate >= today;
    } else {
      // Other months: show guests that overlapped with that month
      return fromDate <= endOfMonth && toDate >= startOfMonth;
    }
  });
  const guestsPaidCount = currentGuests.filter((g) => g.payment_status === "Paid").length;
  const getStatusColor = (status: string) => {
    if (status === "Occupied") return "bg-occupied text-occupied-foreground";
    if (status === "Partially Occupied") return "bg-warning text-warning-foreground";
    return "bg-vacant text-vacant-foreground";
  };

  // Get payment for selected month
  const getSelectedMonthPayment = (tenantId: string) => {
    return payments.find((p) => p.tenantId === tenantId && p.month === selectedMonth && p.year === selectedYear);
  };

  // Tenants active in selected month (history view) - show tenants whose end_date hasn't passed yet
  const tenantsInSelectedMonth = room.tenants.filter((t) =>
    isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
  );

  // For CURRENT month, show occupancy based on who is active NOW (end_date is null or in the future)
  // For past/future months, show occupancy based on month history
  const tenantsForDisplay = isSelectedCurrentMonth
    ? room.tenants.filter((t) => isTenantActiveNow(t.startDate, t.endDate))
    : tenantsInSelectedMonth;

  const eligibleTenants = tenantsForDisplay;

  // Occupancy for the selected month/current month view
  const occupiedCount = tenantsForDisplay.length;

  // Calculate collected amount from tenant_payments for selected month
  const totalCollected = eligibleTenants.reduce((sum, t) => {
    const payment = getSelectedMonthPayment(t.id);
    return sum + (payment?.paymentStatus === "Paid" ? payment.amount : 0);
  }, 0);

  // Calculate expected rent for eligible tenants
  const expectedRent = eligibleTenants.reduce((sum, t) => sum + t.monthlyRent, 0);

  // Calculate paid count from displayed tenants
  const paidCount = tenantsForDisplay.filter((t) => {
    const payment = getSelectedMonthPayment(t.id);
    return payment?.paymentStatus === "Paid";
  }).length;

  const currentStatus =
    occupiedCount === room.capacity ? "Occupied" : occupiedCount === 0 ? "Vacant" : "Partially Occupied";
  return (
    <Card className="transition-all hover:shadow-md overflow-hidden w-full min-w-0 rounded-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-primary">
            ₹{totalCollected.toLocaleString()} / ₹{expectedRent.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Room {room.roomNo}</CardTitle>
          <Badge className={getStatusColor(currentStatus)}>{currentStatus}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Occupancy Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {occupiedCount}/{room.capacity} occupied
            </span>
          </div>

          {tenantsForDisplay.length > 0 && (
            <Badge
              variant="outline"
              className={`rounded-sm ${paidCount === tenantsForDisplay.length ? "bg-paid text-paid-foreground" : "bg-pending text-pending-foreground"}`}
            >
              {paidCount}/{tenantsForDisplay.length} paid
            </Badge>
          )}
        </div>

        {/* Tenant List */}
        {tenantsForDisplay.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Tenants:</div>

            {(isExpanded ? tenantsForDisplay : tenantsForDisplay.slice(0, 2)).map((tenant) => {
              const leftThisMonth = tenantLeftInMonth(tenant.endDate, selectedYear, selectedMonth);
              const joinedThisMonth = tenantJoinedInMonth(tenant.startDate, selectedYear, selectedMonth);
              const payment = getSelectedMonthPayment(tenant.id);
              const isPaid = payment?.paymentStatus === "Paid";
              const isPartial = payment?.paymentStatus === "Partial";
              const whatsappSent = payment?.whatsappSent;
              const handlePaidClick = () => {
                if (!isPaid && !isPartial) return;
                const lastEntry = payment?.paymentEntries?.[payment.paymentEntries.length - 1];
                setReceiptData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  paymentMode: lastEntry?.mode || "cash",
                  paymentDate: lastEntry?.date
                    ? format(new Date(lastEntry.date), "dd-MMM-yyyy")
                    : format(new Date(), "dd-MMM-yyyy"),
                  joiningDate: format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy"),
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: room.roomNo,
                  sharingType: `${room.capacity} Sharing`,
                  amount: tenant.monthlyRent,
                  amountPaid: payment?.amountPaid || tenant.monthlyRent,
                  isFullPayment: isPaid,
                  remainingBalance: isPartial ? tenant.monthlyRent - (payment?.amountPaid || 0) : 0,
                  tenantId: tenant.id,
                });
                setWhatsappDialogOpen(true);
              };
              const openWhatsAppChat = () => {
                const phone = tenant.phone.replace(/\D/g, "");
                const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;
                window.open(`https://wa.me/${formattedPhone}`, "_blank");
              };
              const openPaymentReminder = () => {
                const payment = getSelectedMonthPayment(tenant.id);
                const amountPaid = payment?.amountPaid || 0;
                const balance = tenant.monthlyRent - amountPaid;
                setReminderData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  joiningDate: format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy"),
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: room.roomNo,
                  sharingType: `${room.capacity} Sharing`,
                  amount: tenant.monthlyRent,
                  amountPaid: amountPaid > 0 ? amountPaid : undefined,
                  balance: balance,
                });
                setReminderDialogOpen(true);
              };
              const isNew = isNewTenant(tenant.startDate);
              return (
                <div
                  key={tenant.id}
                  className={`flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 ${leftThisMonth ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {tenant.isLocked && "🔒 "}
                          {tenant.name}
                        </span>
                        {isNew && !leftThisMonth && (
                          <Badge className="h-4 px-1.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 animate-pulse">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            NEW
                          </Badge>
                        )}
                      </div>
                      {leftThisMonth && tenant.endDate && (
                        <span className="text-xs text-destructive">
                          Left: {format(parseDateOnly(tenant.endDate), "dd MMM")}
                        </span>
                      )}
                      {joinedThisMonth && !isNew && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Joined: {format(parseDateOnly(tenant.startDate), "dd MMM")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Call badge */}
                    {tenant.phone && tenant.phone !== "••••••••••" && (
                      <a
                        href={`tel:${tenant.phone}`}
                        className="p-1 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title={`Call ${tenant.name}`}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                    {/* WhatsApp dropdown menu - Always visible */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`p-1 rounded-full transition-colors ${whatsappSent ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"}`}
                          title={whatsappSent ? "Receipt sent - Click for options" : "WhatsApp options"}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(isPaid || isPartial) && (
                          <DropdownMenuItem onClick={handlePaidClick} className="gap-2">
                            <Receipt className="h-4 w-4" />
                            Generate Receipt
                          </DropdownMenuItem>
                        )}
                        {tenant.phone && tenant.phone !== "••••••••••" && (
                          <DropdownMenuItem onClick={openWhatsAppChat} className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Chat with Tenant
                          </DropdownMenuItem>
                        )}
                        {tenant.phone && tenant.phone !== "••••••••••" && !isPaid && (
                          <DropdownMenuItem onClick={openPaymentReminder} className="gap-2">
                            <Bell className="h-4 w-4" />
                            Payment Reminder
                          </DropdownMenuItem>
                        )}
                        {(!tenant.securityDepositAmount || tenant.securityDepositAmount === 0) && (
                          <DropdownMenuItem
                            onClick={() => {
                              // Navigate to index with state to open security deposit dialog
                              navigate("/", { 
                                state: { 
                                  openSecurityDeposit: true, 
                                  tenantId: tenant.id,
                                  tenantName: tenant.name,
                                  tenantPhone: tenant.phone,
                                  roomNo: room.roomNo,
                                  roomCapacity: room.capacity
                                } 
                              });
                            }}
                            className="gap-2"
                          >
                            <Wallet className="h-4 w-4" />
                            Security Deposit
                          </DropdownMenuItem>
                        )}
                        {tenant.phone && tenant.phone !== "••••••••••" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setWelcomeData({
                                tenantName: tenant.name,
                                tenantPhone: tenant.phone,
                                joiningDate: tenant.startDate,
                                roomNo: room.roomNo,
                                sharingType: `${room.capacity} Sharing`,
                                monthlyRent: tenant.monthlyRent,
                              });
                              setWelcomeDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <PartyPopper className="h-4 w-4" />
                            Welcome
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Badge
                      variant="outline"
                      className={
                        isPaid
                          ? "bg-paid text-paid-foreground text-xs cursor-pointer hover:opacity-80"
                          : isPartial
                            ? "bg-partial text-partial-foreground text-xs cursor-pointer hover:opacity-80"
                            : "bg-pending text-pending-foreground text-xs"
                      }
                      onClick={isPaid || isPartial ? handlePaidClick : undefined}
                    >
                      {tenant.isLocked ? "🔒" : ""}
                      {isPaid ? "Paid" : isPartial ? "Partial" : "Not Paid"}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {!isExpanded && tenantsForDisplay.length > 2 && (
              <div className="text-xs text-muted-foreground">+{tenantsForDisplay.length - 2} more</div>
            )}
          </div>
        )}

        {/* Rent Info */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">₹{room.rentAmount.toLocaleString()}</span>
        </div>

        {/* Day Guests Info - Show if guests present */}
        {currentGuests.length > 0 && (
          <div className="border border-dashed border-primary/50 rounded-lg p-3 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Day Guests</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-background border-0 rounded-sm">
                  {occupiedCount} Present
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 rounded-sm">
                  {currentGuests.length} Guest{currentGuests.length > 1 ? "s" : ""}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    guestsPaidCount === currentGuests.length
                      ? "bg-paid text-paid-foreground"
                      : "bg-pending text-pending-foreground"
                  }
                >
                  {guestsPaidCount}/{currentGuests.length} paid
                </Badge>
              </div>
            </div>
            {/* Guest List with WhatsApp */}
            <div className="space-y-1.5 pt-1">
              {currentGuests.map((guest) => {
                const openGuestWhatsApp = () => {
                  if (!guest.mobile_number) return;
                  const phone = guest.mobile_number.replace(/\D/g, "");
                  const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;
                  window.open(`https://wa.me/${formattedPhone}`, "_blank");
                };
                return (
                  <div key={guest.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{guest.guest_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {guest.mobile_number && (
                        <button
                          onClick={openGuestWhatsApp}
                          className="p-1 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title={`Chat with ${guest.guest_name}`}
                        >
                          <Phone className="h-3 w-3" />
                        </button>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          guest.payment_status === "Paid"
                            ? "bg-paid text-paid-foreground"
                            : "bg-pending text-pending-foreground"
                        }
                      >
                        {guest.payment_status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {room.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs">{room.notes}</span>
          </div>
        )}

        {/* Action buttons for current month */}
        {canManageTenants && isSelectedCurrentMonth && occupiedCount < room.capacity && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onViewDetails(room)}
                className="h-10 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Tenant</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/day-guest/${room.id}?roomNo=${encodeURIComponent(room.roomNo)}`)}
                className="h-10 flex items-center justify-center gap-2 border-dashed"
              >
                <UserCheck className="h-4 w-4" />
                <span>Day Guest</span>
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {tenantsForDisplay.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>Expand tenants</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {onEditRoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditRoom(room);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onViewDetails(room);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              Manage Room
            </button>
          </div>
        </div>
      </CardContent>

      {/* WhatsApp Receipt Dialog */}
      <WhatsAppReceiptDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {
          if (receiptData?.tenantId) {
            markWhatsappSent.mutate({
              tenantId: receiptData.tenantId,
              month: selectedMonth,
              year: selectedYear,
            });
          }
        }}
      />

      {/* Payment Reminder Dialog */}
      <PaymentReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />

      {/* Welcome Dialog */}
      <WelcomeDialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen} welcomeData={welcomeData} />
    </Card>
  );
};
