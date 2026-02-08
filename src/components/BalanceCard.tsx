import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { useMonthContext } from "@/contexts/MonthContext";
import { usePG } from "@/contexts/PGContext";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useRooms } from "@/hooks/useRooms";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PaymentEntry } from "@/types";
import { isTenantActiveInMonth } from "@/utils/dateOnly";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY_PREFIX = "pg-expenses-toggles";
const DEFAULT_TOGGLES = {
  familyExpenses: true,
  currentBills: false,
  pgRent: true,
};
const getStorageKey = (month: number, year: number) => `${STORAGE_KEY_PREFIX}-${year}-${month}`;

export const BalanceCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, isLoading: paymentsLoading } = useTenantPayments();
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { currentPG } = usePG();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalance, setEditBalance] = useState("");

  // Previous month info
  const { prevMonth, prevYear } = useMemo(() => {
    let pM = selectedMonth - 1;
    let pY = selectedYear;
    if (pM === 0) {
      pM = 12;
      pY -= 1;
    }
    return { prevMonth: pM, prevYear: pY };
  }, [selectedMonth, selectedYear]);

  // Fetch manual balance for previous month from DB
  const { data: manualBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ["monthly-balance", currentPG?.id, prevMonth, prevYear],
    queryFn: async () => {
      if (!currentPG?.id) return null;
      const { data, error } = await supabase
        .from("monthly_balances")
        .select("balance")
        .eq("pg_id", currentPG.id)
        .eq("month", prevMonth)
        .eq("year", prevYear)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? null;
    },
    enabled: !!currentPG?.id,
    staleTime: 60 * 1000,
  });

  // Upsert manual balance
  const saveBalance = useMutation({
    mutationFn: async (balance: number) => {
      if (!currentPG?.id) throw new Error("No PG selected");
      const { error } = await supabase.from("monthly_balances").upsert(
        {
          pg_id: currentPG.id,
          month: prevMonth,
          year: prevYear,
          balance,
        } as any,
        { onConflict: "pg_id,month,year" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-balance"] });
      setIsEditingBalance(false);
      toast({ title: "Balance saved" });
    },
    onError: () => {
      toast({ title: "Failed to save balance", variant: "destructive" });
    },
  });

  // Listen for toggle changes
  const getMonthToggles = useCallback((month: number, year: number) => {
    try {
      const stored = localStorage.getItem(getStorageKey(month, year));
      if (stored) return JSON.parse(stored);
    } catch (e) {
      /* ignore */
    }
    return { ...DEFAULT_TOGGLES };
  }, []);

  const [toggles, setToggles] = useState(() => getMonthToggles(selectedMonth, selectedYear));

  // Re-read toggles when month changes or event fires
  useState(() => {
    const handler = () => setToggles(getMonthToggles(selectedMonth, selectedYear));
    window.addEventListener("expenses-toggles-changed", handler);
    return () => window.removeEventListener("expenses-toggles-changed", handler);
  });

  // Fetch PG expenses for current month
  const { data: currentExpenseData } = useQuery({
    queryKey: ["personal-expenses-balance", selectedMonth, selectedYear],
    queryFn: async () => {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`,
      );
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Day guest revenue for current month
  const { data: dayGuestRevenue = 0 } = useQuery({
    queryKey: ["day-guest-revenue-balance", selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return 0;
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const { data, error } = await supabase
        .from("day_guests")
        .select("amount_paid, rooms!inner(pg_id)")
        .eq("rooms.pg_id", currentPG.id)
        .gte("from_date", startOfMonth.toISOString().split("T")[0])
        .lte("from_date", endOfMonth.toISOString().split("T")[0]);
      if (error) return 0;
      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const PG_RENT = 150000;

  // Calculate total collected for current month
  const currentTotalCollected = useMemo(() => {
    let thisMonthRent = 0;
    rooms.forEach((room) => {
      room.tenants.forEach((tenant) => {
        if (tenant.isLocked) return;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return;
        const payment = payments.find(
          (p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear,
        );
        if (payment?.paymentEntries) {
          (payment.paymentEntries as PaymentEntry[]).forEach((entry: PaymentEntry) => {
            thisMonthRent += entry.amount;
          });
        }
      });
    });

    // Overdue collections
    let pM = selectedMonth - 1,
      pY = selectedYear;
    if (pM === 0) {
      pM = 12;
      pY -= 1;
    }
    let overdueCollected = 0;
    const allTenants = rooms.flatMap((room) => room.tenants);
    const prevActive = allTenants.filter((t) => isTenantActiveInMonth(t.startDate, t.endDate, pY, pM));
    prevActive.forEach((tenant) => {
      if (tenant.isLocked) return;
      const payment = payments.find((p) => p.tenantId === tenant.id && p.month === pM && p.year === pY);
      if (!payment) return;
      const entries = (payment.paymentEntries || []) as PaymentEntry[];
      entries.forEach((entry) => {
        const d = new Date(entry.date);
        if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
          overdueCollected += entry.amount;
        }
      });
    });

    // Security deposits
    let secDep = 0;
    rooms.forEach((room) => {
      room.tenants.forEach((tenant) => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        const dd = new Date(tenant.securityDepositDate);
        if (dd.getMonth() + 1 === selectedMonth && dd.getFullYear() === selectedYear) {
          secDep += tenant.securityDepositAmount;
        }
      });
    });

    // Extra amounts
    let extra = 0;
    const monthTenants = allTenants.filter((t) =>
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
    );
    monthTenants.forEach((tenant) => {
      if (tenant.isLocked) return;
      const payment = payments.find(
        (p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear,
      );
      if (!payment || !(payment as any).notes) return;
      const m = (payment as any).notes.match(/Extra:\s*₹?([\d,]+)/);
      if (m) extra += parseInt(m[1].replace(/,/g, "")) || 0;
    });

    return thisMonthRent + overdueCollected + dayGuestRevenue + secDep + extra;
  }, [rooms, payments, selectedMonth, selectedYear, dayGuestRevenue]);

  // Calculate expenses for current month
  const currentExpenses = useMemo(() => {
    if (!currentExpenseData) return 0;
    const groceries = currentExpenseData?.breakdown?.groceries?.total || 0;
    const utilityBills = currentExpenseData?.breakdown?.bills?.total || 0;
    const currentBill = currentExpenseData?.currentBill || currentExpenseData?.breakdown?.bills?.currentBills || 0;
    const familyExpenses = currentExpenseData?.familyExpenses || 0;
    const effectiveToggles = getMonthToggles(selectedMonth, selectedYear);
    let total = groceries + utilityBills;
    if (effectiveToggles.currentBills) total += currentBill;
    if (effectiveToggles.pgRent) total += PG_RENT;
    if (effectiveToggles.familyExpenses) total += familyExpenses;
    return total;
  }, [currentExpenseData, selectedMonth, selectedYear, getMonthToggles, toggles]);

  // Use manual balance (or 0 if not set)
  const previousMonthBalance = manualBalance ?? 0;

  // Grand total = previous month balance + current collected - current expenses
  const grandTotal = previousMonthBalance + currentTotalCollected - currentExpenses;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const isDataLoading = paymentsLoading || roomsLoading || balanceLoading;

  const handleStartEdit = () => {
    setEditBalance(String(manualBalance ?? 0));
    setIsEditingBalance(true);
  };

  const handleSaveBalance = () => {
    const val = parseInt(editBalance) || 0;
    saveBalance.mutate(val);
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Balance Overview</span>
            </div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
          </div>

          {isDataLoading ? (
            <>
              <CollapsibleContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CollapsibleContent>
              <div className={`border-t pt-2 ${isOpen ? "mt-2" : "mt-0"}`}>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-7 w-28" />
                </div>
              </div>
            </>
          ) : (
            <>
              <CollapsibleContent>
                <div className="space-y-2">
                  {/* Previous month balance - manual with edit */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{months[prevMonth - 1]} Balance</span>
                      {!isEditingBalance && (
                        <button
                          type="button"
                          onClick={handleStartEdit}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {isEditingBalance ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editBalance}
                          onChange={(e) => setEditBalance(e.target.value)}
                          className="h-6 w-24 text-xs text-right"
                          autoFocus
                        />
                        <button type="button" onClick={handleSaveBalance} className="text-paid hover:text-paid/80">
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingBalance(false)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`font-medium ${previousMonthBalance >= 0 ? "text-paid" : "text-destructive"}`}>
                        {previousMonthBalance >= 0 ? "+" : ""}₹{previousMonthBalance.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Current month collected */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{months[selectedMonth - 1]} Collected</span>
                    <span className="font-medium text-paid">+₹{currentTotalCollected.toLocaleString()}</span>
                  </div>

                  {/* Current month expenses */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{months[selectedMonth - 1]} Expenses</span>
                    <span className="font-medium text-destructive">-₹{currentExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </CollapsibleContent>

              {/* Grand Total (always visible) */}
              <div className={`border-t pt-2 ${isOpen ? "mt-2" : "mt-0"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Balance</span>
                  <span className={`text-xl font-bold ${grandTotal >= 0 ? "text-paid" : "text-destructive"}`}>
                    {grandTotal >= 0 ? "+" : ""}₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </Collapsible>
      </CardContent>
    </Card>
  );
};
