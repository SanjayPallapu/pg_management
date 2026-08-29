import { forwardRef } from "react";

export interface DayGuestReminderData {
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
  acPerDayCharge?: number; // per-day AC electricity charge, multiplied by numberOfDays
  pgName?: string;
  pgLogoUrl?: string;
}

interface Props {
  data: DayGuestReminderData;
}

const formatCurrency = (amount: number): string =>
  `₹ ${Math.floor(amount).toLocaleString("en-IN")}`;

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const DayGuestReminderTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const hasPaid = data.amountPaid > 0;
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";

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
            loading="eager"
            style={{
              width: "105px",
              height: "105px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Top Right: Bill Details */}
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
          <div style={{ textTransform: "uppercase", letterSpacing: "0.3px" }}>Bill No:</div>
          <div
            style={{
              fontWeight: 700,
              color: "#334155",
              fontFamily: "monospace",
              fontSize: "10px",
            }}
          >
            {(() => {
              const monthAbbrs = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
              const d = new Date(data.fromDate);
              const guestMonthAbbr = isNaN(d.getTime()) ? "" : `${monthAbbrs[d.getMonth()]}${d.getFullYear()}`;
              return `DG-${data.roomNo}-${guestMonthAbbr}`;
            })()}
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
            <span style={{ fontSize: "15px" }}>🔔</span>
            <span>Day Guest Payment Reminder</span>
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
            {(() => {
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              const d = new Date(data.fromDate);
              return isNaN(d.getTime()) ? "" : `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            })()}
          </div>
        </div>
      </div>

      {/* Amount Due */}
      <div
        style={{
          margin: "0 20px 12px",
          background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center",
          border: "1px solid #fcd34d",
        }}
      >
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>
          {formatCurrency(data.balance)}
        </div>
        <div style={{ fontSize: "14px", color: "#92400e", fontWeight: 500 }}>
          {hasPaid ? "Remaining Balance Due" : "Amount Due"}
        </div>
        {hasPaid && (
          <div style={{ fontSize: "12px", color: "#166534", marginTop: "4px" }}>
            {formatCurrency(data.amountPaid)} already paid
          </div>
        )}
      </div>

      {/* Details */}
      <div
        style={{
          margin: "0 20px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
          flex: 1,
        }}
      >
        <div
          style={{
            background: "#fef3c7",
            color: "#1a1a1a",
            padding: "10px 16px",
            fontWeight: 600,
            fontSize: "14px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Stay Details
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Guest Name:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.guestName}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Stay Period:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {formatDate(data.fromDate)} - {formatDate(data.toDate)}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Number of Days:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.numberOfDays} days</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Room No:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {data.roomNo} {data.isAc ? " (❄️ AC Room)" : ""}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Per Day Rent:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {formatCurrency(data.perDayRate)}
              </td>
            </tr>
            {Boolean(data.acPerDayCharge && data.acPerDayCharge > 0) && (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 16px", color: "#6b7280" }}>
                  AC Electricity:
                  <span style={{ display: "block", fontSize: "11px", color: "#9ca3af" }}>
                    {formatCurrency(data.acPerDayCharge!)} × {data.numberOfDays} days
                  </span>
                </td>
                <td style={{ padding: "10px 16px", fontWeight: 600, color: "#0284c7" }}>
                  {formatCurrency(data.acPerDayCharge! * data.numberOfDays)}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Total Amount:</td>
              <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1a1a1a" }}>
                {formatCurrency(data.totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Message */}
      <div
        style={{
          background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
          padding: "16px 20px",
          textAlign: "center",
          fontSize: "12px",
          color: "#1a1a1a",
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0, color: "#92400e" }}>
          Please let me know once the payment is done. Thank you! 🙏
        </p>
      </div>
    </div>
  );
});

DayGuestReminderTemplate.displayName = "DayGuestReminderTemplate";
