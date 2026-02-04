import { motion } from "framer-motion";
import appLogo from "@/assets/pg-logo.png";

const SplashScreen = () => {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Animated background circles */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-primary/20 blur-2xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
        >
          {/* Glow effect behind logo */}
          <motion.div 
            className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl"
            animate={{ scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="relative bg-card p-4 rounded-3xl shadow-2xl">
            <img 
              src={appLogo} 
              alt="PG Management"
              className="h-32 w-32 object-contain"
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-foreground text-center"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          PG Management
        </motion.h1>

        <motion.p
          className="mt-3 text-xl text-muted-foreground"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Simple. Smart. Secure.
        </motion.p>

        {/* Loader Bar */}
        <div className="mt-10 w-48 h-1 bg-muted overflow-hidden rounded-full">
          <motion.div
            className="h-full bg-primary"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: "50%" }}
          />
        </div>

        <motion.p
          className="mt-4 text-sm text-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading your dashboard...
        </motion.p>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
