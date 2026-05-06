import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  Palette,
  Users,
  Lock,
  CreditCard,
  Smartphone,
  Gauge,
  Bell,
  FileCheck2,
  TestTube2,
  Activity,
  Megaphone,
  Rocket,
  CheckCircle2,
  Terminal,
} from "lucide-react";

type Section = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  items: { title: string; desc: string; priority?: "high" | "med" | "low" }[];
};

const sections: Section[] = [
  {
    id: "legal",
    icon: ShieldCheck,
    title: "A. Account & Legal",
    subtitle: "Foundations required before any store submission.",
    items: [
      { title: "Google Play Developer Account", desc: "One-time $25 registration on play.google.com/console.", priority: "high" },
      { title: "Business registration", desc: "Sole proprietorship / LLP / Pvt Ltd for invoicing.", priority: "med" },
      { title: "GST registration", desc: "Mandatory if turnover crosses ₹20L (₹10L for special states).", priority: "med" },
      { title: "Privacy Policy URL", desc: "Public page describing data collected, usage, retention.", priority: "high" },
      { title: "Terms & Conditions", desc: "Subscription terms, acceptable use, liability.", priority: "high" },
      { title: "Refund / Cancellation Policy", desc: "Required by Razorpay & Play Store.", priority: "high" },
      { title: "Contact / Support page", desc: "Email + phone visible to users.", priority: "high" },
    ],
  },
  {
    id: "branding",
    icon: Palette,
    title: "B. Branding & Store Listing",
    subtitle: "Visual assets uploaded to Play Console.",
    items: [
      { title: "App icon", desc: "512×512 PNG, no transparency, no text padding." },
      { title: "Feature graphic", desc: "1024×500 PNG/JPG hero banner." },
      { title: "Phone screenshots", desc: "Minimum 2, recommended 4–8 (1080×1920)." },
      { title: "Short description", desc: "Up to 80 chars — keyword-rich." },
      { title: "Full description", desc: "Up to 4000 chars — features, benefits, FAQs." },
      { title: "Promo video (optional)", desc: "30–120s YouTube link boosts conversion." },
      { title: "Category & content rating", desc: "Productivity / Business; complete IARC questionnaire." },
    ],
  },
  {
    id: "multi-tenant",
    icon: Users,
    title: "C. Multi-Tenant Architecture",
    subtitle: "Each PG owner's data must be fully isolated.",
    items: [
      { title: "RLS on every table", desc: "Verify pgs.owner_id = auth.uid() on every read/write.", priority: "high" },
      { title: "Data partitioned by pg_id", desc: "All queries scoped to current property.", priority: "high" },
      { title: "Run Supabase linter", desc: "Resolve security advisories before launch.", priority: "high" },
      { title: "Rate limiting on edge functions", desc: "Prevent abuse of WhatsApp / receipt endpoints." },
      { title: "Soft-delete strategy", desc: "Recover accidentally deleted tenants/payments." },
      { title: "Backups", desc: "Lovable Cloud automated PITR — verify retention." },
    ],
  },
  {
    id: "auth",
    icon: Lock,
    title: "D. Authentication Hardening",
    subtitle: "Account safety is non-negotiable.",
    items: [
      { title: "HIBP leaked-password check", desc: "Enable in Auth → Password settings.", priority: "high" },
      { title: "Email verification ON", desc: "Block sign-in until verified.", priority: "high" },
      { title: "Password reset flow", desc: "Tested end-to-end with custom email template." },
      { title: "Google Sign-In", desc: "Faster onboarding, reduces password fatigue." },
      { title: "Account deletion flow", desc: "Mandatory by Play Store since 2024.", priority: "high" },
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "E. Payments & Subscriptions",
    subtitle: "Razorpay live + bulletproof reconciliation.",
    items: [
      { title: "Razorpay live keys", desc: "Switch from test to live after KYC completion.", priority: "high" },
      { title: "Webhook signature verification", desc: "Always validate X-Razorpay-Signature.", priority: "high" },
      { title: "Invoice generation", desc: "GST-compliant PDF emailed after each payment." },
      { title: "Subscription renewal logic", desc: "Auto-charge + grace period + dunning emails." },
      { title: "Failed payment recovery", desc: "Retry + downgrade after N days." },
      { title: "Play Store policy", desc: "SaaS service — exempt from Play Billing requirement." },
    ],
  },
  {
    id: "android",
    icon: Smartphone,
    title: "F. Capacitor & Android Build",
    subtitle: "Convert the web app to a signed AAB.",
    items: [
      { title: "capacitor.config.ts", desc: "appId: com.sanjay.pgmanagement; remove dev server URL for release." },
      { title: "Generate keystore", desc: "keytool -genkey -v -keystore pgmanager.keystore ..." },
      { title: "versionCode / versionName", desc: "Increment versionCode every upload." },
      { title: "Target SDK 34+", desc: "Required by Play Store as of August 2024." },
      { title: "Permissions", desc: "INTERNET, CAMERA, WRITE_EXTERNAL_STORAGE in AndroidManifest." },
      { title: "Splash screen + status bar", desc: "@capacitor/splash-screen, @capacitor/status-bar." },
      { title: "Deep links", desc: "Razorpay return URL → app intent filter." },
      { title: "ProGuard / R8", desc: "Enable minification for smaller AAB." },
    ],
  },
  {
    id: "perf",
    icon: Gauge,
    title: "G. Performance & UX",
    subtitle: "Snappy on low-end devices.",
    items: [
      { title: "Service worker", desc: "Asset cache + offline shell." },
      { title: "Lazy loading", desc: "Route-level React.lazy on heavy screens." },
      { title: "Image optimization", desc: "WebP + responsive sizes." },
      { title: "Skeleton loaders", desc: "Already in place across financial cards." },
      { title: "Error boundary", desc: "Friendly fallback instead of blank screen." },
      { title: "Crash reporting", desc: "Sentry React + Capacitor SDK.", priority: "high" },
      { title: "Pull-to-refresh", desc: "Already implemented — verify on Android." },
    ],
  },
  {
    id: "notif",
    icon: Bell,
    title: "H. Notifications & Comms",
    subtitle: "Reach tenants and owners reliably.",
    items: [
      { title: "Firebase Cloud Messaging", desc: "Push notifications for payment events." },
      { title: "In-app notification center", desc: "Persistent feed of recent events." },
      { title: "WhatsApp Business API", desc: "Upgrade from manual share to automation." },
      { title: "Transactional email", desc: "Resend or SendGrid for receipts." },
    ],
  },
  {
    id: "compliance",
    icon: FileCheck2,
    title: "I. Play Store Compliance",
    subtitle: "Forms & policies inside Play Console.",
    items: [
      { title: "Data Safety form", desc: "Declare every data type collected.", priority: "high" },
      { title: "Permissions declaration", desc: "Justify each runtime permission." },
      { title: "Target audience", desc: "Adults — confirms non-COPPA scope." },
      { title: "Account deletion URL", desc: "Public web page to request deletion.", priority: "high" },
      { title: "DPDP Act compliance", desc: "India data deletion request endpoint." },
    ],
  },
  {
    id: "testing",
    icon: TestTube2,
    title: "J. Testing Tracks",
    subtitle: "Required quality gates.",
    items: [
      { title: "Internal testing", desc: "Up to 100 testers, instant rollout." },
      { title: "Closed beta (14 days)", desc: "Mandatory for new dev accounts.", priority: "high" },
      { title: "Open beta", desc: "Public opt-in link." },
      { title: "End-to-end test", desc: "Sign-up → add PG → tenant → payment → receipt." },
      { title: "Low-end + slow 3G", desc: "Test on 2GB RAM device, throttled network." },
    ],
  },
  {
    id: "ops",
    icon: Activity,
    title: "K. Monitoring & Support",
    subtitle: "Stay informed after launch.",
    items: [
      { title: "Status page", desc: "UptimeRobot or BetterStack." },
      { title: "Customer support inbox", desc: "Email + WhatsApp number monitored daily." },
      { title: "Onboarding tutorial", desc: "Coach marks for first-time users." },
      { title: "Help / FAQ", desc: "Searchable from inside the app." },
      { title: "Bug-report shortcut", desc: "One-tap feedback with screenshot." },
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    title: "L. Marketing & Growth",
    subtitle: "Bring users in.",
    items: [
      { title: "Landing page", desc: "Already live at /landing." },
      { title: "ASO", desc: "Optimize title, short desc, screenshots for keywords." },
      { title: "Referral program", desc: "Reward owners for inviting peers." },
      { title: "Pricing page", desc: "Visible plans + upgrade CTA." },
      { title: "Demo video", desc: "60s product walkthrough." },
    ],
  },
];

const priorityChecklist = [
  "Privacy Policy + T&C + Refund Policy URLs",
  "Account deletion flow (Play mandate)",
  "Razorpay live KYC + webhook verification",
  "Email verification + HIBP leaked-password check",
  "Sentry crash reporting wired up",
  "Internal testing on a real Android device",
  "Data Safety form completed",
  "Signed AAB built and uploaded",
];

const androidSteps = [
  { cmd: "git clone <repo> && cd pg-manager", desc: "Pull the project locally." },
  { cmd: "npm install", desc: "Install dependencies." },
  { cmd: "npm install @capacitor/android", desc: "Add the Android platform package." },
  { cmd: "npx cap add android", desc: "Generate the native android/ folder." },
  { cmd: "npm run build", desc: "Build production web bundle." },
  { cmd: "npx cap sync android", desc: "Copy web build into native project." },
  { cmd: "npx cap open android", desc: "Open Android Studio." },
  { cmd: "Build → Generate Signed Bundle → AAB", desc: "Output: android/app/release/app-release.aab" },
];

const PriorityDot = ({ p }: { p?: "high" | "med" | "low" }) => {
  const color =
    p === "high"
      ? "bg-red-500"
      : p === "med"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
};

const PublishGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Play Store Readiness</span>
          </div>
          <div className="w-[68px]" />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="container mx-auto px-4 py-14 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge variant="secondary" className="mb-4">A → Z launch checklist</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-foreground">
              Ship PG Manager to the Play Store
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground">
              Everything required to take this web app to a multi-user, production-grade Android release —
              grouped, prioritized, collapsible.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-10 space-y-12 max-w-4xl">
        {/* Priority callout */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Do these first</h2>
              </div>
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/90">
                {priorityChecklist.map((p, i) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                      {i + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.section>

        {/* Sections */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Full checklist</h2>
          <Accordion type="multiple" className="space-y-3">
            {sections.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
              >
                <AccordionItem
                  value={s.id}
                  className="border border-border/60 rounded-xl bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <s.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.subtitle}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ul className="space-y-3 pl-1">
                      {s.items.map((it) => (
                        <li
                          key={it.title}
                          className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 p-3"
                        >
                          <PriorityDot p={it.priority} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {it.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {it.desc}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </section>

        {/* Android build steps */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Web → Android, step by step</h2>
          </div>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-3">
                {androidSteps.map((step, i) => (
                  <li key={step.cmd} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="block text-xs sm:text-sm font-mono bg-muted text-foreground rounded-md px-3 py-2 break-all">
                        {step.cmd}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1">{step.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground mb-1">Daily workflow</div>
                <code className="block font-mono">
                  git pull → npm install → npm run build → npx cap sync android → npx cap open android
                </code>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Footer CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center pt-4"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Pick any item above and ask Lovable to implement it next.
          </p>
          <Button onClick={() => navigate("/")}>Back to dashboard</Button>
        </motion.section>
      </main>
    </div>
  );
};

export default PublishGuide;