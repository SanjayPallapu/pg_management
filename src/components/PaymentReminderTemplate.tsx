import { forwardRef } from "react";
import hostelLogo from "@/assets/hostel-logo.png";

export interface ReminderData {
  tenant: {
    name: string;
    joiningDate: string;
  };
  stay: {
    month: string;
    roomNo: string;
    sharingType: string;
  };
  payment: {
    amount: number;
    paid?: number;
    balance: number;
    dueDate?: string;
  };
}

interface PaymentReminderTemplateProps {
  data: ReminderData;
}

const formatCurrency = (amount: number): string => {
  return `₹ ${Math.floor(amount).toLocaleString("en-IN")}`;
};

export const PaymentReminderTemplate = forwardRef<HTMLDivElement, PaymentReminderTemplateProps>(({ data }, ref) => {
  const hasPaid = (data.payment.paid || 0) > 0;

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        height: "700px",
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
          padding: "20px 0 15px",
          background: "#ffffff",
        }}
      >
        <img
          src={hostelLogo}
          alt="Amma Women's Hostel"
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "160px",
            height: "auto",
            margin: "0 auto",
            display: "block",
          }}
        />
      </div>

      {/* Payment Reminder Badge */}
      <div
        style={{
          textAlign: "center",
          padding: "10px 0",
        }}
      >
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
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            🔔
          </div>
          <span>Payment Reminder</span>
        </div>
      </div>

      {/* Amount Due Card */}
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
        <div
          style={{
            fontSize: "14px",
            color: "#92400e",
            fontWeight: 500,
          }}
        >
          {hasPaid ? "Remaining Balance Due" : "Amount Due"}
        </div>
        {hasPaid && (
          <div
            style={{
              fontSize: "12px",
              color: "#166534",
              marginTop: "4px",
            }}
          >
            {formatCurrency(data.payment.paid || 0)} already paid
          </div>
        )}
      </div>

      {/* Details Card */}
      <div
        style={{
          margin: "0 20px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#ffffff",
          flex: 1,
        }}
      >
        <div
          style={{
            background: "#fef3c7",
            padding: "10px 16px",
            fontWeight: 600,
            fontSize: "14px",
            color: "#1a1a1a",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Payment Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "13px", width: "45%" }}>Tenant Name:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, fontSize: "13px", color: "#1a1a1a" }}>
                {data.tenant.name}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "13px" }}>For Month:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, fontSize: "13px", color: "#1a1a1a" }}>
                {data.stay.month}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "13px" }}>Room No:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, fontSize: "13px", color: "#1a1a1a" }}>
                {data.stay.roomNo}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "13px" }}>Monthly Rent:</td>
              <td style={{ padding: "10px 16px", fontWeight: 500, fontSize: "13px", color: "#1a1a1a" }}>
                {formatCurrency(data.payment.amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
          padding: "14px 20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#92400e",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            Kindly pay at your earliest convenience. Thank you for staying with us! 🙏
          </div>
        </div>
      </div>
    </div>
  );
});

PaymentReminderTemplate.displayName = "PaymentReminderTemplate";
