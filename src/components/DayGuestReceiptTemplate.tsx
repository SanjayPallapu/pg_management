import { forwardRef } from "react";
import paidStampImg from "@/assets/paid-stamp.png";

export interface DayGuestReceiptData {
  guestName: string;
  fromDate: string; // ISO
  toDate: string; // ISO
  numberOfDays: number;
  perDayRate: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  roomNo: string;
  isAc?: boolean;
  acPerDayCharge?: number;
  discount?: number;
  paymentMode?: string;
  paymentDate?: string;
  collectedBy?: string;
  pgName?: string;
  pgLogoUrl?: string;
  pgPhone?: string;
}

interface Props {
  data: DayGuestReceiptData;
}

const formatCurrency = (amount: number): string =>
  `₹ ${Math.floor(amount).toLocaleString("en-IN")}`;

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const DayGuestReceiptTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";
  const amountPaid = data.amountPaid || data.totalAmount;
  const isFullyPaid = data.balance <= 0;

  const rentSubtotal = data.numberOfDays * data.perDayRate;
  const acTotal = (data.acPerDayCharge || 0) * data.numberOfDays;
  const discountTotal = data.discount || 0;

  const receiptNo = (() => {
    const monthAbbrs = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const d = new Date(data.fromDate);
    const guestMonthAbbr = isNaN(d.getTime()) ? "" : `${monthAbbrs[d.getMonth()]}${d.getFullYear()}`;
    return `DGR-${data.roomNo.replace(/\s+/g, "")}-${guestMonthAbbr}`;
  })();

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        height: "690px",
        background: "#ffffff",
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "relative",
          padding: "14px 16px 10px",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: "6px",
          minHeight: "110px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Left: Logo */}
        <div
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <img
            src={pgLogoUrl}
            alt="Logo"
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "14px",
              objectFit: "cover",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          />
        </div>

        {/* Right: Receipt No */}
        <div
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            textAlign: "right",
            fontSize: "10px",
            color: "#64748b",
            maxWidth: "125px",
            wordBreak: "break-word",
            whiteSpace: "normal",
          }}
        >
          <div style={{ textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 800, fontSize: "10px" }}>Receipt No:</div>
          <div
            style={{
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "monospace",
              fontSize: "11px",
              lineHeight: "1.2",
              marginTop: "2px",
            }}
          >
            {receiptNo}
          </div>
        </div>

        {/* Center: Title & Subtitle */}
        <div style={{ width: "100%", paddingLeft: "88px", paddingRight: "88px" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: "#334155",
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
              fontSize: "18px",
              fontWeight: 800,
              color: "#0f172a",
              marginTop: "2px",
            }}
          >
            <span style={{ fontSize: "17px" }}>🧾</span>
            <span>Day Guest Payment Receipt</span>
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#15803d",
              marginTop: "4px",
              background: "#dcfce7",
              padding: "3px 12px",
              borderRadius: "6px",
              display: "inline-block",
              width: "fit-content",
            }}
          >
            Stay Period: {formatDate(data.fromDate)} - {formatDate(data.toDate)}
          </div>
        </div>
      </div>

      {/* Amount Banner */}
      <div
        style={{
          margin: "0 16px 10px",
          background: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
          borderRadius: "14px",
          padding: "14px 16px",
          textAlign: "center",
          border: "1px solid #a7f3d0",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: "#047857",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Total Amount Received
        </div>
        <div
          style={{
            fontSize: "30px",
            fontWeight: 900,
            color: "#065f46",
            letterSpacing: "-0.5px",
            marginTop: "2px",
          }}
        >
          {formatCurrency(amountPaid)}
        </div>
        <div style={{ fontSize: "12px", color: "#047857", marginTop: "2px", fontWeight: 700 }}>
          Payment Status: {isFullyPaid ? "Fully Paid" : `Partial Payment (Bal: ${formatCurrency(data.balance)})`}
        </div>

        {/* Paid Stamp */}
        {isFullyPaid && (
          <img
            src={paidStampImg}
            alt="PAID"
            style={{
              position: "absolute",
              right: "18px",
              top: "50%",
              transform: "translateY(-50%) rotate(-12deg)",
              width: "72px",
              opacity: 0.85,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Guest & Room Details Grid */}
      <div
        style={{
          margin: "0 16px 10px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
            Guest Name
          </div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
            {data.guestName}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
            Room & Sharing
          </div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
            Room {data.roomNo} {data.isAc ? "(AC)" : "(Non-AC)"}
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div
        style={{
          margin: "0 16px 10px",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 800,
            color: "#475569",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Description</span>
          <span>Amount</span>
        </div>

        <div style={{ padding: "7px 14px", fontSize: "12px", display: "flex", justifyContent: "space-between", color: "#334155" }}>
          <span>Stay ({data.numberOfDays} days × {formatCurrency(data.perDayRate)}/day)</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(rentSubtotal)}</span>
        </div>

        {acTotal > 0 && (
          <div style={{ padding: "5px 14px", fontSize: "12px", display: "flex", justifyContent: "space-between", color: "#334155" }}>
            <span>AC Electricity ({data.numberOfDays} days × {formatCurrency(data.acPerDayCharge || 0)})</span>
            <span style={{ fontWeight: 700 }}>+{formatCurrency(acTotal)}</span>
          </div>
        )}

        {discountTotal > 0 && (
          <div style={{ padding: "5px 14px", fontSize: "12px", display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
            <span>Discount / Concession</span>
            <span style={{ fontWeight: 700 }}>-{formatCurrency(discountTotal)}</span>
          </div>
        )}

        <div
          style={{
            background: "#f8fafc",
            padding: "8px 14px",
            fontSize: "14px",
            fontWeight: 900,
            color: "#0f172a",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Net Paid Total</span>
          <span style={{ color: "#059669" }}>{formatCurrency(amountPaid)}</span>
        </div>
      </div>

      {/* Payment Meta Info */}
      <div
        style={{
          margin: "0 16px 0",
          fontSize: "11px",
          color: "#64748b",
          display: "flex",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <span>Mode: <strong style={{ color: "#0f172a" }}>{data.paymentMode ? data.paymentMode.toUpperCase() : "UPI / CASH"}</strong></span>
        <span>Receipt Generated on: <strong style={{ color: "#0f172a" }}>{formatDate(data.paymentDate || new Date().toISOString())}</strong></span>
      </div>

      {/* Feel Good Appreciation Card */}
      <div
        style={{
          margin: "8px 16px auto",
          background: "#f0fdf4",
          border: "1px dashed #86efac",
          borderRadius: "10px",
          padding: "8px 14px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 800, color: "#166534" }}>
          ✨ We loved having you stay with us!
        </div>
        <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px", fontWeight: 500 }}>
          Hope you had a comfortable and pleasant stay. Looking forward to welcoming you again!
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          padding: "8px 16px",
          textAlign: "center",
          fontSize: "11px",
          color: "#94a3b8",
          background: "#ffffff",
        }}
      >
        Thank you for your stay with {pgName}! This is a digitally verified receipt.
      </div>
    </div>
  );
});

DayGuestReceiptTemplate.displayName = "DayGuestReceiptTemplate";
