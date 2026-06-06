import { motion } from "framer-motion";
import dashboardScreenshot from "@/assets/app-screenshot-dashboard.jpg";

const PhoneMockup = () => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, duration: 0.7 }}
    className="flex justify-center mt-12"
  >
    <div className="relative mx-auto w-[260px] sm:w-[280px]">
      {/* Phone frame */}
      <div className="rounded-[2.5rem] border-[6px] border-foreground/20 bg-background shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/20 rounded-b-2xl z-10" />
        {/* Screen */}
        <div className="rounded-[2rem] overflow-hidden">
          <img
            src={dashboardScreenshot}
            alt="PG Manager Dashboard showing rent collection, occupancy stats and payment tracking"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      </div>
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] blur-2xl -z-10" />
    </div>
  </motion.div>
);

export default PhoneMockup;
