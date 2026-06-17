import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowRight } from "lucide-react";
import onboarding1 from "@/assets/onboarding/onboarding1.png";
import onboarding2 from "@/assets/onboarding/onboarding2.png";

const ONBOARDING_DATA = [
  { image: onboarding1, title: "Screen 1" },
  { image: onboarding2, title: "Screen 2" }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate("/", { replace: true });
    } else {
      const hasCompleted = localStorage.getItem("hasCompletedOnboarding") === "true";
      if (hasCompleted) {
        navigate("/auth", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  const nextSlide = () => {
    if (currentSlide < ONBOARDING_DATA.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    navigate("/auth", { replace: true });
  };

  // Drag handlers for touch/swipe gestures
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 55;
    if (info.offset.x < -swipeThreshold) {
      nextSlide();
    } else if (info.offset.x > swipeThreshold) {
      prevSlide();
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : "-100%",
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070913]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const slide = ONBOARDING_DATA[currentSlide];

  return (
    <div className="relative h-screen w-full bg-[#070913] text-white overflow-hidden select-none">
      {/* Header with Skip button */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={completeOnboarding}
          className="text-sm font-semibold text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg bg-black/40 backdrop-blur-md border border-white/5 active:scale-95 duration-100 shadow-lg shadow-black/40"
        >
          Skip
        </button>
      </div>

      {/* Slides Container */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          >
            {/* Full screen screenshot image */}
            <img 
              src={slide.image} 
              className="w-full h-full object-cover"
              style={{ pointerEvents: 'none' }}
              alt={slide.title}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls Overlay */}
      <div className="absolute bottom-8 left-6 right-6 z-20 flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md max-w-sm mx-auto shadow-2xl shadow-black/50">
        {/* Pagination Dots */}
        <div className="flex gap-2">
          {ONBOARDING_DATA.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentSlide ? 1 : -1);
                setCurrentSlide(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx ? "w-6 bg-blue-500" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button
          onClick={nextSlide}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#4f8eff] to-[#3a76e8] hover:from-[#609aff] hover:to-[#4a84fa] text-white font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5"
        >
          {currentSlide === ONBOARDING_DATA.length - 1 ? (
            "Get Started"
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
