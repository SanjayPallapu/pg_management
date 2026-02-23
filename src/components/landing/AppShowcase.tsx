import { useState, useEffect, useCallback, useRef } from "react";
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
import rentManagement from "@/assets/screenshots/rent-management.jpg";
import paymentReceipt from "@/assets/screenshots/payment-receipt.jpg";
import paymentReceiptFull from "@/assets/screenshots/payment-receipt-full.jpg";
import welcomeTenant from "@/assets/screenshots/welcome-tenant.jpg";
import welcomeMessage from "@/assets/screenshots/welcome-message.jpg";
import paymentReminderDetail from "@/assets/screenshots/payment-reminder-detail.jpg";
import paymentReminderSend from "@/assets/screenshots/payment-reminder-send.jpg";
import securityDepositReceipt from "@/assets/screenshots/security-deposit-receipt.jpg";
import securityDepositFull from "@/assets/screenshots/security-deposit-full.jpg";

const screens = [
  { src: dashboard, label: "Dashboard" },
  { src: rooms, label: "Room Management" },
  { src: rentManagement, label: "Rent Collection" },
  { src: paymentDetails, label: "Payment Details" },
  { src: paymentReceipt, label: "Payment Receipt" },
  { src: paymentReceiptFull, label: "Receipt Preview" },
  { src: paymentReconciliation, label: "Reconciliation" },
  { src: settlement, label: "Settlement Summary" },
  { src: whatsappReminders, label: "WhatsApp Reminders" },
  { src: paymentReminderDetail, label: "Reminder Detail" },
  { src: paymentReminderSend, label: "Send Reminder" },
  { src: welcomeTenant, label: "Welcome Tenant" },
  { src: welcomeMessage, label: "Welcome Message" },
  { src: securityDeposits, label: "Security Deposits" },
  { src: securityDepositReceipt, label: "Deposit Receipt" },
  { src: securityDepositFull, label: "Deposit Details" },
  { src: customMessage, label: "Custom Messages" },
  { src: reports, label: "Reports & Analytics" },
  { src: dayGuests, label: "Day Guest Tracking" },
];

// Preload all images on mount
const preloadImages = () => {
  screens.forEach(({ src }) => {
    const img = new Image();
    img.src = src;
  });
};

const AppShowcase = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const touchStartX = useRef(0);

  // Preload all images eagerly
  useEffect(() => {
    preloadImages();
  }, []);

  const go = useCallback((dir: number) => {
    setHasInteracted(true);
    setDirection(dir);
    setCurrent((prev) => (prev + dir + screens.length) % screens.length);
  }, []);

  // Auto-advance every 4s
  useEffect(() => {
    const timer = setInterval(() => go(1), 4000);
    return () => clearInterval(timer);
  }, [go]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      go(delta < 0 ? 1 : -1);
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  // Show first image instantly, animate only after interaction
  const shouldAnimate = hasInteracted;

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

            <div
              className="relative w-[260px] sm:w-[280px]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Phone bezel */}
              <div className="rounded-[2.5rem] border-[6px] border-foreground/20 bg-background shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/20 rounded-b-2xl z-20" />
                {/* Screen */}
                <div className="rounded-[2rem] overflow-hidden aspect-[9/19.5] relative bg-muted">
                  {shouldAnimate ? (
                    <AnimatePresence custom={direction} initial={false} mode="wait">
                      <motion.img
                        key={current}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        src={screens[current].src}
                        alt={screens[current].label}
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                      />
                    </AnimatePresence>
                  ) : (
                    <img
                      src={screens[current].src}
                      alt={screens[current].label}
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                  )}
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

          {/* Dots - scrollable on mobile */}
          <div className="flex gap-1.5 max-w-[280px] sm:max-w-none overflow-x-auto py-1 px-2">
            {screens.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                  i === current
                    ? "w-5 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to ${screens[i].label}`}
              />
            ))}
          </div>

          {/* Mobile swipe hint */}
          <p className="text-xs text-muted-foreground sm:hidden">← Swipe to navigate →</p>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
