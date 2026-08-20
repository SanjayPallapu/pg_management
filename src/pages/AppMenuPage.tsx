import {
  ArrowLeft,
  BedDouble,
  ChevronRight,
  CreditCard,
  FileClock,
  FileText,
  Gift,
  Home,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";
import { AuditHistorySheet } from "@/components/AuditHistorySheet";

type MenuItemProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
  accent?: "blue" | "emerald" | "amber" | "violet";
};

const accentClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const MenuItem = ({ icon, title, description, onClick, destructive = false, accent = "blue" }: MenuItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all active:scale-[0.99] ${destructive ? "border-destructive/20 bg-destructive/[0.04] text-destructive" : "border-border/70 bg-card hover:border-primary/25 hover:bg-muted/40"}`}
  >
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${destructive ? "bg-destructive/10" : accentClasses[accent]}`}>{icon}</span>
    <span className="min-w-0 flex-1">
      <strong className="block text-sm font-bold">{title}</strong>
      <small className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">{description}</small>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
  </button>
);

const QuickAction = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2 py-3 text-center text-white backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">{icon}</span>
    <span className="text-[10px] font-bold leading-tight">{label}</span>
  </button>
);

export default function AppMenuPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, role, signOut } = useAuth();
  const { currentPG } = usePG();
  const [auditOpen, setAuditOpen] = useState(false);
  const isDark = theme === "dark";

  const goToTab = (tab: string) => navigate(`/?tab=${tab}`, { replace: true });
  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/onboarding");
  };

  return (
    <main className="min-h-screen bg-muted/25 text-foreground">
      <div className="bg-gradient-to-br from-[#0e6ce7] via-[#1158c7] to-[#183d91] text-white">
        <header className="px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div><h1 className="text-lg font-black tracking-tight">PG HUB Menu</h1><p className="text-xs text-blue-100">Everything you need, in one place</p></div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-2xl px-4 pb-5 pt-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#1158c7] shadow-lg"><UserRound className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black">{user?.user_metadata?.full_name || "PG HUB Owner"}</h2>
              <p className="truncate text-[11px] text-blue-100">{currentPG?.name || user?.email || user?.phone || "Signed-in account"}</p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide">{role || "owner"}</span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <QuickAction icon={<Home className="h-4 w-4" />} label="Home" onClick={() => goToTab("dashboard")} />
            <QuickAction icon={<BedDouble className="h-4 w-4" />} label="Rooms" onClick={() => goToTab("rooms")} />
            <QuickAction icon={<WalletCards className="h-4 w-4" />} label="Payments" onClick={() => goToTab("reconciliation")} />
            <QuickAction icon={<Settings className="h-4 w-4" />} label="Settings" onClick={() => goToTab("settings")} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-5 px-3 py-5 pb-10">
        <section>
          <h2 className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">Management</h2>
          <div className="space-y-2">
            <MenuItem icon={<FileClock className="h-5 w-5" />} title="Audit History" description="Review tenant, room, and payment changes" onClick={() => setAuditOpen(true)} accent="violet" />
            <MenuItem icon={<Gift className="h-5 w-5" />} title="Refer & Earn" description="Invite an owner; both get 30 bonus days" onClick={() => navigate("/referrals")} accent="emerald" />
            <MenuItem icon={<CreditCard className="h-5 w-5" />} title="Plans & Billing" description="Subscription, cards, and secure checkout" onClick={() => navigate("/subscription")} accent="amber" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">App & Account</h2>
          <div className="space-y-2">
            <MenuItem icon={isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} title="Appearance" description={`Switch to ${isDark ? "light" : "dark"} mode`} onClick={() => setTheme(isDark ? "light" : "dark")} accent="blue" />
            <MenuItem icon={<FileText className="h-5 w-5" />} title="Privacy & Legal" description="Terms, privacy, and refund policies" onClick={() => navigate("/legal")} accent="violet" />
            <MenuItem icon={<LogOut className="h-5 w-5" />} title="Sign Out" description="Sign out of this account" onClick={handleSignOut} destructive />
          </div>
        </section>

        <p className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Your workspace activity is securely tracked.</p>
      </div>

      <AuditHistorySheet open={auditOpen} onOpenChange={setAuditOpen} />
    </main>
  );
}
