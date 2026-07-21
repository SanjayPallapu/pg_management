import { motion } from "framer-motion";
import pgHubLogo from "@/assets/pg-hub/pg-hub-logo.png";

export function PGHubBrand({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <motion.div
      className={`pgh-brand ${compact ? "pgh-brand--compact" : ""}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <img src={pgHubLogo} alt="PG HUB" />
      <span className={dark ? "pgh-brand__text--light" : ""}>PG HUB</span>
    </motion.div>
  );
}
