import { useMemo, useState } from "react";
import { BedDouble, Building2, CirclePlus, DoorOpen, Edit3, IndianRupee, Layers3, Snowflake, ChevronRight, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubCounter } from "@/features/pg-hub/PGHubCounter";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft, type PGFloorDraft } from "@/features/pg-hub/PGSetupDraftContext";
import { usePGSetup } from "@/hooks/usePGSetup";
import { usePG } from "@/contexts/PGContext";
import { getPricePerBed } from "@/constants/pricing";

const sharingLabel = (capacity: number) => capacity === 1 ? "Single sharing" : `${capacity} sharing`;

function FloorRow({ floor, onUpdate }: { floor: PGFloorDraft; onUpdate: (patch: Partial<PGFloorDraft>) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="flex items-start justify-between gap-3 p-3.5 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
          <Layers3 size={20} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <strong className="text-slate-900 font-bold text-sm leading-tight">{floor.name}</strong>
          {!editing ? (
            <div className="text-xs text-slate-500 font-medium mt-1 space-y-0.5">
              <p>{floor.rooms} rooms · {sharingLabel(floor.bedsPerRoom)}</p>
              <p className="text-slate-400">₹{floor.pricePerBed.toLocaleString("en-IN")}/bed · {floor.isAc ? "AC" : "Non-AC"}</p>
            </div>
          ) : (
            <div className="pgh-floor-row__edit mt-2">
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
      </div>
      <button 
        type="button" 
        onClick={() => setEditing((value) => !value)}
        className="px-3.5 py-1.5 rounded-full border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
      >
        <Edit3 size={13} /> {editing ? "Done" : "Edit"}
      </button>
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
      navigate("/setup/subscription");
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
      navigate("/setup/subscription", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create your PG.");
    }
  };

  return (
    <PGHubShell variant="light" className="pgh-setup-shell bg-slate-50 h-dvh max-h-dvh overflow-hidden">
      <div className="w-full max-w-full h-full flex flex-col justify-between p-3 sm:p-4 overflow-hidden">
        
        {/* Top Navigation & Stepper Header */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between pt-1">
            <h1 className="w-full text-center text-base font-extrabold text-slate-900">Create Your PG</h1>
          </div>
          <PGHubSetupHeader step="Step 2 of 3" progress={.66} onBack={() => navigate("/setup/property")} />
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 my-2 pr-0.5">
          
          {/* Section 1: Property Overview */}
          <section className="flex flex-col gap-2.5 w-full">
            <h2 className="text-sm font-extrabold text-slate-900">Property Overview</h2>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              
              {/* Total Rooms */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Total Rooms</span>
                    <strong className="text-lg font-black text-slate-900">{totals.rooms}</strong>
                  </div>
                </div>
              </div>

              {/* Total Beds */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                    <BedDouble size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Total Beds</span>
                    <strong className="text-lg font-black text-slate-900">{totals.beds}</strong>
                  </div>
                </div>
              </div>

              {/* Starting Room No. */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                    <DoorOpen size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block truncate">Starting Room</span>
                    <input 
                      value={startingRoom} 
                      onChange={(event) => setStartingRoom(event.target.value)} 
                      inputMode="numeric" 
                      className="w-14 text-lg font-black text-slate-900 bg-transparent border-b border-purple-300 focus:border-purple-600 focus:outline-none py-0"
                    />
                  </div>
                </div>
              </div>

              {/* Price / Bed From */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0 font-extrabold text-sm">
                    ₹
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Price From</span>
                    <strong className="text-lg font-black text-slate-900">₹{startingPrice.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Section 2: Set up each floor */}
          <section className="flex flex-col gap-2.5 w-full">
            <h2 className="text-sm font-extrabold text-slate-900">Set up each floor</h2>
            <div className="flex flex-col gap-2.5 w-full">
              <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 shadow-xs">
                {floors.map((floor) => <FloorRow key={floor.id} floor={floor} onUpdate={(patch) => updateFloor(floor.id, patch)} />)}
              </div>
              
              <button 
                type="button" 
                className="w-full py-3 rounded-2xl border border-dashed border-purple-300 bg-purple-50/60 hover:bg-purple-100/70 text-purple-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-xs" 
                onClick={addFloor} 
                disabled={floors.length >= 20}
              >
                <CirclePlus size={17} className="text-purple-600" /> Add Upper Floor
              </button>
            </div>
          </section>

        </div>

        {/* Bottom Action Button */}
        <div className="shrink-0 pt-2 pb-1 border-t border-slate-200/80 bg-slate-50 z-30">
          <div className="max-w-xl mx-auto">
            <PGHubButton 
              onClick={create} 
              loading={createPGFromFloorPlan.isPending} 
              disabled={!floors.length || totals.rooms < 1}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-purple-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {creationResult ? "Continue to Subscription" : "Create PG & Select Plan"} <ArrowRight size={18} />
            </PGHubButton>
          </div>
        </div>

      </div>
    </PGHubShell>
  );
}
