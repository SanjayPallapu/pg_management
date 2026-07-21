import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export function PGHubSetupHeader({
  step,
  progress,
  onBack,
}: {
  step: string;
  progress: number;
  onBack: () => void;
}) {
  return (
    <motion.header className="pgh-setup-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="pgh-setup-header__row">
        <button type="button" onClick={onBack} aria-label="Go back"><ArrowLeft size={20} /><span>Back</span></button>
        <strong>Create PG</strong>
        <span>{step}</span>
      </div>
      <div className="pgh-progress"><motion.span initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.6 }} /></div>
    </motion.header>
  );
}
