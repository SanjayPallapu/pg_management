import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import journeyProperty from "@/assets/pg-hub/hub-building-hero.png";
import journeyFeatures from "@/assets/pg-hub/hub-feature-hub.png";
import journeyRent from "@/assets/pg-hub/hub-rent-phone.png";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";

const slides = [
  {
    id: "property",
    eyebrow: "Grow your PG",
    titleTop: "Grow",
    titleBottom: "Your PG",
    body: "Fill rooms faster. Manage less manually. Track occupancy, tenants, rent and payments in one simple app.",
    image: journeyProperty,
  },
  {
    id: "features",
    eyebrow: "One connected workspace",
    titleTop: "Everything in",
    titleBottom: "One Place",
    body: "Rooms, tenants, rent, reports — all connected. Run your PG with one dashboard for occupancy, collections, receipts and reminders.",
    image: journeyFeatures,
  },
  {
    id: "rent",
    eyebrow: "Never miss a payment",
    titleTop: "Never Miss",
    titleBottom: "Rent Again",
    body: "Automatic reminders, instant receipts and clear collection tracking — every tenant, every month.",
    image: journeyRent,
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
      <div className="pgh-onboarding__page pgh-journey">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section
            key={slide.id}
            className={`pgh-onboarding__slide pgh-journey__slide pgh-journey__slide--${slide.id}`}
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
            <motion.div
              className="pgh-journey__visual"
              initial={{ scale: 1.035 }}
              animate={{ scale: [1.035, 1.065, 1.035], y: [0, -4, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <img className="pgh-journey__backdrop" src={slide.image} alt="" aria-hidden="true" />
              <img className="pgh-journey__image" src={slide.image} alt="" />
            </motion.div>
            <div className="pgh-journey__shade" aria-hidden="true" />
            <header className="pgh-journey__header">
              <PGHubBrand dark compact />
              <button type="button" className="pgh-onboarding__skip" onClick={finish}>Skip</button>
            </header>
            <motion.div
              className="pgh-onboarding__copy pgh-journey__copy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .12, duration: .48 }}
            >
              <span className="pgh-journey__eyebrow">{slide.eyebrow}</span>
              <h1>{slide.titleTop}<em>{slide.titleBottom}</em></h1>
              <p>{slide.body}</p>
            </motion.div>
          </motion.section>
        </AnimatePresence>

        <footer className="pgh-onboarding__footer">
          <div className="pgh-journey__progress-row">
            <div className="pgh-dots" aria-label={`Slide ${active + 1} of ${slides.length}`}>
              {slides.map((item, index) => (
                <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}`} />
              ))}
            </div>
            <span>0{active + 1} / 0{slides.length}</span>
          </div>
          <PGHubButton onClick={next} showArrow>{active === slides.length - 1 ? "Get Started" : "Next"}</PGHubButton>
          <button type="button" className="pgh-onboarding__back" onClick={() => active > 0 ? goTo(active - 1) : finish()}>{active > 0 ? "Back" : "I already have an account"}</button>
        </footer>
      </div>
    </PGHubShell>
  );
}
