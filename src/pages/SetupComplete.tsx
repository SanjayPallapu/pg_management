import { useEffect } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import journeyComplete from "@/assets/pg-hub/hub-building-check.png";
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
    <PGHubShell variant="dark" className="pgh-ready pgh-ready--journey">
      <div className="pgh-ready__journey">
        <div className="pgh-ready__backdrop">
          <img src={journeyComplete} alt="Completed PG property" />
          <span aria-hidden="true" />
        </div>
        <header className="pgh-ready__header">
          <button type="button" className="pgh-ready__back" onClick={goBack}><ArrowLeft size={18} /> Back</button>
          <span><CheckCircle2 size={18} /> Setup complete</span>
        </header>
        <section className="pgh-ready__content">
          <div className="pgh-ready__copy">
            <h1>Ready to<br /><em>grow</em></h1>
            <p><strong>{creationResult.pgName}</strong> is live.</p>
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
