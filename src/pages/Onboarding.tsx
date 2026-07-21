import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import onboardingScreen1 from "@/assets/pg-hub/onboarding-screen-1.png";
import onboardingScreen2 from "@/assets/pg-hub/onboarding-screen-2.png";
import onboardingScreen3 from "@/assets/pg-hub/onboarding-screen-3.png";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";

const slides = [
  {
    id: "grow",
    titleTop: "Grow",
    titleBottom: "Your PG",
    subheading: "Fill rooms faster. Manage less manually.",
    body: "Track occupancy, tenants, rent, and payments in one simple app.",
    accent: "#8B5CF6",
    image: onboardingScreen1,
  },
  {
    id: "everything",
    titleTop: "Everything in",
    titleBottom: "One Place",
    subheading: "Rooms, tenants, payments, and reports—all connected.",
    body: "Manage your entire PG from one dashboard with real-time updates and reminders.",
    accent: "#9A67FF",
    image: onboardingScreen3,
  },
  {
    id: "rent",
    titleTop: "Never Miss",
    titleBottom: "Rent Again",
    subheading: "Automate reminders and collect rent on time.",
    body: "Track payments, send reminders, and generate receipts without chasing tenants.",
    accent: "#A855F7",
    image: onboardingScreen2,
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
    return <div className="min-h-screen grid place-items-center bg-[#080711]"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  }

  const slide = slides[active];

  return (
    <PGHubShell variant="dark" className="pgh-onboarding">
      <div className="pgh-onboarding__page">
        <AnimatePresence custom={direction}>
          <motion.section
            key={slide.id}
            className={`pgh-onboarding__slide pgh-onboarding__slide--${slide.id}`}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 55 : -55 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -55 : 55 }}
            transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
          >
            <motion.img
              className="pgh-onboarding__background"
              src={slide.image}
              alt=""
              aria-hidden="true"
              initial={{ scale: 1.02 }}
              animate={{ scale: [1.02, 1.045, 1.02], y: [0, -3, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="pgh-onboarding__shade" aria-hidden="true" />
            <motion.div
              className="pgh-onboarding__copy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .12, duration: .48 }}
            >
              <h1>{slide.titleTop}<em style={{ color: slide.accent }}>{slide.titleBottom}</em></h1>
              <strong>{slide.subheading}</strong>
              <p>{slide.body}</p>
            </motion.div>
          </motion.section>
        </AnimatePresence>

        <footer className="pgh-onboarding__footer">
          <div className="pgh-dots" aria-label={`Slide ${active + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}`} />
            ))}
          </div>
          <div className={`pgh-onboarding__nav ${active === 0 ? "is-first" : ""}`}>
            {active > 0 && (
              <button type="button" className="pgh-onboarding__nav-button pgh-onboarding__nav-button--back" onClick={() => goTo(active - 1)}>
                <ArrowLeft size={20} /> Back
              </button>
            )}
            <button type="button" className="pgh-onboarding__nav-button pgh-onboarding__nav-button--next" onClick={next}>
              Next <ArrowRight size={20} />
            </button>
          </div>
        </footer>
      </div>
    </PGHubShell>
  );
}
