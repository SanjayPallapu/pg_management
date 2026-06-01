import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";

export interface TenantSnooze {
  id: string;
  tenant_id: string;
  snoozed_until: string;
  reason: string | null;
}

const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const useTenantSnoozes = () => {
  const { currentPG } = usePG();
  const qc = useQueryClient();

  const { data: snoozes = [], isLoading } = useQuery({
    queryKey: ["tenant_snoozes", currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const today = todayStr();
      const { data, error } = await supabase
        .from("tenant_snoozes")
        .select("*, tenants!inner(id, room_id, rooms!inner(pg_id))")
        .eq("tenants.rooms.pg_id", currentPG.id)
        .gte("snoozed_until", today)
        .order("snoozed_until", { ascending: true });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        tenant_id: s.tenant_id,
        snoozed_until: s.snoozed_until,
        reason: s.reason,
      })) as TenantSnooze[];
    },
    enabled: !!currentPG?.id,
  });

  // Active = the latest unexpired snooze per tenant
  const activeByTenant = new Map<string, TenantSnooze>();
  for (const s of snoozes) {
    const existing = activeByTenant.get(s.tenant_id);
    if (!existing || s.snoozed_until > existing.snoozed_until) activeByTenant.set(s.tenant_id, s);
  }

  const snoozeIds = (tenantId: string) =>
    snoozes.filter((s) => s.tenant_id === tenantId).map((s) => s.id);

  const snoozeTenants = useMutation({
    mutationFn: async ({ tenantIds, until, reason }: { tenantIds: string[]; until: string; reason?: string }) => {
      // Remove existing active snoozes for these tenants first
      const toClear = tenantIds.flatMap(snoozeIds);
      if (toClear.length > 0) {
        await supabase.from("tenant_snoozes").delete().in("id", toClear);
      }
      const rows = tenantIds.map((tid) => ({ tenant_id: tid, snoozed_until: until, reason: reason || null }));
      const { error } = await supabase.from("tenant_snoozes").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tenant_snoozes", currentPG?.id] });
      toast({ title: `Snoozed ${vars.tenantIds.length} tenant(s)`, description: `Until ${vars.until}` });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const removeSnooze = useMutation({
    mutationFn: async (tenantId: string) => {
      const ids = snoozeIds(tenantId);
      if (ids.length === 0) return;
      const { error } = await supabase.from("tenant_snoozes").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant_snoozes", currentPG?.id] });
      toast({ title: "Snooze removed" });
    },
  });

  const isSnoozed = (tenantId: string) => activeByTenant.has(tenantId);
  const getSnoozedUntil = (tenantId: string) => activeByTenant.get(tenantId)?.snoozed_until;

  return { snoozes, isLoading, isSnoozed, getSnoozedUntil, activeByTenant, snoozeTenants, removeSnooze };
};
