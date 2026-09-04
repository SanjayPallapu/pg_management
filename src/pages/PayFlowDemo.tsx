import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  BedDouble,
  BellRing,
  Bot,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Copy,
  Download,
  FileCheck2,
  Home,
  IndianRupee,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import rentCollection from "@/assets/pg-hub/editorial/rent-collection.jpg";
import roomOccupancy from "@/assets/pg-hub/editorial/room-occupancy.jpg";
import reminders from "@/assets/pg-hub/editorial/whatsapp-reminders.jpg";
import receipts from "@/assets/pg-hub/editorial/smart-receipts.jpg";
import analytics from "@/assets/pg-hub/editorial/analytics.jpg";
import securityDeposit from "@/assets/pg-hub/editorial/security-deposit.jpg";
import onboarding from "@/assets/pg-hub/editorial/tenant-onboarding.jpg";
import multiProperty from "@/assets/pg-hub/editorial/multi-property.jpg";
import bills from "@/assets/pg-hub/editorial/bills-electricity.jpg";
import vacancy from "@/assets/pg-hub/editorial/fill-vacancy.jpg";
import expenses from "@/assets/pg-hub/editorial/expenses-budget.jpg";
import growth from "@/assets/pg-hub/editorial/business-growth.jpg";

type View =
  | "home"
  | "payments"
  | "tenants"
  | "properties"
  | "rooms"
  | "utilities"
  | "receipts"
  | "moveout"
  | "reports"
  | "ai"
  | "pricing"
  | "more";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const statusTone = {
  Paid: "bg-emerald-100 text-emerald-800",
  Partial: "bg-orange-100 text-orange-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Overdue: "bg-red-100 text-red-800",
};

const allIllustrations = [
  { src: rentCollection, title: "Rent collection" },
  { src: roomOccupancy, title: "Room occupancy" },
  { src: reminders, title: "WhatsApp reminders" },
  { src: receipts, title: "Smart receipts" },
  { src: analytics, title: "Analytics" },
  { src: securityDeposit, title: "Security deposit" },
  { src: onboarding, title: "Tenant onboarding" },
  { src: multiProperty, title: "Multi-property" },
  { src: bills, title: "Utility bills" },
  { src: vacancy, title: "Fill vacancy" },
  { src: expenses, title: "Expenses" },
  { src: growth, title: "Business growth" },
];

const tenants = [
  { name: "Rahul Sharma", phone: "+91 98765 43210", room: "204", rent: 9500, paid: 5000, status: "Partial", due: "Due 3 days ago" },
  { name: "Priya Singh", phone: "+91 91234 77880", room: "307", rent: 10000, paid: 0, status: "Overdue", due: "Due yesterday" },
  { name: "Arjun Kumar", phone: "+91 99887 77665", room: "202", rent: 9000, paid: 4500, status: "Partial", due: "Due today" },
  { name: "Neha Reddy", phone: "+91 90909 22114", room: "105", rent: 8500, paid: 8500, status: "Paid", due: "Paid 05 Aug" },
  { name: "Vikram Patel", phone: "+91 95678 34567", room: "401", rent: 12000, paid: 0, status: "Pending", due: "Due tomorrow" },
  { name: "Aisha Khan", phone: "+91 90000 78612", room: "118", rent: 11000, paid: 11000, status: "Paid", due: "Paid 03 Aug" },
] as const;

const properties = [
  { name: "Urban Nest PG", city: "Bangalore", beds: 120, occupied: 108, expected: "₹10.8L", collection: 82 },
  { name: "Sunrise Co-Living", city: "Hyderabad", beds: 80, occupied: 74, expected: "₹7.4L", collection: 91 },
  { name: "Green View Hostel", city: "Pune", beds: 64, occupied: 58, expected: "₹5.9L", collection: 76 },
];

const sidebar: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Overview", icon: LayoutDashboard },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "tenants", label: "Tenants", icon: Users },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "rooms", label: "Rooms & Beds", icon: BedDouble },
  { id: "utilities", label: "Utilities", icon: Zap },
  { id: "receipts", label: "Receipts", icon: ReceiptText },
  { id: "moveout", label: "Move-outs", icon: FileCheck2 },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "ai", label: "AI Assistant", icon: Bot },
  { id: "pricing", label: "Subscription", icon: Sparkles },
  { id: "more", label: "Settings", icon: Settings },
];

const bottomNav: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "tenants", label: "Tenants", icon: Users },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "more", label: "More", icon: MoreHorizontal },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[28px] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]", className)}>{children}</div>;
}

function MoneyHero({ onViewCollections }: { onViewCollections: () => void }) {
  return (
    <motion.section layout className="overflow-hidden rounded-[32px] bg-[#111315] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/55">Expected this month</p>
          <motion.h2 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-5xl font-black leading-none tracking-normal md:text-7xl">₹4,82,500</motion.h2>
          <p className="mt-3 text-sm text-lime-200">You are 77.5% collected</p>
        </div>
        <span className="rounded-full bg-lime-300 px-3 py-2 text-xs font-black text-[#111315]">Live</span>
      </div>
      <div className="mt-6">
        <Progress value={77.5} className="h-4 bg-white/12 [&>div]:bg-lime-300" />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          ["Collected", "₹3.74L", "text-emerald-200"],
          ["Pending", "₹82.5K", "text-yellow-200"],
          ["Overdue", "₹26K", "text-red-200"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl bg-white/8 p-3">
            <p className="text-[11px] font-semibold text-white/45">{label}</p>
            <p className={`mt-1 text-lg font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <Button onClick={onViewCollections} className="mt-5 h-12 w-full rounded-2xl bg-lime-300 text-sm font-black text-[#111315] hover:bg-lime-200">
        View Collections <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.section>
  );
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[360px] sm:max-w-[400px] lg:max-w-[430px] rounded-[32px] sm:rounded-[42px] border-[6px] sm:border-[10px] border-[#15171a] bg-[#f4f5ed] shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:shadow-[0_36px_120px_rgba(0,0,0,0.28)] overflow-hidden">
      <div className="min-h-[640px] sm:min-h-[720px] lg:min-h-[760px] overflow-hidden bg-[#f4f5ed] relative flex flex-col">
        {children}
      </div>
    </div>
  );
}

function TopBar({ view, setView }: { view: View; setView: (view: View) => void }) {
  const activeLabel = sidebar.find((item) => item.id === view)?.label ?? "Overview";
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f4f5ed]/90 px-3.5 sm:px-4 py-2.5 sm:py-3 backdrop-blur shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <button className="flex h-9 sm:h-11 min-w-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-black shadow-sm">
          All Properties <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => setView("ai")} className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl sm:rounded-2xl bg-[#111315] text-lime-300">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl sm:rounded-2xl bg-white shadow-sm">
            <BellRing className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl sm:rounded-2xl bg-lime-300 font-black text-xs sm:text-sm">
            S
          </div>
        </div>
      </div>
      <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-bold text-slate-500">{activeLabel} · Last synced just now</p>
    </header>
  );
}

function HomeView({ setView, openPayment }: { setView: (view: View) => void; openPayment: () => void }) {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div>
        <p className="text-xs sm:text-sm font-bold text-slate-500">Good morning, Sanjay</p>
        <h1 className="mt-0.5 sm:mt-1 text-2xl sm:text-3xl font-black leading-tight tracking-normal text-[#111315]">
          Collect faster. Manage smarter.
        </h1>
      </div>
      <MoneyHero onViewCollections={() => setView("payments")} />
      <Card className="bg-gradient-to-br from-lime-200 via-white to-orange-100 p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <img src={analytics} alt="Analytics illustration" className="h-16 w-16 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl object-cover aspect-square shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-black uppercase text-slate-500">Your daily PayFlow summary</p>
            <p className="mt-1 sm:mt-2 text-base sm:text-lg font-black leading-snug">₹48,500 collected today from 12 tenants.</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">5 tenants still need follow-up. Room 204 and 307 are overdue.</p>
            <Button onClick={() => setView("ai")} size="sm" className="mt-2.5 sm:mt-3 rounded-xl bg-[#111315] text-xs font-bold text-lime-200 hover:bg-black">
              View full summary
            </Button>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {[
          [IndianRupee, "Collect Rent", "bg-lime-200", openPayment],
          [UserRound, "Add Tenant", "bg-orange-100", () => setView("tenants")],
          [MessageCircle, "Send Reminders", "bg-emerald-100", () => setView("payments")],
          [Plus, "Add Payment", "bg-violet-100", openPayment],
          [ReceiptText, "Receipt", "bg-yellow-100", () => setView("receipts")],
          [Banknote, "Expense", "bg-sky-100", () => setView("reports")],
        ].map(([Icon, label, tone, action]) => {
          const ActionIcon = Icon as typeof Home;
          return (
            <button key={label as string} onClick={action as () => void} className={`min-h-[80px] sm:min-h-[92px] rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-3 text-left shadow-sm transition hover:scale-[1.02] ${tone as string}`}>
              <ActionIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="mt-2 sm:mt-3 block text-[11px] sm:text-xs font-black leading-tight">{label as string}</span>
            </button>
          );
        })}
      </div>
      <section>
        <div className="mb-2.5 sm:mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black">Today's collection</h2>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">What happened and what needs attention</p>
          </div>
          <button onClick={() => setView("payments")} className="text-[11px] sm:text-xs font-black text-[#111315] hover:underline">View all</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            ["Paid", "124 tenants", "₹3,74,000", "bg-emerald-100 text-emerald-900"],
            ["Partial", "12 tenants", "₹42,500", "bg-orange-100 text-orange-900"],
            ["Pending", "18 tenants", "₹40,000", "bg-yellow-100 text-yellow-900"],
            ["Overdue", "7 tenants", "₹26,000", "bg-red-100 text-red-900"],
          ].map(([title, count, amount, tone]) => (
            <button key={title} onClick={() => setView("payments")} className={`rounded-[18px] sm:rounded-[24px] p-3 sm:p-4 text-left ${tone} transition hover:scale-[1.01]`}>
              <p className="text-xs sm:text-sm font-black">{title}</p>
              <p className="mt-2.5 sm:mt-4 text-xl sm:text-2xl font-black">{amount}</p>
              <p className="text-[10px] sm:text-xs font-bold opacity-70">{count}</p>
            </button>
          ))}
        </div>
      </section>
      <IllustrationRail />
    </div>
  );
}

function IllustrationRail() {
  return (
    <section className="overflow-hidden rounded-[22px] sm:rounded-[28px] bg-[#111315] p-3.5 sm:p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-black uppercase text-lime-300">Motion canvas</p>
          <h2 className="text-lg sm:text-xl font-black">All product illustrations</h2>
        </div>
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-lime-300" />
      </div>
      <div className="mt-3 sm:mt-4 flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
        {allIllustrations.map((item, index) => (
          <motion.figure
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, rotate: index % 2 ? 1 : -1 }}
            viewport={{ once: true }}
            className="w-32 sm:w-40 shrink-0 overflow-hidden rounded-[18px] sm:rounded-[24px] bg-white text-[#111315]"
          >
            <img src={item.src} alt={item.title} className="h-32 sm:h-40 w-full object-cover aspect-square" loading="lazy" />
            <figcaption className="p-2 sm:p-3 text-[11px] sm:text-xs font-black truncate">{item.title}</figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

function PaymentsView({ openPayment, openReminder, setView }: { openPayment: () => void; openReminder: () => void; setView: (view: View) => void }) {
  const [tab, setTab] = useState("All");
  const filtered = tab === "All" ? tenants : tenants.filter((tenant) => tenant.status === tab);
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Payments</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">18 tenants need attention</p>
        </div>
        <img src={rentCollection} alt="Rent collection" className="h-16 w-16 sm:h-20 sm:w-20 rounded-[18px] sm:rounded-[24px] object-cover shadow-md aspect-square" />
      </div>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        {["All", "Paid", "Partial", "Pending", "Overdue"].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-black shrink-0 transition ${
              tab === item ? "bg-[#111315] text-lime-300" : "bg-white text-slate-700"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 sm:py-3 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <span className="text-xs sm:text-sm font-semibold text-slate-400">Search tenant or room</span>
      </div>
      <div className="grid gap-2.5 sm:gap-3">
        {filtered.map((tenant) => {
          const remaining = tenant.rent - tenant.paid;
          const progress = Math.round((tenant.paid / tenant.rent) * 100);
          return (
            <Card key={tenant.name} className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black">{tenant.name}</h2>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Room {tenant.room} · Double Sharing</p>
                </div>
                <Badge className={`text-[10px] sm:text-xs ${statusTone[tenant.status as keyof typeof statusTone]}`}>{tenant.status}</Badge>
              </div>
              <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <div><p className="text-[10px] sm:text-xs font-bold text-slate-400">Rent</p><p className="font-black">{money(tenant.rent)}</p></div>
                <div><p className="text-[10px] sm:text-xs font-bold text-slate-400">Paid</p><p className="font-black">{money(tenant.paid)}</p></div>
                <div><p className="text-[10px] sm:text-xs font-bold text-slate-400">Remaining</p><p className="font-black">{money(remaining)}</p></div>
              </div>
              <div className="mt-3 sm:mt-4">
                <Progress value={progress} className="h-2.5 sm:h-3 bg-slate-100 [&>div]:bg-lime-400" />
                <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-bold text-slate-500">{progress}% collected · {tenant.due}</p>
              </div>
              <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
                <Button onClick={openPayment} size="sm" className="rounded-xl bg-[#111315] text-[11px] sm:text-xs text-lime-300 hover:bg-black">Record</Button>
                <Button onClick={openReminder} size="sm" variant="outline" className="rounded-xl text-[11px] sm:text-xs">Remind</Button>
                <Button onClick={() => setView("tenants")} size="sm" variant="outline" className="rounded-xl text-[11px] sm:text-xs">History</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TenantsView({ openPayment, openReminder }: { openPayment: () => void; openReminder: () => void }) {
  const rahul = tenants[0];
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center gap-3">
        <img src={onboarding} alt="Tenant onboarding" className="h-18 w-18 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[28px] object-cover aspect-square" />
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-500">Tenant management</p>
          <h1 className="text-2xl sm:text-3xl font-black">Rahul Sharma</h1>
          <Badge className="mt-1 sm:mt-2 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs">Active</Badge>
        </div>
      </div>
      <Card className="p-3.5 sm:p-4">
        <p className="text-[10px] sm:text-xs font-black uppercase text-slate-400">Room 204 · Double Sharing</p>
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          {[
            ["Phone", rahul.phone],
            ["Email", "rahul@demo.in"],
            ["Joining date", "12 Jun 2026"],
            ["Monthly rent", money(rahul.rent)],
            ["Security deposit", "₹10,000"],
            ["Payment status", "₹4,500 pending"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">{label}</p>
              <p className="mt-0.5 sm:mt-1 font-black text-xs sm:text-sm">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-3.5 sm:p-4">
        <h2 className="text-base sm:text-lg font-black">Payment overview</h2>
        <div className="mt-2.5 sm:mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-3"><p className="text-[10px] sm:text-xs text-slate-400">Expected</p><b>{money(9500)}</b></div>
          <div className="rounded-xl sm:rounded-2xl bg-emerald-50 p-2.5 sm:p-3"><p className="text-[10px] sm:text-xs text-slate-400">Paid</p><b>{money(5000)}</b></div>
          <div className="rounded-xl sm:rounded-2xl bg-orange-50 p-2.5 sm:p-3"><p className="text-[10px] sm:text-xs text-slate-400">Pending</p><b>{money(4500)}</b></div>
        </div>
        <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          {["August 2026 · ₹5,000 · Partial", "July 2026 · ₹9,500 · Paid", "June 2026 · ₹9,500 · Paid"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-slate-50 px-3 py-2 sm:py-3 font-bold">
              <span>{item}</span>
              <CircleCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={openPayment} className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-[#111315] text-xs sm:text-sm font-bold text-lime-300 hover:bg-black">Record Payment</Button>
        <Button onClick={openReminder} className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-lime-300 text-xs sm:text-sm font-bold text-[#111315] hover:bg-lime-200">Send Reminder</Button>
      </div>
    </div>
  );
}

function PropertiesView({ setView }: { setView: (view: View) => void }) {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Properties</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">All Properties consolidated</p>
        </div>
        <img src={multiProperty} alt="Multi property" className="h-16 w-16 sm:h-20 sm:w-20 rounded-[18px] sm:rounded-[24px] object-cover aspect-square shadow-md" />
      </div>
      {properties.map((property) => (
        <Card key={property.name} className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black">{property.name}</h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">{property.city}</p>
            </div>
            <Badge className="bg-lime-200 text-[#111315] text-[10px] sm:text-xs">{property.collection}% collected</Badge>
          </div>
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <div className="rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-3"><b>{property.beds}</b><p className="text-[10px] sm:text-xs text-slate-400">Beds</p></div>
            <div className="rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-3"><b>{property.occupied}</b><p className="text-[10px] sm:text-xs text-slate-400">Occupied</p></div>
            <div className="rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-3"><b>{property.expected}</b><p className="text-[10px] sm:text-xs text-slate-400">Expected</p></div>
          </div>
          <Button onClick={() => setView("rooms")} className="mt-3 sm:mt-4 h-10 sm:h-11 w-full rounded-xl sm:rounded-2xl bg-[#111315] text-xs sm:text-sm font-bold text-lime-300 hover:bg-black">Manage Property</Button>
        </Card>
      ))}
    </div>
  );
}

function RoomsView() {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center gap-3">
        <img src={roomOccupancy} alt="Rooms and beds" className="h-18 w-18 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[28px] object-cover aspect-square shadow-md" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Rooms & Beds</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">Urban Nest PG · Floor 2</p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:gap-3">
        {[
          ["201", "3 / 3 occupied", "₹27,000/month", "Full", 100],
          ["202", "2 / 3 occupied", "₹18,000/month", "1 bed available", 66],
          ["203", "1 / 4 occupied", "₹9,500/month", "3 beds available", 25],
        ].map(([room, occ, rent, status, value]) => (
          <Card key={room as string} className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl sm:text-2xl font-black">{room}</h2><p className="text-xs sm:text-sm font-bold text-slate-500">{occ}</p></div>
              <Badge className={(value as number) === 100 ? "bg-[#111315] text-lime-300 text-[10px] sm:text-xs" : "bg-lime-200 text-[#111315] text-[10px] sm:text-xs"}>{status}</Badge>
            </div>
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-black">{rent}</p>
            <div className="mt-2.5 sm:mt-3 flex gap-1.5 sm:gap-2">
              {Array.from({ length: room === "203" ? 4 : 3 }).map((_, i) => (
                <span key={i} className={`h-8 sm:h-10 flex-1 rounded-xl sm:rounded-2xl ${(i + 1) * 25 <= (value as number) || (room !== "203" && i < Math.round((value as number) / 34)) ? "bg-[#111315]" : "bg-slate-100 border border-dashed border-slate-300"}`} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UtilitiesView() {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center gap-3">
        <img src={bills} alt="Utility bills" className="h-18 w-18 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[28px] object-cover aspect-square shadow-md" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Utilities</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">Electricity · AC · Other</p>
        </div>
      </div>
      <Card className="bg-gradient-to-br from-yellow-100 to-white p-3.5 sm:p-4">
        <p className="text-[10px] sm:text-xs font-black uppercase text-slate-500">August Electricity</p>
        <h2 className="mt-1 sm:mt-2 text-3xl sm:text-4xl font-black">₹24,000</h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-600">48 eligible tenants · Equal split preview</p>
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2">
          {["Equal split", "Per room", "Per person", "Meter reading"].map((method, i) => (
            <button key={method} className={`rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-black ${i === 0 ? "bg-[#111315] text-lime-300" : "bg-white"}`}>{method}</button>
          ))}
        </div>
      </Card>
      <Card className="p-3.5 sm:p-4">
        <h2 className="text-base sm:text-lg font-black">Charge preview</h2>
        {[
          ["Rahul Sharma", "₹500"],
          ["Priya Singh", "₹500"],
          ["Arjun Kumar", "₹750"],
          ["Neha Reddy", "₹500"],
        ].map(([name, amount]) => (
          <div key={name} className="mt-2 sm:mt-3 flex items-center justify-between rounded-xl sm:rounded-2xl bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm font-black"><span>{name}</span><span>{amount}</span></div>
        ))}
        <div className="mt-3.5 sm:mt-4 grid grid-cols-2 gap-2"><Button className="rounded-xl sm:rounded-2xl bg-[#111315] text-xs sm:text-sm font-bold text-lime-300 hover:bg-black">Generate Charges</Button><Button variant="outline" className="rounded-xl sm:rounded-2xl text-xs sm:text-sm">Send to Tenants</Button></div>
      </Card>
    </div>
  );
}

function ReceiptView() {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center gap-3">
        <img src={receipts} alt="Smart receipts" className="h-18 w-18 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[28px] object-cover aspect-square shadow-md" />
        <div><h1 className="text-2xl sm:text-3xl font-black">Receipts</h1><p className="text-xs sm:text-sm font-semibold text-slate-500">Professional receipt sharing</p></div>
      </div>
      <Card className="border border-dashed border-slate-200 p-3.5 sm:p-4">
        <div className="flex items-start justify-between"><div><p className="text-xs sm:text-sm font-black">PG Hub</p><h2 className="text-xl sm:text-2xl font-black">Payment Receipt</h2></div><Badge className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs">Generated</Badge></div>
        <div className="mt-4 sm:mt-5 grid gap-2 sm:gap-3 text-xs sm:text-sm">
          {[
            ["Tenant", "Rahul Sharma"],
            ["Room", "204"],
            ["Billing period", "August 2026"],
            ["Amount", "₹9,500"],
            ["Payment method", "UPI"],
            ["Date", "05 Aug 2026"],
            ["Receipt ID", "PGP-2026-000184"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1.5 sm:pb-2"><span className="font-semibold text-slate-500">{label}</span><b>{value}</b></div>
          ))}
        </div>
        <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-1.5 sm:gap-2"><Button size="sm" className="rounded-xl text-[10px] sm:text-xs"><Download className="h-3.5 w-3.5" /> Download</Button><Button size="sm" variant="outline" className="rounded-xl text-[10px] sm:text-xs"><Send className="h-3.5 w-3.5" /> Share</Button><Button size="sm" variant="outline" className="rounded-xl text-[10px] sm:text-xs"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button></div>
      </Card>
    </div>
  );
}

function MoveOutView() {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center gap-3">
        <img src={securityDeposit} alt="Security deposit" className="h-18 w-18 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[28px] object-cover aspect-square shadow-md" />
        <div><h1 className="text-2xl sm:text-3xl font-black">Move-out</h1><p className="text-xs sm:text-sm font-semibold text-slate-500">Rahul Sharma · Room 204</p></div>
      </div>
      <Card className="p-3.5 sm:p-4">
        <p className="text-[10px] sm:text-xs font-black uppercase text-slate-500">Move-out settlement</p>
        {[
          ["Monthly rent", 9500],
          ["Prorated rent", 7750],
          ["Pending previous balance", 2000],
          ["Utility charges", 450],
          ["Discount", -500],
          ["Security deposit", -10000],
        ].map(([label, amount]) => (
          <div key={label as string} className="mt-2 sm:mt-3 flex items-center justify-between rounded-xl sm:rounded-2xl bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm font-bold"><span>{label as string}</span><span>{money(amount as number)}</span></div>
        ))}
        <div className="mt-4 sm:mt-5 rounded-[20px] sm:rounded-[24px] bg-[#111315] p-3.5 sm:p-4 text-white">
          <p className="text-xs sm:text-sm font-semibold text-white/55">Refund to tenant</p>
          <p className="mt-1 text-3xl sm:text-4xl font-black text-lime-300">₹300</p>
          <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-white/50">Total deductions: ₹9,700</p>
        </div>
        <div className="mt-3.5 sm:mt-4 grid grid-cols-2 gap-2"><Button className="rounded-xl sm:rounded-2xl bg-lime-300 text-xs sm:text-sm font-bold text-[#111315] hover:bg-lime-200">Save Settlement</Button><Button variant="outline" className="rounded-xl sm:rounded-2xl text-xs sm:text-sm">Generate Receipt</Button></div>
      </Card>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <div className="flex items-center gap-3">
        <img src={analytics} alt="Reports analytics" className="h-18 w-18 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[28px] object-cover aspect-square shadow-md" />
        <div><h1 className="text-2xl sm:text-3xl font-black">Reports</h1><p className="text-xs sm:text-sm font-semibold text-slate-500">Revenue, occupancy and methods</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {[
          ["Monthly revenue", "₹4.82L"],
          ["Pending rent", "₹82.5K"],
          ["Overdue rent", "₹26K"],
          ["Occupancy", "90%"],
        ].map(([label, value]) => <Card key={label} className="p-3 sm:p-4"><p className="text-[10px] sm:text-xs font-bold text-slate-400">{label}</p><p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-black">{value}</p></Card>)}
      </div>
      <Card className="bg-[#111315] text-white p-3.5 sm:p-4">
        <div className="flex items-center justify-between"><h2 className="text-lg sm:text-xl font-black">Collection trend</h2><PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-lime-300" /></div>
        <div className="mt-4 sm:mt-6 flex h-32 sm:h-40 items-end gap-2 sm:gap-3">
          {[52, 70, 62, 84, 78, 92, 76].map((height, index) => <motion.span key={index} initial={{ height: 0 }} animate={{ height: `${height}%` }} className="flex-1 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-t from-lime-400 to-yellow-200" />)}
        </div>
      </Card>
    </div>
  );
}

function AiView({ openReminder }: { openReminder: () => void }) {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <Card className="overflow-hidden bg-[#111315] text-white p-3.5 sm:p-4">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-lime-300 text-[#111315]"><Bot className="h-5 w-5 sm:h-6 sm:w-6" /></div><div><h1 className="text-2xl sm:text-3xl font-black">PayFlow AI</h1><p className="text-xs sm:text-sm text-white/55">Ask anything about your collections.</p></div></div>
        <div className="mt-3.5 sm:mt-5 grid gap-1.5 sm:gap-2">
          {["Who owes me rent?", "How much did I collect this week?", "Draft a reminder for Rahul."].map((prompt) => <button key={prompt} className="rounded-xl sm:rounded-2xl bg-white/8 px-3 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-bold text-white/80 transition hover:bg-white/12">{prompt}</button>)}
        </div>
      </Card>
      <Card className="p-3.5 sm:p-4">
        <p className="text-[10px] sm:text-xs font-black uppercase text-violet-600">AI response</p>
        <h2 className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black">You have ₹26,000 overdue across 7 tenants.</h2>
        <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
          {["Rahul Sharma — ₹9,500", "Priya Singh — ₹6,000", "Arjun Kumar — ₹4,500"].map((row) => <div key={row} className="rounded-xl sm:rounded-2xl bg-slate-50 px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-black">{row}</div>)}
        </div>
        <Button onClick={openReminder} className="mt-3.5 sm:mt-4 h-11 sm:h-12 w-full rounded-xl sm:rounded-2xl bg-lime-300 text-xs sm:text-sm font-bold text-[#111315] hover:bg-lime-200">Send all reminders</Button>
      </Card>
      <IllustrationRail />
    </div>
  );
}

function PricingMoreView() {
  return (
    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-4 pb-24 sm:pb-28">
      <h1 className="text-2xl sm:text-3xl font-black">Run your PG smarter.</h1>
      {[
        ["Basic", "₹499/month", "For small PG operators.", ["Tenant management", "Room management", "Rent tracking", "Basic reports"]],
        ["Plus", "₹799/month", "Most popular.", ["Everything in Basic", "WhatsApp reminders", "Digital receipts", "Utility billing", "Advanced analytics"]],
        ["Pro Max", "₹999/month", "For growing operators.", ["Everything in Plus", "Multi-property", "AI assistant", "Staff roles", "Priority support"]],
      ].map(([plan, price, desc, features], index) => (
        <Card key={plan as string} className={`p-3.5 sm:p-4 transition-all ${index === 1 ? "bg-[#111315] text-white shadow-xl ring-2 ring-lime-300/40" : "bg-white text-slate-900"}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black">{plan as string}</h2>
              <p className={`text-xs sm:text-sm font-semibold ${index === 1 ? "text-white/70" : "text-slate-500"}`}>{desc as string}</p>
            </div>
            {index === 1 && <Badge className="bg-lime-300 text-[#111315] text-[10px] sm:text-xs font-black">Most Popular</Badge>}
          </div>
          <p className="mt-3 sm:mt-4 text-2xl sm:text-4xl font-black">{price as string}</p>
          <ul className={`mt-3 sm:mt-4 grid gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold ${index === 1 ? "text-white/90" : "text-slate-700"}`}>
            {(features as string[]).map((feature) => (
              <li key={feature} className="flex items-center gap-1.5 sm:gap-2">
                <Check className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${index === 1 ? "text-lime-300" : "text-emerald-600"}`} />
                {feature}
              </li>
            ))}
          </ul>
          <Button className={`mt-4 sm:mt-5 h-11 sm:h-12 w-full rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black ${index === 1 ? "bg-lime-300 text-[#111315] hover:bg-lime-200 shadow-md" : "bg-[#111315] text-lime-300 hover:bg-black"}`}>Start {plan as string}</Button>
        </Card>
      ))}
      <Card className="bg-gradient-to-br from-lime-200 to-orange-100 p-3.5 sm:p-4">
        <h2 className="text-xl sm:text-2xl font-black">Refer PG owners. Earn rewards.</h2>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-semibold text-slate-600">Your referral code: <b>PGHUB50</b></p>
        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 text-xs sm:text-sm"><div><b>3</b><p>referrals</p></div><div><b>₹600</b><p>earned</p></div><div><b>₹200</b><p>pending</p></div></div>
        <Button className="mt-3.5 sm:mt-4 rounded-xl sm:rounded-2xl bg-[#111315] text-xs sm:text-sm font-bold text-lime-300 hover:bg-black"><MessageCircle className="h-4 w-4" /> Share Referral</Button>
      </Card>
    </div>
  );
}

function PaymentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [success, setSuccess] = useState(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ y: 420 }} animate={{ y: 0 }} exit={{ y: 420 }} className="w-full max-w-[430px] rounded-t-[28px] sm:rounded-t-[32px] bg-white p-4 sm:p-5 shadow-2xl md:rounded-[32px]">
            {!success ? (
              <>
                <div className="flex items-center justify-between"><h2 className="text-xl sm:text-2xl font-black">Record payment</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">Rahul Sharma · August 2026</p>
                <div className="mt-4 sm:mt-5 grid gap-2.5 sm:gap-3">
                  <label className="grid gap-1 text-xs sm:text-sm font-black">Amount<input defaultValue="4500" className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 px-3.5 sm:px-4 font-bold outline-none text-sm sm:text-base" /></label>
                  <div className="grid grid-cols-3 gap-2">{["UPI", "Cash", "Bank"].map((method, i) => <button key={method} className={`rounded-xl sm:rounded-2xl px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-black ${i === 0 ? "bg-[#111315] text-lime-300" : "bg-slate-50"}`}>{method}</button>)}</div>
                  <label className="grid gap-1 text-xs sm:text-sm font-black">Payment date<input type="date" defaultValue="2026-08-23" className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 px-3.5 sm:px-4 font-bold outline-none text-xs sm:text-sm" /></label>
                  <label className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-slate-50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-black">Generate receipt<span className="h-5 w-10 sm:h-6 sm:w-11 rounded-full bg-lime-300 p-0.5 sm:p-1 flex items-center justify-end"><i className="block h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-[#111315]" /></span></label>
                </div>
                <Button onClick={() => setSuccess(true)} className="mt-4 sm:mt-5 h-12 sm:h-13 w-full rounded-xl sm:rounded-2xl bg-lime-300 py-3 sm:py-4 text-sm sm:text-base font-black text-[#111315] hover:bg-lime-200">Record ₹4,500</Button>
              </>
            ) : (
              <div className="py-6 sm:py-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-lime-300 text-[#111315]"><Check className="h-8 w-8 sm:h-10 sm:w-10" /></motion.div>
                <h2 className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-black">Payment recorded</h2>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold text-slate-500">₹4,500 received from Rahul Sharma. Receipt ready to share.</p>
                <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-2"><Button className="rounded-xl sm:rounded-2xl bg-[#111315] text-xs sm:text-sm font-bold text-lime-300 hover:bg-black">Share Receipt</Button><Button onClick={onClose} variant="outline" className="rounded-xl sm:rounded-2xl text-xs sm:text-sm">Done</Button></div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReminderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const message = "Hi Rahul, your August PG rent of ₹4,500 is pending. Please complete the payment at your earliest convenience. Thank you — PG Hub.";
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ y: 420 }} animate={{ y: 0 }} exit={{ y: 420 }} className="w-full max-w-[430px] rounded-t-[28px] sm:rounded-t-[32px] bg-white p-4 sm:p-5 shadow-2xl md:rounded-[32px]">
            <div className="flex items-center justify-between"><h2 className="text-xl sm:text-2xl font-black">Rent reminder</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold text-slate-500">Rahul Sharma · ₹4,500 pending · Due 3 days ago</p>
            <div className="mt-4 sm:mt-5 rounded-[20px] sm:rounded-[24px] bg-emerald-50 p-3.5 sm:p-4 text-xs sm:text-sm font-semibold leading-relaxed text-emerald-950">{message}</div>
            <div className="mt-4 sm:mt-5 grid gap-2"><Button className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-[#25D366] text-xs sm:text-sm font-bold text-white hover:bg-[#1fb258]"><MessageCircle className="h-4 w-4" /> Send via WhatsApp</Button><Button variant="outline" className="h-11 sm:h-12 rounded-xl sm:rounded-2xl text-xs sm:text-sm"><Copy className="h-4 w-4" /> Copy message</Button><Button variant="outline" className="h-11 sm:h-12 rounded-xl sm:rounded-2xl text-xs sm:text-sm">Edit message</Button></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PayFlowDemo() {
  const [view, setView] = useState<View>("home");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const activeView = useMemo(() => {
    if (view === "home") return <HomeView setView={setView} openPayment={() => setPaymentOpen(true)} />;
    if (view === "payments") return <PaymentsView setView={setView} openPayment={() => setPaymentOpen(true)} openReminder={() => setReminderOpen(true)} />;
    if (view === "tenants") return <TenantsView openPayment={() => setPaymentOpen(true)} openReminder={() => setReminderOpen(true)} />;
    if (view === "properties") return <PropertiesView setView={setView} />;
    if (view === "rooms") return <RoomsView />;
    if (view === "utilities") return <UtilitiesView />;
    if (view === "receipts") return <ReceiptView />;
    if (view === "moveout") return <MoveOutView />;
    if (view === "reports") return <ReportsView />;
    if (view === "ai") return <AiView openReminder={() => setReminderOpen(true)} />;
    return <PricingMoreView />;
  }, [view]);

  return (
    <main className="min-h-screen bg-[#e9f95c] text-[#111315]">
      <div className="mx-auto grid min-h-screen max-w-7xl 2xl:max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
        <aside className="hidden bg-[#111315] p-5 text-white lg:block">
          <div className="mb-8 rounded-[24px] bg-lime-300 p-4 text-[#111315]">
            <p className="text-[10px] font-black uppercase">PG Hub</p>
            <h1 className="mt-1 text-xl font-black leading-tight">Collect faster. Manage smarter.</h1>
          </div>
          <nav className="grid gap-1">
            {sidebar.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-black transition ${
                    view === item.id ? "bg-white text-[#111315]" : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f4f5ed_36%,#e9f95c_120%)] flex flex-col justify-between">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-[#f4f5ed]/85 px-4 py-3 backdrop-blur lg:hidden">
            <button onClick={() => setNavOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#111315] text-lime-300">
              <Menu className="h-5 w-5" />
            </button>
            <b className="text-sm font-black">PG Hub</b>
            <button onClick={() => setView("ai")} className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300">
              <Bot className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-6 sm:gap-8 p-4 sm:p-6 lg:p-8 md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_430px] items-center justify-center">
            <div className="hidden pt-2 md:block">
              <p className="text-xs sm:text-sm font-black uppercase text-slate-500">Android-first product demo</p>
              <h2 className="mt-2 sm:mt-3 text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-normal">
                A premium rent collection cockpit for Indian PG owners.
              </h2>
              <p className="mt-3 sm:mt-5 text-sm sm:text-base lg:text-lg font-semibold leading-relaxed text-slate-600">
                PayFlow turns rent, tenants, rooms, receipts, utilities, move-outs and AI follow-ups into a simple 3-tap mobile flow.
              </p>
              <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2.5 sm:gap-3">
                {["₹4.82L expected", "77.5% collected", "7 overdue"].map((metric) => (
                  <div key={metric} className="rounded-[22px] bg-white p-3.5 sm:p-4 text-base sm:text-lg font-black shadow-md text-center">
                    {metric}
                  </div>
                ))}
              </div>
              <div className="mt-6 sm:mt-8">
                <IllustrationRail />
              </div>
            </div>
            
            <div className="w-full flex items-center justify-center">
              <PhoneShell>
                <TopBar view={view} setView={setView} />
                <AnimatePresence mode="wait">
                  <motion.div key={view} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.18 }} className="flex-1 overflow-y-auto">
                    {activeView}
                  </motion.div>
                </AnimatePresence>
                <nav className="sticky bottom-0 z-30 mx-auto w-full grid grid-cols-5 gap-1 border-t border-black/5 bg-white/92 px-2 py-1.5 backdrop-blur shrink-0">
                  {bottomNav.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.id || (item.id === "more" && !bottomNav.some((nav) => nav.id === view));
                    return (
                      <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`grid min-h-[50px] sm:min-h-[56px] place-items-center rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black transition ${
                          active ? "bg-[#111315] text-lime-300" : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </PhoneShell>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {navOpen && (
          <motion.div className="fixed inset-0 z-50 bg-black/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="h-full w-72 sm:w-80 bg-[#111315] p-5 text-white">
              <div className="mb-5 flex items-center justify-between">
                <b className="text-base font-black">PG Hub</b>
                <button onClick={() => setNavOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="grid gap-1">
                {sidebar.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setView(item.id);
                        setNavOpen(false);
                      }}
                      className="flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black text-white/75 hover:bg-white/8 transition"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setView("ai")} className="fixed bottom-20 right-4 z-40 hidden rounded-full bg-[#111315] px-5 py-3.5 text-xs sm:text-sm font-black text-lime-300 shadow-2xl lg:flex items-center gap-2 hover:bg-black transition">
        <Bot className="h-4 w-4" /> Ask PayFlow AI
      </button>
      <PaymentSheet open={paymentOpen} onClose={() => { setPaymentOpen(false); }} />
      <ReminderSheet open={reminderOpen} onClose={() => setReminderOpen(false)} />
    </main>
  );
}
