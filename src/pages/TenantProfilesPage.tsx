import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Search, UserRound, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ProfileStatusBadge, useOnboardingProfileMap } from "@/features/tenant-onboarding";
import { useRooms } from "@/hooks/useRooms";
import { isTenantActiveNow } from "@/utils/dateOnly";

const COMPLETE_STATUSES = new Set(["profile_completed", "pending_verification", "form_submitted", "verified"]);

export default function TenantProfilesPage() {
  const navigate = useNavigate();
  const { rooms, isLoading } = useRooms();
  const profiles = useOnboardingProfileMap();
  const [query, setQuery] = useState("");

  const tenants = useMemo(() => rooms.flatMap((room) => room.tenants
    .filter((tenant) => isTenantActiveNow(tenant.startDate, tenant.endDate))
    .map((tenant) => ({ ...tenant, roomNo: room.roomNo }))) , [rooms]);
  const filtered = tenants.filter((tenant) => `${tenant.name} ${tenant.phone} ${tenant.roomNo}`.toLowerCase().includes(query.toLowerCase()));
  const completed = filtered.filter((tenant) => COMPLETE_STATUSES.has(profiles.get(tenant.id)?.status || ""));
  const incomplete = filtered.filter((tenant) => !COMPLETE_STATUSES.has(profiles.get(tenant.id)?.status || ""));

  const list = (items: typeof tenants, empty: string) => items.length ? (
    <div className="divide-y divide-border/70">
      {items.map((tenant) => (
        <button key={tenant.id} type="button" onClick={() => navigate(`/tenant-profile/${tenant.id}`)} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">{tenant.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{tenant.name}</p><p className="text-[11px] text-muted-foreground">Room {tenant.roomNo} · {tenant.phone}</p></div>
          <ProfileStatusBadge status={profiles.get(tenant.id)?.status} showLabel={false} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  ) : <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>;

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} className="grid h-9 w-9 place-items-center rounded-xl bg-muted hover:bg-muted/80 transition-colors" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <div><h1 className="text-base sm:text-lg font-black">Tenant Profiles</h1><p className="text-[11px] sm:text-xs text-muted-foreground">Completed and incomplete onboarding</p></div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 pb-12">
        <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenant, phone or room" className="h-11 rounded-2xl pl-10" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><strong className="mt-2 block text-2xl font-black">{completed.length}</strong><span className="text-xs font-semibold text-muted-foreground">Completed Profiles</span></div>
          <div className="rounded-2xl bg-amber-500/10 p-4"><UsersRound className="h-5 w-5 text-amber-500" /><strong className="mt-2 block text-2xl font-black">{incomplete.length}</strong><span className="text-xs font-semibold text-muted-foreground">Incomplete Profiles</span></div>
        </div>
        {isLoading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading profiles…</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-2 border-b pb-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><h2 className="text-sm font-black">Completed profiles</h2></div>{list(completed, "No completed profiles")}</section>
            <section className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-2 border-b pb-3"><UserRound className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-black">Incomplete profiles</h2></div>{list(incomplete, "No incomplete profiles")}</section>
          </div>
        )}
      </div>
    </main>
  );
}
