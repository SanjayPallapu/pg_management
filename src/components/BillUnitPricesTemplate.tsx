import { forwardRef } from "react";

export interface BillPricesData {
  pgName: string;
  pgLogoUrl: string;
  electricitySlabs: { slab: string; rate: number }[];
  fixedCharges: { range: string; charge: number }[];
  effectiveDate: string;
}

interface Props {
  data: BillPricesData;
}

export const BillUnitPricesTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
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
      <div
        style={{
          position: "relative",
          padding: "16px 20px 12px",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: "12px",
          minHeight: "115px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Left Side: Logo */}
        <div
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <img
            src={pgLogoUrl}
            alt={pgName}
            crossOrigin="anonymous"
            style={{
              width: "105px",
              height: "105px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Top Right: Tariff Details */}
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "20px",
            textAlign: "right",
            fontSize: "9px",
            color: "#64748b",
            lineHeight: "1.3",
            fontWeight: 500,
          }}
        >
          <div style={{ textTransform: "uppercase", letterSpacing: "0.3px" }}>Category:</div>
          <div
            style={{
              fontWeight: 700,
              color: "#334155",
              fontFamily: "monospace",
              fontSize: "10px",
            }}
          >
            LT-II COMM
          </div>
        </div>

        {/* Center: PG Details & Invoice Title */}
        <div style={{ width: "100%", paddingLeft: "80px", paddingRight: "80px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {pgName}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "17px",
              fontWeight: 700,
              color: "#0f172a",
              marginTop: "3px",
            }}
          >
            <span style={{ fontSize: "15px" }}>⚡</span>
            <span>Electricity Tariff Card</span>
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#475569",
              marginTop: "5px",
              background: "#f1f5f9",
              padding: "2px 8px",
              borderRadius: "6px",
              display: "inline-block",
              width: "fit-content",
            }}
          >
            Effective from {data.effectiveDate}
          </div>
        </div>
      </div>

      {/* Electricity Slabs */}
      <div style={{ margin: "10px 20px 8px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ⚡ Electricity Charges (AP LT-II Commercial)
        </div>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f0f9ff" }}>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    color: "#0369a1",
                    fontWeight: 600,
                    borderBottom: "1px solid #bae6fd",
                  }}
                >
                  Slab Range
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "#0369a1",
                    fontWeight: 600,
                    borderBottom: "1px solid #bae6fd",
                  }}
                >
                  Rate / Unit
                </th>
              </tr>
            </thead>
            <tbody>
              {data.electricitySlabs.map((slab, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < data.electricitySlabs.length - 1
                        ? "1px solid #f1f5f9"
                        : "none",
                    background: i % 2 === 1 ? "#fafbfc" : "#ffffff",
                  }}
                >
                  <td style={{ padding: "7px 12px", color: "#374151" }}>
                    {slab.slab}
                  </td>
                  <td
                    style={{
                      padding: "7px 12px",
                      textAlign: "right",
                      color: "#1a1a1a",
                      fontWeight: 600,
                    }}
                  >
                    ₹{slab.rate.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed Charges */}
      <div style={{ margin: "10px 20px 8px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          📋 Fixed Charges (per month)
        </div>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {data.fixedCharges.map((fc, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < data.fixedCharges.length - 1
                        ? "1px solid #f1f5f9"
                        : "none",
                    background: i % 2 === 1 ? "#fafbfc" : "#ffffff",
                  }}
                >
                  <td style={{ padding: "7px 12px", color: "#374151" }}>
                    {fc.range}
                  </td>
                  <td
                    style={{
                      padding: "7px 12px",
                      textAlign: "right",
                      color: "#1a1a1a",
                      fontWeight: 600,
                    }}
                  >
                    ₹{fc.charge}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#f8fafc",
          borderTop: "1px solid #e5e7eb",
          padding: "10px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 10, color: "#9ca3af" }}>
          Rates subject to change • Contact PG management for questions
        </div>
        <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500, marginTop: 2 }}>
          {pgName}
        </div>
      </div>
    </div>
  );
});

BillUnitPricesTemplate.displayName = "BillUnitPricesTemplate";
