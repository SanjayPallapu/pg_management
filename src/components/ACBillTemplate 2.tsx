import { forwardRef } from "react";

export interface ACBillData {
  roomNo: string;
  units: number;
  unitPrice: number;
  totalAmount: number;
  tenants: { name: string; share: number }[];
  monthLabel: string;
  pgName?: string;
  pgLogoUrl?: string;
  tenantName?: string;
}

interface Props { data: ACBillData; }

const fmt = (n: number) => `₹ ${Math.floor(n).toLocaleString("en-IN")}`;

export const ACBillTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";
  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        background: "#ffffff",
        fontFamily: "'Segoe UI','Roboto',Arial,sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", textAlign: "center", padding: "20px 0 1px" }}>
        <img src={pgLogoUrl} alt={pgName} crossOrigin="anonymous"
          style={{ width: "240px", height: "auto", margin: "0 auto", display: "block", maxHeight: "130px", objectFit: "contain" }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#4b5563", marginTop: 4 }}>{pgName}</div>
      </div>

      <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: "#0ea5e9",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold",
          }}>⚡</div>
          <span>AC Electricity Bill</span>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{data.monthLabel}</div>
      </div>

      {/* Tenant + Room meta strip */}
      <div style={{ margin: "4px 20px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {data.tenantName && (
          <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>Tenant</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{data.tenantName}</div>
          </div>
        )}
        <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>Room</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{data.roomNo}</div>
        </div>
      </div>

      {/* Reading breakdown */}
      <div style={{ margin: "0 20px 10px", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "9px 14px", color: "#6b7280" }}>Units Consumed</td>
              <td style={{ padding: "9px 14px", color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>{data.units}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "9px 14px", color: "#6b7280" }}>Rate per Unit</td>
              <td style={{ padding: "9px 14px", color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>₹ {data.unitPrice}</td>
            </tr>
            <tr style={{ background: "#f0f9ff" }}>
              <td style={{ padding: "10px 14px", color: "#0c4a6e", fontWeight: 600 }}>Total Bill</td>
              <td style={{ padding: "10px 14px", color: "#0c4a6e", fontWeight: 700, textAlign: "right" }}>{fmt(data.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{
        margin: "0 20px 12px",
        background: "linear-gradient(180deg,#dbeafe 0%,#bfdbfe 100%)",
        borderRadius: 12, padding: 16, textAlign: "center", border: "1px solid #93c5fd",
      }}>
        {data.tenantName ? (
          <>
            <div style={{ fontSize: 12, color: "#075985", fontWeight: 500, marginBottom: 4 }}>Your Share</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0c4a6e" }}>
              {fmt(data.tenants.find(t => t.name === data.tenantName)?.share ?? data.totalAmount)}
            </div>
            <div style={{ fontSize: 12, color: "#075985", marginTop: 4 }}>{data.monthLabel} • Room {data.roomNo}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0c4a6e", marginBottom: 4 }}>{fmt(data.totalAmount)}</div>
            <div style={{ fontSize: 13, color: "#075985", fontWeight: 500 }}>
              {data.units} units × ₹{data.unitPrice} • Room {data.roomNo}
            </div>
          </>
        )}
      </div>

      <div style={{ margin: "0 20px 12px", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "#dbeafe", color: "#0c4a6e", padding: "10px 16px", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e5e7eb" }}>
          Per-Tenant Share
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {data.tenants.map((t, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 16px", color: "#1a1a1a", fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: "10px 16px", color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>{fmt(t.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        background: "linear-gradient(180deg,#dbeafe 0%,#bfdbfe 100%)",
        padding: "14px 20px", textAlign: "left", fontSize: 12, color: "#0c4a6e", lineHeight: 1.5,
      }}>
        <p style={{ margin: 0 }}>Please pay your AC share along with this month's rent. Thank you! 🙏</p>
      </div>
    </div>
  );
});

ACBillTemplate.displayName = "ACBillTemplate";