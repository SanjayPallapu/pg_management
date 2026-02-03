import { motion } from "framer-motion";
import { Home, Key, DoorOpen, Users } from "lucide-react";

const SplashScreen = () => {
  // Use default branding since splash shows before auth/PG context is available
  const logoUrl = "/icon-512.png";
  const pgName = "PG Management";
  
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      style={{
        backgroundImage: `url(${logoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

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
            className="relative flex items-center justify-center"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.3)",
            }}
          >
            <img 
              src={logoUrl} 
              alt={pgName}
              className="h-36 w-auto rounded-3xl scale-110 object-contain"
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-white text-center"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {pgName}
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
