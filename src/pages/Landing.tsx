import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
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
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

gsap.registerPlugin(ScrollTrigger);

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="" className="h-11 w-11 rounded-2xl" />
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
      initial={{ opacity: 0, y: 42, rotate: 3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[390px] rounded-[42px] border-[10px] border-[#111315] bg-[#f4f5ed] p-4 shadow-[0_35px_120px_rgba(0,0,0,0.32)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-500">Good morning, Sanjay</p>
          <h3 className="text-xl font-black">All Properties</h3>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 font-black">S</span>
      </div>
      <div className="rounded-[30px] bg-[#111315] p-5 text-white">
        <p className="text-sm font-semibold text-white/55">Expected this month</p>
        <p className="mt-2 text-5xl font-black">₹4.82L</p>
        <p className="mt-2 text-sm font-bold text-lime-300">You're 77.5% collected</p>
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
          <motion.span initial={{ width: 0 }} animate={{ width: "77.5%" }} transition={{ delay: 0.35, duration: 0.9 }} className="block h-full rounded-full bg-lime-300" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["₹3.74L collected", "₹82.5K pending", "₹26K overdue"].map((item) => <div key={item} className="rounded-2xl bg-white/8 p-3 text-xs font-black">{item}</div>)}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {["Collect Rent", "Send Reminders", "Generate Receipt", "PayFlow AI"].map((label) => <div key={label} className="rounded-[22px] bg-white p-3 text-xs font-black shadow-sm">{label}</div>)}
      </div>
      <motion.img src={rentCollection} alt="PayFlow rent collection illustration" className="absolute -right-10 -top-12 h-32 w-32 rounded-[28px] object-cover shadow-2xl" animate={{ y: [0, -10, 0], rotate: [4, 1, 4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
      <motion.img src={reminders} alt="PayFlow WhatsApp reminder illustration" className="absolute -bottom-10 -left-8 h-28 w-28 rounded-[28px] object-cover shadow-2xl" animate={{ y: [0, 8, 0], rotate: [-5, -1, -5] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }} />
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
        y: 34,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
      });

      gsap.to(".payflow-float-card", {
        y: -18,
        rotate: 2,
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
            start: "top 82%",
          },
          opacity: 0,
          y: 80,
          rotate: index % 2 === 0 ? -1.5 : 1.5,
          duration: 0.85,
          ease: "power3.out",
        });
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={pageRef} className="min-h-screen overflow-hidden bg-[#f4f5ed] text-[#111315]">
      <motion.div className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-lime-300" style={{ scaleX }} />
      <nav className="sticky top-0 z-40 mx-auto flex max-w-[min(1500px,100vw)] items-center justify-between bg-[#f4f5ed]/85 px-4 py-4 backdrop-blur md:px-8">
        <Brand />
        <div className="hidden items-center gap-2 md:flex">
          {["Product", "Payments", "AI", "Pricing"].map((item) => <a key={item} href={`#${item.toLowerCase()}`} className="rounded-full px-4 py-2 text-sm font-black text-slate-600 hover:bg-white">{item}</a>)}
        </div>
        <Button asChild className="rounded-2xl bg-[#111315] text-lime-300 hover:bg-black">
          <a href={playStoreUrl} target="_blank" rel="noreferrer">Download App <ArrowRight className="h-4 w-4" /></a>
        </Button>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100svh-76px)] max-w-[min(1500px,100vw)] items-center gap-10 px-4 py-8 md:grid-cols-[1fr_440px] md:px-8 lg:grid-cols-[1fr_520px]">
        <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full border-[36px] border-lime-300/70" />
        <div className="pointer-events-none absolute -right-28 bottom-6 hidden h-72 w-72 rounded-[48px] bg-[#4938ff] opacity-90 blur-sm md:block" />
        <div>
          <div className="payflow-gsap-hero inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase shadow-sm"><Sparkles className="h-4 w-4 text-lime-600" /> Fintech for PG owners</div>
          <h1 className="payflow-gsap-hero mt-7 max-w-5xl text-[clamp(48px,10vw,132px)] font-black leading-[0.88] tracking-normal">Collect rent. Not spreadsheets.</h1>
          <p className="payflow-gsap-hero mt-6 max-w-2xl text-[clamp(16px,1.5vw,21px)] font-semibold leading-8 text-slate-600">PG Hub PayFlow brings rent collection, tenants, rooms, receipts, utilities and property operations into one simple Android-first app.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-14 rounded-2xl bg-lime-300 px-7 text-base font-black text-[#111315] hover:bg-lime-200">
              <a href={playStoreUrl} target="_blank" rel="noreferrer"><Smartphone className="h-5 w-5" /> Download on Play Store</a>
            </Button>
            <Button onClick={() => navigate("/payflow")} variant="outline" className="h-14 rounded-2xl border-[#111315] px-7 text-base font-black"><Play className="h-5 w-5" /> See How It Works</Button>
          </div>
          <div className="payflow-gsap-hero mt-6 grid max-w-xl grid-cols-[94px_1fr] items-center gap-3 rounded-[28px] bg-[#111315] p-3 text-white shadow-[0_24px_70px_rgba(17,19,21,0.18)] sm:max-w-lg">
            <img src="/pg-hub-playstore-qr.svg" alt="QR code to download PG Hub on Google Play" className="h-[94px] w-[94px] rounded-[18px] bg-[#f4f5ed]" />
            <div>
              <p className="text-xs font-black uppercase text-lime-300">Scan to download</p>
              <h2 className="mt-1 text-2xl font-black leading-tight">Install PG Hub from Google Play.</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-white/55">Open the app listing instantly. The scanner stays still for easy capture.</p>
            </div>
          </div>
          <div className="payflow-gsap-hero mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {["₹4.82L expected", "77.5% collected", "7 need attention"].map((item) => <div key={item} className="rounded-[24px] bg-white p-4 text-sm font-black shadow-sm">{item}</div>)}
          </div>
        </div>
        <DashboardMockup />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <motion.div
          {...reveal}
          className="grid overflow-hidden rounded-[40px] bg-[#4938ff] text-white shadow-[0_32px_100px_rgba(0,0,0,0.22)] md:grid-cols-[1.1fr_.9fr]"
        >
          <div className="p-6 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-xs font-black uppercase text-lime-300">
              <QrCode className="h-4 w-4" /> Scan and install
            </div>
            <h2 className="mt-7 max-w-2xl text-[clamp(42px,7vw,92px)] font-black leading-none tracking-normal">Download the rent cockpit built for PG owners.</h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-white/70">Scan the QR or tap the button to open the official PG Hub Play Store page. The scanner stays still so it is easy to capture on any device.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-14 rounded-2xl bg-lime-300 px-7 text-base font-black text-[#111315] hover:bg-lime-200">
                <a href={playStoreUrl} target="_blank" rel="noreferrer">Open Play Store <ArrowRight className="h-5 w-5" /></a>
              </Button>
              <Button onClick={() => navigate("/payflow")} variant="outline" className="h-14 rounded-2xl border-white/20 bg-transparent px-7 text-base font-black text-white hover:bg-white hover:text-[#111315]">Explore Demo</Button>
            </div>
          </div>
          <div className="relative grid place-items-center bg-lime-300 p-6 text-[#111315] md:p-10">
            <div className="rounded-[36px] bg-[#f4f5ed] p-5 shadow-[14px_14px_0_rgba(17,19,21,1)]">
              <img src="/pg-hub-playstore-qr.svg" alt="QR code to download PG Hub on Google Play" className="h-64 w-64 rounded-[24px]" />
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-slate-600">Google Play</p>
                  <p className="text-lg font-black">PG Hub</p>
                </div>
                <Smartphone className="h-7 w-7" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="border-y border-black/10 bg-lime-300 py-5">
        <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="flex w-max gap-8 whitespace-nowrap text-xl font-black">
          {Array.from({ length: 2 }).flatMap(() => ["Rent collection", "WhatsApp reminders", "Digital receipts", "Utility billing", "Move-outs", "PayFlow AI", "Multi-property"]).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </motion.div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <motion.div {...reveal} className="max-w-3xl">
          <p className="text-sm font-black uppercase text-lime-700">Product story</p>
          <h2 className="mt-3 text-5xl font-black leading-none tracking-normal md:text-7xl">What happened? What needs attention? What should I do next?</h2>
          <p className="mt-5 text-lg font-semibold leading-8 text-slate-600">Every screen is built around those three questions, so a PG owner can act in three taps or fewer.</p>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article key={item.title} {...reveal} transition={{ ...reveal.transition, delay: index * 0.04 }} whileHover={{ y: -8 }} className="rounded-[28px] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#111315] text-lime-300"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-8 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#111315] px-4 py-20 text-white md:px-8">
        <div className="mx-auto max-w-[min(1500px,100vw)]">
          <motion.div {...reveal} className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase text-lime-300">Canvas image system</p>
              <h2 className="mt-3 max-w-4xl text-[clamp(44px,8vw,104px)] font-black leading-none tracking-normal">Started with rent. Stayed for every PG workflow.</h2>
            </div>
            <p className="max-w-md text-sm font-semibold leading-7 text-white/55">A product-style gallery inspired by modern fintech launches: one visual moment per workflow, all 12 generated illustrations included.</p>
          </motion.div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {illustrations.map((item, index) => (
              <figure
                key={item.title}
                className={`payflow-product-card overflow-hidden rounded-[36px] text-[#111315] shadow-[0_30px_90px_rgba(0,0,0,0.22)] ${index % 4 === 0 ? "bg-lime-300" : index % 4 === 1 ? "bg-[#f4f5ed]" : index % 4 === 2 ? "bg-[#e6ddff]" : "bg-[#ffdf63]"}`}
              >
                <div className="grid min-h-[360px] gap-0 sm:grid-cols-[0.9fr_1.1fr]">
                  <figcaption className="flex flex-col justify-between p-6 md:p-8">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-600">{String(index + 1).padStart(2, "0")} · PG Hub PayFlow</p>
                      <h3 className="mt-5 text-[clamp(32px,5vw,64px)] font-black leading-none tracking-normal">{item.title}</h3>
                      <p className="mt-4 max-w-sm text-base font-semibold leading-7 text-slate-700">{item.copy}</p>
                    </div>
                    <div className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#111315] px-4 py-3 text-xs font-black uppercase text-lime-300">
                      View workflow <ArrowRight className="h-4 w-4" />
                    </div>
                  </figcaption>
                  <div className="relative min-h-[280px] overflow-hidden sm:min-h-full">
                    <img src={item.src} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Attention Engine */}
      <section className="bg-[#4938ff] px-4 py-24 text-white md:px-8">
        <div className="mx-auto grid max-w-[min(1500px,100vw)] gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-sm font-black uppercase text-lime-300">Attention engine</p>
            <h2 className="mt-4 text-[clamp(46px,9vw,118px)] font-black leading-none tracking-normal">
              7 tenants need your attention today.
            </h2>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/70">
              The landing now sells the exact owner outcome: see what happened,
              understand what is pending, and act immediately.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              ["₹26,000 overdue", "Send reminders"],
              ["₹82.5K still to collect", "View pending"],
              ["Room 204 partial", "Record balance"],
            ].map(([title, action], index) => (
              <div
                key={title}
                className="payflow-float-card rounded-[30px] bg-white p-5 text-[#111315] shadow-[0_28px_80px_rgba(0,0,0,0.22)]"
              >
                <p className="text-3xl font-black">{title}</p>
                <p className="mt-3 text-sm font-black uppercase text-slate-500">{action}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`block h-full rounded-full ${
                      index === 0
                        ? "w-[38%] bg-red-400"
                        : index === 1
                          ? "w-[64%] bg-yellow-300"
                          : "w-[70%] bg-lime-300"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App showcase, how-it-works and comparison sections from the main branch
          are intentionally omitted here because this file does not contain their
          component definitions/imports. Keeping them would create new build errors. */}

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Loved by PG Owners
            </h2>
            <p className="text-lg text-muted-foreground">
              See what our users have to say
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: t.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>

                    <p className="text-foreground mb-4 text-sm leading-relaxed">
                      "{t.text}"
                    </p>

                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-muted-foreground text-xs">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="payments" className="mx-auto grid max-w-7xl gap-8 px-4 py-20 md:grid-cols-2 md:px-8">
        <motion.div {...reveal} className="rounded-[36px] bg-lime-300 p-7">
          <IndianRupee className="h-9 w-9" />
          <h2 className="mt-10 text-5xl font-black leading-none tracking-normal">Stop chasing rent. Start running your PG.</h2>
          <p className="mt-5 text-lg font-semibold leading-8 text-slate-700">Payment statuses are visual, partial payments are obvious, and every follow-up is one tap away.</p>
          <Button onClick={() => navigate("/payflow")} className="mt-7 rounded-2xl bg-[#111315] px-6 py-4 text-lime-300 hover:bg-black">Try payment flow</Button>
        </motion.div>
        <motion.div {...reveal} className="rounded-[36px] bg-white p-7 shadow-xl">
          <h3 className="text-2xl font-black">Today's collection</h3>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["Paid", "124 tenants", "₹3,74,000", "bg-emerald-100"],
              ["Partial", "12 tenants", "₹42,500", "bg-orange-100"],
              ["Pending", "18 tenants", "₹40,000", "bg-yellow-100"],
              ["Overdue", "7 tenants", "₹26,000", "bg-red-100"],
            ].map(([label, count, amount, tone]) => <div key={label} className={`rounded-[24px] p-4 ${tone}`}><p className="text-sm font-black">{label}</p><p className="mt-5 text-2xl font-black">{amount}</p><p className="text-xs font-bold opacity-60">{count}</p></div>)}
          </div>
        </motion.div>
      </section>

      <section id="ai" className="bg-white px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[.9fr_1.1fr]">
          <motion.div {...reveal}>
            <p className="text-sm font-black uppercase text-violet-700">PayFlow AI</p>
            <h2 className="mt-3 text-5xl font-black leading-none tracking-normal md:text-7xl">An assistant that knows your collections.</h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-slate-600">Ask who owes rent, which property is slow, or what reminders should go today. Responses include actions, not just text.</p>
            <Button onClick={() => navigate("/payflow")} className="mt-7 h-14 rounded-2xl bg-[#111315] px-7 text-lime-300 hover:bg-black">Ask PayFlow AI</Button>
          </motion.div>
          <motion.div {...reveal} className="rounded-[36px] bg-[#111315] p-6 text-white">
            <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-300 text-[#111315]"><Bot /></span><b>Who still owes rent?</b></div>
            <div className="mt-6 rounded-[28px] bg-white p-5 text-[#111315]">
              <p className="text-xs font-black uppercase text-violet-700">AI summary</p>
              <h3 className="mt-2 text-3xl font-black">₹26,000 overdue across 7 tenants.</h3>
              <p className="mt-3 text-sm font-semibold text-slate-600">Highest outstanding: Rahul Sharma ₹9,500, Priya Singh ₹6,000, Arjun Kumar ₹4,500.</p>
              <Button className="mt-5 rounded-2xl bg-lime-300 text-[#111315] hover:bg-lime-200">Send all reminders</Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-sm font-black uppercase text-lime-700">Pricing</p><h2 className="mt-3 text-5xl font-black tracking-normal">Run your PG smarter.</h2></div>
          <p className="max-w-md text-sm font-semibold leading-7 text-slate-600">Built for small PGs, growing hostels and multi-property operators.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Basic", "₹199/month", "Tenant management, rooms, rent tracking and basic reports.", "Start Basic"],
            ["Plus", "₹299/month", "WhatsApp reminders, receipts, utility billing and advanced analytics.", "Start Plus"],
            ["Pro Max", "₹499/month", "Multi-property, AI assistant, staff roles and priority support.", "Start Pro Max"],
          ].map(([plan, price, copy, cta], index) => (
            <motion.article key={plan} {...reveal} className={`rounded-[32px] p-6 shadow-xl ${index === 1 ? "bg-[#111315] text-white" : "bg-white"}`}>
              {index === 1 && <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-black text-[#111315]">Most Popular</span>}
              <h3 className="mt-5 text-3xl font-black">{plan}</h3>
              <p className="mt-4 text-4xl font-black">{price}</p>
              <p className={`mt-4 text-sm font-semibold leading-7 ${index === 1 ? "text-white/55" : "text-slate-600"}`}>{copy}</p>
              <Button onClick={() => navigate("/payflow")} className={`mt-7 h-12 w-full rounded-2xl ${index === 1 ? "bg-lime-300 text-[#111315] hover:bg-lime-200" : "bg-[#111315] text-lime-300 hover:bg-black"}`}>{cta}</Button>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 md:px-8">
        <motion.div {...reveal} className="mx-auto max-w-5xl rounded-[40px] bg-[#111315] p-8 text-center text-white md:p-14">
          <ShieldCheck className="mx-auto h-10 w-10 text-lime-300" />
          <h2 className="mt-6 text-5xl font-black leading-none tracking-normal md:text-7xl">Your PG deserves better than spreadsheets.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/60">Start collecting smarter with PG Hub PayFlow.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="h-14 rounded-2xl bg-lime-300 px-7 text-[#111315] hover:bg-lime-200">
              <a href={playStoreUrl} target="_blank" rel="noreferrer">Download App</a>
            </Button>
            <Button onClick={() => navigate("/payflow")} variant="outline" className="h-14 rounded-2xl border-white/25 bg-transparent px-7 text-white hover:bg-white hover:text-[#111315]">Book a Demo</Button>
          </div> 
        </motion.div>
      </section>

      <footer className="border-t border-black/10 px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <Brand />
          <p className="text-sm font-bold text-slate-500">Collect faster. Manage smarter. Grow confidently.</p>
          <div className="flex gap-4 text-sm font-black text-slate-600"><a href="mailto:support@pgmanager.in">Support</a><button onClick={() => navigate("/legal")}>Privacy</button></div>
        </div>
      </footer>
    </main>
  );
}
