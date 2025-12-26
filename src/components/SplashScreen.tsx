import { motion } from "framer-motion";
import { Home, Key, DoorOpen, Users } from "lucide-react";
import appLogo from "@/assets/pg-logo.png";

const SplashScreen = () => {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -20, 0], scale: [1.2, 1, 1.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/40 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ y: [-20, -100], opacity: [0, 1, 0] }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Floating Icons */}
      <motion.div
        className="absolute top-[20%] left-[15%]"
        animate={{ y: [-15, 15, -15] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Home className="h-16 w-16 text-white/20" />
      </motion.div>

      <motion.div
        className="absolute bottom-[25%] right-[15%]"
        animate={{ y: [15, -15, 15] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <Key className="h-12 w-12 text-white/20" />
      </motion.div>

      <motion.div
        className="absolute top-[35%] right-[20%]"
        animate={{ y: [-10, 20, -10] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        <DoorOpen className="h-14 w-14 text-white/20" />
      </motion.div>

      <motion.div
        className="absolute bottom-[35%] left-[20%]"
        animate={{ y: [10, -20, 10] }}
        transition={{ duration: 5.5, repeat: Infinity }}
      >
        <Users className="h-10 w-10 text-white/20" />
      </motion.div>

      {/* Main Center Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="relative mb-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 140 }}
        >
          <motion.div className="absolute inset-0 rounded-3xl bg-blue-400/30 blur-3xl animate-pulse" />

          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-3xl shadow-2xl overflow-visible"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.3)",
            }}
          >
            <img src={appLogo} alt="Amma Management" className="h-36 w-auto" />
          </div>
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-white"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          PG Management
        </motion.h1>

        <motion.p
          className="mt-3 text-xl text-white/70"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Simple. Smart. Secure.
        </motion.p>

        {/* Loader Bar */}
        <div className="mt-10 w-48 h-1 bg-white/20 overflow-hidden rounded-full">
          <motion.div
            className="h-full bg-blue-400"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: "50%" }}
          />
        </div>

        <motion.p
          className="mt-4 text-sm text-white/50"
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
