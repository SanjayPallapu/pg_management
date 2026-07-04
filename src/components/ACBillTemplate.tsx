import { forwardRef } from "react";
import { calculateAPCommercialBill } from "@/hooks/useElectricityReadings";
import paidStamp from "@/assets/paid-stamp.png";

export interface ACBillData {
  roomNo: string;
  units: number;
  unitPrice: number;
  totalAmount: number;
  tenants: { name: string; share: number }[];
  monthLabel: string;
  pgName?: string;
  pgLogoUrl?: string;
  calcMode?: "commercial" | "custom";
  tenantName?: string;
  startReading?: number | null;
  endReading?: number | null;
  splitType?: string;
  splitCount?: number | null;
  isPaid?: boolean;
  paymentDate?: string;
  paymentMode?: string;
  collectedBy?: string;
}

interface Props { data: ACBillData; }

const fmt = (n: number) => `₹ ${Math.floor(n).toLocaleString("en-IN")}`;

export const ACBillTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";
  const apBill = calculateAPCommercialBill(data.units);
  const isCustomMode = data.calcMode === "custom";
  const isPaid = data.isPaid;

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
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        padding: "16px 20px 12px", 
        borderBottom: "1px solid #f1f5f9",
        marginBottom: "12px",
        gap: "16px"
      }}>
        {/* Left Side: Logo */}
        <div style={{ flexShrink: 0 }}>
          <img src={pgLogoUrl} alt={pgName} crossOrigin="anonymous"
            style={{ 
              width: "100px", 
              height: "100px", 
              objectFit: "contain",
              display: "block"
            }} 
          />
        </div>

        {/* Right Side: PG Details & Invoice Title */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left", flexGrow: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {pgName}
          </div>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "6px", 
            fontSize: 18, 
            fontWeight: 700, 
            color: "#0f172a",
            marginTop: "2px"
          }}>
            <span style={{ fontSize: "16px" }}>{isPaid ? "🧾" : "⚡"}</span>
            <span>{isPaid ? "AC Payment Receipt" : "AC Electricity Bill"}</span>
          </div>
          <div style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: "#64748b", 
            marginTop: "4px",
            background: "#f1f5f9",
            padding: "2px 8px",
            borderRadius: "6px",
            display: "inline-block",
            width: "fit-content"
          }}>
            {data.monthLabel}
          </div>
        </div>
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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {data.startReading !== undefined && data.startReading !== null && (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>Previous Reading</td>
                <td style={{ padding: "8px 12px", color: "#374151", fontWeight: 600, textAlign: "right" }}>{data.startReading}</td>
              </tr>
            )}
            {data.endReading !== undefined && data.endReading !== null && (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>Current Reading</td>
                <td style={{ padding: "8px 12px", color: "#374151", fontWeight: 600, textAlign: "right" }}>{data.endReading}</td>
              </tr>
            )}
            <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>
              <td style={{ padding: "8px 12px", color: "#4b5563", fontWeight: 600 }}>Units Consumed</td>
              <td style={{ padding: "8px 12px", color: "#1a1a1a", fontWeight: 700, textAlign: "right" }}>{data.units} Units</td>
            </tr>
            {isCustomMode ? (
              <>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 12px", color: "#4b5563", fontWeight: 500 }}>Rate per Unit</td>
                  <td style={{ padding: "8px 12px", color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>₹ {data.unitPrice.toFixed(2)}</td>
                </tr>
                <tr style={{ background: "#f0f9ff" }}>
                  <td style={{ padding: "9px 12px", color: "#0c4a6e", fontWeight: 600 }}>Total AC Electricity Bill</td>
                  <td style={{ padding: "9px 12px", color: "#0c4a6e", fontWeight: 700, textAlign: "right" }}>{fmt(data.totalAmount)}</td>
                </tr>
              </>
            ) : (
              <>
                {apBill.slabBreakdown.map((slab, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "6px 12px 6px 20px", color: "#6b7280" }}>- {slab.slab}</td>
                    <td style={{ padding: "6px 12px", color: "#374151", textAlign: "right", fontStyle: slab.units === 0 ? "italic" : "normal" }}>
                      {slab.units > 0 ? `${slab.units} units × ₹${slab.rate.toFixed(2)} = ₹${Math.round(slab.amount).toLocaleString("en-IN")}` : "0 units"}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 12px", color: "#4b5563", fontWeight: 500 }}>Energy Charges</td>
                  <td style={{ padding: "8px 12px", color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>₹ {Math.round(apBill.energyCharges).toLocaleString("en-IN")}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 12px", color: "#4b5563", fontWeight: 500 }}>Fixed Charges</td>
                  <td style={{ padding: "8px 12px", color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>₹ {apBill.fixedCharges}</td>
                </tr>
                <tr style={{ background: "#f0f9ff" }}>
                  <td style={{ padding: "9px 12px", color: "#0c4a6e", fontWeight: 600 }}>Total Bill (AP LT-II Commercial)</td>
                  <td style={{ padding: "9px 12px", color: "#0c4a6e", fontWeight: 700, textAlign: "right" }}>{fmt(apBill.totalBill)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div style={{
        margin: "0 20px 12px",
        background: isPaid ? "linear-gradient(180deg,#f0fdf4 0%,#dcfce7 100%)" : "linear-gradient(180deg,#dbeafe 0%,#bfdbfe 100%)",
        borderRadius: 12, padding: "16px 12px", textAlign: "center", 
        border: isPaid ? "1px solid #bbf7d0" : "1px solid #93c5fd",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        {isPaid && (
          <img 
            src={paidStamp} 
            alt="PAID" 
            style={{
              position: "absolute",
              top: "10px",
              right: "15px",
              width: "75px",
              height: "75px",
              objectFit: "contain",
              opacity: 0.9,
              pointerEvents: "none",
            }} 
          />
        )}
        {data.tenantName ? (
          <>
            <div style={{ fontSize: 12, color: isPaid ? "#1b5e20" : "#075985", fontWeight: 500, marginBottom: 4 }}>
              {isPaid ? "Amount Paid" : "Your Share"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: isPaid ? "#1b5e20" : "#0c4a6e" }}>
              {(() => {
                const tenant = data.tenants.find(t => t.name === data.tenantName || t.name.startsWith(data.tenantName + " ("));
                const baseShare = tenant?.share ?? 0;
                const overdue = (tenant as any)?.overdueAcTotal ?? 0;
                return fmt(baseShare + overdue);
              })()}
            </div>
            <div style={{ fontSize: 11, color: isPaid ? "#2e7d32" : "#075985", marginTop: 4, fontWeight: isPaid ? 600 : 400 }}>
              {isPaid ? (
                `Paid via ${data.paymentMode?.toUpperCase()} on ${data.paymentDate}${data.collectedBy ? ` • Received by ${data.collectedBy}` : ""}`
              ) : (
                `${data.monthLabel} • Room ${data.roomNo}`
              )}
            </div>
            {(() => {
              const tenant = data.tenants.find(t => t.name === data.tenantName || t.name.startsWith(data.tenantName + " ("));
              if (!tenant) return null;
              const overdueAcList = (tenant as any).overdueAc || [];
              if (overdueAcList.length === 0) return null;

              return (
                <div style={{ marginTop: 6, fontSize: 10, color: isPaid ? "#2e7d32" : "#b45309", opacity: 0.9 }}>
                  Includes: {tenant.share > 0 ? `Current Month (${fmt(tenant.share)})` : ""}
                  {overdueAcList.map((om: any) => (
                    <span key={om.monthLabel}> + {om.monthLabel} ({fmt(om.share)})</span>
                  ))}
                </div>
              );
            })()}
            <div style={{ fontSize: 10, color: isPaid ? "#2e7d32" : "#075985", opacity: 0.8, marginTop: 4 }}>
              {data.splitType === "custom"
                ? `Split: Custom Split (${data.splitCount} persons)`
                : data.splitType === "capacity"
                  ? `Split: Capped by room capacity`
                  : `Split: Divided by active tenants`}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, color: isPaid ? "#1b5e20" : "#0c4a6e", marginBottom: 4 }}>{fmt(data.totalAmount)}</div>
            <div style={{ fontSize: 13, color: isPaid ? "#1b5e20" : "#075985", fontWeight: 500 }}>
              {data.units} units • {isCustomMode ? `Flat Rate ₹${data.unitPrice}/unit` : "AP LT-II Commercial"} • Room {data.roomNo}
            </div>
            <div style={{ fontSize: 10, color: isPaid ? "#2e7d32" : "#075985", opacity: 0.8, marginTop: 4 }}>
              {data.splitType === "custom"
                ? `Split: Custom Split (${data.splitCount} persons)`
                : data.splitType === "capacity"
                  ? `Split: Capped by room capacity`
                  : `Split: Divided by active tenants`}
            </div>
          </>
        )}
      </div>

      <div style={{ margin: "0 20px 12px", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: isPaid ? "#c8e6c9" : "#dbeafe", color: isPaid ? "#1b5e20" : "#0c4a6e", padding: "10px 16px", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e5e7eb" }}>
          Per-Tenant Share
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {data.tenants.map((t: any, i) => {
              const isCurrentTenant = !data.tenantName || (t.name === data.tenantName || t.name.startsWith(data.tenantName + " ("));
              const hasOverdue = isCurrentTenant && t.overdueAcTotal > 0;
              const totalTenantDue = t.share + (t.overdueAcTotal || 0);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 16px", color: "#1a1a1a", fontWeight: 500, verticalAlign: "top" }}>
                    <div>{t.name}</div>
                    {isCurrentTenant && t.overdueAc && t.overdueAc.map((om: any) => (
                      <div key={om.monthLabel} style={{ fontSize: 10, color: "#b45309", marginTop: 2 }}>
                        ↳ Overdue AC ({om.monthLabel}): {fmt(om.share)}
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#1a1a1a", fontWeight: 600, textAlign: "right", verticalAlign: "top" }}>
                    <div>{fmt(t.share)}</div>
                    {hasOverdue ? (
                      <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700, marginTop: 2 }}>
                        Total: {fmt(totalTenantDue)}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        background: isPaid ? "linear-gradient(180deg,#e8f5e9 0%,#c8e6c9 100%)" : "linear-gradient(180deg,#dbeafe 0%,#bfdbfe 100%)",
        padding: "14px 20px", textAlign: "left", fontSize: 12, color: isPaid ? "#1b5e20" : "#0c4a6e", lineHeight: 1.5,
      }}>
        <p style={{ margin: 0 }}>
          {isPaid 
            ? "Thank you! The AC bill payment has been successfully received and recorded." 
            : "Please pay your AC share along with this month's rent. Thank you! 🙏"}
        </p>
      </div>
    </div>
  );
});

ACBillTemplate.displayName = "ACBillTemplate";