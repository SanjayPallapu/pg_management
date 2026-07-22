import { useEffect } from "react";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft } from "@/features/pg-hub/PGSetupDraftContext";

export default function SetupComplete() {
  const navigate = useNavigate();
  const { creationResult, reset } = usePGSetupDraft();

  useEffect(() => {
    if (!creationResult) navigate("/", { replace: true });
  }, [creationResult, navigate]);

  if (!creationResult) return null;

  const finish = (target: string) => {
    reset();
    // Leaving setup also rebuilds the dashboard providers from the newly
    // created PG. A full replacement avoids a race between clearing the setup
    // result and React Router's protected-route redirect.
    window.location.replace(target);
  };

  const goBack = () => {
    navigate("/setup/capacity");
  };

  return (
    <PGHubShell variant="light" className="pgh-ready pgh-ready--journey">
      <div className="pgh-ready__journey">
        <header className="pgh-ready__header">
          <button type="button" className="pgh-ready__back" onClick={goBack}><ArrowLeft size={18} /> Back</button>
          <span><CheckCircle2 size={18} /> Setup complete</span>
        </header>
        <div className="pgh-ready__backdrop">
          <div className="pgh-icon-hero__circle pgh-icon-hero__circle--lg"><Building2 size={56} /></div>
          <i><CheckCircle2 size={31} /></i>
        </div>
        <section className="pgh-ready__content">
          <div className="pgh-ready__copy">
            <span>Your workspace is live</span>
            <h1>Your PG is<br /><em>ready to grow</em></h1>
            <p><strong>{creationResult.pgName}</strong> has been created successfully.</p>
          </div>
          <div className="pgh-ready__stats" aria-label="Property summary">
            <div><strong>{creationResult.floors}</strong><span>Floors</span></div>
            <div><strong>{creationResult.rooms}</strong><span>Rooms</span></div>
            <div><strong>{creationResult.beds}</strong><span>Beds</span></div>
          </div>
          <div className="pgh-ready__buttons">
            <PGHubButton onClick={() => finish("/")}>Open dashboard</PGHubButton>
          </div>
        </section>
      </div>
    </PGHubShell>
  );
}
