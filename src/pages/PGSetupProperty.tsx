import { useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Building2, Layers3, Map, MapPin, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import readyBuilding from "@/assets/pg-hub/ready-building.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubFormField } from "@/features/pg-hub/PGHubFormField";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft } from "@/features/pg-hub/PGSetupDraftContext";

type Errors = Partial<Record<"name" | "city" | "address" | "floors", string>>;

export default function PGSetupProperty() {
  const navigate = useNavigate();
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

  return (
    <PGHubShell variant="light">
      <div className="pgh-page">
        <PGHubSetupHeader step="Step 1 of 2" progress={.5} onBack={() => navigate(-1)} />
        <section className="pgh-setup-title"><h1>Property Details</h1><p>Add the basic information for your PG property.</p></section>
        <motion.div className="pgh-setup-form" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .06 } } }}>
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="PG Name" required icon={Building2} placeholder="Enter PG name" value={property.name} onChange={(event) => updateProperty({ name: event.currentTarget.value })} error={errors.name} /></motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="City / Area" required icon={MapPin} placeholder="Enter city or area" value={property.city} onChange={(event) => updateProperty({ city: event.currentTarget.value })} error={errors.city} /></motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="Address" required multiline icon={Map} placeholder="Enter full address" value={property.address} onChange={(event) => updateProperty({ address: event.currentTarget.value })} error={errors.address} /></motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><PGHubFormField label="Total Floors" required icon={Layers3} type="number" inputMode="numeric" min={1} max={20} value={property.totalFloors} onChange={(event) => setFloorCount(Number(event.currentTarget.value))} error={errors.floors} /></motion.div>
        </motion.div>

        <motion.section className="pgh-photo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 }}>
          <label>Property Logo / Photo <small>(Optional)</small></label>
          <label className="pgh-photo__picker">
            <img src={property.imagePreview || readyBuilding} alt="Property preview" />
            <span><strong>{property.imageFile ? "Image selected" : "Add a property image"}</strong><small>This helps you recognize your PG in the app.</small><i><UploadCloud size={17} />{property.imageFile ? "Change Image" : "Upload Image"}</i></span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
          </label>
          <small>JPG, PNG, or WebP up to 5 MB. Recommended ratio 4:3.</small>
        </motion.section>
        <PGHubButton onClick={validate} showArrow>Continue</PGHubButton>
      </div>
    </PGHubShell>
  );
}
