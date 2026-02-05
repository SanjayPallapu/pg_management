import { useMemo } from "react";
import { motion } from "framer-motion";
import splashLogo from "@/assets/splash-uploaded-logo.png";
 
 const SplashScreen = () => {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const size = 14 + ((i * 11) % 34); // 14–48
        const left = (i * 17) % 100;
        const delay = (i % 7) * 0.35;
        const duration = 5.5 + (i % 6) * 1.1;
        const drift = -12 - (i % 5) * 6;
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
        {/* Soft backdrop (token-based) */}
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
              key={b.id}
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

       {/* Logo with smooth scale animation */}
       <motion.div
         initial={{ scale: 0.8, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
       >
          <motion.img
            src={splashLogo}
            alt="App logo"
            className="w-44 h-44 object-contain"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
       </motion.div>
 
       {/* Animated loader dots */}
        <motion.div
         className="flex gap-2 mt-8"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.4 }}
       >
         {[0, 1, 2].map((i) => (
        <motion.div
             key={i}
             className="w-2.5 h-2.5 rounded-full bg-primary"
             animate={{
               y: [0, -8, 0],
               opacity: [0.5, 1, 0.5],
             }}
             transition={{
               duration: 0.6,
               repeat: Infinity,
               delay: i * 0.15,
               ease: "easeInOut",
             }}
          />
         ))}
       </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
