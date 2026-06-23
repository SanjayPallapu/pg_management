import { forwardRef } from "react";

export interface BillPricesData {
  pgName: string;
  pgLogoUrl: string;
  bedPricing: { sharing: number; price: number }[];
  electricitySlabs: { slab: string; rate: number }[];
  fixedCharges: { range: string; charge: number }[];
  acUnitPrice: number;
  effectiveDate: string;
}

interface Props {
  data: BillPricesData;
}

const fmt = (n: number) => `₹${Math.floor(n).toLocaleString("en-IN")}`;

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
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            💰
          </div>
          <span>Current Pricing & Rates</span>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Effective from {data.effectiveDate}
        </div>
      </div>

      {/* Bed Pricing / Rent by Sharing */}
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
          🏠 Room Rent (per bed / month)
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
              <tr style={{ background: "#f8fafc" }}>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    color: "#4b5563",
                    fontWeight: 600,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Sharing Type
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "#4b5563",
                    fontWeight: 600,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Rent / Month
                </th>
              </tr>
            </thead>
            <tbody>
              {data.bedPricing.map((bp, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < data.bedPricing.length - 1 ? "1px solid #f1f5f9" : "none",
                    background: i % 2 === 1 ? "#fafbfc" : "#ffffff",
                  }}
                >
                  <td style={{ padding: "8px 12px", color: "#374151", fontWeight: 500 }}>
                    {bp.sharing === 1
                      ? "Single Occupancy"
                      : `${bp.sharing}-Sharing`}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      color: "#1a1a1a",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(bp.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* AC Unit Price highlight */}
      <div
        style={{
          margin: "10px 20px 14px",
          background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
          borderRadius: 12,
          padding: "14px 16px",
          border: "1px solid #93c5fd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#4338ca", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            AC Room Extra Charge
          </div>
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
            Per unit consumed
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>
          ₹{data.acUnitPrice}/unit
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
