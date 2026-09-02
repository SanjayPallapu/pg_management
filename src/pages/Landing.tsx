import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring, type Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  FileCheck2,
  IndianRupee,
  MessageCircle,
  Play,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ComparisonSection from "@/components/landing/ComparisonSection";
import logo from "@/assets/pg-hub/pg-hub-logo.png";
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

const playStoreUrl = "https://play.google.com/store/apps/details?id=com.sanjay.pgmanagement&pcampaignid=web_share";

const illustrations = [
  { src: rentCollection, title: "Collect rent", copy: "Paid, partial, pending and overdue in one glance." },
  { src: roomOccupancy, title: "Track beds", copy: "Know what is full, vacant and ready to fill." },
  { src: reminders, title: "WhatsApp reminders", copy: "Send smart follow-ups without awkward calls." },
  { src: receipts, title: "Digital receipts", copy: "Generate receipts the moment money lands." },
  { src: analytics, title: "Reports", copy: "Understand collection, occupancy and growth." },
  { src: securityDeposit, title: "Deposits", copy: "Track deposits, refunds and settlements clearly." },
  { src: onboarding, title: "Tenant onboarding", copy: "Add tenant details before move-in." },
  { src: multiProperty, title: "Multi-property", copy: "Manage every PG from one owner cockpit." },
  { src: bills, title: "Utility billing", copy: "Split electricity, AC and other charges." },
  { src: vacancy, title: "Fill vacancies", copy: "Turn empty beds into next actions." },
  { src: expenses, title: "Expenses", copy: "Keep daily costs beside collections." },
  { src: growth, title: "Business growth", copy: "See your PG business moving forward." },
];

const features = [
  { icon: IndianRupee, title: "Payment collection", text: "Record UPI, cash and bank payments with partial payment clarity." },
  { icon: MessageCircle, title: "WhatsApp reminders", text: "Context-aware messages for tenants who need a nudge." },
  { icon: ReceiptText, title: "Digital receipts", text: "Professional receipts ready to download, share or WhatsApp." },
  { icon: Zap, title: "Utility billing", text: "Split electricity, AC and custom charges by room, person or meter." },
  { icon: FileCheck2, title: "Move-out settlements", text: "Calculate prorated rent, utility deductions and final refunds." },
  { icon: Bot, title: "PayFlow AI", text: "Ask who owes rent, what changed and what to follow up today." },
  { icon: Building2, title: "Multi-property", text: "Switch between Urban Nest PG, Sunrise Co-Living and all properties." },
  { icon: BarChart3, title: "Reports", text: "Readable collection, revenue, occupancy and payment method charts." },
];

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const testimonials = [
  {
    name: "Rajesh K.",
    role: "PG Owner, Hyderabad",
    text: "This app saved me 5 hours every week on rent collection. The WhatsApp reminders are a game changer!",
    rating: 5,
  },
  {
    name: "Priya M.",
    role: "PG Manager, Bangalore",
    text: "Managing 3 PGs was a nightmare before. Now everything is in one place. Highly recommend!",
    rating: 5,
  },
  {
    name: "Arun S.",
    role: "Hostel Owner, Chennai",
    text: "The receipt generation and tenant tracking features are exactly what I needed. Worth every rupee.",
    rating: 5,
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

gsap.registerPlugin(ScrollTrigger);

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="PG Hub" className="h-11 w-11 rounded-2xl object-contain bg-black shrink-0" />
      <div>
        <p className="text-sm font-black leading-none">PG Hub</p>
        <p className="text-[10px] font-black uppercase text-slate-500">PayFlow</p>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] rounded-[32px] sm:rounded-[42px] border-[6px] sm:border-[10px] border-[#111315] bg-[#f4f5ed] p-3.5 sm:p-5 shadow-[0_25px_80px_rgba(0,0,0,0.22)] md:shadow-[0_35px_120px_rgba(0,0,0,0.32)]"
    >
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] sm:text-xs font-black text-slate-500">Good morning, Sanjay</p>
          <h3 className="text-lg sm:text-xl font-black">All Properties</h3>
        </div>
        <span className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl sm:rounded-2xl bg-lime-300 font-black text-sm sm:text-base">S</span>
      </div>
      <div className="rounded-[24px] sm:rounded-[30px] bg-[#111315] p-4 sm:p-5 text-white">
        <p className="text-xs sm:text-sm font-semibold text-white/55">Expected this month</p>
        <p className="mt-1 sm:mt-2 text-3xl sm:text-4xl lg:text-5xl font-black">₹4.82L</p>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-bold text-lime-300">You're 77.5% collected</p>
        <div className="mt-3 sm:mt-5 h-3 sm:h-4 overflow-hidden rounded-full bg-white/10">
          <motion.span initial={{ width: 0 }} animate={{ width: "77.5%" }} transition={{ delay: 0.35, duration: 0.9 }} className="block h-full rounded-full bg-lime-300" />
        </div>
        <div className="mt-3 sm:mt-5 grid grid-cols-3 gap-1.5 sm:gap-2">
          {["₹3.74L collected", "₹82.5K pending", "₹26K overdue"].map((item) => (
            <div key={item} className="rounded-xl sm:rounded-2xl bg-white/8 p-2 sm:p-3 text-[10px] sm:text-xs font-black text-center sm:text-left leading-tight">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        {["Collect Rent", "Send Reminders", "Generate Receipt", "PayFlow AI"].map((label) => (
          <div key={label} className="rounded-xl sm:rounded-[22px] bg-white p-2.5 sm:p-3 text-[11px] sm:text-xs font-black shadow-sm text-center sm:text-left">
            {label}
          </div>
        ))}
      </div>
      <motion.img
        src={rentCollection}
        alt="PayFlow rent collection illustration"
        className="absolute -right-4 sm:-right-8 lg:-right-10 -top-6 sm:-top-10 h-20 w-20 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-2xl sm:rounded-[28px] object-cover shadow-xl aspect-square"
        animate={{ y: [0, -8, 0], rotate: [4, 1, 4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={reminders}
        alt="PayFlow WhatsApp reminder illustration"
        className="absolute -bottom-6 sm:-bottom-8 lg:-bottom-10 -left-4 sm:-left-6 lg:-left-8 h-18 w-18 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-2xl sm:rounded-[28px] object-cover shadow-xl aspect-square"
        animate={{ y: [0, 6, 0], rotate: [-5, -1, -5] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 150, damping: 28, restDelta: 0.001 });

  useEffect(() => {
    if (!pageRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(".payflow-gsap-hero", {
        opacity: 0,
        y: 28,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.08,
      });

      gsap.to(".payflow-float-card", {
        y: -14,
        rotate: 1.5,
        duration: 2.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
      });

      gsap.utils.toArray<HTMLElement>(".payflow-product-card").forEach((card, index) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          opacity: 0,
          y: 50,
          rotate: index % 2 === 0 ? -1 : 1,
          duration: 0.8,
          ease: "power3.out",
        });
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={pageRef} className="min-h-screen overflow-x-hidden bg-[#f4f5ed] text-[#111315]">
      <motion.div className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-lime-300" style={{ scaleX }} />
      <nav className="sticky top-0 z-40 mx-auto flex max-w-7xl 2xl:max-w-[1600px] items-center justify-between bg-[#f4f5ed]/90 px-4 py-3 sm:py-4 backdrop-blur md:px-8">
        <Brand />
        <div className="hidden items-center gap-1 lg:gap-2 md:flex">
          {["Product", "Payments", "AI", "Pricing"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="rounded-full px-3.5 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-black text-slate-600 hover:bg-white transition-colors">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/payflow")} variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl font-bold text-xs sm:text-sm">
            Try Demo
          </Button>
          <Button asChild size="sm" className="rounded-xl sm:rounded-2xl bg-[#111315] px-3.5 sm:px-5 py-2 text-xs sm:text-sm text-lime-300 hover:bg-black">
            <a href={playStoreUrl} target="_blank" rel="noreferrer">
              <span>Download App</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto grid min-h-[calc(100svh-64px)] sm:min-h-[calc(100svh-76px)] max-w-7xl 2xl:max-w-[1600px] items-center gap-8 lg:gap-12 px-4 py-6 sm:py-10 md:grid-cols-[1fr_360px] lg:grid-cols-[1.1fr_460px] xl:grid-cols-[1.2fr_520px] 2xl:grid-cols-[1.2fr_560px] md:px-8">
        <div className="pointer-events-none absolute -left-20 top-20 h-40 w-40 sm:h-56 sm:w-56 rounded-full border-[24px] sm:border-[36px] border-lime-300/60" />
        <div className="pointer-events-none absolute -right-24 bottom-6 hidden h-60 w-60 rounded-[48px] bg-[#4938ff] opacity-80 blur-sm md:block" />
        
        <div className="z-10">
          <div className="payflow-gsap-hero inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] sm:text-xs font-black uppercase shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-lime-600" /> Fintech for PG owners
          </div>
          <h1 className="payflow-gsap-hero mt-4 sm:mt-6 text-4xl sm:text-6xl md:text-5xl lg:text-7xl xl:text-8xl 2xl:text-[104px] font-black leading-[0.95] tracking-tight sm:tracking-normal">
            Collect rent. Not spreadsheets.
          </h1>
          <p className="payflow-gsap-hero mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg lg:text-xl font-semibold leading-relaxed text-slate-600">
            PG Hub PayFlow brings rent collection, tenants, rooms, receipts, utilities and property operations into one simple Android-first app.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-12 sm:h-14 rounded-2xl bg-lime-300 px-6 sm:px-8 text-sm sm:text-base font-black text-[#111315] hover:bg-lime-200 shadow-md">
              <a href={playStoreUrl} target="_blank" rel="noreferrer">
                <Smartphone className="mr-2 h-4 sm:h-5 w-4 sm:w-5" /> Download on Play Store
              </a>
            </Button>
            <Button onClick={() => navigate("/payflow")} variant="outline" className="h-12 sm:h-14 rounded-2xl border-[#111315] px-6 sm:px-8 text-sm sm:text-base font-black">
              <Play className="mr-2 h-4 sm:h-5 w-4 sm:w-5" /> See How It Works
            </Button>
          </div>

          <div className="payflow-gsap-hero mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
            {["₹4.82L expected", "77.5% collected", "7 need attention"].map((item) => (
              <div key={item} className="rounded-xl sm:rounded-[20px] bg-white p-2.5 sm:p-4 text-xs sm:text-sm font-black shadow-sm text-center">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex justify-center py-4 md:py-0">
          <DashboardMockup />
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y border-black/10 bg-lime-300 py-3.5 sm:py-5 overflow-hidden">
        <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="flex w-max gap-6 sm:gap-8 whitespace-nowrap text-base sm:text-xl font-black">
          {Array.from({ length: 2 }).flatMap(() => ["Rent collection", "WhatsApp reminders", "Digital receipts", "Utility billing", "Move-outs", "PayFlow AI", "Multi-property"]).map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-6 sm:gap-8">
              {item} <span>•</span>
            </span>
          ))}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="product" className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 py-14 sm:py-20 md:px-8">
        <motion.div {...reveal} className="max-w-3xl">
          <p className="text-xs sm:text-sm font-black uppercase text-lime-700">Product story</p>
          <h2 className="mt-2 sm:mt-3 text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-normal">
            What happened? What needs attention? What should I do next?
          </h2>
          <p className="mt-3 sm:mt-5 text-base sm:text-lg font-semibold leading-relaxed text-slate-600">
            Every screen is built around those three questions, so a PG owner can act in three taps or fewer.
          </p>
        </motion.div>
        <div className="mt-8 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: index * 0.03 }}
                whileHover={{ y: -6 }}
                className="rounded-[22px] sm:rounded-[28px] bg-white p-4 sm:p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] flex flex-col justify-between"
              >
                <div>
                  <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-[#111315] text-lime-300">
                    <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                  </span>
                  <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl font-black">{item.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm font-semibold leading-relaxed text-slate-600">{item.text}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Gallery Showcase with 12 Illustrations */}
      <section className="bg-[#111315] px-4 py-14 sm:py-20 text-white md:px-8">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1600px]">
          <motion.div {...reveal} className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs sm:text-sm font-black uppercase text-lime-300">Canvas image system</p>
              <h2 className="mt-2 sm:mt-3 text-3xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-black leading-tight tracking-normal">
                Started with rent. Stayed for every PG workflow.
              </h2>
            </div>
            <p className="max-w-md text-xs sm:text-sm font-semibold leading-relaxed text-white/55">
              A product-style gallery inspired by modern fintech launches: one visual moment per workflow, all 12 illustrations included with responsive scaling.
            </p>
          </motion.div>
          
          <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 md:grid-cols-2">
            {illustrations.map((item, index) => (
              <figure
                key={item.title}
                className={`payflow-product-card overflow-hidden rounded-[28px] sm:rounded-[36px] text-[#111315] shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${
                  index % 4 === 0 ? "bg-lime-300" : index % 4 === 1 ? "bg-[#f4f5ed]" : index % 4 === 2 ? "bg-[#e6ddff]" : "bg-[#ffdf63]"
                }`}
              >
                <div className="grid min-h-[300px] sm:min-h-[340px] gap-0 sm:grid-cols-[1fr_1.1fr]">
                  <figcaption className="flex flex-col justify-between p-5 sm:p-7 order-2 sm:order-1">
                    <div>
                      <p className="text-[10px] sm:text-xs font-black uppercase text-slate-600">{String(index + 1).padStart(2, "0")} · PG Hub PayFlow</p>
                      <h3 className="mt-3 sm:mt-4 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">{item.title}</h3>
                      <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">{item.copy}</p>
                    </div>
                    <div className="mt-5 sm:mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#111315] px-3.5 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-black uppercase text-lime-300">
                      View workflow <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </figcaption>
                  <div className="relative h-48 sm:h-auto min-h-[190px] sm:min-h-[260px] overflow-hidden order-1 sm:order-2">
                    <img
                      src={item.src}
                      alt={item.title}
                      className="h-full w-full object-cover object-center aspect-[4/3] sm:aspect-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Attention Engine */}
      <section className="bg-[#4938ff] px-4 py-16 sm:py-24 text-white md:px-8">
        <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-8 lg:grid-cols-[1fr_0.9fr] items-center">
          <div>
            <p className="text-xs sm:text-sm font-black uppercase text-lime-300">Attention engine</p>
            <h2 className="mt-2 sm:mt-4 text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-normal">
              7 tenants need your attention today.
            </h2>
            <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg font-semibold leading-relaxed text-white/70">
              The landing now sells the exact owner outcome: see what happened, understand what is pending, and act immediately without delays.
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4">
            {[
              ["₹26,000 overdue", "Send reminders"],
              ["₹82.5K still to collect", "View pending"],
              ["Room 204 partial", "Record balance"],
            ].map(([title, action], index) => (
              <div
                key={title}
                className="payflow-float-card rounded-[24px] sm:rounded-[30px] bg-white p-4 sm:p-5 text-[#111315] shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-black">{title}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-700">{action}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`block h-full rounded-full ${
                      index === 0
                        ? "w-[38%] bg-red-400"
                        : index === 1
                          ? "w-[64%] bg-yellow-400"
                          : "w-[70%] bg-lime-400"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Loved by PG Owners
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              See what our users have to say across India
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full rounded-[24px] border-none shadow-[0_12px_36px_rgba(0,0,0,0.04)]">
                  <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex gap-1 mb-3">
                        {Array.from({ length: t.rating }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="h-4 w-4 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>

                      <p className="text-foreground mb-4 text-xs sm:text-sm leading-relaxed font-medium">
                        "{t.text}"
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="font-bold text-foreground text-xs sm:text-sm">{t.name}</p>
                      <p className="text-muted-foreground text-[11px]">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <ComparisonSection />

      {/* Payments Section */}
      <section id="payments" className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-6 sm:gap-8 px-4 py-14 sm:py-20 md:grid-cols-2 md:px-8 items-center">
        <motion.div {...reveal} className="rounded-[28px] sm:rounded-[36px] bg-lime-300 p-6 sm:p-8">
          <IndianRupee className="h-8 w-8 sm:h-9 sm:w-9" />
          <h2 className="mt-6 sm:mt-8 text-3xl sm:text-5xl font-black leading-tight tracking-normal">
            Stop chasing rent. Start running your PG.
          </h2>
          <p className="mt-3 sm:mt-5 text-base sm:text-lg font-semibold leading-relaxed text-slate-700">
            Payment statuses are visual, partial payments are obvious, and every follow-up is one tap away.
          </p>
          <Button onClick={() => navigate("/payflow")} className="mt-6 sm:mt-7 rounded-2xl bg-[#111315] px-6 py-3.5 text-sm sm:text-base font-black text-lime-300 hover:bg-black">
            Try payment flow
          </Button>
        </motion.div>
        <motion.div {...reveal} className="rounded-[28px] sm:rounded-[36px] bg-white p-6 sm:p-8 shadow-lg sm:shadow-xl">
          <h3 className="text-xl sm:text-2xl font-black">Today's collection</h3>
          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
            {[
              ["Paid", "124 tenants", "₹3,74,000", "bg-emerald-100"],
              ["Partial", "12 tenants", "₹42,500", "bg-orange-100"],
              ["Pending", "18 tenants", "₹40,000", "bg-yellow-100"],
              ["Overdue", "7 tenants", "₹26,000", "bg-red-100"],
            ].map(([label, count, amount, tone]) => (
              <div key={label} className={`rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-4 ${tone}`}>
                <p className="text-xs sm:text-sm font-black">{label}</p>
                <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-black">{amount}</p>
                <p className="text-[11px] sm:text-xs font-bold opacity-60">{count}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* AI Section */}
      <section id="ai" className="bg-white px-4 py-14 sm:py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-6 sm:gap-8 md:grid-cols-[0.9fr_1.1fr] items-center">
          <motion.div {...reveal}>
            <p className="text-xs sm:text-sm font-black uppercase text-violet-700">PayFlow AI</p>
            <h2 className="mt-2 sm:mt-3 text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-normal">
              An assistant that knows your collections.
            </h2>
            <p className="mt-3 sm:mt-5 text-base sm:text-lg font-semibold leading-relaxed text-slate-600">
              Ask who owes rent, which property is slow, or what reminders should go today. Responses include actions, not just text.
            </p>
            <Button onClick={() => navigate("/payflow")} className="mt-6 sm:mt-7 h-12 sm:h-14 rounded-2xl bg-[#111315] px-6 sm:px-7 text-sm sm:text-base font-black text-lime-300 hover:bg-black">
              Ask PayFlow AI
            </Button>
          </motion.div>
          <motion.div {...reveal} className="rounded-[28px] sm:rounded-[36px] bg-[#111315] p-5 sm:p-7 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-lime-300 text-[#111315]">
                <Bot className="h-5 w-5" />
              </span>
              <b className="text-base sm:text-lg">Who still owes rent?</b>
            </div>
            <div className="mt-4 sm:mt-6 rounded-[22px] sm:rounded-[28px] bg-white p-4 sm:p-5 text-[#111315]">
              <p className="text-[10px] sm:text-xs font-black uppercase text-violet-700">AI summary</p>
              <h3 className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-black">₹26,000 overdue across 7 tenants.</h3>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600">Highest outstanding: Rahul Sharma ₹9,500, Priya Singh ₹6,000, Arjun Kumar ₹4,500.</p>
              <Button onClick={() => navigate("/payflow")} className="mt-4 rounded-xl sm:rounded-2xl bg-lime-300 text-xs sm:text-sm font-black text-[#111315] hover:bg-lime-200">
                Send all reminders
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 py-14 sm:py-20 md:px-8">
        <div className="mb-8 sm:mb-10 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs sm:text-sm font-black uppercase text-lime-700">Pricing</p>
            <h2 className="mt-2 text-3xl sm:text-5xl font-black tracking-normal">Run your PG smarter.</h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm font-semibold leading-relaxed text-slate-600">
            Built for small PGs, growing hostels and multi-property operators.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Basic", "₹499/month", "Tenant management, rooms, rent tracking and basic reports.", "Start Basic"],
            ["Plus", "₹799/month", "WhatsApp reminders, receipts, utility billing and advanced analytics.", "Start Plus"],
            ["Pro Max", "₹999/month", "Multi-property, AI assistant, staff roles and priority support.", "Start Pro Max"],
          ].map(([plan, price, copy, cta], index) => (
            <motion.article
              key={plan}
              {...reveal}
              className={`rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 shadow-lg flex flex-col justify-between ${
                index === 1 ? "bg-[#111315] text-white sm:col-span-2 lg:col-span-1" : "bg-white"
              }`}
            >
              <div>
                {index === 1 && <span className="rounded-full bg-lime-300 px-3 py-1 text-[11px] font-black text-[#111315]">Most Popular</span>}
                <h3 className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-black">{plan}</h3>
                <p className="mt-2 sm:mt-4 text-3xl sm:text-4xl font-black">{price}</p>
                <p className={`mt-3 text-xs sm:text-sm font-semibold leading-relaxed ${index === 1 ? "text-white/60" : "text-slate-600"}`}>{copy}</p>
              </div>
              <Button
                onClick={() => navigate("/payflow")}
                className={`mt-6 h-11 sm:h-12 w-full rounded-2xl text-xs sm:text-sm font-black ${
                  index === 1 ? "bg-lime-300 text-[#111315] hover:bg-lime-200" : "bg-[#111315] text-lime-300 hover:bg-black"
                }`}
              >
                {cta}
              </Button>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 py-14 sm:py-20 md:px-8">
        <motion.div {...reveal} className="mx-auto max-w-5xl rounded-[32px] sm:rounded-[40px] bg-[#111315] p-6 sm:p-12 md:p-16 text-center text-white">
          <ShieldCheck className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-lime-300" />
          <h2 className="mt-4 sm:mt-6 text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-normal">
            Your PG deserves better than spreadsheets.
          </h2>
          <p className="mx-auto mt-3 sm:mt-5 max-w-2xl text-sm sm:text-lg font-semibold leading-relaxed text-white/65">
            Start collecting smarter with PG Hub PayFlow today.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="h-12 sm:h-14 rounded-2xl bg-lime-300 px-6 sm:px-8 text-sm sm:text-base font-black text-[#111315] hover:bg-lime-200">
              <a href={playStoreUrl} target="_blank" rel="noreferrer">Download App</a>
            </Button>
            <Button onClick={() => navigate("/payflow")} variant="outline" className="h-12 sm:h-14 rounded-2xl border-white/25 bg-transparent px-6 sm:px-8 text-sm sm:text-base font-black text-white hover:bg-white hover:text-[#111315]">
              Book a Demo
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 px-4 py-6 sm:py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl 2xl:max-w-[1600px] flex-col justify-between gap-4 sm:gap-5 md:flex-row md:items-center">
          <Brand />
          <p className="text-xs sm:text-sm font-bold text-slate-500 text-center md:text-left">Collect faster. Manage smarter. Grow confidently.</p>
          <div className="flex justify-center gap-4 text-xs sm:text-sm font-black text-slate-600">
            <a href="mailto:support@pgmanager.in" className="hover:underline">Support</a>
            <button onClick={() => navigate("/legal")} className="hover:underline">Privacy</button>
          </div>
        </div>
      </footer>
    </main>
  );
}

