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
      {/* Header with Logo */}
      <div style={{ width: "100%", textAlign: "center", padding: "20px 0 1px", background: "#ffffff" }}>
        <img
          src={pgLogoUrl}
          alt={pgName}
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "260px",
            height: "auto",
            margin: "0 auto",
            display: "block",
            maxHeight: "140px",
            objectFit: "contain",
          }}
        />
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#4b5563", marginTop: "4px" }}>
          {pgName}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", padding: "4px 0" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "20px",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: "bold",
            }}
          >
            🔔
          </div>
          <span>Day Guest Payment Reminder</span>
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
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.roomNo}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Per Day Rate:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {formatCurrency(data.perDayRate)}
              </td>
            </tr>
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
          textAlign: "left",
          fontSize: "12px",
          color: "#1a1a1a",
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: "8px 0 0 0", color: "#92400e" }}>
          Please let me know once the payment is done. Thank you! 🙏
        </p>
      </div>
    </div>
  );
});

DayGuestReminderTemplate.displayName = "DayGuestReminderTemplate";
