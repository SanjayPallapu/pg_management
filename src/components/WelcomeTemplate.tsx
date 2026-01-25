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
   Flower SVG Components
========================= */

const FlowerTopRight = () => (
  <svg
    style={{ position: "absolute", top: 0, right: 0, width: "140px", height: "140px" }}
    viewBox="0 0 140 140"
    fill="none"
  >
    {/* Main flower cluster */}
    <g transform="translate(60, 10)">
      {/* Large flower */}
      <circle cx="30" cy="25" r="12" fill="#f9a8d4" />
      <circle cx="22" cy="18" r="8" fill="#fbcfe8" />
      <circle cx="38" cy="18" r="8" fill="#fbcfe8" />
      <circle cx="22" cy="32" r="8" fill="#fbcfe8" />
      <circle cx="38" cy="32" r="8" fill="#fbcfe8" />
      <circle cx="30" cy="25" r="5" fill="#fcd34d" />
    </g>
    {/* Small flowers */}
    <g transform="translate(95, 45)">
      <circle cx="15" cy="15" r="8" fill="#fda4af" />
      <circle cx="10" cy="10" r="5" fill="#fecdd3" />
      <circle cx="20" cy="10" r="5" fill="#fecdd3" />
      <circle cx="10" cy="20" r="5" fill="#fecdd3" />
      <circle cx="20" cy="20" r="5" fill="#fecdd3" />
      <circle cx="15" cy="15" r="3" fill="#fcd34d" />
    </g>
    {/* Leaves */}
    <ellipse cx="70" cy="55" rx="12" ry="6" fill="#86efac" transform="rotate(-30 70 55)" />
    <ellipse cx="55" cy="40" rx="10" ry="5" fill="#4ade80" transform="rotate(-45 55 40)" />
    <ellipse cx="100" cy="70" rx="10" ry="5" fill="#86efac" transform="rotate(20 100 70)" />
    {/* Small buds */}
    <circle cx="45" cy="25" r="4" fill="#f9a8d4" />
    <circle cx="115" cy="35" r="3" fill="#fda4af" />
  </svg>
);

const FlowerBottomLeft = () => (
  <svg
    style={{ position: "absolute", bottom: 0, left: 0, width: "160px", height: "160px" }}
    viewBox="0 0 160 160"
    fill="none"
  >
    {/* Stem and leaves */}
    <path d="M30 160 Q40 120 60 100" stroke="#4ade80" strokeWidth="3" fill="none" />
    <path d="M60 100 Q80 80 90 60" stroke="#4ade80" strokeWidth="2" fill="none" />
    <ellipse cx="45" cy="130" rx="15" ry="7" fill="#86efac" transform="rotate(30 45 130)" />
    <ellipse cx="55" cy="115" rx="12" ry="6" fill="#4ade80" transform="rotate(-20 55 115)" />
    <ellipse cx="70" cy="95" rx="10" ry="5" fill="#86efac" transform="rotate(15 70 95)" />
    
    {/* Large flower */}
    <g transform="translate(75, 45)">
      <circle cx="20" cy="20" r="15" fill="#f9a8d4" />
      <circle cx="10" cy="12" r="10" fill="#fbcfe8" />
      <circle cx="30" cy="12" r="10" fill="#fbcfe8" />
      <circle cx="10" cy="28" r="10" fill="#fbcfe8" />
      <circle cx="30" cy="28" r="10" fill="#fbcfe8" />
      <circle cx="20" cy="20" r="6" fill="#fcd34d" />
    </g>
    
    {/* Small flowers */}
    <g transform="translate(35, 70)">
      <circle cx="12" cy="12" r="8" fill="#fda4af" />
      <circle cx="7" cy="7" r="5" fill="#fecdd3" />
      <circle cx="17" cy="7" r="5" fill="#fecdd3" />
      <circle cx="7" cy="17" r="5" fill="#fecdd3" />
      <circle cx="17" cy="17" r="5" fill="#fecdd3" />
      <circle cx="12" cy="12" r="3" fill="#fcd34d" />
    </g>
    
    {/* Buds */}
    <circle cx="20" cy="100" r="4" fill="#f9a8d4" />
    <circle cx="110" cy="75" r="3" fill="#fda4af" />
    <circle cx="50" cy="55" r="3" fill="#fbcfe8" />
  </svg>
);

/* =========================
   Component - Pink Floral Theme
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
        background: "linear-gradient(180deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        border: "3px solid #f9a8d4",
        borderRadius: "16px",
      }}
    >
      {/* Decorative border inner */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          right: "8px",
          bottom: "8px",
          border: "1px solid rgba(249, 168, 212, 0.5)",
          borderRadius: "12px",
          pointerEvents: "none",
        }}
      />

      {/* Flower decorations */}
      <FlowerTopRight />
      <FlowerBottomLeft />

      {/* Scattered hearts */}
      <div style={{ position: "absolute", top: "180px", left: "20px", fontSize: "14px", color: "#f9a8d4", opacity: 0.6 }}>💕</div>
      <div style={{ position: "absolute", top: "300px", right: "25px", fontSize: "12px", color: "#f9a8d4", opacity: 0.5 }}>💗</div>
      <div style={{ position: "absolute", bottom: "200px", right: "40px", fontSize: "10px", color: "#f9a8d4", opacity: 0.4 }}>💕</div>
      <div style={{ position: "absolute", top: "450px", left: "35px", fontSize: "11px", color: "#f9a8d4", opacity: 0.5 }}>💖</div>

      {/* Header with Logo */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          padding: "30px 0 20px",
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
            width: "150px",
            height: "auto",
            margin: "0 auto",
            display: "block",
          }}
        />
      </div>

      {/* Welcome Content */}
      <div
        style={{
          padding: "0 45px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: "20px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "#831843",
              marginBottom: "12px",
              fontStyle: "italic",
            }}
          >
            Hi {data.tenant.name},
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#1f2937",
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
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#1f2937",
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
        <div style={{ marginBottom: "25px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#1f2937",
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
        <div style={{ marginBottom: "25px" }}>
          <p
            style={{
              fontSize: "15px",
              color: "#374151",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Please let me know once the payment{hasSecurityDeposit ? " and advance are" : " is"} completed. If you have any questions, feel free to ask.
          </p>
        </div>

        {/* Thank You */}
        <div style={{ marginTop: "auto", paddingBottom: "40px" }}>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 700,
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
    </div>
  );
});

WelcomeTemplate.displayName = "WelcomeTemplate";
