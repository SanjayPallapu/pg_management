import { ArrowLeft } from "lucide-react";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";

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
    <header className="pgh-setup-header">
      <div className="pgh-setup-header__row">
        <button type="button" onClick={onBack} aria-label="Go back"><ArrowLeft size={20} /><span>Back</span></button>
        <div className="pgh-setup-header__brand"><PGHubBrand compact /><small>Create PG</small></div>
        <span>{step}</span>
      </div>
      <div className="pgh-progress"><span style={{ width: `${progress * 100}%` }} /></div>
    </header>
  );
}
