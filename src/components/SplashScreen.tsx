 import { motion } from "framer-motion";
 import splashLogo from "@/assets/splash-logo.png";
 
 const SplashScreen = () => {
  return (
    <motion.div
       className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       transition={{ duration: 0.4, ease: "easeOut" }}
    >
       {/* Logo with smooth scale animation */}
       <motion.div
         initial={{ scale: 0.8, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
       >
         <img
           src={splashLogo}
           alt="Hostel Building App"
           className="w-56 h-56 object-contain"
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
