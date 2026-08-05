import { useState, useRef, useEffect } from "react";
import { useBackGesture } from "@/hooks/useBackGesture";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Room, Tenant, PaymentEntry } from "@/types";
import {
  MapPin,
  User,
  CreditCard,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CalendarIcon,
  LogOut,
  PartyPopper,
  Phone,
  MessageCircle,
  MessageSquare,
  Bell,
  Receipt,
  Wallet,
  Loader2,
  ArrowRightLeft,
  ArrowLeft,
  Contact,
} from "lucide-react";
import {
  pickContactFromDevice,
  sanitizePhoneNumber,
  MOCK_CONTACTS,
  getSimulatedContacts,
  saveSimulatedContact,
  getDeviceContacts,
  type SelectedContact,
} from "@/utils/contactsHelper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInDays } from "date-fns";
import { useRooms } from "@/hooks/useRooms";
import { toast } from "@/hooks/use-toast";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useRent } from "@/contexts/RentContext";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { WhatsAppReceiptDialog } from "./WhatsAppReceiptDialog";
import { PaymentReminderDialog } from "./PaymentReminderDialog";
import { DeletePaymentDialog } from "./DeletePaymentDialog";
import { MarkLeftDialog } from "./MarkLeftDialog";
import { WelcomeDialog } from "./WelcomeDialog";
import { ShiftRoomDialog } from "./ShiftRoomDialog";
import { isTenantActiveInMonth, isTenantActiveNow, hasTenantLeftNow, parseDateOnly } from "@/utils/dateOnly";
import { useCollectorNames } from "@/hooks/useCollectorNames";

// Helper to check if tenant joined within last 5 days
const isNewTenant = (startDate: string): boolean => {
  const joinDate = parseDateOnly(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceJoining = differenceInDays(today, joinDate);
  return daysSinceJoining >= 0 && daysSinceJoining <= 5;
};

interface TenantManagementProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  autoScrollToAdd?: boolean;
}

export const TenantManagement = ({ room, isOpen, onClose, autoScrollToAdd = false }: TenantManagementProps) => {
  const isMobile = useIsMobile();
  const { updateRoom, addTenant, updateTenant, removeTenant } = useRooms();
  const { payments, upsertPayment, markWhatsappSent } = useTenantPayments();
  const { rentRecords } = useRent();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { isAdmin, isOwner } = useAuth();
  const { collectors } = useCollectorNames();
  const canManageTenants = isOwner;
  const navigate = useNavigate();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && autoScrollToAdd) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
        // Focus the name input
        const nameInput = document.getElementById("new-tenant-name");
        nameInput?.focus();
      }, 350);
    }
  }, [isOpen, autoScrollToAdd]);

  // Handle OS back gesture to close dialog
  useBackGesture(isOpen, onClose);
  
  const [customContactPickerOpen, setCustomContactPickerOpen] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<SelectedContact[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [paymentDateTenant, setPaymentDateTenant] = useState<string | null>(null);
  const [partialPaymentTenant, setPartialPaymentTenant] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [payRemainingTenant, setPayRemainingTenant] = useState<string | null>(null);
  const [payRemainingAmount, setPayRemainingAmount] = useState<number>(0);
  const [payRemainingDate, setPayRemainingDate] = useState<Date>(new Date());
  const [partialPaymentDate, setPartialPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");
  const [remainingPaymentMode, setRemainingPaymentMode] = useState<"upi" | "cash">("upi");
  const [collectedBy, setCollectedBy] = useState<string>(collectors[0]?.displayName || "Me");
  const [remainingCollectedBy, setRemainingCollectedBy] = useState<string>(collectors[0]?.displayName || "Me");
  const [overpaymentReason, setOverpaymentReason] = useState<string>("");
  const [overpaymentError, setOverpaymentError] = useState<boolean>(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [markLeftTenant, setMarkLeftTenant] = useState<Tenant | null>(null);
  const [shiftTenant, setShiftTenant] = useState<Tenant | null>(null);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
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
  const [welcomeData, setWelcomeData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    roomNo: string;
    sharingType: string;
    monthlyRent: number;
    securityDeposit?: number;
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
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Get payment status for a tenant for the SELECTED month
  const getSelectedMonthPayment = (tenantId: string) => {
    return rentRecords.find((p) => p.tenantId === tenantId);
  };

  // Check payment status for the selected month
  const getTenantPaymentStatus = (tenantId: string) => {
    const payment = getSelectedMonthPayment(tenantId);
    return payment?.paymentStatus || "Pending";
  };

  const isTenantPaidForMonth = (tenantId: string) => {
    const payment = getSelectedMonthPayment(tenantId);
    if (!payment) return false; // ⬅️ important change
    return getTenantPaymentStatus(tenantId) === "Paid";
  };

  const isTenantPartialForMonth = (tenantId: string) => {
    const payment = getSelectedMonthPayment(tenantId);
    if (!payment) return false;
    return getTenantPaymentStatus(tenantId) === "Partial";
  };

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{
    name: string;
    phone: string;
    startDate: string;
    endDate?: string;
    monthlyRent: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setEditingTenantId(null);
      setEditingValues(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsEditMode(false);
    setEditingTenantId(null);
    setEditingValues(null);
  }, [room.id]);

  const [confirmAction, setConfirmAction] = useState<{ type: "paid" | "delete"; tenantId: string } | null>(null);
  const [deletePaymentTenant, setDeletePaymentTenant] = useState<{
    id: string;
    name: string;
    monthlyRent: number;
    paymentEntries: PaymentEntry[];
  } | null>(null);

  // Handle OS back gesture to close sub-dialogs
  useBackGesture(confirmAction?.type === "delete", () => setConfirmAction(null));
  useBackGesture(!!deletePaymentTenant, () => setDeletePaymentTenant(null));
  useBackGesture(!!partialPaymentTenant, () => setPartialPaymentTenant(null));
  useBackGesture(!!payRemainingTenant, () => setPayRemainingTenant(null));
  useBackGesture(!!markLeftTenant, () => setMarkLeftTenant(null));
  useBackGesture(!!shiftTenant, () => setShiftTenant(null));

  const getPricePerPerson = (capacity: number) => {
    const configuredPrice = Math.round(room.rentAmount / Math.max(1, capacity));
    if (configuredPrice > 0) return configuredPrice;
    const priceMap: { [key: number]: number } = {
      1: 11500,
      2: 6000,
      3: 5000,
      4: 4500,
      5: 4000,
    };
    return priceMap[capacity] || 4000;
  };

  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({
    name: "",
    phone: "",
    monthlyRent: getPricePerPerson(room.capacity),
    paymentStatus: "Pending",
    startDate: new Date().toISOString().split("T")[0],
  });
  const [includeSecurityDeposit, setIncludeSecurityDeposit] = useState(false);
  const FIXED_SECURITY_DEPOSIT = 2000;

  const [numberSelectOpen, setNumberSelectOpen] = useState(false);
  const [numbersToSelect, setNumbersToSelect] = useState<string[]>([]);
  const [selectedContactName, setSelectedContactName] = useState("");

  // Handle back gesture for contacts dialogs
  useBackGesture(numberSelectOpen, () => setNumberSelectOpen(false));

  const handleContactSelected = (name: string, phones: string[]) => {
    // Deduplicate phone numbers by their sanitized (10-digit) values
    const seenCleaned = new Set<string>();
    const uniquePhones: string[] = [];

    (phones || []).forEach((phone) => {
      const cleaned = sanitizePhoneNumber(phone);
      if (cleaned && !seenCleaned.has(cleaned)) {
        seenCleaned.add(cleaned);
        uniquePhones.push(phone);
      }
    });

    if (uniquePhones.length === 0) {
      toast({
        title: "No phone number found",
        description: `${name} does not have any phone numbers saved.`,
        variant: "destructive",
      });
      return;
    }

    if (uniquePhones.length === 1) {
      const cleaned = sanitizePhoneNumber(uniquePhones[0]);
      setNewTenant((prev) => ({
        ...prev,
        name: name,
        phone: cleaned,
      }));
    } else {
      setSelectedContactName(name);
      setNumbersToSelect(uniquePhones);
      setNumberSelectOpen(true);
    }
  };

  const filteredContacts = deviceContacts.filter((c) => {
    const q = contactSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phones.some(p => p.toLowerCase().includes(q));
  });

  const handleChooseFromContacts = async () => {
    try {
      const contact = await pickContactFromDevice();
      if (contact === undefined) {
        return; // User explicitly cancelled, do nothing
      }
      if (contact) {
        handleContactSelected(contact.name, contact.phones);
      }
    } catch (err: any) {
      const errStr = String(err?.message || err?.name || '').toLowerCase();
      if (errStr.includes('cancel') || errStr.includes('abort') || errStr.includes('dismiss')) {
        return; // User cancelled native picker, do nothing
      }
      
      console.log("Native pickContact failed, falling back to full list search modal:", err);
      
      // Open custom dialog and load device contacts
      setLoadingContacts(true);
      setCustomContactPickerOpen(true);
      try {
        const list = await getDeviceContacts();
        setDeviceContacts(list);
      } catch (listErr: any) {
        console.error("Failed to load device contacts list:", listErr);
        toast({
          title: "Failed to access contacts",
          description: listErr?.message || "Please check your contacts permissions in device Settings.",
          variant: "destructive",
        });
        setCustomContactPickerOpen(false);
      } finally {
        setLoadingContacts(false);
      }
    }
  };

  const handleSelectPhoneNumber = (phone: string) => {
    const cleaned = sanitizePhoneNumber(phone);
    setNewTenant((prev) => ({
      ...prev,
      name: selectedContactName,
      phone: cleaned,
    }));
    setNumberSelectOpen(false);

  };

  const getFloorName = (floor: number) => {
    const floorNames = { 1: "1st Floor", 2: "2nd Floor", 3: "3rd Floor" };
    return floorNames[floor as keyof typeof floorNames];
  };

  const getStatusColor = (status: string) => {
    if (status === "Occupied") return "bg-occupied text-occupied-foreground";
    if (status === "Partially Occupied") return "bg-warning text-warning-foreground";
    return "bg-vacant text-vacant-foreground";
  };

  const handleAddTenant = async () => {
    if (!newTenant.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the tenant's name",
        variant: "destructive",
      });
      return;
    }
    if (!newTenant.phone || newTenant.phone.length < 10) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }
    if (newTenant.monthlyRent !== undefined && newTenant.monthlyRent <= 0) {
      toast({
        title: "Validation Error",
        description: "Monthly rent must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    const tenant = {
      name: newTenant.name.trim(),
      phone: newTenant.phone,
      startDate: newTenant.startDate || new Date().toISOString().split("T")[0],
      monthlyRent: newTenant.monthlyRent || Math.floor(room.rentAmount / room.capacity),
      paymentStatus: newTenant.paymentStatus || ("Pending" as const),
    };

    try {
      await addTenant.mutateAsync({ roomId: room.id, roomNo: room.roomNo, tenant });
    } catch (err: any) {
      toast({
        title: "Failed to add tenant",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
      return;
    }

    // Best-effort status update (don't block tenant creation UX if this fails)
    try {
      const optimisticCount = (room.tenants || []).length + 1;
      const newStatus =
        optimisticCount === room.capacity ? "Occupied" : optimisticCount === 0 ? "Vacant" : "Partially Occupied";

      await updateRoom.mutateAsync({
        ...room,
        status: newStatus as any,
      });
    } catch {
      // Ignore: rooms query refetch will recompute status in UI anyway.
    }

    // Prepare welcome data and show dialog
    setWelcomeData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      joiningDate: tenant.startDate,
      roomNo: room.roomNo,
      sharingType: `${room.capacity} Sharing`,
      monthlyRent: tenant.monthlyRent,
      securityDeposit: includeSecurityDeposit ? FIXED_SECURITY_DEPOSIT : undefined,
    });
    setWelcomeDialogOpen(true);
    // Reset security deposit toggle for next tenant
    setIncludeSecurityDeposit(false);

    setNewTenant({
      name: "",
      phone: "",
      monthlyRent: getPricePerPerson(room.capacity),
      paymentStatus: "Pending",
      startDate: new Date().toISOString().split("T")[0],
    });


  };

  const handleUpdateTenant = async (tenantId: string, updates: Partial<Tenant>) => {
    await updateTenant.mutateAsync({ tenantId, updates });
  };

  const handleRemoveTenant = (tenantId: string) => {
    setConfirmAction({ type: "delete", tenantId });
  };

  const confirmRemoveTenant = async (tenantId: string) => {
    const tenant = (room.tenants || []).find((t) => t.id === tenantId);
    await removeTenant.mutateAsync({ tenantId, tenantName: tenant?.name });

    const updatedTenants = (room.tenants || []).filter((tenant) => tenant.id !== tenantId);
    const newStatus =
      updatedTenants.length === room.capacity
        ? "Occupied"
        : updatedTenants.length === 0
          ? "Vacant"
          : "Partially Occupied";

    await updateRoom.mutateAsync({
      ...room,
      tenants: updatedTenants,
      status: newStatus as any,
    });


  };

  const isSelectedCurrentMonth = (() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  })();

  const tenantsInSelectedMonth = (room.tenants || []).filter((t) =>
    t && isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
  );

  // For current month: show tenants who are active now (end_date is null or in the future)
  // For past/future months: show tenants active in that month
  const activeTenants = isSelectedCurrentMonth
    ? (room.tenants || []).filter((t) => t && isTenantActiveNow(t.startDate, t.endDate))
    : tenantsInSelectedMonth;

  const beginEditingTenant = (tenant: Tenant) => {
    setIsEditMode(true);
    setEditingTenantId(tenant.id);
    setEditingValues({
      name: tenant.name,
      phone: tenant.phone || "",
      startDate: tenant.startDate,
      endDate: tenant.endDate,
      monthlyRent: tenant.monthlyRent,
    });
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditingTenantId(null);
    setEditingValues(null);
  };

  const handleEditModeToggle = () => {
    if (isEditMode) {
      exitEditMode();
      return;
    }

    if (activeTenants.length === 1) {
      beginEditingTenant(activeTenants[0]);
      return;
    }

    setIsEditMode(true);
    setEditingTenantId(null);
    setEditingValues(null);
  };

  const derivedStatus =
    activeTenants.length === room.capacity ? "Occupied" : activeTenants.length === 0 ? "Vacant" : "Partially Occupied";

  const leftTenantsCount = (room.tenants || []).filter((t) => t && hasTenantLeftNow(t.endDate)).length;

  const availableBeds = room.capacity - activeTenants.length;

  const handleCapacityChange = (increment: boolean) => {
    const newCapacity = increment ? room.capacity + 1 : room.capacity - 1;
    if (newCapacity >= (room.tenants || []).length && newCapacity > 0) {
      const pricePerPerson = getPricePerPerson(newCapacity);
      const newTotalRent = newCapacity * pricePerPerson;

      updateRoom.mutate({
        ...room,
        capacity: newCapacity,
        rentAmount: newTotalRent,
      });

      setNewTenant({
        ...newTenant,
        monthlyRent: pricePerPerson,
      });
    }
  };

  const handlePaymentToggle = (tenantId: string, checked: boolean) => {
    if (checked) {
      const tenant = room.tenants.find((t) => t.id === tenantId);
      if (tenant) {
        setPartialPaymentTenant(tenantId);
        setPartialAmount(tenant.monthlyRent);
        setPartialPaymentDate(new Date());
      }
    } else {
      // Open delete payment dialog
      const tenant = room.tenants.find((t) => t.id === tenantId);
      const payment = getSelectedMonthPayment(tenantId);
      if (tenant && payment && payment.paymentEntries.length > 0) {
        setDeletePaymentTenant({
          id: tenantId,
          name: tenant.name,
          monthlyRent: tenant.monthlyRent,
          paymentEntries: payment.paymentEntries,
        });
      }
    }
  };

  const handleDeletePayments = async (entriesToDelete: number[], newAmountPaid: number, newEntries: PaymentEntry[]) => {
    if (!deletePaymentTenant) return;

    const newStatus =
      newAmountPaid >= deletePaymentTenant.monthlyRent ? "Paid" : newAmountPaid > 0 ? "Partial" : "Pending";

    const lastEntry = newEntries[newEntries.length - 1];

    updateTenant.mutate({
      tenantId: deletePaymentTenant.id,
      updates: { paymentStatus: newStatus === "Paid" ? "Paid" : "Pending", paymentDate: lastEntry?.date },
    });

    await upsertPayment.mutateAsync({
      tenantId: deletePaymentTenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: newStatus,
      paymentDate: lastEntry?.date,
      amount: deletePaymentTenant.monthlyRent,
      amountPaid: newAmountPaid,
      paymentEntries: newEntries,
    });



    setDeletePaymentTenant(null);
  };

  const handlePartialPaymentConfirm = async (tenantId: string, date: Date) => {
    const tenant = room.tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const formattedDate = format(date, "yyyy-MM-dd");
    const existingPayment = getSelectedMonthPayment(tenantId);
    const previousPaid = existingPayment?.amountPaid || 0;
    const totalPaid = previousPaid + partialAmount;

    // Check for overpayment without reason
    const isOverpayment = partialAmount > tenant.monthlyRent;
    if (isOverpayment && !overpaymentReason.trim()) {
      setOverpaymentError(true);
      return;
    }
    setOverpaymentError(false);

    const isFullPayment = totalPaid >= tenant.monthlyRent;
    const status = isFullPayment ? "Paid" : "Partial";

    // Build new payment entry
    const newEntry = {
      amount: partialAmount,
      date: formattedDate,
      type: isFullPayment ? ("full" as const) : ("partial" as const),
      mode: paymentMode,
      collectedBy,
    };

    // Combine with existing entries
    const existingEntries = existingPayment?.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

    // Build notes for overpayment
    const notes = isOverpayment
      ? `Extra ₹${(partialAmount - tenant.monthlyRent).toLocaleString()}: ${overpaymentReason.trim()}`
      : undefined;

    updateTenant.mutate({
      tenantId,
      updates: {
        paymentStatus: isFullPayment ? "Paid" : "Pending",
        paymentDate: formattedDate,
      },
    });

    await upsertPayment.mutateAsync({
      tenantId,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: partialAmount, // Store actual amount paid for overpayment tracking
      paymentEntries: updatedEntries,
      notes,
    });



    // Show receipt dialog
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: paymentMode,
      paymentDate: format(date, "dd-MMM-yyyy"),
      joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: room.roomNo,
      sharingType: `${room.capacity} Sharing`,
      amount: tenant.monthlyRent,
      amountPaid: partialAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
      tenantId: tenant.id,
    });
    setTimeout(() => {
      setWhatsappDialogOpen(true);
    }, 100);

    setPartialPaymentTenant(null);
    setPartialAmount(0);
    setOverpaymentReason("");
    setCollectedBy("Me");
  };

  const handlePayRemaining = (tenantId: string) => {
    const tenant = room.tenants.find((t) => t.id === tenantId);
    const payment = getSelectedMonthPayment(tenantId);
    if (tenant && payment) {
      const remaining = tenant.monthlyRent - (payment.amountPaid || 0);
      setPayRemainingTenant(tenantId);
      setPayRemainingAmount(remaining);
      setPayRemainingDate(new Date());
    }
  };

  const confirmPayRemaining = async (tenantId: string) => {
    const tenant = room.tenants.find((t) => t.id === tenantId);
    const payment = getSelectedMonthPayment(tenantId);
    if (!tenant || !payment) return;

    const formattedDate = format(payRemainingDate, "yyyy-MM-dd");
    const previousPaid = payment.amountPaid || 0;
    const totalPaid = previousPaid + payRemainingAmount;
    const isFullPayment = totalPaid >= tenant.monthlyRent;

    // Add remaining payment entry
    const newEntry = {
      amount: payRemainingAmount,
      date: formattedDate,
      type: isFullPayment ? ("remaining" as const) : ("partial" as const),
      mode: remainingPaymentMode,
      collectedBy: remainingCollectedBy,
    };

    const existingEntries = payment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

    const status = isFullPayment ? "Paid" : "Partial";

    updateTenant.mutate({
      tenantId,
      updates: {
        paymentStatus: isFullPayment ? "Paid" : "Pending",
        paymentDate: formattedDate,
      },
    });

    await upsertPayment.mutateAsync({
      tenantId,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: Math.min(totalPaid, tenant.monthlyRent),
      paymentEntries: updatedEntries,
    });



    // Show receipt dialog
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: remainingPaymentMode,
      paymentDate: format(payRemainingDate, "dd-MMM-yyyy"),
      joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: room.roomNo,
      sharingType: `${room.capacity} Sharing`,
      amount: tenant.monthlyRent,
      amountPaid: payRemainingAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
      tenantId: tenant.id,
    });
    setTimeout(() => {
      setWhatsappDialogOpen(true);
    }, 100);

    setPayRemainingTenant(null);
    setPayRemainingAmount(0);
    setRemainingCollectedBy(collectors[0]?.displayName || "Me");
  };

  // detect overdue based on SELECTED month payment status
  const hasCrossedCycle = (tenant: Tenant) => {
    const status = getTenantPaymentStatus(tenant.id);
    if (status === "Paid") return false;

    // Check if selected month is in the past (zero out time to avoid false positives)
    const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
    const currentDate = new Date();
    currentDate.setFullYear(currentDate.getFullYear(), currentDate.getMonth(), 1);
    currentDate.setHours(0, 0, 0, 0);
    return selectedDate < currentDate;
  };

  // choose background + badge color based on SELECTED MONTH payment
  const getTenantStyles = (tenant: Tenant) => {
    const status = getTenantPaymentStatus(tenant.id);
    if (status === "Paid") {
      return { card: "bg-paid-muted", badge: "bg-paid text-paid-foreground" };
    }
    if (status === "Partial") {
      return { card: "bg-partial-muted", badge: "bg-partial text-partial-foreground" };
    }
    if (hasCrossedCycle(tenant)) {
      return { card: "bg-overdue-muted", badge: "bg-overdue text-overdue-foreground" };
    }
    // Check if due date hasn't arrived yet (not-due = blue)
    const isCurrentMonth = (() => {
      const now = new Date();
      return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    })();
    if (isCurrentMonth) {
      const joinDay = parseDateOnly(tenant.startDate).getDate();
      const today = new Date();
      if (today.getDate() < joinDay) {
        return { card: "bg-not-due-muted", badge: "bg-not-due text-not-due-foreground" };
      }
    }
    return { card: "bg-pending-muted", badge: "bg-pending text-pending-foreground" };
  };

  // Get display status for selected month
  const getPaymentStatusForMonth = (tenantId: string) => {
    const status = getTenantPaymentStatus(tenantId);
    if (status === "Paid") return "Paid";
    if (status === "Partial") return "Due";
    // Check if tenant's due day hasn't arrived yet
    const tenant = room.tenants.find(t => t.id === tenantId);
    if (tenant) {
      const isCurrentMonth = (() => {
        const now = new Date();
        return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
      })();
      if (isCurrentMonth) {
        const joinDay = parseDateOnly(tenant.startDate).getDate();
        const today = new Date();
        if (today.getDate() < joinDay) return "Pending";
      }
    }
    return "Pending";
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-full w-full px-0 pt-0 pb-0 rounded-none border-none overflow-hidden flex flex-col [&>button]:hidden animate-in duration-300">
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <SheetTitle className="flex items-center gap-2">
                  Room {room.roomNo}
                  <Badge className={getStatusColor(derivedStatus)}>{derivedStatus}</Badge>
                </SheetTitle>
                
              </div>
            </div>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Room Info */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm bg-muted/40 p-3.5 rounded-xl border border-border/40">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Occupancy:</span>
              <span className="font-semibold text-foreground">
                {activeTenants.length}/{room.capacity} occupied
              </span>
              {isAdmin && (
                <div className="flex gap-1 ml-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleCapacityChange(true)}
                    disabled={room.capacity >= 20}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleCapacityChange(false)}
                    disabled={room.capacity <= (room.tenants || []).length}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Rent:</span>
              <span className="font-semibold text-foreground">
                ₹{room.rentAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Current Tenants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Current Tenants ({activeTenants.length})</h3>
                {leftTenantsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/left-tenants?roomNo=${encodeURIComponent(room.roomNo)}`)}
                  >
                    Left ({leftTenantsCount})
                  </Button>
                )}
              </div>
              {canManageTenants && (
                <Button
                  type="button"
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  onClick={handleEditModeToggle}
                >
                  {isEditMode ? "Done" : "Edit"}
                </Button>
              )}
            </div>

            {canManageTenants && !isEditMode && (
              <div className="text-xs text-muted-foreground">Tap Edit to update tenant details</div>
            )}

            {canManageTenants && isEditMode && activeTenants.length > 1 && !editingTenantId && (
              <div className="text-xs text-muted-foreground">Choose the tenant you want to edit</div>
            )}

            {!canManageTenants && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Only the PG owner can edit tenant details.
              </div>
            )}

            {activeTenants.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tenants for the selected month.</div>
            ) : (
              [...activeTenants]
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((tenant) => {
                  const isEditing = editingTenantId === tenant.id;
                  const payment = getSelectedMonthPayment(tenant.id);
                  const isPaid = isTenantPaidForMonth(tenant.id);
                  const isPartial = isTenantPartialForMonth(tenant.id);
                  const remaining = isPartial ? tenant.monthlyRent - (payment?.amountPaid || 0) : 0;

                  return (
                    <div
                      key={tenant.id}
                      className={cn(
                        "p-4 border rounded-xl space-y-3 transition-all duration-200",
                        getTenantStyles(tenant).card,
                        isEditing && "ring-2 ring-primary scale-[1.02]",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={editingValues?.name ?? tenant.name}
                                onChange={(e) => {
                                  setEditingValues(prev => prev ? { ...prev, name: e.target.value } : null);
                                }}
                                onBlur={async () => {
                                  if (editingValues) {
                                    await handleUpdateTenant(tenant.id, { name: editingValues.name });
                                  }
                                }}
                                placeholder="Name"
                                className="font-medium"
                              />
                              <Input
                                value={editingValues?.phone ?? tenant.phone}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                  setEditingValues(prev => prev ? { ...prev, phone: value } : null);
                                }}
                                onBlur={async () => {
                                  if (editingValues) {
                                    await handleUpdateTenant(tenant.id, { phone: editingValues.phone });
                                  }
                                }}
                                placeholder="Phone"
                                maxLength={10}
                              />
                              <div>
                                <Label className="text-xs text-muted-foreground">Joining Date</Label>
                                <Input
                                  type="date"
                                  value={editingValues?.startDate ?? tenant.startDate}
                                  onChange={(e) => {
                                    setEditingValues(prev => prev ? { ...prev, startDate: e.target.value } : null);
                                  }}
                                  onBlur={async () => {
                                    if (editingValues) {
                                      await handleUpdateTenant(tenant.id, { startDate: editingValues.startDate });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-lg">{tenant.name}</div>
                                {isNewTenant(tenant.startDate) && !tenant.endDate && (
                                  <Badge className="h-5 px-1.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 animate-pulse">
                                    NEW
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{tenant.phone}</div>
                              <div className="text-xs text-muted-foreground">
                                Joining Date: {format(new Date(tenant.startDate), "d MMM yyyy")}
                              </div>
                              {tenant.endDate && (
                                <div className="text-xs text-destructive font-medium">
                                  Left: {format(new Date(tenant.endDate), "d MMM yyyy")}
                                </div>
                              )}
                              {/* Display payment entries */}
                              {payment?.paymentEntries && payment.paymentEntries.length > 0 ? (
                                <div className="mt-1 space-y-0.5">
                                  {payment.paymentEntries.map((entry, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span>
                                        {entry.type === "partial"
                                          ? "Partial"
                                          : entry.type === "remaining"
                                            ? "Remaining"
                                            : "Paid"}
                                        : ₹{entry.amount.toLocaleString()} on{" "}
                                        {format(new Date(entry.date), "d MMM yyyy")}
                                      </span>
                                      {entry.mode && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === "upi" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}
                                        >
                                          {entry.mode === "upi" ? "UPI" : "Cash"}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                payment?.paymentDate && (
                                  <div className="text-xs text-muted-foreground">
                                    Paid on: {format(new Date(payment.paymentDate), "d MMM yyyy")}
                                  </div>
                                )
                              )}
                              {isPartial && (
                                <div className="text-sm font-medium mt-2">
                                  <span className="text-paid">
                                    Paid: ₹{(payment?.amountPaid || 0).toLocaleString()}
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span className="text-partial">Due: ₹{remaining.toLocaleString()}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-2">
                          {isEditMode && !isEditing && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => beginEditingTenant(tenant)}
                            >
                              Edit details
                            </Button>
                          )}

                          {!isEditing && (
                            <>
                              {isPartial ? (
                                <Badge className="bg-overdue text-overdue-foreground px-3 py-1 text-sm">
                                  ₹{remaining.toLocaleString()}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className={getTenantStyles(tenant).badge}>
                                  {getPaymentStatusForMonth(tenant.id)}
                                </Badge>
                              )}

                              {/* Action badges */}
                              {tenant.phone && tenant.phone !== "••••••••••" && (
                                <div className="flex items-center gap-1">
                                  {/* Call badge */}
                                  <a
                                    href={`tel:${tenant.phone}`}
                                    className="p-1.5 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    title={`Call ${tenant.name}`}
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>

                                  {/* WhatsApp dropdown menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                        title="WhatsApp options"
                                      >
                                        <MessageCircle className="h-4 w-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {(isPaid || isPartial) && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const lastEntry =
                                              payment?.paymentEntries?.[payment.paymentEntries.length - 1];
                                            setReceiptData({
                                              tenantName: tenant.name,
                                              tenantPhone: tenant.phone,
                                              paymentMode: lastEntry?.mode || "cash",
                                              paymentDate: lastEntry?.date
                                                ? format(new Date(lastEntry.date), "dd-MMM-yyyy")
                                                : format(new Date(), "dd-MMM-yyyy"),
                                              joiningDate: tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
                                              forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                                              roomNo: room.roomNo,
                                              sharingType: `${room.capacity} Sharing`,
                                              amount: tenant.monthlyRent,
                                              amountPaid: payment?.amountPaid || tenant.monthlyRent,
                                              isFullPayment: isPaid,
                                              remainingBalance: isPartial ? remaining : 0,
                                              tenantId: tenant.id,
                                            });
                                            setTimeout(() => {
                                              setWhatsappDialogOpen(true);
                                            }, 100);
                                          }}
                                          className="gap-2"
                                        >
                                          <Receipt className="h-4 w-4" />
                                          Generate Receipt
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const phone = tenant.phone.replace(/\D/g, "");
                                          const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;
                                          window.location.href = `https://wa.me/${formattedPhone}`;
                                        }}
                                        className="gap-2"
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        Chat with Tenant
                                      </DropdownMenuItem>
                                      {!isPaid && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setReminderData({
                                              tenantName: tenant.name,
                                              tenantPhone: tenant.phone,
                                              joiningDate: tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
                                              forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                                              roomNo: room.roomNo,
                                              sharingType: `${room.capacity} Sharing`,
                                              amount: tenant.monthlyRent,
                                              amountPaid: payment?.amountPaid,
                                              balance: isPartial ? remaining : tenant.monthlyRent,
                                            });
                                            setTimeout(() => {
                                              setReminderDialogOpen(true);
                                            }, 100);
                                          }}
                                          className="gap-2"
                                        >
                                          <Bell className="h-4 w-4" />
                                          Payment Reminder
                                        </DropdownMenuItem>
                                      )}
                                      {(!tenant.securityDepositAmount || tenant.securityDepositAmount === 0) && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            // Dispatch custom event to open security deposit dialog directly
                                            const event = new CustomEvent('openSecurityDeposit', { 
                                              detail: { 
                                                tenantId: tenant.id,
                                                tenantName: tenant.name,
                                                tenantPhone: tenant.phone,
                                                roomNo: room.roomNo,
                                                roomCapacity: room.capacity
                                              } 
                                            });
                                            setTimeout(() => {
                                              window.dispatchEvent(event);
                                            }, 100);
                                          }}
                                          className="gap-2"
                                        >
                                          <Wallet className="h-4 w-4" />
                                          Security Deposit
                                        </DropdownMenuItem>
                                      )}
                                      {tenant.securityDepositAmount && tenant.securityDepositAmount > 0 && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            // Dispatch custom event to open security deposit receipt dialog directly
                                            const event = new CustomEvent('openSecurityDepositReceipt', { 
                                              detail: { 
                                                tenantId: tenant.id
                                              } 
                                            });
                                            setTimeout(() => {
                                              window.dispatchEvent(event);
                                            }, 100);
                                          }}
                                          className="gap-2"
                                        >
                                          <Receipt className="h-4 w-4" />
                                          Security Deposit Receipt
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setWelcomeData({
                                            tenantName: tenant.name,
                                            tenantPhone: tenant.phone,
                                            joiningDate: tenant.startDate,
                                            roomNo: room.roomNo,
                                            sharingType: `${room.capacity} Sharing`,
                                            monthlyRent: tenant.monthlyRent,
                                            securityDeposit: undefined,
                                          });
                                          setTimeout(() => {
                                            setWelcomeDialogOpen(true);
                                          }, 100);
                                        }}
                                        className="gap-2"
                                      >
                                        <PartyPopper className="h-4 w-4" />
                                        Welcome
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </>
                          )}

                          {isEditing && (
                            <>
                              {!tenant.endDate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  onClick={() => setShiftTenant(tenant)}
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                                  Shift Room
                                </Button>
                              )}
                              {tenant.endDate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  onClick={() => {
                                    handleUpdateTenant(tenant.id, { endDate: undefined });

                                  }}
                                >
                                  Reactivate
                                </Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => handleRemoveTenant(tenant.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (editingValues) {
                                    await handleUpdateTenant(tenant.id, editingValues);
                                  }
                                  exitEditMode();
                                }}
                              >
                                Done
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isEditing && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Monthly Rent</Label>
                            <div className="text-lg font-semibold bg-background/50 rounded-lg px-3 py-2">
                              ₹{tenant.monthlyRent.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-end">
                            {isPartial ? (
                              <Button
                                onClick={() => handlePayRemaining(tenant.id)}
                                className="w-full bg-foreground text-background hover:bg-foreground/90"
                              >
                                Pay Remaining
                              </Button>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={isTenantPaidForMonth(tenant.id)}
                                  onCheckedChange={(checked) => handlePaymentToggle(tenant.id, checked)}
                                />
                                <Label>Rent Paid</Label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {isEditing && (
                        <div className="space-y-3">
                          <div>
                            <Label>Monthly Rent</Label>
                            <Input
                              type="number"
                              value={editingValues?.monthlyRent ?? tenant.monthlyRent}
                              readOnly={isTenantPaidForMonth(tenant.id)}
                              className={isTenantPaidForMonth(tenant.id) ? "opacity-50 cursor-not-allowed" : ""}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setEditingValues(prev => prev ? { ...prev, monthlyRent: val } : null);
                              }}
                              onBlur={async () => {
                                if (editingValues) {
                                  await handleUpdateTenant(tenant.id, { monthlyRent: editingValues.monthlyRent });
                                }
                              }}
                            />
                          </div>
                          {!tenant.endDate && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start h-auto min-h-10 border-orange-300 px-3 py-2.5 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                              onClick={() => setMarkLeftTenant(tenant)}
                            >
                              <LogOut className="h-4 w-4 mr-2 shrink-0" />
                              <span className="text-left leading-tight">
                                <span className="block text-xs font-bold">Move Out</span>
                              </span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          {/* Add New Tenant - Admin Only */}
          {canManageTenants && availableBeds > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Tenant ({availableBeds} beds available)
              </h3>

              <div className="p-4 border rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Tenant Name</Label>
                    <div className="relative flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleChooseFromContacts}
                        className="absolute left-1.5 h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors rounded-lg z-10"
                        title="Choose from Contacts"
                      >
                        <Contact className="h-4 w-4" />
                      </Button>
                      <Input
                        id="new-tenant-name"
                        value={newTenant.name}
                        onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                        placeholder="Enter name"
                        className="pl-11 bg-background/50 border-border hover:border-primary/50 focus-visible:ring-primary/20 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3.5 h-4 w-4 text-primary pointer-events-none z-10" />
                      <Input
                        value={newTenant.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setNewTenant({ ...newTenant, phone: value });
                        }}
                        placeholder="Enter phone"
                        maxLength={10}
                        className="pl-11 bg-background/50 border-border hover:border-primary/50 focus-visible:ring-primary/20 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="monthlyRent" className="text-sm font-medium text-muted-foreground">Monthly Rent (₹)</Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-primary font-medium pointer-events-none select-none text-base z-10">₹</span>
                      <Input
                        id="monthlyRent"
                        type="number"
                        value={newTenant.monthlyRent}
                        onChange={(e) => setNewTenant({ ...newTenant, monthlyRent: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="Enter amount"
                        className="pl-11 bg-background/50 border-border hover:border-primary/50 focus-visible:ring-primary/20 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-sm font-medium text-muted-foreground">Joining Date</Label>
                    <div className="relative flex items-center">
                      <CalendarIcon className="absolute left-3.5 h-4 w-4 text-primary pointer-events-none z-10" />
                      <Input
                        id="startDate"
                        type="date"
                        value={newTenant.startDate}
                        onChange={(e) => setNewTenant({ ...newTenant, startDate: e.target.value })}
                        required
                        className="pl-11 pr-10 bg-background/50 border-border hover:border-primary/50 focus-visible:ring-primary/20 h-11 rounded-xl text-sm appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <ChevronDown className="absolute right-3.5 h-4 w-4 text-primary pointer-events-none z-10" />
                    </div>
                  </div>
                </div>

                {/* Security Deposit Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex flex-col">
                    <Label htmlFor="securityDeposit" className="cursor-pointer">
                      Include Security Deposit
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Fixed amount: ₹{FIXED_SECURITY_DEPOSIT.toLocaleString()}
                    </span>
                  </div>
                  <Switch
                    id="securityDeposit"
                    checked={includeSecurityDeposit}
                    onCheckedChange={setIncludeSecurityDeposit}
                  />
                </div>

                <Button
                  onClick={handleAddTenant}
                  disabled={!newTenant.name || !newTenant.phone || addTenant.isPending}
                  className="w-full"
                >
                  {addTenant.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Tenant"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Room Notes - Admin Only */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>Room Notes</Label>
              <Textarea
                placeholder="Add any notes about this room..."
                value={room.notes || ""}
                onChange={(e) => updateRoom.mutate({ ...room, notes: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>
    </SheetContent>

      {/* Enter Payment Amount Sheet */}
      <Sheet open={!!partialPaymentTenant} onOpenChange={(open) => !open && setPartialPaymentTenant(null)}>
        <SheetContent 
          side="bottom" 
          className="h-full w-full px-0 pt-0 pb-0 rounded-none border-none overflow-hidden flex flex-col [&>button]:hidden animate-in duration-300"
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setPartialPaymentTenant(null)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col text-left">
                  <SheetTitle className="text-base text-foreground font-bold">Enter Payment Amount</SheetTitle>
                  <p className="text-xs text-muted-foreground">Enter the amount received and select date.</p>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Amount (₹)</Label>
                  {partialPaymentTenant && (() => {
                    const tenant = room.tenants.find((t) => t.id === partialPaymentTenant);
                    if (!tenant) return null;
                    return (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={partialAmount === tenant.monthlyRent ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => { setPartialAmount(tenant.monthlyRent); setOverpaymentReason(""); }}
                        >
                          Full Rent
                        </Button>
                        <Button
                          type="button"
                          variant={partialAmount !== tenant.monthlyRent && partialAmount > 0 ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => { setPartialAmount(0); setOverpaymentReason(""); }}
                        >
                          Custom / Luggage
                        </Button>
                      </div>
                    );
                  })()}
                </div>
                <Input
                  type="number"
                  value={partialAmount || ""}
                  onChange={(e) => {
                    setPartialAmount(Math.max(0, parseInt(e.target.value) || 0));
                    setOverpaymentReason("");
                    setOverpaymentError(false);
                  }}
                  className="mt-2"
                  placeholder="Enter custom amount"
                />
                {partialPaymentTenant &&
                  (() => {
                    const tenant = room.tenants.find((t) => t.id === partialPaymentTenant);
                    if (tenant) {
                      if (partialAmount < tenant.monthlyRent && partialAmount > 0) {
                        return (
                          <p className="text-sm text-partial mt-2">
                            This will be recorded as a partial payment. Remaining: ₹
                            {(tenant.monthlyRent - partialAmount).toLocaleString()}
                          </p>
                        );
                      } else if (partialAmount > tenant.monthlyRent) {
                        const extra = partialAmount - tenant.monthlyRent;
                        return (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              Extra payment: ₹{extra.toLocaleString()} above rent of ₹
                              {tenant.monthlyRent.toLocaleString()}
                            </p>
                            <div>
                              <Label className="text-sm">Reason for extra amount *</Label>
                              <Input
                                type="text"
                                value={overpaymentReason}
                                onChange={(e) => {
                                  setOverpaymentReason(e.target.value);
                                  setOverpaymentError(false);
                                }}
                                placeholder="e.g., Advance, Electricity, Next month"
                                className={cn("mt-1", overpaymentError && "border-destructive")}
                              />
                              {overpaymentError && (
                                <p className="text-sm text-destructive mt-1">Reason is required for extra payment</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
              </div>

              <div>
                <Label>Payment Mode</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={paymentMode === "upi" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setPaymentMode("upi")}
                  >
                    UPI/Online
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === "cash" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setPaymentMode("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>

              <div>
                <Label>Collected By</Label>
                <div className="flex gap-2 mt-2">
                  {collectors.map((collector) => (
                    <Button
                      key={collector.id}
                      type="button"
                      variant={collectedBy === collector.id ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setCollectedBy(collector.id)}
                    >
                      {collector.displayName}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Payment Date</Label>
                <Calendar
                  mode="single"
                  selected={partialPaymentDate}
                  onSelect={(date) => date && setPartialPaymentDate(date)}
                  className={cn("rounded-md border mt-2 pointer-events-auto w-full flex justify-center")}
                />
              </div>

              <div className="flex gap-2 pt-4 pb-2 border-t mt-4 shrink-0">
                <Button variant="outline" className="flex-1" onClick={() => setPartialPaymentTenant(null)}>Cancel</Button>
                <Button 
                  className="flex-1" 
                  onClick={() => partialPaymentTenant && handlePartialPaymentConfirm(partialPaymentTenant, partialPaymentDate)}
                  disabled={partialAmount <= 0}
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay Remaining Sheet */}
      <Sheet open={!!payRemainingTenant} onOpenChange={(open) => !open && setPayRemainingTenant(null)}>
        <SheetContent 
          side="bottom" 
          className="h-full w-full px-0 pt-0 pb-0 rounded-none border-none overflow-hidden flex flex-col [&>button]:hidden animate-in duration-300"
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setPayRemainingTenant(null)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col text-left">
                  <SheetTitle className="text-base text-foreground font-bold">Pay Remaining Amount</SheetTitle>
                  <p className="text-xs text-muted-foreground">Enter amount and select payment date.</p>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={payRemainingAmount || ""}
                  onChange={(e) => setPayRemainingAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-2"
                />
                {payRemainingTenant &&
                  (() => {
                    const tenant = room.tenants.find((t) => t.id === payRemainingTenant);
                    const payment = getSelectedMonthPayment(payRemainingTenant);
                    if (tenant && payment) {
                      const remaining = tenant.monthlyRent - (payment.amountPaid || 0);
                      const newTotal = (payment.amountPaid || 0) + payRemainingAmount;
                      if (payRemainingAmount < remaining) {
                        return (
                          <p className="text-sm text-partial mt-2">
                            Partial payment. Total paid: ₹{newTotal.toLocaleString()} • Still due: ₹
                            {(tenant.monthlyRent - newTotal).toLocaleString()}
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
              </div>

              <div>
                <Label>Payment Mode</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={remainingPaymentMode === "upi" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRemainingPaymentMode("upi")}
                  >
                    UPI/Online
                  </Button>
                  <Button
                    type="button"
                    variant={remainingPaymentMode === "cash" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRemainingPaymentMode("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>

              <div>
                <Label>Collected By</Label>
                <div className="flex gap-2 mt-2">
                  {collectors.map((collector) => (
                    <Button
                      key={collector.id}
                      type="button"
                      variant={remainingCollectedBy === collector.id ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setRemainingCollectedBy(collector.id)}
                    >
                      {collector.displayName}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Payment Date</Label>
                <Calendar
                  mode="single"
                  selected={payRemainingDate}
                  onSelect={(date) => date && setPayRemainingDate(date)}
                  className={cn("rounded-md border mt-2 pointer-events-auto w-full flex justify-center")}
                />
              </div>

              <div className="flex gap-2 pt-4 pb-2 border-t mt-4 shrink-0">
                <Button variant="outline" className="flex-1" onClick={() => setPayRemainingTenant(null)}>Cancel</Button>
                <Button 
                  className="flex-1" 
                  onClick={() => payRemainingTenant && confirmPayRemaining(payRemainingTenant)}
                  disabled={payRemainingAmount <= 0}
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Shift Room Dialog */}
      <ShiftRoomDialog
        open={!!shiftTenant}
        onOpenChange={(open) => !open && setShiftTenant(null)}
        tenant={shiftTenant}
        currentRoom={room}
      />

      {/* Custom Contact List Search & Selector Modal */}
      <Dialog open={customContactPickerOpen} onOpenChange={setCustomContactPickerOpen}>
        <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden rounded-2xl flex flex-col h-[70vh]">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Contact className="h-5 w-5 text-primary" />
              Select Contact
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search and select a tenant contact from your phone.
            </DialogDescription>
          </DialogHeader>

          {/* Search input bar */}
          <div className="p-3 border-b bg-muted/35">
            <Input
              type="text"
              placeholder="Search by name or number..."
              value={contactSearchQuery}
              onChange={(e) => setContactSearchQuery(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingContacts ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading device contacts...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No contacts found matching "{contactSearchQuery}"
              </div>
            ) : (
              filteredContacts.map((c, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    handleContactSelected(c.name, c.phones);
                    setCustomContactPickerOpen(false);
                    setContactSearchQuery("");
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-muted/80 transition-colors flex items-center justify-between border border-transparent hover:border-border"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-sm truncate text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phones.join(', ')}</p>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0">
                    Select
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Left Dialog with Settlement */}
      <MarkLeftDialog
        open={!!markLeftTenant}
        onOpenChange={(open) => !open && setMarkLeftTenant(null)}
        tenant={markLeftTenant}
        currentMonthPayment={markLeftTenant ? getSelectedMonthPayment(markLeftTenant.id) || null : null}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onConfirm={async (data) => {
          if (!markLeftTenant) return;

          // Keep the database value date-only so the active-tenant helpers compare
          // the selected calendar day consistently in every timezone.
          const normalizedEndDate = data.endDate.slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedEndDate)) return;

          await handleUpdateTenant(markLeftTenant.id, { endDate: normalizedEndDate });

          const existingPayment = getSelectedMonthPayment(markLeftTenant.id);
          const previousPaid = existingPayment?.amountPaid || 0;

          // If clearPending is true, mark payment as "Paid" to exclude from rent sheet
          if (data.clearPending) {
            await upsertPayment.mutateAsync({
              tenantId: markLeftTenant.id,
              month: selectedMonth,
              year: selectedYear,
              paymentStatus: "Paid",
              paymentDate: normalizedEndDate,
              amount: markLeftTenant.monthlyRent,
              amountPaid: markLeftTenant.monthlyRent, // Mark as fully paid
              paymentEntries: existingPayment?.paymentEntries || [],
              notes: data.settlementNotes,
            });
          } else if (data.discountGiven) {
            // Discount given - also mark as Paid
            await upsertPayment.mutateAsync({
              tenantId: markLeftTenant.id,
              month: selectedMonth,
              year: selectedYear,
              paymentStatus: "Paid",
              paymentDate: normalizedEndDate,
              amount: markLeftTenant.monthlyRent,
              amountPaid: markLeftTenant.monthlyRent, // Mark as fully paid (with discount)
              paymentEntries: existingPayment?.paymentEntries || [],
              notes: data.settlementNotes,
            });
          } else if (data.settlementAmount > 0) {
            // Normal settlement - record payment
            const totalPaid = previousPaid + data.settlementAmount;
            const isFullPayment = totalPaid >= markLeftTenant.monthlyRent;

            const newEntry = {
              amount: data.settlementAmount,
              date: data.endDate,
              type: isFullPayment ? ("full" as const) : ("partial" as const),
              mode: data.settlementMode,
            };

            const existingEntries = existingPayment?.paymentEntries || [];
            const updatedEntries = [...existingEntries, newEntry];

            await upsertPayment.mutateAsync({
              tenantId: markLeftTenant.id,
              month: selectedMonth,
              year: selectedYear,
              paymentStatus: isFullPayment ? "Paid" : "Partial",
              paymentDate: normalizedEndDate,
              amount: markLeftTenant.monthlyRent,
              amountPaid: totalPaid,
              paymentEntries: updatedEntries,
              notes: data.settlementNotes,
            });
          }



          setMarkLeftTenant(null);
        }}
      />

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



      {/* Multiple Phone Numbers Selection Dialog */}
      <Dialog open={numberSelectOpen} onOpenChange={setNumberSelectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Phone Number</DialogTitle>
            <DialogDescription>
              {selectedContactName} has multiple phone numbers. Please select one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-4">
            {numbersToSelect.map((phone, index) => (
              <button
                key={index}
                onClick={() => handleSelectPhoneNumber(phone)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors flex items-center justify-between text-sm"
              >
                <span>{phone}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({sanitizePhoneNumber(phone)})
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNumberSelectOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Dialog for new tenants */}
      <WelcomeDialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen} welcomeData={welcomeData} />
    </Sheet>
  );
};
