import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import type { Database } from "@/integrations/supabase/types";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";

type ElectricityReadingRow = Database["public"]["Tables"]["room_electricity_readings"]["Row"];
type ElectricityReadingSource = "manual" | "imported";

const normalizeSource = (source: string | null | undefined): ElectricityReadingSource =>
  source === "imported" ? "imported" : "manual";

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
      const { error } = await supabase
        .from("room_electricity_readings")
        .upsert(
          {
            room_id: roomId,
            month,
            year,
            units,
            unit_price: unitPrice,
            source,
          },
          { onConflict: "room_id,month,year" },
        );
      if (error) throw error;
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
