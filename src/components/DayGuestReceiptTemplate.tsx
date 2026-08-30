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
        height: "680px",
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
          padding: "16px 20px 12px",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: "8px",
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
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <img
            src={pgLogoUrl}
            alt="Logo"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              objectFit: "cover",
              border: "1px solid #e2e8f0",
            }}
          />
        </div>

        {/* Right: Receipt No */}
        <div
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            textAlign: "right",
            fontSize: "9px",
            color: "#64748b",
            background: "#f8fafc",
            padding: "5px 9px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ textTransform: "uppercase", letterSpacing: "0.3px" }}>Receipt No:</div>
          <div
            style={{
              fontWeight: 700,
              color: "#334155",
              fontFamily: "monospace",
              fontSize: "10px",
            }}
          >
            {receiptNo}
          </div>
        </div>

        {/* Center: Title & Subtitle */}
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
            <span style={{ fontSize: "15px" }}>🧾</span>
            <span>Day Guest Payment Receipt</span>
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#15803d",
              marginTop: "4px",
              background: "#dcfce7",
              padding: "2px 8px",
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
          margin: "0 20px 10px",
          background: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
          borderRadius: "12px",
          padding: "14px 16px",
          textAlign: "center",
          border: "1px solid #a7f3d0",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#047857",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Total Amount Received
        </div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#065f46",
            letterSpacing: "-0.5px",
            marginTop: "2px",
          }}
        >
          {formatCurrency(amountPaid)}
        </div>
        <div style={{ fontSize: "10px", color: "#047857", marginTop: "2px", fontWeight: 600 }}>
          Payment Status: {isFullyPaid ? "Fully Paid" : `Partial Payment (Bal: ${formatCurrency(data.balance)})`}
        </div>

        {/* Paid Stamp */}
        {isFullyPaid && (
          <img
            src={paidStampImg}
            alt="PAID"
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%) rotate(-12deg)",
              width: "68px",
              opacity: 0.85,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Guest & Room Details Grid */}
      <div
        style={{
          margin: "0 20px 10px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px 12px",
          }}
        >
          <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
            Guest Name
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
            {data.guestName}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px 12px",
          }}
        >
          <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
            Room & Sharing
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
            Room {data.roomNo} {data.isAc ? "(AC)" : "(Non-AC)"}
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div
        style={{
          margin: "0 20px 10px",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#475569",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Description</span>
          <span>Amount</span>
        </div>

        <div style={{ padding: "6px 12px", fontSize: "11px", display: "flex", justifyContent: "space-between", color: "#334155" }}>
          <span>Stay ({data.numberOfDays} days × {formatCurrency(data.perDayRate)}/day)</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(rentSubtotal)}</span>
        </div>

        {acTotal > 0 && (
          <div style={{ padding: "4px 12px", fontSize: "11px", display: "flex", justifyContent: "space-between", color: "#334155" }}>
            <span>AC Electricity ({data.numberOfDays} days × {formatCurrency(data.acPerDayCharge || 0)})</span>
            <span style={{ fontWeight: 600 }}>+{formatCurrency(acTotal)}</span>
          </div>
        )}

        {discountTotal > 0 && (
          <div style={{ padding: "4px 12px", fontSize: "11px", display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
            <span>Discount / Concession</span>
            <span style={{ fontWeight: 600 }}>-{formatCurrency(discountTotal)}</span>
          </div>
        )}

        <div
          style={{
            background: "#f8fafc",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 800,
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
          margin: "0 20px auto",
          fontSize: "10px",
          color: "#64748b",
          display: "flex",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <span>Mode: <strong style={{ color: "#334155" }}>{data.paymentMode ? data.paymentMode.toUpperCase() : "UPI / CASH"}</strong></span>
        <span>Receipt Generated on: <strong style={{ color: "#334155" }}>{formatDate(data.paymentDate || new Date().toISOString())}</strong></span>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          padding: "10px 20px",
          textAlign: "center",
          fontSize: "10px",
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
