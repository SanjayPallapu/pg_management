import { useMemo, useState } from "react";
import { BedDouble, Building2, CirclePlus, DoorOpen, Edit3, IndianRupee, Info, Layers3, Snowflake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubCounter } from "@/features/pg-hub/PGHubCounter";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft, type PGFloorDraft } from "@/features/pg-hub/PGSetupDraftContext";
import { usePGSetup } from "@/hooks/usePGSetup";
import { usePG } from "@/contexts/PGContext";
import journeyBuilding from "@/assets/pg-hub/journey-building-transparent.png";
import { getPricePerBed } from "@/constants/pricing";

const sharingLabel = (capacity: number) => capacity === 1 ? "Single sharing" : `${capacity} sharing`;

function FloorRow({ floor, onUpdate }: { floor: PGFloorDraft; onUpdate: (patch: Partial<PGFloorDraft>) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="pgh-floor-row">
      <i><Layers3 size={22} /></i>
      <div className="pgh-floor-row__info">
        <strong>{floor.name}</strong>
        {!editing ? <small>{floor.rooms} rooms · {sharingLabel(floor.bedsPerRoom)} · ₹{floor.pricePerBed.toLocaleString("en-IN")}/bed · {floor.isAc ? "AC" : "Non-AC"}</small> : (
          <div className="pgh-floor-row__edit">
            <label>Rooms<PGHubCounter value={floor.rooms} onChange={(rooms) => onUpdate({ rooms })} /></label>
            <label>Sharing type<PGHubCounter value={floor.bedsPerRoom} max={20} onChange={(bedsPerRoom) => onUpdate({ bedsPerRoom, pricePerBed: getPricePerBed(bedsPerRoom) })} /></label>
            <label className="pgh-floor-price">
              Monthly price / bed
              <span><IndianRupee size={16} /><input aria-label={`${floor.name} monthly price per bed`} value={floor.pricePerBed || ""} onChange={(event) => onUpdate({ pricePerBed: Math.min(1000000, Math.max(0, Number(event.target.value))) })} inputMode="numeric" type="number" min={1} max={1000000} /></span>
            </label>
            <small className="pgh-floor-price-total">₹{(floor.pricePerBed * floor.bedsPerRoom).toLocaleString("en-IN")} total rent per room</small>
            <label className="pgh-ac-toggle"><input type="checkbox" checked={floor.isAc} onChange={(event) => onUpdate({ isAc: event.target.checked })} /><span /><Snowflake size={16} /> AC rooms</label>
          </div>
        )}
      </div>
      <button type="button" onClick={() => setEditing((value) => !value)}><Edit3 size={16} />{editing ? "Done" : "Edit"}</button>
    </article>
  );
}

export default function PGSetupCapacity() {
  const navigate = useNavigate();
  const { property, floors, startingRoom, creationResult, setStartingRoom, updateFloor, addFloor, setCreationResult } = usePGSetupDraft();
  const { createPGFromFloorPlan } = usePGSetup();
  const { refreshPGs } = usePG();
  const totals = useMemo(() => floors.reduce((sum, floor) => ({ rooms: sum.rooms + floor.rooms, beds: sum.beds + floor.rooms * floor.bedsPerRoom }), { rooms: 0, beds: 0 }), [floors]);
  const startingPrice = useMemo(() => Math.min(...floors.map((floor) => floor.pricePerBed)), [floors]);

  const create = async () => {
    if (creationResult) {
      navigate("/setup/complete");
      return;
    }
    if (!property.name.trim()) {
      navigate("/setup/property", { replace: true });
      return;
    }
    if (floors.some((floor) => floor.pricePerBed < 1)) {
      toast.error("Enter a valid monthly price for every sharing type.");
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
    <PGHubShell variant="light" className="pgh-setup-shell">
      <div className="pgh-page pgh-page--wide pgh-setup-page pgh-capacity-page pgh-page--fullscreen p-0 w-full max-w-full">
        <div className="px-4 pt-3">
          <PGHubSetupHeader step="Step 2 of 2" progress={1} onBack={() => navigate("/setup/property")} />
        </div>

        <section className="pgh-setup-surface pgh-setup-surface--fullscreen w-full rounded-none border-none shadow-none bg-transparent px-4 pt-4 pb-8">
          <div className="pgh-capacity-grid">
            <div><DoorOpen /><span>Total Rooms</span><strong>{totals.rooms}</strong></div>
            <div><BedDouble /><span>Total Beds</span><strong>{totals.beds}</strong></div>
            <label><DoorOpen /><span>Starting Room No.</span><input value={startingRoom} onChange={(event) => setStartingRoom(event.target.value)} inputMode="numeric" /></label>
            <div><IndianRupee /><span>Price / Bed From</span><strong className="pgh-capacity-grid__types">₹{startingPrice.toLocaleString("en-IN")}</strong></div>
          </div>

          <section className="pgh-floor-section">
            <h2>Set up each floor</h2>
            <div>{floors.map((floor) => <FloorRow key={floor.id} floor={floor} onUpdate={(patch) => updateFloor(floor.id, patch)} />)}</div>
            <button type="button" className="pgh-add-floor" onClick={addFloor} disabled={floors.length >= 20}><CirclePlus size={21} /> Add Upper Floor</button>
          </section>

          <p className="pgh-capacity-note"><Info size={17} /> Edit anytime from PG Overview.</p>
          <PGHubButton onClick={create} loading={createPGFromFloorPlan.isPending} disabled={!floors.length || totals.rooms < 1}>{creationResult ? "Return to setup complete" : "Create PG"}</PGHubButton>
        </section>
      </div>
    </PGHubShell>
  );
}
