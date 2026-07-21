import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function PGHubStat({ icon: Icon, value, label, color, delay = 0 }: { icon: LucideIcon; value: number; label: string; color: string; delay?: number }) {
  return (
    <motion.div className="pgh-stat" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay / 1000 }}>
      <span style={{ backgroundColor: `${color}18` }}><Icon size={22} color={color} /></span>
      <strong>{value}</strong>
      <small>{label}</small>
    </motion.div>
  );
}
