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
      <button className="pgh-setup-header__back" type="button" onClick={onBack} aria-label="Go back"><ArrowLeft size={20} /></button>
      <div className="pgh-setup-steps" aria-label={step}>
        <div className="pgh-setup-step is-active">
          <i>1</i>
          <span>Property details</span>
        </div>
        <div className="pgh-setup-steps__line"><span style={{ width: progress >= 1 ? "100%" : "0%" }} /></div>
        <div className={`pgh-setup-step ${progress >= 1 ? "is-active" : ""}`}>
          <i>2</i>
          <span>Configuration</span>
        </div>
      </div>
    </header>
  );
}
