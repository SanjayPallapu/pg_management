import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BedDouble, Building2, CirclePlus, DoorOpen, Edit3, Info, Layers3, Snowflake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubCounter } from "@/features/pg-hub/PGHubCounter";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft, type PGFloorDraft } from "@/features/pg-hub/PGSetupDraftContext";
import { usePGSetup } from "@/hooks/usePGSetup";
import { usePG } from "@/contexts/PGContext";

function FloorRow({ floor, onUpdate }: { floor: PGFloorDraft; onUpdate: (patch: Partial<PGFloorDraft>) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <motion.article className="pgh-floor-row" layout>
      <i><Layers3 size={22} /></i>
      <div className="pgh-floor-row__info">
        <strong>{floor.name}</strong>
        {!editing ? <small>{floor.rooms} rooms · {floor.bedsPerRoom} beds/room · {floor.isAc ? "AC" : "Non-AC"}</small> : (
          <div className="pgh-floor-row__edit">
            <label>Rooms<PGHubCounter value={floor.rooms} onChange={(rooms) => onUpdate({ rooms })} /></label>
            <label>Beds/room<PGHubCounter value={floor.bedsPerRoom} max={20} onChange={(bedsPerRoom) => onUpdate({ bedsPerRoom })} /></label>
            <label className="pgh-ac-toggle"><input type="checkbox" checked={floor.isAc} onChange={(event) => onUpdate({ isAc: event.target.checked })} /><span /><Snowflake size={16} /> AC rooms</label>
          </div>
        )}
      </div>
      <button type="button" onClick={() => setEditing((value) => !value)}><Edit3 size={16} />{editing ? "Done" : "Edit"}</button>
    </motion.article>
  );
}

export default function PGSetupCapacity() {
  const navigate = useNavigate();
  const { property, floors, startingRoom, setStartingRoom, updateFloor, addFloor, setCreationResult } = usePGSetupDraft();
  const { createPGFromFloorPlan } = usePGSetup();
  const { refreshPGs } = usePG();
  const totals = useMemo(() => floors.reduce((sum, floor) => ({ rooms: sum.rooms + floor.rooms, beds: sum.beds + floor.rooms * floor.bedsPerRoom }), { rooms: 0, beds: 0 }), [floors]);

  const create = async () => {
    if (!property.name.trim()) {
      navigate("/setup/property", { replace: true });
      return;
    }
    try {
      const result = await createPGFromFloorPlan.mutateAsync({
        name: property.name.trim(),
        address: [property.address.trim(), property.city.trim()].filter(Boolean).join(", "),
        imageFile: property.imageFile,
        floors,
        startingRoom,
      });
      setCreationResult({ pgId: result.id, pgName: result.name, floors: floors.length, rooms: totals.rooms, beds: totals.beds });
      await refreshPGs();
      sessionStorage.removeItem("isNewSignup");
      navigate("/setup/complete", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create your PG.");
    }
  };

  return (
    <PGHubShell variant="light">
      <div className="pgh-page pgh-page--wide">
        <PGHubSetupHeader step="Step 2 of 2" progress={1} onBack={() => navigate("/setup/property")} />
        <section className="pgh-setup-title"><h1>Rooms & Capacity</h1><p>Set up rooms, beds, and the default room type for each floor.</p></section>

        <section className="pgh-card pgh-capacity-card">
          <h2 className="pgh-section-title"><Building2 size={21} /> Overall Capacity</h2>
          <div className="pgh-capacity-grid">
            <div><DoorOpen /><span>Total Rooms</span><strong>{totals.rooms}</strong></div>
            <div><BedDouble /><span>Total Beds</span><strong>{totals.beds}</strong></div>
            <label><DoorOpen /><span>Starting Room No.</span><input value={startingRoom} onChange={(event) => setStartingRoom(event.target.value)} inputMode="numeric" /></label>
            <div><Snowflake /><span>Room Types</span><strong className="pgh-capacity-grid__types">AC + Non-AC</strong></div>
          </div>
        </section>

        <section className="pgh-floor-section">
          <h2>Floor Setup</h2>
          <div>{floors.map((floor) => <FloorRow key={floor.id} floor={floor} onUpdate={(patch) => updateFloor(floor.id, patch)} />)}</div>
          <button type="button" className="pgh-add-floor" onClick={addFloor} disabled={floors.length >= 20}><CirclePlus size={21} /> Add Floor</button>
        </section>

        <section className="pgh-card pgh-overview">
          <h2 className="pgh-section-title"><Building2 size={21} /> PG Overview</h2>
          <div><span><Building2 /><strong>{floors.length}</strong><small>Floors</small></span><span><DoorOpen /><strong>{totals.rooms}</strong><small>Rooms</small></span><span><BedDouble /><strong>{totals.beds}</strong><small>Beds</small></span></div>
        </section>
        <p className="pgh-capacity-note"><Info size={17} /> You can edit rooms, capacity, AC settings, and floors later from Settings.</p>
        <PGHubButton onClick={create} loading={createPGFromFloorPlan.isPending} disabled={!floors.length || totals.rooms < 1}>Create PG</PGHubButton>
      </div>
    </PGHubShell>
  );
}
