import { useEffect } from "react";
import { BedDouble, Building2, CheckCircle2, DoorOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import journeyComplete from "@/assets/pg-hub/hub-building-check.png";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { PGHubStat } from "@/features/pg-hub/PGHubStats";
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
    navigate(target, { replace: true });
  };

  return (
    <PGHubShell variant="dark" className="pgh-ready pgh-ready--journey">
      <div className="pgh-ready__journey">
        <div className="pgh-ready__backdrop">
          <img src={journeyComplete} alt="Completed PG property" />
          <span aria-hidden="true" />
        </div>
        <header className="pgh-ready__header"><PGHubBrand dark compact /><span><CheckCircle2 size={18} /> Setup complete</span></header>
        <section className="pgh-ready__sheet">
          <div className="pgh-ready__grab" aria-hidden="true" />
          <div className="pgh-ready__copy">
            <span>Welcome home</span>
            <h1>Your PG <em>is ready</em></h1>
            <p><strong>{creationResult.pgName}</strong> is set up and waiting for its first tenant.</p>
          </div>
          <div className="pgh-ready__stats">
            <PGHubStat icon={Building2} value={creationResult.floors} label="Floors" color="#1769FF" delay={260} />
            <PGHubStat icon={DoorOpen} value={creationResult.rooms} label="Rooms" color="#7B4DFF" delay={340} />
            <PGHubStat icon={BedDouble} value={creationResult.beds} label="Beds" color="#22A447" delay={420} />
          </div>
          <div className="pgh-ready__buttons">
            <PGHubButton onClick={() => finish("/")}>Enter dashboard</PGHubButton>
            <PGHubButton variant="outline" onClick={() => finish("/?tab=rooms")}>Add your first tenant</PGHubButton>
          </div>
        </section>
      </div>
    </PGHubShell>
  );
}
