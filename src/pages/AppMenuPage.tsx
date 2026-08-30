import {
  ArrowLeft,
  LayoutGrid,
  CreditCard,
  Users,
  Building2,
  Bed,
  Zap,
  ReceiptText,
  UserMinus,
  BarChart3,
  Bot,
  Sparkles,
  Settings,
  FileClock,
  Gift,
  FileText,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserRound,
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
  description?: string;
  onClick: () => void;
  destructive?: boolean;
};

const MenuItem = ({ icon, title, description, onClick, destructive = false }: MenuItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition-all active:bg-white/[0.12] ${
      destructive 
        ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" 
        : "text-gray-200 hover:text-white hover:bg-white/[0.08]"
    }`}
  >
    <span className="shrink-0 text-gray-400 group-hover:text-white">{icon}</span>
    <span className="min-w-0 flex-1">
      <strong className="block text-sm font-semibold">{title}</strong>
      {description && <small className="block truncate text-[11px] text-gray-400 mt-0.5">{description}</small>}
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-gray-300 transition-transform group-hover:translate-x-0.5" />
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

  const navItems = [
    { label: "Overview", icon: <LayoutGrid className="h-5 w-5" />, action: () => goToTab("dashboard") },
    { label: "Payments", icon: <CreditCard className="h-5 w-5" />, action: () => goToTab("reconciliation") },
    { label: "Tenants", icon: <Users className="h-5 w-5" />, action: () => goToTab("rooms") },
    { label: "Properties", icon: <Building2 className="h-5 w-5" />, action: () => goToTab("settings") },
    { label: "Rooms & Beds", icon: <Bed className="h-5 w-5" />, action: () => goToTab("rooms") },
    { label: "Utilities", icon: <Zap className="h-5 w-5" />, action: () => navigate("/?tab=rent-sheet&openAc=true", { replace: true }) },
    { label: "Receipts", icon: <ReceiptText className="h-5 w-5" />, action: () => goToTab("rent-sheet") },
    { label: "Move-outs", icon: <UserMinus className="h-5 w-5" />, action: () => navigate("/left-tenants") },
    { label: "Reports", icon: <BarChart3 className="h-5 w-5" />, action: () => goToTab("settings") },
    { label: "AI Assistant", icon: <Bot className="h-5 w-5" />, action: () => { window.dispatchEvent(new CustomEvent("trigger_voice_assistant")); navigate("/"); } },
    { label: "Subscription", icon: <Sparkles className="h-5 w-5" />, action: () => navigate("/subscription") },
    { label: "Settings", icon: <Settings className="h-5 w-5" />, action: () => goToTab("settings") },
    { label: "Audit History", icon: <FileClock className="h-5 w-5" />, action: () => setAuditOpen(true) },
  ];

  return (
    <main className="min-h-screen bg-[#121316] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#121316]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => navigate("/", { replace: true })} 
              aria-label="Back" 
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-white">PG Hub PayFlow</h1>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-gray-300 uppercase">
            {role || "owner"}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-3 py-4 space-y-4">
        {/* Profile Card */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <UserRound className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-white">{user?.user_metadata?.full_name || "PG HUB Owner"}</h2>
            <p className="truncate text-xs text-gray-400">{currentPG?.name || user?.email || "Account Active"}</p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 space-y-0.5">
          {navItems.map((item, i) => (
            <MenuItem 
              key={i} 
              icon={item.icon} 
              title={item.label} 
              onClick={item.action} 
            />
          ))}
        </div>

        {/* Preferences & More */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 space-y-0.5">
          <MenuItem 
            icon={<Gift className="h-5 w-5" />} 
            title="Refer & Earn" 
            description="Invite an owner and earn rewards"
            onClick={() => navigate("/referrals")} 
          />
          <MenuItem 
            icon={isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} 
            title="Theme" 
            description={`Currently ${isDark ? "dark" : "light"} mode`}
            onClick={() => setTheme(isDark ? "light" : "dark")} 
          />
          <MenuItem 
            icon={<FileText className="h-5 w-5" />} 
            title="Privacy & Legal" 
            description="Terms and policies"
            onClick={() => navigate("/legal")} 
          />
          <MenuItem 
            icon={<LogOut className="h-5 w-5" />} 
            title="Sign Out" 
            onClick={handleSignOut} 
            destructive 
          />
        </div>

        <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-gray-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure workspace activity tracking
        </p>
      </div>

      <AuditHistorySheet open={auditOpen} onOpenChange={setAuditOpen} />
    </main>
  );
}
