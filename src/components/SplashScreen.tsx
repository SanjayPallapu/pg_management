import { motion } from "framer-motion";
import appLogo from "@/public/icon-512.png";

interface SplashScreenProps {
  pgLogoUrl?: string;
  pgName?: string;
}

const SplashScreen = ({ pgLogoUrl, pgName }: SplashScreenProps) => {
  // Use PG logo if available, otherwise fall back to app logo
  const logoToShow = pgLogoUrl || appLogo;
  const titleToShow = pgName || "PG Management";

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
        >
          {/* Logo without any background or border */}
          <img
            src={logoToShow}
            alt={titleToShow}
            className="h-40 w-40 object-contain rounded-2xl shadow-lg"
            crossOrigin="anonymous"
          />
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-foreground text-center"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {titleToShow}
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
