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
      {/* Header with PG Logo */}
      <div style={{ width: "100%", textAlign: "center", padding: "20px 0 4px" }}>
        <img
          src={pgLogoUrl}
          alt={pgName}
          crossOrigin="anonymous"
          style={{
            width: "220px",
            height: "auto",
            margin: "0 auto",
            display: "block",
            maxHeight: "120px",
            objectFit: "contain",
          }}
        />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#4b5563", marginTop: 4 }}>
          {pgName}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 20,
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            ⚡
          </div>
          <span>Electricity Rates</span>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Effective from {data.effectiveDate}
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
