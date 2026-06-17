import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { 
  CreditCard, 
  Bell, 
  Receipt, 
  TrendingUp, 
  Users, 
  Building2, 
  Wrench, 
  BarChart3,
  ArrowRight
} from "lucide-react";
import onboarding1 from "@/assets/onboarding/onboarding1.png";
import onboarding2 from "@/assets/onboarding/onboarding2.png";

const ONBOARDING_DATA = [
  {
    image: onboarding1,
    title: "Collect Rent Instantly",
    titleIcon: "✨",
    subtitle: "Accept rent payments, send reminders, generate receipts, and track collections automatically.",
    features: [
      {
        icon: CreditCard,
        title: "Online Payments",
        desc: "UPI, Cards, Wallets"
      },
      {
        icon: Bell,
        title: "Smart Reminders",
        desc: "Never miss a rent"
      },
      {
        icon: Receipt,
        title: "Digital Receipts",
        desc: "Instant & shareable"
      },
      {
        icon: TrendingUp,
        title: "Track Collections",
        desc: "Real-time updates"
      }
    ]
  },
  {
    image: onboarding2,
    title: "Manage Your PG Effortlessly",
    titleIcon: "✦",
    subtitle: "Track tenants, rooms, maintenance requests, and daily operations from one place.",
    features: [
      {
        icon: Users,
        title: "Manage Tenants",
        desc: "Add, track & manage all your tenants"
      },
      {
        icon: Building2,
        title: "Manage Rooms",
        desc: "Track rooms, rent & occupancy"
      },
      {
        icon: Wrench,
        title: "Maintenance",
        desc: "Handle requests instantly"
      },
      {
        icon: BarChart3,
        title: "Smart Reports",
        desc: "Get insights & grow your business"
      }
    ]
  }
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
      x: dir > 0 ? 300 : -300,
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
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const slide = ONBOARDING_DATA[currentSlide];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070913]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#070913] text-white overflow-hidden px-6 py-8 select-none">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#1d2d5f] to-transparent opacity-40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#121c3b] to-transparent opacity-30 blur-[120px] pointer-events-none" />

      {/* Header with Skip button */}
      <div className="w-full flex justify-end items-center h-10 relative z-20">
        <button 
          onClick={completeOnboarding}
          className="text-sm font-semibold text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5 active:scale-95 duration-100"
        >
          Skip
        </button>
      </div>

      {/* Slides Container */}
      <div className="flex-1 flex flex-col justify-center my-4 relative z-10 max-w-md mx-auto w-full">
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
            className="w-full h-full flex flex-col justify-center space-y-6 cursor-grab active:cursor-grabbing"
          >
            {/* Cropped Illustration */}
            <div className="relative w-full aspect-[1.1] overflow-hidden rounded-[24px] border border-white/[0.06] bg-black/40 shadow-2xl">
              <img 
                src={slide.image} 
                className="absolute left-0 w-full"
                style={{
                  top: '-7.5%',
                  height: '185%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  pointerEvents: 'none' // prevents browser drag image behavior
                }}
                alt={slide.title}
              />
            </div>

            {/* Title & Description */}
            <div className="space-y-2 text-left px-1">
              <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                {slide.title}
                <span className="text-2xl">{slide.titleIcon}</span>
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                {slide.subtitle}
              </p>
            </div>

            {/* 2x2 Features Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-[20px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-md">
              {slide.features.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div key={idx} className="flex items-start p-1.5">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mr-3 border border-blue-500/10">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{feat.title}</h4>
                      <p className="text-[10px] text-gray-400 font-semibold leading-tight line-clamp-2">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Controls (Pagination & Navigation Button) */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between mt-4 relative z-20 px-2 h-14">
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
