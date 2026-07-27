import {
  ArrowLeft,
  BedDouble,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";

type MenuItemProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
};

const MenuItem = ({ icon, title, description, onClick, destructive = false }: MenuItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/55 ${destructive ? "text-destructive" : "text-foreground"}`}
  >
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${destructive ? "bg-destructive/10" : "bg-primary/10 text-primary"}`}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <strong className="block text-sm font-bold">{title}</strong>
      <small className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">{description}</small>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
  </button>
);

export default function AppMenuPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, role, signOut } = useAuth();
  const { currentPG } = usePG();
  const isDark = theme === "dark";

  const goToTab = (tab: string) => navigate(`/?tab=${tab}`, { replace: true });
  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/onboarding");
  };

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Menu</h1>
            <p className="text-xs text-muted-foreground">Workspace, billing, and account</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-4 pb-10">
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
          <div className="flex items-center gap-4 p-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <UserRound className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-black">{user?.user_metadata?.full_name || "PG HUB Owner"}</h2>
              <p className="truncate text-xs text-muted-foreground">{user?.email || user?.phone || "Signed-in account"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary">{role || "owner"}</span>
                {currentPG && <span className="max-w-48 truncate rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{currentPG.name}</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <h2 className="px-4 pb-2 pt-4 text-[11px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">Workspace</h2>
          <div className="divide-y divide-border/70">
            <MenuItem icon={<Home className="h-5 w-5" />} title="Home" description="Overview and quick actions" onClick={() => goToTab("dashboard")} />
            <MenuItem icon={<BedDouble className="h-5 w-5" />} title="Rooms & tenants" description="Occupancy, rooms, and residents" onClick={() => goToTab("rooms")} />
            <MenuItem icon={<WalletCards className="h-5 w-5" />} title="Rent & payments" description="Collections, receipts, and reconciliation" onClick={() => goToTab("reconciliation")} />
            <MenuItem icon={<Building2 className="h-5 w-5" />} title="Property settings" description="PG details, preferences, and management" onClick={() => goToTab("settings")} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <h2 className="px-4 pb-2 pt-4 text-[11px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">Account</h2>
          <div className="divide-y divide-border/70">
            <MenuItem icon={<CreditCard className="h-5 w-5" />} title="Plans & billing" description="Subscription, cards, and secure checkout" onClick={() => navigate("/subscription")} />
            <MenuItem icon={<Settings className="h-5 w-5" />} title="Settings & preferences" description="Notifications, security, support, and more" onClick={() => goToTab("settings")} />
            <MenuItem icon={<FileText className="h-5 w-5" />} title="Privacy & legal" description="Terms, privacy, and refund policies" onClick={() => navigate("/legal")} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/55">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-bold">Appearance</strong><small className="mt-0.5 block text-xs font-medium text-muted-foreground">Switch to {isDark ? "light" : "dark"} mode</small></span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted-foreground">{isDark ? "Dark" : "Light"}</span>
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-destructive/20 bg-background shadow-sm">
          <MenuItem icon={<LogOut className="h-5 w-5" />} title="Sign out" description="Return to the onboarding screen" onClick={handleSignOut} destructive />
        </section>

        <p className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> PG HUB keeps your workspace protected.</p>
      </div>
    </main>
  );
}
