import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import dashboard from "@/assets/screenshots/dashboard.jpg";
import rooms from "@/assets/screenshots/rooms.jpg";
import securityDeposits from "@/assets/screenshots/security-deposits.jpg";
import paymentReconciliation from "@/assets/screenshots/payment-reconciliation.jpg";
import paymentDetails from "@/assets/screenshots/payment-details.jpg";
import settlement from "@/assets/screenshots/settlement.jpg";
import whatsappReminders from "@/assets/screenshots/whatsapp-reminders.jpg";
import customMessage from "@/assets/screenshots/custom-message.jpg";
import reports from "@/assets/screenshots/reports.jpg";
import dayGuests from "@/assets/screenshots/day-guests.jpg";

const screens = [
  { src: dashboard, label: "Dashboard" },
  { src: rooms, label: "Room Management" },
  { src: securityDeposits, label: "Security Deposits" },
  { src: paymentReconciliation, label: "Payment Reconciliation" },
  { src: paymentDetails, label: "Payment Details" },
  { src: settlement, label: "Settlement Summary" },
  { src: whatsappReminders, label: "WhatsApp Reminders" },
  { src: customMessage, label: "Custom Messages" },
  { src: reports, label: "Reports & Analytics" },
  { src: dayGuests, label: "Day Guest Tracking" },
];

const AppShowcase = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const go = useCallback((dir: number) => {
    setDirection(dir);
    setCurrent((prev) => (prev + dir + screens.length) % screens.length);
  }, []);

  // Auto-advance every 4s
  useEffect(() => {
    const timer = setInterval(() => go(1), 4000);
    return () => clearInterval(timer);
  }, [go]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 120 : -120, opacity: 0, scale: 0.92 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -120 : 120, opacity: 0, scale: 0.92 }),
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            See It in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore the powerful features that make PG management effortless.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* Phone frame with carousel */}
          <div className="relative flex items-center gap-4">
            <button
              onClick={() => go(-1)}
              className="hidden sm:flex h-10 w-10 rounded-full border border-border bg-background items-center justify-center hover:bg-muted transition-colors"
              aria-label="Previous screen"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="relative w-[260px] sm:w-[280px]">
              {/* Phone bezel */}
              <div className="rounded-[2.5rem] border-[6px] border-foreground/20 bg-background shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/20 rounded-b-2xl z-20" />
                {/* Screen */}
                <div className="rounded-[2rem] overflow-hidden aspect-[9/19.5] relative bg-muted">
                  <AnimatePresence custom={direction} mode="wait">
                    <motion.img
                      key={current}
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      src={screens[current].src}
                      alt={screens[current].label}
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                  </AnimatePresence>
                </div>
              </div>
              {/* Glow */}
              <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] blur-2xl -z-10" />
            </div>

            <button
              onClick={() => go(1)}
              className="hidden sm:flex h-10 w-10 rounded-full border border-border bg-background items-center justify-center hover:bg-muted transition-colors"
              aria-label="Next screen"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Label */}
          <motion.p
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold text-primary"
          >
            {screens[current].label}
          </motion.p>

          {/* Dots */}
          <div className="flex gap-2">
            {screens.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to ${screens[i].label}`}
              />
            ))}
          </div>

          {/* Mobile swipe hint */}
          <div className="flex sm:hidden gap-4 mt-2">
            <button onClick={() => go(-1)} className="text-sm text-muted-foreground flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button onClick={() => go(1)} className="text-sm text-muted-foreground flex items-center gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
