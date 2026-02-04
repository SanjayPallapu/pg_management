import { forwardRef } from "react";

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
  // PG Branding
  pgName?: string;
  pgLogoUrl?: string;
}

interface PaymentReminderTemplateProps {
  data: ReminderData;
}

/* =========================
   Helpers
========================= */

const formatCurrency = (amount: number): string => `₹ ${Math.floor(amount).toLocaleString("en-IN")}`;

const getLastDayOfMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

export const formatBillingRange = (joiningDate: string, selectedYear: number, selectedMonth: number): string => {
  const joinDate = new Date(joiningDate);
  if (isNaN(joinDate.getTime())) return "—";

  const joinDay = joinDate.getDate();
  const lastDayCurrent = getLastDayOfMonth(selectedYear, selectedMonth);

  /* =========================
     START DAY (calendar-safe)
  ========================= */
  // Start day is the joining day, clamped to the last day of current month
  const startDay = Math.min(joinDay, lastDayCurrent);

  /* =========================
     END DAY (same month logic)
  ========================= */
  let endDay: number;
  let endMonth = selectedMonth; // Keep end date in the same month by default
  let endYear = selectedYear;

  if (joinDay === 1) {
    // If joined on 1st, billing period is 1st to last day of the same month
    endDay = lastDayCurrent;
  } else {
    // For other days, end is the day before the join day in the SAME month
    // But if join day > last day of month, end is last day of month
    // The billing cycle for "15th joiner" in January would be "15 Jan - 14 Feb"
    // But we need to show ONLY the current month's portion

    // Actually, the correct logic for "1 Jan - 31 Jan" for someone who joined on 1st Aug:
    // Start: 1st of selected month
    // End: last day of selected month (if joined on 1st)

    // For someone joined on 15th:
    // Billing cycle: 15th to 14th of next month
    // So for January: "15 Jan - 14 Feb"

    // Let's implement this correctly:
    endDay = joinDay - 1;
    if (endDay <= 0) {
      // If join day is 1, end day is last day of same month
      endDay = lastDayCurrent;
    } else {
      // End day is (joinDay - 1) of NEXT month
      endMonth = selectedMonth + 1;
      if (endMonth > 12) {
        endMonth = 1;
        endYear = selectedYear + 1;
      }
      // Clamp to the last day of the end month
      const lastDayEndMonth = getLastDayOfMonth(endYear, endMonth);
      endDay = Math.min(endDay, lastDayEndMonth);
    }
  }

  /* =========================
     BUILD DATES
  ========================= */
  const startDate = new Date(selectedYear, selectedMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

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
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";

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
      {/* Header with Logo */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          padding: "20px 0 4px",
          background: "#ffffff",
        }}
      >
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
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#4b5563",
            marginTop: "8px",
          }}
        >
          {pgName}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", padding: "0px 0" }}>
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
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Tenant Name:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.tenant.name}</td>
            </tr>

            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>For Period:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {formatBillingRange(data.tenant.joiningDate, data.selectedYear, data.selectedMonth)}
              </td>
            </tr>

            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Room No:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>{data.stay.roomNo}</td>
            </tr>

            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>Monthly Rent:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1a1a1a" }}>
                {formatCurrency(data.payment.amount)}
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

PaymentReminderTemplate.displayName = "PaymentReminderTemplate";
