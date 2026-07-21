import { ArrowLeft } from "lucide-react";

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
        <strong className="pgh-setup-header__title">Create PG</strong>
        <span>{step}</span>
      </div>
      <div className="pgh-progress"><span style={{ width: `${progress * 100}%` }} /></div>
    </header>
  );
}
