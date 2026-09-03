import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import type { Database } from "@/integrations/supabase/types";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";

type ElectricityReadingRow = Database["public"]["Tables"]["room_electricity_readings"]["Row"];
type ElectricityReadingSource = "manual" | "imported";

const normalizeSource = (source: string | null | undefined): ElectricityReadingSource =>
  source === "imported" ? "imported" : "manual";

const isMissingSourceColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === "PGRST204" && (maybeError.message ?? "").includes("source");
};

export interface ElectricityReading {
  id: string;
  room_id: string;
  month: number;
  year: number;
  units: number;
  unit_price: number;
  source: ElectricityReadingSource;
  start_reading?: number | null;
  end_reading?: number | null;
  split_type?: string;
  split_count?: number | null;
}

export const useElectricityReadings = (month: number, year: number) => {
  const { currentPG } = usePG();
  const qc = useQueryClient();

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["electricity_readings", currentPG?.id, month, year],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const { data, error } = await supabase
        .from("room_electricity_readings")
        .select("*, rooms!inner(pg_id)")
        .eq("rooms.pg_id", currentPG.id)
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        id: r.id,
        room_id: r.room_id,
        month: r.month,
        year: r.year,
        units: r.units,
        unit_price: r.unit_price,
        source: normalizeSource(r.source),
        start_reading: r.start_reading,
        end_reading: r.end_reading,
        split_type: r.split_type || 'active_tenants',
        split_count: r.split_count,
      })) as ElectricityReading[];
    },
    enabled: !!currentPG?.id,
  });

  const byRoom = new Map(readings.map((r) => [r.room_id, r]));

  const setReading = useMutation({
    mutationFn: async ({
      roomId,
      units,
      unitPrice,
      source = "manual",
      startReading = null,
      endReading = null,
      splitType = "active_tenants",
      splitCount = null,
    }: {
      roomId: string;
      units: number;
      unitPrice: number;
      source?: ElectricityReading["source"];
      startReading?: number | null;
      endReading?: number | null;
      splitType?: string;
      splitCount?: number | null;
    }) => {
      const payload = {
        room_id: roomId,
        month,
        year,
        units,
        unit_price: unitPrice,
        start_reading: startReading,
        end_reading: endReading,
        split_type: splitType,
        split_count: splitCount,
      };
      const { error } = await supabase
        .from("room_electricity_readings")
        .upsert(
          {
            ...payload,
            source,
          },
          { onConflict: "room_id,month,year" },
        );
      if (!error) return;

      if (!isMissingSourceColumnError(error)) throw error;

      const { error: fallbackError } = await supabase
        .from("room_electricity_readings")
        .upsert(payload, { onConflict: "room_id,month,year" });
      if (fallbackError) throw fallbackError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["electricity_readings", currentPG?.id, month, year] });
      qc.invalidateQueries({ queryKey: ["all_electricity_readings", currentPG?.id] });
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Unable to save electricity reading";
      toast({ title: "Failed", description: message, variant: "destructive" });
    },
  });

  return { readings, isLoading, byRoom, setReading };
};

export const useAllElectricityReadings = () => {
  const { currentPG } = usePG();

  return useQuery({
    queryKey: ["all_electricity_readings", currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const currentDate = new Date();
      const cutoffYear = currentDate.getFullYear() - 1;
      const { data, error } = await supabase
        .from("room_electricity_readings")
        .select("*, rooms!inner(pg_id)")
        .eq("rooms.pg_id", currentPG.id)
        .gte("year", cutoffYear);
      if (error) throw error;
      return (data || []) as ElectricityReadingRow[];
    },
    enabled: !!currentPG?.id,
  });
};


/**
 * Calculate per-tenant AC surcharge for a room.
 * units × unitPrice ÷ activeTenants  (rounded).
 */
export const calcAcShare = (units: number, unitPrice: number, activeTenants: number) => {
  if (!units || !unitPrice || activeTenants <= 0) return 0;
  return Math.round((units * unitPrice) / activeTenants);
};

export interface AcTenantLike {
  id?: string;
  name: string;
  startDate: string;
  endDate?: string;
}

export interface AcTenantShare {
  name: string;
  daysStayed: number;
  share: number;
}

const parseDateOnlyLocal = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getAcStayedDaysInMonth = (
  startDate: string,
  endDate: string | undefined,
  year: number,
  month: number,
) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const joinDate = parseDateOnlyLocal(startDate);
  const leaveDate = endDate ? parseDateOnlyLocal(endDate) : monthEnd;
  const effectiveStart = joinDate > monthStart ? joinDate : monthStart;
  const effectiveEnd = leaveDate < monthEnd ? leaveDate : monthEnd;

  if (effectiveStart > monthEnd || effectiveEnd < monthStart || effectiveEnd < effectiveStart) return 0;

  const startNoon = new Date(effectiveStart);
  startNoon.setHours(12, 0, 0, 0);
  const endNoon = new Date(effectiveEnd);
  endNoon.setHours(12, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endNoon.getTime() - startNoon.getTime()) / msPerDay) + 1;
};

export interface APCalculationResult {
  units: number;
  slabBreakdown: {
    slab: string;
    units: number;
    rate: number;
    amount: number;
  }[];
  energyCharges: number;
  fixedCharges: number;
  totalBill: number;
}

export const calculateAPCommercialBill = (units: number): APCalculationResult => {
  const breakdown: APCalculationResult["slabBreakdown"] = [];
  let remaining = units;
  let energyCharges = 0;

  let slabs = [5.40, 7.65, 9.05, 9.60, 10.15];
  let fixed = [30, 40, 45];
  
  if (typeof window !== "undefined") {
    const pgId = localStorage.getItem("currentPgId") || "default";
    try {
      const storedSlabs = localStorage.getItem(`electricity-slabs-${pgId}`);
      if (storedSlabs) {
        const parsed = JSON.parse(storedSlabs);
        if (parsed.length === 5) {
          slabs = parsed.map((s: any) => s.rate);
        }
      }
      const storedFixed = localStorage.getItem(`fixed-charges-${pgId}`);
      if (storedFixed) {
        const parsed = JSON.parse(storedFixed);
        if (parsed.length === 3) {
          fixed = parsed.map((fc: any) => fc.charge);
        }
      }
    } catch (e) {
      console.error("Failed to load custom pricing", e);
    }
  }

  // Slab 1: 0-50 units @ slabs[0]
  const s1Units = Math.min(remaining, 50);
  if (s1Units > 0) {
    const amt = s1Units * slabs[0];
    energyCharges += amt;
    breakdown.push({ slab: "0-50 units", units: s1Units, rate: slabs[0], amount: amt });
    remaining -= s1Units;
  } else {
    breakdown.push({ slab: "0-50 units", units: 0, rate: slabs[0], amount: 0 });
  }

  // Slab 2: 51-100 units @ slabs[1]
  const s2Units = Math.min(remaining, 50);
  if (s2Units > 0) {
    const amt = s2Units * slabs[1];
    energyCharges += amt;
    breakdown.push({ slab: "51-100 units", units: s2Units, rate: slabs[1], amount: amt });
    remaining -= s2Units;
  } else {
    breakdown.push({ slab: "51-100 units", units: 0, rate: slabs[1], amount: 0 });
  }

  // Slab 3: 101-300 units @ slabs[2]
  const s3Units = Math.min(remaining, 200);
  if (s3Units > 0) {
    const amt = s3Units * slabs[2];
    energyCharges += amt;
    breakdown.push({ slab: "101-300 units", units: s3Units, rate: slabs[2], amount: amt });
    remaining -= s3Units;
  } else {
    breakdown.push({ slab: "101-300 units", units: 0, rate: slabs[2], amount: 0 });
  }

  // Slab 4: 301-500 units @ slabs[3]
  const s4Units = Math.min(remaining, 200);
  if (s4Units > 0) {
    const amt = s4Units * slabs[3];
    energyCharges += amt;
    breakdown.push({ slab: "301-500 units", units: s4Units, rate: slabs[3], amount: amt });
    remaining -= s4Units;
  } else {
    breakdown.push({ slab: "301-500 units", units: 0, rate: slabs[3], amount: 0 });
  }

  // Slab 5: Above 500 units @ slabs[4]
  if (remaining > 0) {
    const amt = remaining * slabs[4];
    energyCharges += amt;
    breakdown.push({ slab: "Above 500 units", units: remaining, rate: slabs[4], amount: amt });
  } else {
    breakdown.push({ slab: "Above 500 units", units: 0, rate: slabs[4], amount: 0 });
  }

  let fixedCharges = 0;
  if (units > 0) {
    if (units <= 50) fixedCharges = fixed[0];
    else if (units <= 100) fixedCharges = fixed[1];
    else fixedCharges = fixed[2];
  }

  const totalBill = energyCharges + fixedCharges;

  return {
    units,
    slabBreakdown: breakdown,
    energyCharges,
    fixedCharges,
    totalBill,
  };
};

export const calcAcTenantShares = (
  units: number,
  unitPrice: number,
  tenants: AcTenantLike[],
  year: number,
  month: number,
  sharingCount?: number,
  customTotalAmount?: number,
  splitType: string = 'active_tenants',
  splitCount?: number,
  dayOverrides?: Record<string, number | { days: number; startDate?: string; endDate?: string }>,
): AcTenantShare[] => {
  const totalAmount = customTotalAmount !== undefined ? customTotalAmount : units * unitPrice;
  const daysInMonth = new Date(year, month, 0).getDate();

  const tenantDays = tenants
    .map((tenant) => {
      const override = dayOverrides?.[tenant.id || tenant.name];
      const overrideDays = typeof override === 'number' ? override : override?.days;
      return {
      name: tenant.name,
      // A manager can correct the occupancy days from the AC sheet. This is
      // useful when a person stayed only part of the billing period.
      daysStayed: Math.max(0, Math.min(
        daysInMonth,
        overrideDays ?? getAcStayedDaysInMonth(tenant.startDate, tenant.endDate, year, month),
      )),
      };
    })
    .filter((tenant) => tenant.daysStayed > 0);

  if (tenantDays.length <= 0) return [];

  // Keep the historical occupants visible even before a reading is entered.
  // This lets the manager set their stay dates for a past month, and avoids
  // incorrectly showing “No active tenants” for a ₹0 bill.
  if (totalAmount <= 0) {
    return tenantDays.map((tenant) => ({ ...tenant, share: 0 }));
  }

  // Date-based occupancy: calculate each calendar day separately, then split
  // that day's cost only among tenants staying on that day. For example, in a
  // 2-sharing room where A stays days 1-10 and B stays all month, days 1-10
  // are split between A/B while the remaining days belong entirely to B.
  if (splitType === 'daily_occupancy') {
    const shares = new Map(tenantDays.map((tenant) => [tenant.name, 0]));
    const dailyAmount = totalAmount / daysInMonth;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const present = tenantDays.filter((tenant) => {
        const original = tenants.find((item) => item.name === tenant.name);
        if (!original) return false;
        const override = dayOverrides?.[original.id || original.name];
        const overrideData = typeof override === 'number' ? { days: override } : override;
        const start = Math.max(1, new Date(`${overrideData?.startDate || original.startDate}T12:00:00`).getDate());
        const end = Math.min(daysInMonth, new Date(`${overrideData?.endDate || original.endDate || `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`}T12:00:00`).getDate());
        const overriddenDays = overrideData?.days;
        // When a day count was manually entered, it represents the first N
        // days of the selected month until an explicit date range is stored.
        const effectiveEnd = overriddenDays !== undefined ? Math.min(daysInMonth, start + overriddenDays - 1) : end;
        return day >= start && day <= effectiveEnd;
      });
      if (present.length > 0) {
        present.forEach((tenant) => shares.set(tenant.name, (shares.get(tenant.name) || 0) + dailyAmount / present.length));
      }
    }
    return tenantDays.map((tenant) => ({ ...tenant, share: Math.round(shares.get(tenant.name) || 0) }));
  }

  // Strategy 1: custom split count
  if (splitType === 'custom' && splitCount && splitCount > 0) {
    return tenantDays.map((tenant) => {
      // Split equally, but scaled by the stay duration fraction in the month
      const stayFraction = tenant.daysStayed / daysInMonth;
      return {
        ...tenant,
        share: Math.round((totalAmount / splitCount) * stayFraction),
      };
    });
  }

  // Strategy 2: room capacity split
  if (splitType === 'capacity') {
    const cap = sharingCount && sharingCount > 0 ? sharingCount : 1;
    return tenantDays.map((tenant) => {
      // Each tenant pays their share of the capacity scaled by stay duration
      const stayFraction = tenant.daysStayed / daysInMonth;
      return {
        ...tenant,
        share: Math.round((totalAmount / cap) * stayFraction),
      };
    });
  }

  // Strategy 3: active tenants (default/proportional)
  const capacity = sharingCount && sharingCount > 0 ? sharingCount : 0;
  const totalDays = tenantDays.reduce((sum, tenant) => sum + tenant.daysStayed, 0);

  if (capacity > 0 && tenantDays.length > capacity) {
    const slotAmount = totalAmount / capacity;
    const fullMonthTenants = tenantDays
      .filter((tenant) => tenant.daysStayed >= daysInMonth)
      .slice(0, capacity);
    const fullMonthNames = new Set(fullMonthTenants.map((tenant) => tenant.name));
    const changingTenants = tenantDays.filter((tenant) => !fullMonthNames.has(tenant.name));
    const changingDays = changingTenants.reduce((sum, tenant) => sum + tenant.daysStayed, 0);
    const changingSlots = Math.max(capacity - fullMonthTenants.length, 0);
    const changingAmount = totalAmount - slotAmount * fullMonthTenants.length;

    if (fullMonthTenants.length > 0 && changingTenants.length > 0 && changingSlots > 0 && changingDays > 0) {
      return [
        ...fullMonthTenants.map((tenant) => ({
          ...tenant,
          share: Math.round(slotAmount),
        })),
        ...changingTenants.map((tenant) => ({
          ...tenant,
          share: Math.round((changingAmount * tenant.daysStayed) / changingDays),
        })),
      ];
    }
  }

  if (totalDays <= 0) return [];
  return tenantDays.map((tenant) => ({
    ...tenant,
    share: Math.round((totalAmount * tenant.daysStayed) / totalDays),
  }));
};

export const calcCustomAcSplitShares = (totalAmount: number, splitCount: number): AcTenantShare[] => {
  if (totalAmount <= 0 || splitCount <= 0) return [];
  return [{
    name: `Each person (${splitCount} split)`,
    daysStayed: 0,
    share: Math.round(totalAmount / splitCount),
  }];
};
