import { useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Building2, Layers3, Map, MapPin, UploadCloud, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import journeyBuilding from "@/assets/pg-hub/hub-building-hero.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubFormField } from "@/features/pg-hub/PGHubFormField";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft } from "@/features/pg-hub/PGSetupDraftContext";
import { useAuth } from "@/hooks/useAuth";

type Errors = Partial<Record<"name" | "city" | "address" | "floors", string>>;

export default function PGSetupProperty() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { property, updateProperty, setPropertyImage, setFloorCount } = usePGSetupDraft();
  const [errors, setErrors] = useState<Errors>({});

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
    const next: Errors = {};
    if (!property.name.trim()) next.name = "Enter your PG name.";
    if (!property.city.trim()) next.city = "Enter the city or area.";
    if (!property.address.trim()) next.address = "Enter the property address.";
    if (property.totalFloors < 1) next.floors = "Enter at least one floor.";
    setErrors(next);
    if (Object.keys(next).length === 0) navigate("/setup/capacity");
  };

  const backToOnboarding = async () => {
    await signOut();
    window.location.replace("/onboarding");
  };

  return (
    <PGHubShell variant="light" className="pgh-setup-shell">
      <div className="pgh-page pgh-setup-page">
        <PGHubSetupHeader step="Step 1 of 2" progress={.5} onBack={backToOnboarding} />
        <motion.section className="pgh-setup-hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <img src={journeyBuilding} alt="PG property" />
          <div aria-hidden="true" />
          <span>Build your workspace</span>
          <h1>Tell us about<br /><em>your PG</em></h1>
          <p>We’ll prepare rooms and capacity around your property.</p>
        </motion.section>
        <section className="pgh-setup-surface">
          <section className="pgh-setup-title"><h2>Property details</h2><p>You can edit all of this later.</p></section>
          <motion.div className="pgh-setup-form" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .06 } } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="PG Name" required icon={Building2} placeholder="Enter PG name" value={property.name} onChange={(event) => updateProperty({ name: event.currentTarget.value })} error={errors.name} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
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
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="City / Area" required icon={MapPin} placeholder="Enter city or area" value={property.city} onChange={(event) => updateProperty({ city: event.currentTarget.value })} error={errors.city} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="Address" required multiline icon={Map} placeholder="Enter full address" value={property.address} onChange={(event) => updateProperty({ address: event.currentTarget.value })} error={errors.address} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="Total Floors" required icon={Layers3} type="number" inputMode="numeric" min={1} max={20} value={property.totalFloors} onChange={(event) => setFloorCount(Number(event.currentTarget.value))} error={errors.floors} /></motion.div>
          </motion.div>

          <motion.section className="pgh-photo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 }}>
            <label>Property Logo / Photo <small>(Optional)</small></label>
            <label className="pgh-photo__picker">
              <img src={property.imagePreview || journeyBuilding} alt="Property preview" />
              <span><strong>{property.imageFile ? "Image selected" : "Add a property image"}</strong><small>This helps you recognize your PG in the app.</small><i><UploadCloud size={17} />{property.imageFile ? "Change Image" : "Upload Image"}</i></span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
            </label>
            <small>JPG, PNG, or WebP up to 5 MB. Recommended ratio 4:3.</small>
          </motion.section>
          <PGHubButton onClick={validate} showArrow>Continue to rooms</PGHubButton>
        </section>
      </div>
    </PGHubShell>
  );
}
