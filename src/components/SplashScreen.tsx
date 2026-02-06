import { useMemo } from "react";
import { motion } from "framer-motion";
import splashLogo from "@/assets/splash-uploaded-logo.png";

const SplashScreen = () => {
  // Floating bubbles
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const size = 14 + ((i * 11) % 34);
        const left = (i * 17) % 100;
        const delay = (i % 7) * 0.35;
        const duration = 5.5 + (i % 6) * 1.1;
        const drift = -12 - (i % 5) * 6;
        return { id: i, size, left, delay, duration, drift };
      }),
    []
  );

  // Snowflakes
  const snowflakes = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const size = 3 + ((i * 7) % 6);
        const left = (i * 13 + 5) % 100;
        const delay = (i % 10) * 0.5;
        const duration = 6 + (i % 5) * 2;
        const drift = -20 + (i % 7) * 8;
        return { id: i, size, left, delay, duration, drift };
      }),
    []
  );

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-transparent overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Soft backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 30%, hsl(var(--primary) / 0.18) 0%, transparent 55%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background) / 0.92) 100%)",
        }}
      />

      {/* Floating bubbles */}
      <div className="absolute inset-0" aria-hidden="true">
        {bubbles.map((b) => (
          <motion.span
            key={`bubble-${b.id}`}
            className="absolute rounded-full bg-primary/10 border border-primary/15"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              top: "110%",
            }}
            animate={{
              y: [0, -900],
              x: [0, b.drift, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: b.duration,
              delay: b.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Snowflakes falling from top */}
      <div className="absolute inset-0" aria-hidden="true">
        {snowflakes.map((s) => (
          <motion.span
            key={`snow-${s.id}`}
            className="absolute rounded-full bg-foreground/20"
            style={{
              width: s.size,
              height: s.size,
              left: `${s.left}%`,
              top: "-5%",
            }}
            animate={{
              y: [0, window.innerHeight + 50],
              x: [0, s.drift, 0],
              opacity: [0, 0.7, 0.7, 0],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Logo - larger */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <motion.img
          src={splashLogo}
          alt="App logo"
          className="w-56 h-56 object-contain"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Title text */}
      <motion.h1
        className="text-2xl font-bold text-foreground mt-6 tracking-wide"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        PG Management
      </motion.h1>

      {/* Tagline */}
      <motion.p
        className="text-base text-muted-foreground mt-2 tracking-widest"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        Simple. Smart. Secure.
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="mt-8 w-48 h-1 bg-muted rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeInOut", delay: 0.9 }}
        />
      </motion.div>

      {/* Loading text */}
      <motion.p
        className="text-xs text-muted-foreground mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Loading your dashboard...
      </motion.p>
    </motion.div>
  );
};

export default SplashScreen;
