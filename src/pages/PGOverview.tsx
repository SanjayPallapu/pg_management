import { useState } from "react";
import { ArrowLeft, BedDouble, Building2, DoorOpen, Layers3, MapPin, Pencil, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePG } from "@/contexts/PGContext";
import { useRooms } from "@/hooks/useRooms";
import { supabase } from "@/integrations/supabase/proxyClient";

export default function PGOverview() {
  const navigate = useNavigate();
  const { currentPG, refreshPGs } = usePG();
  const { rooms } = useRooms();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentPG?.name ?? "");
  const [address, setAddress] = useState(currentPG?.address ?? "");
  const [saving, setSaving] = useState(false);

  const totalBeds = rooms.reduce((sum, r: any) => sum + (r.capacity ?? r.beds ?? 0), 0);

  const save = async () => {
    if (!currentPG) return;
    setSaving(true);
    const { error } = await supabase
      .from("pgs")
      .update({ name: name.trim(), address: address.trim() })
      .eq("id", currentPG.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshPGs();
    toast.success("PG details updated");
    setEditing(false);
  };

  if (!currentPG) {
    return (
      <PGHubShell variant="light">
        <div className="pgh-page"><p>No PG selected.</p></div>
      </PGHubShell>
    );
  }

  return (
    <PGHubShell variant="light">
      <div className="pgh-page">
        <header className="pgh-setup-header__row" style={{ marginBottom: "1.25rem" }}>
          <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
          <h1 className="pgh-setup-header__title">PG Overview</h1>
          <button type="button" onClick={() => setEditing((v) => !v)}>
            {editing ? <><X size={14} /> Cancel</> : <><Pencil size={14} /> Edit</>}
          </button>
        </header>

        <section className="pgh-card" style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
          {!editing ? (
            <>
              <div style={{ display: "grid", gap: ".25rem" }}>
                <span style={{ fontSize: ".7rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#7b4dff", fontWeight: 800 }}>Property</span>
                <h2 style={{ margin: 0, fontFamily: "Sora, sans-serif", fontSize: "1.85rem", letterSpacing: "-.03em" }}>{currentPG.name}</h2>
                {currentPG.address && <p style={{ margin: 0, color: "#667085", display: "inline-flex", gap: ".4rem", alignItems: "center" }}><MapPin size={14} /> {currentPG.address}</p>}
              </div>
            </>
          ) : (
            <>
              <label className="pgh-field">
                <span className="pgh-field__label">PG Name</span>
                <span className="pgh-field__wrap"><Building2 size={20} className="pgh-field__icon" />
                  <input className="pgh-field__control pgh-field__control--icon" value={name} onChange={(e) => setName(e.target.value)} />
                </span>
              </label>
              <label className="pgh-field">
                <span className="pgh-field__label">Address</span>
                <span className="pgh-field__wrap"><MapPin size={20} className="pgh-field__icon" />
                  <input className="pgh-field__control pgh-field__control--icon" value={address} onChange={(e) => setAddress(e.target.value)} />
                </span>
              </label>
              <PGHubButton onClick={save} loading={saving}><Save size={16} /> Save changes</PGHubButton>
            </>
          )}
        </section>

        <section className="pgh-card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: ".75rem", textAlign: "center" }}>
          <div><Layers3 size={20} style={{ color: "#7b4dff" }} /><div style={{ fontFamily: "Sora, sans-serif", fontSize: "1.5rem", fontWeight: 800 }}>{currentPG.floors}</div><small style={{ color: "#667085" }}>Floors</small></div>
          <div><DoorOpen size={20} style={{ color: "#1769ff" }} /><div style={{ fontFamily: "Sora, sans-serif", fontSize: "1.5rem", fontWeight: 800 }}>{rooms.length}</div><small style={{ color: "#667085" }}>Rooms</small></div>
          <div><BedDouble size={20} style={{ color: "#38bdf8" }} /><div style={{ fontFamily: "Sora, sans-serif", fontSize: "1.5rem", fontWeight: 800 }}>{totalBeds}</div><small style={{ color: "#667085" }}>Beds</small></div>
        </section>
      </div>
    </PGHubShell>
  );
}