import { useState, useMemo, useCallback } from "react";
import { useMonthContext } from "@/contexts/MonthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Users, Send, Loader2, ArrowLeft } from "lucide-react";
import { CalendarClock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format as fmtDate, addDays } from "date-fns";
import {
  useElectricityReadings,
  useAllElectricityReadings,
  calcAcTenantShares,
  calculateAPCommercialBill,
} from "@/hooks/useElectricityReadings";
import { toast } from "@/hooks/use-toast";
import { MONTHS } from "@/constants/pricing";
import { Room } from "@/types";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { isTenantActiveInMonth } from "@/utils/dateOnly";

interface BulkReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

interface TenantWithPayment {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  monthlyRent: number;
  amountPaid: number;
  balance: number;
  acShare: number;
  overdueAc?: { monthLabel: string; share: number }[];
  overdueAcTotal?: number;
  paymentStatus: "Paid" | "Pending" | "Partial";
}

export const BulkReminderDialog = ({ open, onOpenChange, rooms }: BulkReminderDialogProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  const { byRoom: acByRoom } = useElectricityReadings(selectedMonth, selectedYear);
  const { data: allReadings = [] } = useAllElectricityReadings();

  const getOverdueAcBills = useCallback((tenantId: string, room: Room) => {
    const overdue: { month: number; year: number; share: number; monthLabel: string }[] = [];
    const tenant = room.tenants.find((t) => t.id === tenantId);
    if (!tenant) return overdue;

    const joinDate = new Date(tenant.startDate);
    const checkMonths: { month: number; year: number }[] = [];
    
    let curM = selectedMonth - 1;
    let curY = selectedYear;
    if (curM === 0) {
      curM = 12;
      curY = selectedYear - 1;
    }

    const currentDate = new Date();
    const limitDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1); // 12 months limit
    const startDateLimit = joinDate > limitDate ? joinDate : limitDate;

    while (true) {
      const checkDate = new Date(curY, curM - 1, 1);
      if (checkDate < startDateLimit) break;
      checkMonths.push({ month: curM, year: curY });
      curM--;
      if (curM === 0) {
        curM = 12;
        curY--;
      }
    }

    for (const { month: m, year: y } of checkMonths) {
      if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, y, m)) continue;

      const payment = payments.find((p) => p.tenantId === tenantId && p.month === m && p.year === y);
      const isPaid = payment?.acPaymentStatus === "Paid";

      if (!isPaid) {
        const reading = allReadings.find((r) => r.room_id === room.id && r.month === m && r.year === y);
        if (reading && reading.units > 0) {
          const activeTenants = room.tenants.filter((t) =>
            isTenantActiveInMonth(t.startDate, t.endDate, y, m)
          );
          const apBill = calculateAPCommercialBill(reading.units);
          const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom";
          const totalAmount = isCustom ? reading.units * reading.unit_price : apBill.totalBill;

          const shares = calcAcTenantShares(
            reading.units,
            reading.unit_price,
            activeTenants,
            y,
            m,
            room.capacity,
            totalAmount
          );
          const myShare = shares.find((s) => s.name === tenant.name)?.share || 0;
          if (myShare > 0) {
            overdue.push({
              month: m,
              year: y,
              share: myShare,
              monthLabel: `${MONTHS[m - 1]?.label} ${y}`,
            });
          }
        }
      }
    }

    return overdue;
  }, [payments, allReadings, selectedMonth, selectedYear]);

  // Helper: compute AC surcharge share for a tenant in the given room
  const getAcShareForTenant = useCallback((room: Room, tenantId: string): number => {
    if (!room.isAc) return 0;
    const reading = acByRoom.get(room.id);
    const units = reading?.units ?? 0;
    const unitPrice = reading?.unit_price ?? 12;
    const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom";
    const apBill = calculateAPCommercialBill(units);
    const totalAmount = isCustom ? units * unitPrice : apBill.totalBill;
    const active = room.tenants.filter((t) =>
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
    );
    if (!active.some((t) => t.id === tenantId)) return 0;
    const tenant = active.find((t) => t.id === tenantId);
    if (!tenant) return 0;
    return calcAcTenantShares(units, unitPrice, active, selectedYear, selectedMonth, room.capacity, totalAmount)
      .find((share) => share.name === tenant.name)?.share ?? 0;
  }, [acByRoom, selectedMonth, selectedYear]);
  const [messageType, setMessageType] = useState<"reminder" | "custom">("reminder");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [includeAmount, setIncludeAmount] = useState(true);
  const [includeMonth, setIncludeMonth] = useState(true);


  // Get all pending tenants (excluding left tenants)
  const pendingTenants = useMemo(() => {
    const allTenants = rooms.flatMap((room) =>
      room.tenants
        .filter((tenant) => {
          // Must be active in current month
          if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return false;
          // Exclude tenants who have already left (end_date is set and in the past or today)
          if (tenant.endDate) {
            const endDate = new Date(tenant.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            if (endDate <= today) return false;
          }
          return true;
        })
        .filter((tenant) => tenant.phone && tenant.phone !== "••••••••••") // Only tenants with visible phone
        .map((tenant) => {
          const payment = payments.find(
            (p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
          );
          const amountPaid = payment?.amountPaid || 0;
          const isAcPaid = payment?.acPaymentStatus === "Paid";
          const acShare = isAcPaid ? 0 : getAcShareForTenant(room, tenant.id);
          const overdueAc = getOverdueAcBills(tenant.id, room);
          const overdueAcTotal = overdueAc.reduce((sum, om) => sum + om.share, 0);
          return {
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            roomNo: room.roomNo,
            monthlyRent: tenant.monthlyRent,
            amountPaid,
            balance: tenant.monthlyRent - amountPaid + acShare + overdueAcTotal,
            acShare,
            overdueAc,
            overdueAcTotal,
            paymentStatus: (payment?.paymentStatus || "Pending") as "Paid" | "Pending" | "Partial",
          };
        })
    );

    // Filter to only pending and partial
    return allTenants.filter((t) => t.paymentStatus !== "Paid");
  }, [rooms, payments, selectedMonth, selectedYear, getAcShareForTenant, getOverdueAcBills]);

  // Get all tenants for custom message (excluding left tenants)
  const allTenants = useMemo(() => {
    return rooms.flatMap((room) =>
      room.tenants
        .filter((tenant) => {
          // Must be active in current month
          if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return false;
          // Exclude tenants who have already left (end_date is set and in the past or today)
          if (tenant.endDate) {
            const endDate = new Date(tenant.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            if (endDate <= today) return false;
          }
          return true;
        })
        .filter((tenant) => tenant.phone && tenant.phone !== "••••••••••")
        .map((tenant) => {
          const payment = payments.find(
            (p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
          );
          return {
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            roomNo: room.roomNo,
            monthlyRent: tenant.monthlyRent,
            amountPaid: payment?.amountPaid || 0,
            balance: tenant.monthlyRent - (payment?.amountPaid || 0),
            paymentStatus: (payment?.paymentStatus || "Pending") as "Paid" | "Pending" | "Partial",
          };
        })
    );
  }, [rooms, payments, selectedMonth, selectedYear]);

  const currentTenants = messageType === "reminder" ? pendingTenants : allTenants;
  const monthName = MONTHS[selectedMonth - 1];

  const toggleTenant = (tenantId: string) => {
    const newSelected = new Set(selectedTenants);
    if (newSelected.has(tenantId)) {
      newSelected.delete(tenantId);
    } else {
      newSelected.add(tenantId);
    }
    setSelectedTenants(newSelected);
  };

  const selectAll = () => {
    setSelectedTenants(new Set(currentTenants.map((t) => t.id)));
  };

  const deselectAll = () => {
    setSelectedTenants(new Set());
  };

  const generateMessage = (tenant: TenantWithPayment) => {
    if (messageType === "custom") {
      return customMessage
        .replace("{name}", tenant.name)
        .replace("{room}", tenant.roomNo)
        .replace("{amount}", `₹${tenant.balance.toLocaleString()}`)
        .replace("{month}", `${monthName} ${selectedYear}`);
    }

    // Payment reminder message
    let message = `Hi ${tenant.name},\n\nThis is a gentle reminder`;
    
    if (includeMonth) {
      message += ` for your rent payment for ${monthName} ${selectedYear}`;
    } else {
      message += ` for your pending rent payment`;
    }

    if (includeAmount) {
      message += `.\n\nAmount Due: ₹${tenant.balance.toLocaleString()}`;
      if (tenant.amountPaid > 0) {
        message += `\n(Already Paid: ₹${tenant.amountPaid.toLocaleString()})`;
      }
      if (tenant.acShare > 0) {
        message += `\n(Includes AC Electricity: ₹${tenant.acShare.toLocaleString()})`;
      }
      if (tenant.overdueAc && tenant.overdueAc.length > 0) {
        tenant.overdueAc.forEach((om) => {
          message += `\n(Overdue AC for ${om.monthLabel}: ₹${om.share.toLocaleString()})`;
        });
      }
    }

    message += "\n\nPlease pay at your earliest convenience.\n\nThank you!";
    return message;
  };

  const sendReminders = async () => {
    const tenantsToSend = currentTenants.filter((t) => selectedTenants.has(t.id));
    if (tenantsToSend.length === 0) {
      toast({
        title: "No tenants selected",
        description: "Please select at least one tenant to send reminders.",
        variant: "destructive",
      });
      return;
    }

    if (messageType === "custom" && !customMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a custom message to send.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    // Open WhatsApp for each tenant with a delay
    for (let i = 0; i < tenantsToSend.length; i++) {
      const tenant = tenantsToSend[i];
      const message = encodeURIComponent(generateMessage(tenant));
      const phone = tenant.phone.replace(/\D/g, "");
      const url = `https://wa.me/${phone}?text=${message}`;
      
      window.open(url, "_blank");
      
      // Small delay between opening tabs
      if (i < tenantsToSend.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsSending(false);

    onOpenChange(false);
  };

  const handleSnooze = async () => {
    const ids = Array.from(selectedTenants);
    if (ids.length === 0) {
      toast({ title: "Select tenants first", variant: "destructive" });
      return;
    }
    await snoozeTenants.mutateAsync({
      tenantIds: ids,
      until: fmtDate(snoozeDate, "yyyy-MM-dd"),
      reason: `Promised by ${fmtDate(snoozeDate, "dd MMM")}`,
    });
    setSelectedTenants(new Set());
    setSnoozeOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900"
      >
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <MessageCircle className="h-5 w-5 text-cash shrink-0" />
                <SheetTitle className="text-base text-foreground font-bold truncate">
                  Bulk WhatsApp Messages
                </SheetTitle>
              </div>
            </div>
            <SheetDescription className="ml-10 mt-1">
              Send payment reminders or custom messages to multiple tenants
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 flex flex-col min-h-0 py-4 bg-background">

        <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "reminder" | "custom")} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 mx-4" style={{ width: "calc(100% - 2rem)" }}>
            <TabsTrigger value="reminder">Payment Reminders</TabsTrigger>
            <TabsTrigger value="custom">Custom Message</TabsTrigger>
          </TabsList>

          <div>
            <div className="p-4 space-y-4">
              <TabsContent value="reminder" className="mt-0 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch checked={includeAmount} onCheckedChange={setIncludeAmount} id="include-amount" />
                    <Label htmlFor="include-amount" className="text-sm">Include Amount</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={includeMonth} onCheckedChange={setIncludeMonth} id="include-month" />
                    <Label htmlFor="include-month" className="text-sm">Include Month</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Custom Message</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter your message here. Use {name}, {room}, {amount}, {month} for placeholders."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders: {"{name}"}, {"{room}"}, {"{amount}"}, {"{month}"}
                  </p>
                </div>
              </TabsContent>

              {/* Tenant Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select Tenants ({selectedTenants.size}/{currentTenants.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                {currentTenants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {messageType === "reminder"
                      ? "No pending payments for this month!"
                      : "No tenants available"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentTenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTenants.has(tenant.id)
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/30 border-transparent hover:bg-muted/50"
                        }`}
                        onClick={() => toggleTenant(tenant.id)}
                      >
                        <Checkbox
                          checked={selectedTenants.has(tenant.id)}
                          onCheckedChange={() => toggleTenant(tenant.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{tenant.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Room {tenant.roomNo} • {tenant.phone}
                          </div>
                        </div>
                        {messageType === "reminder" && (
                          <Badge variant="outline" className="text-overdue border-overdue">
                            ₹{tenant.balance.toLocaleString()}
                          </Badge>
                        )}
                        {tenant.paymentStatus === "Partial" && (
                          <Badge variant="outline" className="text-partial border-partial">
                            Partial
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs>

        {/* Fixed bottom action button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2">

          <Button
            onClick={sendReminders}
            disabled={selectedTenants.size === 0 || isSending}
            className="flex-1 bg-cash hover:bg-cash/90 text-cash-foreground"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening WhatsApp...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedTenants.size}
              </>
            )}
          </Button>
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
