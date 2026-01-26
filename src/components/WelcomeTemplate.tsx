import { forwardRef } from "react";
import hostelLogo from "@/assets/hostel-logo-transparent.png";
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
        background: "linear-gradient(180deg, #fff5f8 0%, #ffeef4 50%, #ffe4ed 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: "20px",
        boxShadow: "0 8px 32px rgba(219, 39, 119, 0.15)",
      }}
    >
      {/* Decorative border */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          right: "10px",
          bottom: "10px",
          border: "2px solid rgba(236, 72, 153, 0.3)",
          borderRadius: "16px",
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
          top: "-10px",
          right: "-10px",
          width: "180px",
          height: "180px",
          objectFit: "contain",
          transform: "rotate(0deg)",
          opacity: 0.95,
        }}
      />

      {/* Bottom Left Flowers */}
      <img
        src={flowersBottom}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          bottom: "-15px",
          left: "-15px",
          width: "200px",
          height: "200px",
          objectFit: "contain",
          opacity: 0.95,
        }}
      />

      {/* Scattered hearts */}
      <div style={{ position: "absolute", top: "200px", left: "25px", fontSize: "16px", color: "#ec4899", opacity: 0.5 }}>💕</div>
      <div style={{ position: "absolute", top: "320px", right: "30px", fontSize: "14px", color: "#ec4899", opacity: 0.4 }}>💗</div>
      <div style={{ position: "absolute", bottom: "220px", right: "45px", fontSize: "12px", color: "#ec4899", opacity: 0.35 }}>💕</div>

      {/* Header with Centered Logo */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "35px 0 25px",
          position: "relative",
          zIndex: 1,
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
        <div style={{ marginBottom: "22px" }}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#9d174d",
              marginBottom: "14px",
              fontStyle: "italic",
            }}
          >
            Hi {data.tenant.name},
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            Welcome to Amma Women's Hostel!
            <br />
            We're happy to have you with us.
          </p>
        </div>

        {/* Rent Period */}
        <div style={{ marginBottom: "22px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: 1.85,
              margin: 0,
            }}
          >
            Your rent period will start from
            <br />
            <strong style={{ fontSize: "19px", color: "#9d174d" }}>{billingPeriod}.</strong>
          </p>
        </div>

        {/* Payment Details */}
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: 2.1,
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
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              fontSize: "15px",
              color: "#4b5563",
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            Please let me know once the payment{hasSecurityDeposit ? " and advance are" : " is"} completed. If you have any questions, feel free to ask.
          </p>
        </div>

        {/* Thank You */}
        <div style={{ marginTop: "auto", paddingBottom: "45px" }}>
          <p
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#9d174d",
              margin: 0,
              lineHeight: 1.85,
            }}
          >
            Thank you,
            <br />
            <span style={{ fontStyle: "italic" }}>@Amma Women's Hostel</span>
          </p>
        </div>
      </div>
    </div>
  );
});

WelcomeTemplate.displayName = "WelcomeTemplate";
