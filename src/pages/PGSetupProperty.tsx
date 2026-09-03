import { useState, type ChangeEvent } from "react";
import { Building2, Layers3, MapPin, Minus, Plus, UploadCloud, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import journeyBuilding from "@/assets/pg-hub/journey-building-transparent.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubFormField } from "@/features/pg-hub/PGHubFormField";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft } from "@/features/pg-hub/PGSetupDraftContext";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";

type Errors = Partial<Record<"name" | "city" | "floors", string>>;

export default function PGSetupProperty() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { canCreatePG, subscription } = usePG();
  const { property, updateProperty, setPropertyImage, setFloorCount } = usePGSetupDraft();
  const [errors, setErrors] = useState<Errors>({});
  const [floorsDraft, setFloorsDraft] = useState(String(property.totalFloors));

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setPropertyImage(file);
  };

  const validate = () => {
    if (!canCreatePG) {
      toast.error(`Your plan allows up to ${Math.min(4, subscription?.maxPgs ?? 1)} PG properties.`);
      navigate("/subscription", { replace: true });
      return;
    }
    const next: Errors = {};
    if (!property.name.trim()) next.name = "Enter your PG name.";
    if (!property.city.trim()) next.city = "Enter the city or area.";
    if (property.totalFloors < 1) next.floors = "Enter at least one floor.";
    setErrors(next);
    if (Object.keys(next).length === 0) navigate("/setup/capacity");
  };

  const backToOnboarding = async () => {
    await signOut();
    window.location.replace("/onboarding");
  };

  return (
    <PGHubShell variant="light" className="pgh-setup-shell h-dvh max-h-dvh overflow-hidden">
      <div className="pgh-page pgh-setup-page pgh-page--fullscreen p-0 w-full max-w-full h-full flex flex-col justify-between overflow-hidden">
        <div className="px-4 pt-2 shrink-0">
          <PGHubSetupHeader step="Step 1 of 3" progress={.33} onBack={backToOnboarding} />
        </div>
        <section className="pgh-setup-surface pgh-setup-surface--fullscreen w-full rounded-none border-none shadow-none bg-transparent px-4 py-2 flex-1 flex flex-col justify-between overflow-hidden min-h-0">
          <div className="pgh-setup-form grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><PGHubFormField label="PG Name" required icon={Building2} placeholder="Enter PG name" value={property.name} onChange={(event) => updateProperty({ name: event.currentTarget.value })} error={errors.name} /></div>
            <div>
              <label className="pgh-field">
                <span className="pgh-field__label">PG Type <em>*</em></span>
                <span className="pgh-field__wrap">
                  <UsersRound size={20} className="pgh-field__icon" />
                  <select
                    className="pgh-field__control pgh-field__control--icon pgh-field__select"
                    value={property.type}
                    onChange={(event) => updateProperty({ type: event.currentTarget.value as typeof property.type })}
                    aria-label="PG Type"
                  >
                    <option>Women's PG</option>
                    <option>Men's PG</option>
                    <option>Co-living</option>
                  </select>
                </span>
              </label>
            </div>
            <div><PGHubFormField label="City / Area" required icon={MapPin} placeholder="Enter city or area" value={property.city} onChange={(event) => updateProperty({ city: event.currentTarget.value })} error={errors.city} /></div>
            <div>
              <label className="pgh-field">
                <span className="pgh-field__label">Total Floors <em>*</em></span>
                <span className="pgh-field__wrap flex items-center justify-between p-1 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 pl-2">
                    <Layers3 size={20} className="text-purple-600 shrink-0" />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20}
                      value={floorsDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFloorsDraft(val);
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 1 && num <= 20) {
                          setFloorCount(num);
                        }
                      }}
                      onBlur={() => {
                        const num = parseInt(floorsDraft, 10);
                        const validNum = isNaN(num) || num < 1 ? 1 : Math.min(20, num);
                        setFloorsDraft(String(validNum));
                        setFloorCount(validNum);
                      }}
                      className="w-12 text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-medium">Floors</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, property.totalFloors - 1);
                        setFloorsDraft(String(next));
                        setFloorCount(next);
                      }}
                      disabled={property.totalFloors <= 1}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 font-bold transition-all"
                      aria-label="Decrease floor"
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(20, property.totalFloors + 1);
                        setFloorsDraft(String(next));
                        setFloorCount(next);
                      }}
                      disabled={property.totalFloors >= 20}
                      className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center font-bold transition-all"
                      aria-label="Increase floor"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </span>
                {errors.floors && <span className="pgh-field__error">{errors.floors}</span>}
              </label>
            </div>
          </div>

          <section className="pgh-photo my-1 shrink-0">
            <label className="text-xs font-bold text-slate-700 mb-1 block">Property Logo / Photo <small className="text-slate-400">(Optional)</small></label>
            <label className="pgh-photo__picker cursor-pointer flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-white">
              <img src={property.imagePreview || journeyBuilding} alt="Property preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              <span className="flex-1 min-w-0 text-xs">
                <strong className="block text-slate-900 truncate">{property.imageFile ? "Image selected" : "Add property image"}</strong>
                <small className="text-slate-500 block truncate">Recognize your PG in app</small>
              </span>
              <span className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 rounded-lg flex items-center gap-1 shrink-0">
                <UploadCloud size={14} /> {property.imageFile ? "Change" : "Upload"}
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} className="hidden" />
            </label>
          </section>
          <div className="shrink-0 pt-1">
            <PGHubButton onClick={validate} showArrow>Continue to rooms</PGHubButton>
          </div>
        </section>
      </div>
    </PGHubShell>
  );
}
