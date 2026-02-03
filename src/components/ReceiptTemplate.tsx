import { forwardRef } from "react";
import { formatBillingRange } from "./PaymentReminderTemplate";
import { PaymentEntry } from "@/types";

export interface ReceiptData {
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
    type: "FULL" | "PARTIAL";
    amount: number;
    paid: number;
    balance: number;
    mode: string;
    date: string;
  };
  selectedMonth: number; // 1-12
  selectedYear: number; // YYYY
  paymentEntries?: PaymentEntry[];
  previousMonthPending?: number;
  pgLogoUrl?: string;
  pgName?: string;
}

interface ReceiptTemplateProps {
  data: ReceiptData;
}

const formatCurrency = (amount: number): string => {
  return `₹ ${Math.floor(amount).toLocaleString("en-IN")}`;
};

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(({ data }, ref) => {
  const isFullPayment = data.payment.type === "FULL";
  const logoUrl = data.pgLogoUrl || "/icon-512.png";
  const pgName = data.pgName || "PG Management";

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        background: "#ffffff",
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header with PG Logo */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          padding: "15px 0 10px",
          background: "#ffffff",
        }}
      >
        <img
          src={pgLogoUrl}
          alt={pgName}
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "160px",
            height: "auto",
            margin: "0 auto",
            display: "block",
            maxHeight: "80px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Payment Successful Badge */}
      <div
        style={{
          textAlign: "center",
          padding: "8px 0",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "18px",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            ✓
          </div>
          <span>Payment Successful!</span>
        </div>
      </div>

      {/* Payment Summary Card */}
      <div
        style={{
          margin: "0 15px 8px",
          background: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
          borderRadius: "10px",
          padding: "12px",
          textAlign: "center",
          border: "1px solid #a7f3d0",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "4px",
          }}
        >
          {formatCurrency(data.payment.paid)} {isFullPayment ? "Full Payment" : "Partial Payment"}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#4b5563",
            marginBottom: isFullPayment ? "0" : "6px",
          }}
        >
          {isFullPayment
            ? "Your full payment has been successfully completed."
            : `You have made a partial payment of ${formatCurrency(data.payment.paid)}.`}
        </div>
        {!isFullPayment && (
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#dc2626",
            }}
          >
            {formatCurrency(data.payment.balance)} Remaining Balance
          </div>
        )}
      </div>

      {/* Tenant & Transaction Details */}
      <div
        style={{
          margin: "0 15px 8px",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            background: "#ecfdf5",
            padding: "8px 12px",
            fontWeight: 600,
            fontSize: "13px",
            color: "#1a1a1a",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Tenant & Transaction Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px", width: "45%" }}>Tenant Name:</td>
              <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                {data.tenant.name}
              </td>
            </tr>
            {/* Always show all payment entries with dates */}
            {data.paymentEntries && data.paymentEntries.length > 0 ? (
              data.paymentEntries.map((entry, idx) => {
                const formattedDate = (() => {
                  try {
                    return new Date(entry.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  } catch {
                    return entry.date;
                  }
                })();
                const label = entry.type === "partial" ? "Partial" : entry.type === "remaining" ? "Final" : "Payment";
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>
                      {label} ({formattedDate}):
                    </td>
                    <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                      ₹{entry.amount.toLocaleString("en-IN")} via {entry.mode === "upi" ? "UPI" : "Cash"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>Payment Mode:</td>
                  <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                    {data.payment.mode}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>Payment Date:</td>
                  <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                    {data.payment.date}
                  </td>
                </tr>
              </>
            )}
            <tr>
              <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>Joining Date:</td>
              <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                {data.tenant.joiningDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stay & Payment Details */}
      <div
        style={{
          margin: "0 15px 8px",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            background: "#ecfdf5",
            padding: "8px 12px",
            fontWeight: 600,
            fontSize: "13px",
            color: "#1a1a1a",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Stay & Payment Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px", width: "45%" }}>For Period:</td>
              <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                {formatBillingRange(data.tenant.joiningDate, data.selectedYear, data.selectedMonth)}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>Room No:</td>
              <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                {data.stay.roomNo}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>Sharing Type:</td>
              <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                {data.stay.sharingType}
              </td>
            </tr>
            <tr style={{ borderBottom: data.previousMonthPending ? "1px solid #f3f4f6" : undefined }}>
              <td style={{ padding: "6px 12px", color: "#6b7280", fontSize: "12px" }}>Amount:</td>
              <td style={{ padding: "6px 12px", fontWeight: 500, fontSize: "12px", color: "#1a1a1a" }}>
                {formatCurrency(data.payment.amount)}
              </td>
            </tr>
            {data.previousMonthPending && data.previousMonthPending > 0 && (
              <tr>
                <td style={{ padding: "6px 12px", color: "#dc2626", fontSize: "12px", fontWeight: 500 }}>
                  Previous Month Pending:
                </td>
                <td style={{ padding: "6px 12px", fontWeight: 600, fontSize: "12px", color: "#dc2626" }}>
                  {formatCurrency(data.previousMonthPending)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)",
          padding: "12px 15px",
          marginTop: "5px",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "24px",
              fontWeight: 700,
              color: "#166534",
              fontStyle: "italic",
              marginBottom: "4px",
            }}
          >
            Thank You!
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#4b5563",
              lineHeight: 1.4,
              maxWidth: "320px",
              margin: "0 auto",
            }}
          >
            {isFullPayment
              ? "Your full payment has been successfully completed."
              : `You have successfully made a partial payment of ${formatCurrency(data.payment.paid)}. Please pay the remaining ${formatCurrency(data.payment.balance)} at your earliest convenience.`}
          </div>
        </div>
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = "ReceiptTemplate";
