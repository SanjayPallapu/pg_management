import { Minus, Plus } from "lucide-react";

export function PGHubCounter({
  value,
  min = 1,
  max = 50,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="pgh-counter">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">
        <Minus size={16} />
      </button>
      <strong>{value}</strong>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        <Plus size={16} />
      </button>
    </div>
  );
}
