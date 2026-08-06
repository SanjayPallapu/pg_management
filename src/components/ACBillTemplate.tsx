// AC Electricity Bill and Payment Receipt Template - Refined Layout
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
        paddingBottom: "8px",
      }}
    >
      <div style={{ 
        position: "relative",
        padding: "18px 20px 46px", 
        marginBottom: "-30px",
        minHeight: "130px",
        background: isPaid
          ? "linear-gradient(135deg,#0f7a4d 0%,#16a34a 55%,#4ade80 100%)"
          : "linear-gradient(135deg,#0b2f6b 0%,#1d4ed8 55%,#38bdf8 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* Illustrated background shapes */}
        <div style={{ position: "absolute", top: "-70px", right: "-50px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
        <div style={{ position: "absolute", bottom: "-90px", left: "-60px", width: "190px", height: "190px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", top: "18px", left: "150px", width: "10px", height: "10px", borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
        <div style={{ position: "absolute", bottom: "50px", right: "120px", width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
        {/* Left Side: Logo */}
        <div style={{ 
          position: "absolute", 
          left: "20px", 
          top: "50%", 
          transform: "translateY(-50%)",
          zIndex: 10 
        }}>
          <div style={{
            width: "86px", height: "86px", borderRadius: "26px",
            background: isPaid ? "#0f7a4d" : "#0b2f6b",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 10px 24px rgba(2,20,54,.25)",
          }}>
            <img src={pgLogoUrl} alt={pgName} crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "26px" }}
            />
          </div>
        </div>

        {/* Top Right: Receipt/Bill Details */}
        <div style={{
          position: "absolute",
          top: "18px",
          right: "18px",
          textAlign: "right",
          fontSize: "9px",
          color: "rgba(255,255,255,0.8)",
          lineHeight: "1.3",
          fontWeight: 600,
          background: "rgba(255,255,255,0.14)",
          borderRadius: "10px",
          padding: "6px 10px",
        }}>
          <div style={{ textTransform: "uppercase", letterSpacing: "0.3px" }}>{isPaid ? "Receipt No:" : "Bill No:"}</div>
          <div style={{ fontWeight: 800, color: "#ffffff", fontFamily: "monospace", fontSize: "10px" }}>
            AC-{data.roomNo}-{data.monthLabel.split(" ")[0].substring(0,3).toUpperCase()}{data.monthLabel.split(" ")[1] || ""}
          </div>
        </div>

        {/* Center: PG Details & Invoice Title */}
        <div style={{ width: "100%", paddingLeft: "110px", paddingRight: "100px", position: "relative", zIndex: 5 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            {pgName}
          </div>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            gap: "6px", 
            fontSize: 19, 
            fontWeight: 800, 
            color: "#ffffff",
            marginTop: "4px"
          }}>
            <span style={{ fontSize: "15px" }}>{isPaid ? "🧾" : "⚡"}</span>
            <span>{isPaid ? "AC Payment Receipt" : "AC Electricity Bill"}</span>
          </div>
          <div style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            color: "#ffffff", 
            marginTop: "5px",
            background: "rgba(255,255,255,0.2)",
            padding: "3px 10px",
            borderRadius: "999px",
            display: "inline-block",
            width: "fit-content"
          }}>
            {data.monthLabel}
          </div>
        </div>
      </div>

            {/* Tenant + Room meta strip */}
      <div style={{ position: "relative", zIndex: 6, margin: "0 16px 10px", display: "flex", gap: 8 }}>
        {data.tenantName ? (
          <>
            <div style={{ flex: 1, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "10px 12px", boxShadow: "0 10px 24px -18px rgba(15,23,42,.6)" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "flex", alignItems: "center", gap: "4px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Tenant
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{data.tenantName}</div>
            </div>
            <div style={{ flex: 1, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "10px 12px", boxShadow: "0 10px 24px -18px rgba(15,23,42,.6)" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "flex", alignItems: "center", gap: "4px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18"/><path d="M15 11h.01"/></svg>
                Room
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{data.roomNo}</div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "12px 16px", boxShadow: "0 10px 24px -18px rgba(15,23,42,.6)" }}>
            <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18"/><path d="M15 11h.01"/></svg>
              Room
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{data.roomNo}</div>
          </div>
        )}
      </div>


      {/* Reading breakdown */}
      <div style={{ margin: "0 16px 10px", border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden", background: "#ffffff" }}>
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
              <td style={{ padding: "8px 12px", color: "#1e293b", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Units Consumed
              </td>
              <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 800, fontSize: "13px", textAlign: "right" }}>{data.units} Units</td>
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
        margin: "0 16px 12px",
        background: isPaid ? "linear-gradient(140deg,#f0fdf4 0%,#dcfce7 100%)" : "linear-gradient(140deg,#eff6ff 0%,#dbeafe 60%,#e0f2fe 100%)",
        borderRadius: 20, padding: "18px 12px", textAlign: "center", 
        border: isPaid ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: "-50px", left: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: isPaid ? "rgba(22,163,74,.08)" : "rgba(29,78,216,.08)" }} />
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

      <div style={{ margin: "0 16px 12px", border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ background: isPaid ? "#c8e6c9" : "#dbeafe", color: isPaid ? "#1b5e20" : "#0c4a6e", padding: "10px 16px", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Per-Tenant Share
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {data.tenants.map((t: any, i) => {
              const isCurrentTenant = !data.tenantName || (t.name === data.tenantName || t.name.startsWith(data.tenantName + " ("));
              const hasOverdue = isCurrentTenant && t.overdueAcTotal > 0;
              const totalTenantDue = t.share + (t.overdueAcTotal || 0);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 16px", color: "#1e293b", fontWeight: 600, verticalAlign: "top" }}>
                    <div>{t.name}</div>
                    {isCurrentTenant && t.overdueAc && t.overdueAc.map((om: any) => (
                      <div key={om.monthLabel} style={{ fontSize: 10, color: "#b45309", marginTop: 2 }}>
                        ↳ Overdue AC ({om.monthLabel}): {fmt(om.share)}
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#0f172a", fontWeight: 700, textAlign: "right", verticalAlign: "top" }}>
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
        padding: "14px 20px 16px", textAlign: "center", fontSize: 12, color: isPaid ? "#1b5e20" : "#0c4a6e", lineHeight: 1.5, fontWeight: 500,
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