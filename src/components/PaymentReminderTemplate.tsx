import { forwardRef } from "react";
import hostelLogo from "@/assets/hostel-logo.png";

/* =========================
   Types
========================= */

export interface ReminderData {
  tenant: {
    name: string;
    joiningDate: string; // ISO date
  };
  stay: {
    month: string; // kept for compatibility
    roomNo: string;
    sharingType: string;
  };
  payment: {
    amount: number;
    paid?: number;
    balance: number;
    dueDate?: string;
  };
  selectedMonth: number; // 1–12
  selectedYear: number; // YYYY
}

interface PaymentReminderTemplateProps {
  data: ReminderData;
}

/* =========================
   Helpers
========================= */

const formatCurrency = (amount: number): string => `₹ ${Math.floor(amount).toLocaleString("en-IN")}`;

const getLastDayOfMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

/**
 * Join-date based billing cycle (SAFE)
 * - Start: join day or last valid day of month
 * - End: next month (join day - 1) or last valid day
 */
const formatBillingRange = (joiningDate: string, selectedYear: number, selectedMonth: number): string => {
  const joinDate = new Date(joiningDate);
  if (isNaN(joinDate.getTime())) return "—";

  const joinDay = joinDate.getDate();

  const startDay = Math.min(joinDay, getLastDayOfMonth(selectedYear, selectedMonth));

  const endDay = Math.min(joinDay - 1, getLastDayOfMonth(selectedYear, selectedMonth + 1));

  const startDate = new Date(selectedYear, selectedMonth - 1, startDay);
  const endDate = new Date(
    selectedYear,
    selectedMonth,
    endDay > 0 ? endDay : getLastDayOfMonth(selectedYear, selectedMonth),
  );

  const format = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  return `${format(startDate)} - ${format(endDate)}`;
};

/* =========================
   Component
========================= */

export const PaymentReminderTemplate = forwardRef<HTMLDivElement, PaymentReminderTemplateProps>(({ data }, ref) => {
  const hasPaid = (data.payment.paid || 0) > 0;

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        height: "625px",
        background: "#ffffff",
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", padding: "20px 0 15px" }}>
        <img
          src={hostelLogo}
          alt="Amma Women's Hostel"
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "160px",
            margin: "0 auto",
            display: "block",
          }}
        />
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", padding: "10px 0" }}>
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
          <span>Payment Reminder</span>
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
        <div
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "6px",
          }}
        >
          {formatCurrency(data.payment.balance)}
        </div>

        <div style={{ fontSize: "14px", color: "#92400e", fontWeight: 500 }}>
          {hasPaid ? "Remaining Balance Due" : "Amount Due"}
        </div>

        {hasPaid && (
          <div style={{ fontSize: "12px", color: "#166534", marginTop: "4px" }}>
            {formatCurrency(data.payment.paid || 0)} already paid
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
          Payment Details
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Tenant Name:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.tenant.name}</td>
            </tr>

            <tr>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>For Period:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {formatBillingRange(data.tenant.joiningDate, data.selectedYear, data.selectedMonth)}
              </td>
            </tr>

            <tr>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Room No:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.stay.roomNo}</td>
            </tr>

            <tr>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Monthly Rent:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{formatCurrency(data.payment.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
          padding: "14px 20px",
          textAlign: "center",
          fontSize: "13px",
          color: "#92400e",
          fontWeight: 500,
        }}
      >
        Kindly pay at your earliest convenience. Thank you! 🙏
      </div>
    </div>
  );
});

PaymentReminderTemplate.displayName = "PaymentReminderTemplate";
