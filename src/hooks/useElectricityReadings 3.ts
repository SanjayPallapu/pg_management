import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";

export interface ElectricityReading {
  id: string;
  room_id: string;
  month: number;
  year: number;
  units: number;
  unit_price: number;
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
      return (data || []).map((r: any) => ({
        id: r.id,
        room_id: r.room_id,
        month: r.month,
        year: r.year,
        units: r.units,
        unit_price: r.unit_price,
      })) as ElectricityReading[];
    },
    enabled: !!currentPG?.id,
  });

  const byRoom = new Map(readings.map((r) => [r.room_id, r]));

  const setReading = useMutation({
    mutationFn: async ({ roomId, units, unitPrice }: { roomId: string; units: number; unitPrice: number }) => {
      const existing = byRoom.get(roomId);
      if (existing) {
        const { error } = await supabase
          .from("room_electricity_readings")
          .update({ units, unit_price: unitPrice })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("room_electricity_readings")
          .insert({ room_id: roomId, month, year, units, unit_price: unitPrice });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["electricity_readings", currentPG?.id, month, year] });
      toast({ title: "Electricity reading saved" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
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
