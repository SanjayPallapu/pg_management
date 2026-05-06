import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Shield,
  Smartphone,
  Bell,
  TrendingUp,
  Star,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import dashboard from "@/assets/screenshots/dashboard.jpg";
import rentMgmt from "@/assets/screenshots/rent-management.jpg";
import reports from "@/assets/screenshots/reports-dashboard.jpg";
import receipts from "@/assets/screenshots/payment-receipt-full.jpg";
import reminders from "@/assets/screenshots/payment-reminder-send.jpg";
import rooms from "@/assets/screenshots/rooms.jpg";

/* ─────────────────────────  data  ───────────────────────── */

const products = [
  { src: dashboard, title: "Live Dashboard", caption: "Every metric, one screen." },
  { src: rentMgmt, title: "Rent Sheet", caption: "Color-coded, sorted by urgency." },
  { src: reminders, title: "WhatsApp Reminders", caption: "One tap. Image receipts." },
  { src: receipts, title: "Smart Receipts", caption: "GST-ready, branded, instant." },
  { src: rooms, title: "Room Directory", caption: "Floors, beds, occupancy." },
  { src: reports, title: "Reports & Trends", caption: "Revenue, occupancy, growth." },
];

const benefits = [
  { icon: Zap, title: "5 hrs saved / week", desc: "Auto-collected rent + reminders replace spreadsheets." },
  { icon: TrendingUp, title: "98% on-time rate", desc: "Visual due-day cues nudge tenants before overdue." },
  { icon: Shield, title: "Private by design", desc: "Each PG isolated. Bank-grade encryption." },
  { icon: Smartphone, title: "Mobile-first", desc: "Built for the owner who runs the PG from a phone." },
  { icon: Bell, title: "Never miss a payment", desc: "Real-time push the moment a tenant pays." },
  { icon: Sparkles, title: "AI-powered branding", desc: "Logo, receipt, welcome poster — generated for you." },
];

const testimonials = [
  {
    name: "Rajesh K.",
    role: "PG Owner · Hyderabad",
    quote: "I run 3 PGs from my phone now. Saturday rent collection used to take a full day — done in 20 minutes.",
    rating: 5,
  },
  {
    name: "Priya M.",
    role: "Hostel Manager · Bangalore",
    quote: "The WhatsApp reminders alone are worth the price. Late payments dropped by 70%.",
    rating: 5,
  },
  {
    name: "Arun S.",
    role: "Property Owner · Chennai",
    quote: "The receipts look more professional than my bank's. Tenants love it.",
    rating: 5,
  },
];

/* ─────────────────────  motion presets  ───────────────────── */

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: EASE },
  }),
};

const slideIn: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.55, ease: EASE },
  }),
};

/* ─────────────────────────  page  ───────────────────────── */

const Showcase = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroFade = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden scroll-smooth">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <span className="text-sm font-semibold tracking-wide text-foreground">PG Manager</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" onClick={() => navigate("/auth")}>
              Try Free <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────  HERO  ───────── */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* animated background blobs */}
        <motion.div
          aria-hidden
          className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-primary/25 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-amber-400/20 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="container mx-auto px-4 pt-24 pb-32 relative text-center max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5">
              <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
              Loved by 100+ PG owners across India
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05]"
          >
            Your PG.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-amber-500 bg-clip-text text-transparent">
              On autopilot.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Collect rent, track tenants, send WhatsApp receipts — all from your phone.
            Built for owners who value their weekends.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button size="lg" className="text-base px-8 py-6 shadow-lg shadow-primary/30" onClick={() => navigate("/auth")}>
              Start Free Trial <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6"
              onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })}
            >
              See it in action
            </Button>
          </motion.div>

          {/* hero phone */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
            className="relative mx-auto mt-16 w-[260px] sm:w-[300px]"
          >
            <div className="absolute -inset-8 bg-primary/20 rounded-[3rem] blur-3xl -z-10" />
            <div className="rounded-[2.5rem] border-[7px] border-foreground/15 bg-background shadow-2xl overflow-hidden">
              <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/20 rounded-b-2xl z-10" />
              <img
                src={dashboard}
                alt="PG Manager dashboard"
                className="w-full h-auto block"
                loading="eager"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────  PRODUCT  ───────── */}
      <section id="product" className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge variant="outline" className="mb-4">The product</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Built for the way you actually work.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every screen designed to take seconds — not minutes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {products.map((p, i) => (
              <motion.div
                key={p.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative rounded-2xl overflow-hidden border border-border/60 bg-card cursor-default"
              >
                <div className="aspect-[9/16] overflow-hidden bg-muted">
                  <motion.img
                    src={p.src}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-top will-change-transform"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
                  <div className="text-sm font-semibold text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.caption}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────  BENEFITS  ───────── */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge variant="outline" className="mb-4">Why owners switch</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Less admin. More revenue.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={slideIn}
              >
                <Card className="h-full border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-[border,box-shadow] duration-300">
                  <CardContent className="pt-6">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1.5">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────  PROOF (stats + testimonials)  ───────── */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* stats */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-20"
          >
            {[
              { v: "100+", l: "Active owners" },
              { v: "10K+", l: "Tenants tracked" },
              { v: "₹2Cr+", l: "Rent collected" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight">{s.v}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 uppercase tracking-wider">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* testimonials */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4">The proof</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Owners say it best.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
              >
                <Card className="h-full bg-card border-border/60">
                  <CardContent className="pt-6 flex flex-col h-full">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.rating }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-foreground leading-relaxed mb-5 flex-1">"{t.quote}"</p>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────  CTA  ───────── */}
      <section className="py-28 relative overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-amber-400/10"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="container mx-auto px-4 relative text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.05]">
              Stop chasing rent.
              <br />
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                Start growing.
              </span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Free 14-day trial. No credit card. Set up your first PG in under 5 minutes.
            </p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                size="lg"
                className="text-base px-10 py-7 shadow-xl shadow-primary/40"
                onClick={() => navigate("/auth")}
              >
                Get Started Free <ArrowRight className="h-5 w-5 ml-1.5" />
              </Button>
            </motion.div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No setup fee", "Cancel anytime", "Indian support"].map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PG Manager. Built for Indian PG owners.
        </div>
      </footer>
    </div>
  );
};

export default Showcase;