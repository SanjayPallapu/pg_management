import { forwardRef } from "react";
import ammaLogo from "@/assets/amma-logo-transparent.png";
import flowersTop from "@/assets/welcome-flowers-top.png";
import flowersBottom from "@/assets/welcome-flowers-bottom.png";
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
   Component - Premium Floral Theme
========================= */

export const WelcomeTemplate = forwardRef<HTMLDivElement, WelcomeTemplateProps>(({ data }, ref) => {
  const billingPeriod = formatBillingRange(data.tenant.joiningDate, data.selectedYear, data.selectedMonth);
  const hasSecurityDeposit = data.payment.securityDeposit && data.payment.securityDeposit > 0;

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        height: "700px",
        background: "#ffffff",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: "16px",
      }}
    >
      {/* Decorative pink border */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          right: "12px",
          bottom: "12px",
          border: "3px solid rgba(236, 72, 153, 0.35)",
          borderRadius: "12px",
          pointerEvents: "none",
        }}
      />

      {/* Top Right Flowers */}
      <img
        src={flowersTop}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          top: "-5px",
          right: "-5px",
          width: "160px",
          height: "160px",
          objectFit: "contain",
          opacity: 1,
        }}
      />

      {/* Bottom Right Flowers - moved down */}
      <img
        src={flowersBottom}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          bottom: "-20px",
          right: "-15px",
          width: "180px",
          height: "180px",
          objectFit: "contain",
          opacity: 1,
        }}
      />

      {/* Header with Centered Logo */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "30px 0 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <img
          src={ammaLogo}
          alt="Amma Women's Hostel"
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "180px",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {/* Welcome Content */}
      <div
        style={{
          padding: "0 50px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: "18px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "#831843",
              marginBottom: "12px",
              fontStyle: "normal",
            }}
          >
            Hi {data.tenant.name},
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#374151",
              lineHeight: 1.7,
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
              fontSize: "17px",
              color: "#374151",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            Your rent period will start from
            <br />
            <strong style={{ fontSize: "18px", color: "#831843" }}>{billingPeriod}.</strong>
          </p>
        </div>

        {/* Payment Details */}
        <div style={{ marginBottom: "22px" }}>
          <p
            style={{
              fontSize: "17px",
              color: "#374151",
              lineHeight: 2,
              margin: 0,
            }}
          >
            <strong>Monthly rent amount:</strong> {formatCurrency(data.payment.monthlyRent)}
            {hasSecurityDeposit && (
              <>
                <br />
                <strong>Security advance:</strong> {formatCurrency(data.payment.securityDeposit!)}
              </>
            )}
          </p>
        </div>

        {/* Request Message */}
        <div style={{ marginBottom: "22px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#4b5563",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Please let me know once the payment{hasSecurityDeposit ? " and advance are" : " is"} completed. If you have any questions, feel free to ask.
          </p>
        </div>

        {/* Thank You */}
        <div style={{ marginTop: "auto", paddingBottom: "50px" }}>
          <p
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#831843",
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            Thank you,
            <br />
            <span style={{ fontWeight: 600 }}>@Amma Women's Hostel</span>
          </p>
        </div>
      </div>
    </div>
  );
});

WelcomeTemplate.displayName = "WelcomeTemplate";
