import pgHubLogo from "@/assets/pg-hub/pg-hub-logo.png";

export function PGHubBrand({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className={`pgh-brand ${compact ? "pgh-brand--compact" : ""}`}>
      <img src={pgHubLogo} alt="PG HUB" />
      <span className={dark ? "pgh-brand__text--light" : ""}>PG HUB</span>
    </div>
  );
}
