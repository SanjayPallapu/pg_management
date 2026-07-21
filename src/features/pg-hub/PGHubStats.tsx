import type { LucideIcon } from "lucide-react";

export function PGHubStat({ icon: Icon, value, label, color }: { icon: LucideIcon; value: number; label: string; color: string; delay?: number }) {
  return (
    <div className="pgh-stat">
      <span style={{ backgroundColor: `${color}18` }}><Icon size={22} color={color} /></span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
