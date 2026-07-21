import { useEffect } from "react";
import { motion } from "framer-motion";
import { BedDouble, Building2, CheckCircle2, DoorOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import readyBuilding from "@/assets/pg-hub/ready-building.png";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubConfetti } from "@/features/pg-hub/PGHubConfetti";
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
    <PGHubShell variant="light" className="pgh-ready">
      <PGHubConfetti />
      <div className="pgh-page">
        <header className="pgh-ready__header"><PGHubBrand compact /><span><CheckCircle2 size={18} /> Setup Complete</span></header>
        <motion.div className="pgh-ready__art" initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 14 }}>
          <motion.img src={readyBuilding} alt="Completed PG property" animate={{ y: [-4, 5, -4] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }} />
          <motion.i initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: .35 }}><CheckCircle2 size={54} /></motion.i>
        </motion.div>
        <motion.section className="pgh-ready__copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>
          <h1>Your PG <em>is ready</em></h1>
          <p>{creationResult.pgName} has been created successfully.<br />Start by adding tenants, assigning rooms, and collecting rent.</p>
        </motion.section>
        <div className="pgh-ready__stats">
          <PGHubStat icon={Building2} value={creationResult.floors} label="Floors" color="#1769FF" delay={260} />
          <PGHubStat icon={DoorOpen} value={creationResult.rooms} label="Rooms" color="#7B4DFF" delay={340} />
          <PGHubStat icon={BedDouble} value={creationResult.beds} label="Beds" color="#22A447" delay={420} />
        </div>
        <div className="pgh-ready__buttons">
          <PGHubButton onClick={() => finish("/")}>Go to Dashboard</PGHubButton>
          <PGHubButton variant="outline" onClick={() => finish("/?tab=rooms")}>Add Tenants</PGHubButton>
        </div>
      </div>
    </PGHubShell>
  );
}
