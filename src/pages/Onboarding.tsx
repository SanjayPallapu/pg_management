import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import onboardingGrow from "@/assets/pg-hub/onboarding-grow.png";
import onboardingHub from "@/assets/pg-hub/onboarding-hub.png";
import onboardingRent from "@/assets/pg-hub/onboarding-rent.png";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";

const slides = [
  {
    id: "grow",
    titleTop: "Grow",
    titleBottom: "Your PG",
    strong: "Fill rooms faster. Manage less manually.",
    body: "Track occupancy, tenants, rent, and payments in one simple app.",
    image: onboardingGrow,
  },
  {
    id: "hub",
    titleTop: "Everything in",
    titleBottom: "One Place",
    strong: "Rooms, tenants, rent, reports — all connected.",
    body: "Run your PG with one dashboard for occupancy, collections, receipts, and reminders.",
    image: onboardingHub,
  },
  {
    id: "rent",
    titleTop: "Never Miss",
    titleBottom: "Rent Again",
    strong: "Automate reminders and collect on time.",
    body: "Send reminders, track payments, and record every receipt without chasing tenants.",
    image: onboardingRent,
  },
] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    if (localStorage.getItem("hasCompletedOnboarding") === "true") {
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const finish = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    navigate("/auth", { replace: true });
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > active ? 1 : -1);
    setActive(next);
  };

  const next = () => {
    if (active === slides.length - 1) finish();
    else goTo(active + 1);
  };

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -55) next();
    if (info.offset.x > 55) goTo(active - 1);
  };

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-[#08052f]"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>;
  }

  const slide = slides[active];

  return (
    <PGHubShell variant="dark" className="pgh-onboarding">
      <div className="pgh-onboarding__page">
        <button type="button" className="pgh-onboarding__skip" onClick={finish}>Skip</button>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section
            key={slide.id}
            className="pgh-onboarding__slide"
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 70 : -70 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -70 : 70 }}
            transition={{ type: "spring", stiffness: 230, damping: 25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
          >
            <div className="pgh-onboarding__copy">
              <PGHubBrand dark />
              <h1>{slide.titleTop}<em>{slide.titleBottom}</em></h1>
              <strong>{slide.strong}</strong>
              <p>{slide.body}</p>
            </div>
            <motion.div
              className={`pgh-onboarding__art pgh-onboarding__art--${slide.id}`}
              animate={{ y: [-5, 7, -5], rotate: slide.id === "rent" ? [-.6, .6, -.6] : [-.2, .2, -.2] }}
              transition={{ duration: slide.id === "hub" ? 5.2 : 3.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={slide.image} alt="" />
            </motion.div>
          </motion.section>
        </AnimatePresence>

        <footer className="pgh-onboarding__footer">
          <div className="pgh-dots" aria-label={`Slide ${active + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}`} />
            ))}
          </div>
          <PGHubButton onClick={next} showArrow>{active === slides.length - 1 ? "Get Started" : "Next"}</PGHubButton>
          {active > 0 && <button type="button" className="pgh-onboarding__back" onClick={() => goTo(active - 1)}>Back</button>}
        </footer>
      </div>
    </PGHubShell>
  );
}
