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
    <PGHubShell variant="dark" className="pgh-setup-shell min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-24 flex-1 flex flex-col gap-6">
        <PGHubSetupHeader step="Step 2 of 2" progress={1} onBack={() => navigate("/setup/property")} />

        {/* Overview Stats Bar */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Total Rooms</span>
              <strong className="text-2xl font-black text-blue-400">{totals.rooms}</strong>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Total Beds</span>
              <strong className="text-2xl font-black text-indigo-400">{totals.beds}</strong>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Starting Room</span>
              <input 
                value={startingRoom} 
                onChange={(event) => setStartingRoom(event.target.value)} 
                inputMode="numeric" 
                className="w-16 text-center text-xl font-black bg-slate-700/60 border border-slate-600 rounded-lg text-white mt-1 py-0.5 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Starting Price</span>
              <strong className="text-2xl font-black text-emerald-400">₹{startingPrice.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </section>

        {/* Floor Setup List */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="text-blue-400" size={22} /> Floor & Room Setup
            </h2>
            <span className="text-xs text-slate-400 font-semibold">{floors.length} floors configured</span>
          </div>

          <div className="flex flex-col gap-3">
            {floors.map((floor) => <FloorRow key={floor.id} floor={floor} onUpdate={(patch) => updateFloor(floor.id, patch)} />)}
          </div>

          <button 
            type="button" 
            className="w-full py-3.5 px-4 rounded-2xl bg-white/5 border border-dashed border-slate-700 text-slate-300 font-bold hover:bg-white/10 hover:border-slate-500 transition-all flex items-center justify-center gap-2 text-sm mt-2" 
            onClick={addFloor} 
            disabled={floors.length >= 20}
          >
            <CirclePlus size={20} className="text-blue-400" /> Add Upper Floor
          </button>
        </section>

        <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 pt-2">
          <Info size={15} /> Room numbers and sharing prices can be edited anytime later.
        </p>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/80 z-30">
        <div className="max-w-2xl mx-auto">
          <PGHubButton 
            onClick={create} 
            loading={createPGFromFloorPlan.isPending} 
            disabled={!floors.length || totals.rooms < 1}
            className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white rounded-2xl font-extrabold text-base shadow-xl shadow-blue-500/25 active:scale-98 transition-all"
          >
            {creationResult ? "Return to setup complete" : "Create PG"}
          </PGHubButton>
        </div>
      </div>
    </PGHubShell>
  );
}
