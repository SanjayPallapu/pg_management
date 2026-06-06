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
      return ((data || []) as ElectricityReadingRow[]).map((r) => ({
        id: r.id,
        room_id: r.room_id,
        month: r.month,
        year: r.year,
        units: r.units,
        unit_price: r.unit_price,
        source: normalizeSource(r.source),
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
    }: {
      roomId: string;
      units: number;
      unitPrice: number;
      source?: ElectricityReading["source"];
    }) => {
      const payload = {
        room_id: roomId,
        month,
        year,
        units,
        unit_price: unitPrice,
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
      toast({ title: "Electricity reading saved" });
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Unable to save electricity reading";
      toast({ title: "Failed", description: message, variant: "destructive" });
    },
  });

  return { readings, isLoading, byRoom, setReading };
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

export const calcAcTenantShares = (
  units: number,
  unitPrice: number,
  tenants: AcTenantLike[],
  year: number,
  month: number,
  sharingCount?: number,
): AcTenantShare[] => {
  const totalAmount = units * unitPrice;
  if (totalAmount <= 0) return [];
  const daysInMonth = new Date(year, month, 0).getDate();

  const tenantDays = tenants
    .map((tenant) => ({
      name: tenant.name,
      daysStayed: getAcStayedDaysInMonth(tenant.startDate, tenant.endDate, year, month),
    }))
    .filter((tenant) => tenant.daysStayed > 0);

  const totalDays = tenantDays.reduce((sum, tenant) => sum + tenant.daysStayed, 0);
  if (totalDays <= 0) return [];

  const capacity = sharingCount && sharingCount > 0 ? sharingCount : 0;
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
