import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Receipt,
  BarChart3,
  Shield,
  Smartphone,
  Bell,
  CreditCard,
  Star,
  ArrowRight,
  Check,
  Crown } from
"lucide-react";
import { motion } from "framer-motion";
import appLogo from "@/assets/splash-uploaded-logo.png";
import { SUBSCRIPTION_PLANS } from "@/types/pg";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FAQSection from "@/components/landing/FAQSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import PhoneMockup from "@/components/landing/PhoneMockup";
import ContactSection from "@/components/landing/ContactSection";
import AppShowcase from "@/components/landing/AppShowcase";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
{
  icon: Building2,
  title: "Multi-PG Management",
  description: "Manage multiple PG properties from a single dashboard with ease."
},
{
  icon: Users,
  title: "Tenant Tracking",
  description: "Complete tenant lifecycle — join, pay, leave — all tracked automatically."
},
{
  icon: Receipt,
  title: "Rent Collection",
  description: "Digital rent receipts, payment tracking, and overdue alerts in real time."
},
{
  icon: BarChart3,
  title: "Reports & Analytics",
  description: "Visual reports on occupancy, revenue, and payment trends at a glance."
},
{
  icon: Bell,
  title: "WhatsApp Reminders",
  description: "Send rent reminders directly via WhatsApp — manual or automated."
},
{
  icon: Shield,
  title: "Security Deposits",
  description: "Track security deposits, generate receipts, and manage refunds."
}];


const testimonials = [
{
  name: "Rajesh K.",
  role: "PG Owner, Hyderabad",
  text: "This app saved me 5 hours every week on rent collection. The WhatsApp reminders are a game changer!",
  rating: 5
},
{
  name: "Priya M.",
  role: "PG Manager, Bangalore",
  text: "Managing 3 PGs was a nightmare before. Now everything is in one place. Highly recommend!",
  rating: 5
},
{
  name: "Arun S.",
  role: "Hostel Owner, Chennai",
  text: "The receipt generation and tenant tracking features are exactly what I needed. Worth every rupee.",
  rating: 5
}];


const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 }
  })
};

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-px">
            <img alt="PG Manager" className="h-10 w-9 object-contain" src="/lovable-uploads/e6c9e1f8-79c6-4213-b090-2b4644b8ac55.jpg" />
            <span className="text-lg font-bold text-foreground border-0 rounded-md ml-[10px]">  PG Manager</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">FAQ</button>
            <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Contact</button>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={() => navigate("/auth")}>
              Sign Up <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="container mx-auto px-4 pt-20 pb-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto">

            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              🚀 Trusted by 500+ PG Owners across India
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Manage Your PG
              <span className="text-primary block mt-2">Like a Pro</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The all-in-one platform to track tenants, collect rent, send reminders, and grow your PG business — all
              from your phone.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                Start Free Trial <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>

                See Features
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-16">

            {[
            { value: "500+", label: "PG Owners" },
            { value: "10K+", label: "Tenants Managed" },
            { value: "₹5Cr+", label: "Rent Collected" }].
            map((stat) =>
            <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            )}
          </motion.div>

          {/* Phone Mockup */}
          <PhoneMockup />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Everything You Need to Run Your PG</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From tenant onboarding to monthly reports — we've got every aspect of PG management covered.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, i) =>
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}>

                <Card className="h-full hover:shadow-lg transition-shadow border-border/50">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* App Showcase Carousel */}
      <AppShowcase />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Comparison & Trust */}
      <ComparisonSection />

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">Choose the plan that fits your needs. Upgrade anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Manual Plan */}
            <Card className="relative border-border hover:border-primary/50 transition-all">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-xl font-semibold mb-2">Manual Plan</h3>
                <p className="text-muted-foreground text-sm mb-4">{SUBSCRIPTION_PLANS.manual.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">₹{SUBSCRIPTION_PLANS.manual.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                  "Limited PGs (2)",
                  "Unlimited Tenants",
                  "Manual WhatsApp Reminders",
                  "Payment Receipts",
                  "Basic Reports",
                  "AI Logo Generator"].
                  map((f) =>
                  <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  )}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Automatic Plan */}
            <Card className="relative border-primary ring-2 ring-primary/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1">
                  <Crown className="h-3 w-3 mr-1" /> Most Popular
                </Badge>
              </div>
              <CardContent className="pt-8 pb-8">
                <h3 className="text-xl font-semibold mb-2">Automatic Plan</h3>
                <p className="text-muted-foreground text-sm mb-4">{SUBSCRIPTION_PLANS.automatic.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">₹{SUBSCRIPTION_PLANS.automatic.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                  "Unlimited PGs",
                  "Unlimited Tenants",
                  "Automated Image Reminders",
                  "Smart Payment Receipts",
                  "Daily Activity Reports",
                  "AI Logo Generator"].
                  map((f) =>
                  <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  )}
                </ul>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  Get Started <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Loved by PG Owners</h2>
            <p className="text-lg text-muted-foreground">See what our users have to say</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) =>
            <motion.div
              key={t.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}>

                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: t.rating }).map((_, idx) =>
                    <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    )}
                    </div>
                    <p className="text-foreground mb-4 text-sm leading-relaxed">"{t.text}"</p>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-muted-foreground text-xs">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <FAQSection />
      </section>

      {/* Contact */}
      <ContactSection />

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready to Simplify Your PG Management?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join 500+ PG owners who are saving time and growing revenue with PG Manager.
          </p>
          <Button size="lg" className="text-lg px-10 py-6" onClick={() => navigate("/auth")}>
            Get Started <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img alt="PG Manager" className="h-12 w-12 object-contain" src="/lovable-uploads/b1a13d19-8ccf-45ef-a671-245f3213d3b7.png" />
            <span className="text-sm font-medium text-foreground">PG Manager</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PG Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>);

};

export default Landing;