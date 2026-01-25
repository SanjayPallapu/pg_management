import { forwardRef } from "react";
import hostelLogo from "@/assets/hostel-logo.png";
import { formatBillingRange } from "./PaymentReminderTemplate";

/* =========================
   Types
========================= */

export interface WelcomeData {
  tenant: {
    name: string;
    joiningDate: string; // ISO date
    phone: string;
  };
  stay: {
    roomNo: string;
    sharingType: string;
  };
  payment: {
    monthlyRent: number;
    securityDeposit?: number;
  };
  selectedMonth: number; // 1–12
  selectedYear: number; // YYYY
}

interface WelcomeTemplateProps {
  data: WelcomeData;
}

/* =========================
   Helpers
========================= */

const formatCurrency = (amount: number): string => `₹${Math.floor(amount).toLocaleString("en-IN")}`;

/* =========================
   Component
========================= */

export const WelcomeTemplate = forwardRef<HTMLDivElement, WelcomeTemplateProps>(({ data }, ref) => {
  const billingPeriod = formatBillingRange(data.tenant.joiningDate, data.selectedYear, data.selectedMonth);

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        height: "700px",
        background: "linear-gradient(180deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        border: "3px solid #f9a8d4",
        borderRadius: "16px",
      }}
    >
      {/* Decorative corner flowers - Top Right */}
      <div
        style={{
          position: "absolute",
          top: "0",
          right: "0",
          width: "100px",
          height: "100px",
          background: "linear-gradient(225deg, #f472b6 0%, transparent 70%)",
          borderRadius: "0 14px 0 100px",
          opacity: 0.3,
        }}
      />

      {/* Decorative corner flowers - Bottom Left */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          width: "120px",
          height: "120px",
          background: "linear-gradient(45deg, #f472b6 0%, transparent 70%)",
          borderRadius: "0 100px 0 14px",
          opacity: 0.3,
        }}
      />

      {/* Header with Logo */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          padding: "25px 0 15px",
        }}
      >
        <img
          src={hostelLogo}
          alt="Amma Women's Hostel"
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "140px",
            height: "auto",
            margin: "0 auto",
            display: "block",
          }}
        />
      </div>

      {/* Welcome Content */}
      <div
        style={{
          padding: "0 35px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: "20px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#831843",
              marginBottom: "10px",
              fontStyle: "italic",
            }}
          >
            Hi {data.tenant.name},
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#1a1a1a",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Welcome to Amma Women's Hostel!
            <br />
            We're happy to have you with us.
          </p>
        </div>

        {/* Rent Period */}
        <div style={{ marginBottom: "18px" }}>
          <p
            style={{
              fontSize: "15px",
              color: "#1a1a1a",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Your rent period will start from
            <br />
            <strong style={{ fontSize: "17px", color: "#831843" }}>{billingPeriod}.</strong>
          </p>
        </div>

        {/* Payment Details */}
        <div style={{ marginBottom: "18px" }}>
          <p
            style={{
              fontSize: "15px",
              color: "#1a1a1a",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            <strong>Monthly rent amount:</strong> {formatCurrency(data.payment.monthlyRent)}
            <br />
            {data.payment.securityDeposit && data.payment.securityDeposit > 0 && (
              <>
                <strong>Security advance:</strong> {formatCurrency(data.payment.securityDeposit)}
              </>
            )}
          </p>
        </div>

        {/* Room Info */}
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.6)",
            borderRadius: "10px",
            border: "1px solid #f9a8d4",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            <strong>Room:</strong> {data.stay.roomNo} • <strong>Sharing:</strong> {data.stay.sharingType}
          </p>
        </div>

        {/* Request Message */}
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "14px",
              color: "#1a1a1a",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Please let me know once the payment and advance are completed. If you have any questions, feel free to ask.
          </p>
        </div>

        {/* Thank You */}
        <div style={{ marginTop: "auto", paddingBottom: "30px" }}>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#831843",
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            Thank you,
            <br />
            <span style={{ fontStyle: "italic" }}>@Amma Women's Hostel</span>
          </p>
        </div>
      </div>

      {/* Decorative hearts scattered */}
      <div
        style={{
          position: "absolute",
          top: "80px",
          right: "25px",
          fontSize: "16px",
          color: "#f472b6",
          opacity: 0.5,
        }}
      >
        💕
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "150px",
          left: "25px",
          fontSize: "14px",
          color: "#f472b6",
          opacity: 0.4,
        }}
      >
        💖
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "80px",
          right: "40px",
          fontSize: "12px",
          color: "#f472b6",
          opacity: 0.4,
        }}
      >
        💗
      </div>
    </div>
  );
});

WelcomeTemplate.displayName = "WelcomeTemplate";
