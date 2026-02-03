import { forwardRef } from "react";
import flowersTop from "@/assets/welcome-flowers-top.png";
import flowersBottom from "@/assets/welcome-flowers-bottom.png";

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
  // PG Branding
  pgName?: string;
  pgLogoUrl?: string;
}

interface WelcomeTemplateProps {
  data: WelcomeData;
}

/* =========================
   Helpers
========================= */

const formatCurrency = (amount: number): string => `₹${Math.floor(amount).toLocaleString("en-IN")}`;

// Format joining date to "January 21" format
const formatStartDate = (joiningDate: string): string => {
  const date = new Date(joiningDate);
  if (isNaN(date.getTime())) return "—";
  
  const day = date.getDate();
  const monthName = date.toLocaleDateString("en-IN", { month: "long" });
  
  return `${monthName} ${day}`;
};

// Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Format the day with ordinal suffix
const formatDayWithSuffix = (joiningDate: string): string => {
  const date = new Date(joiningDate);
  if (isNaN(date.getTime())) return "—";
  
  const day = date.getDate();
  return `${day}${getOrdinalSuffix(day)}`;
};

/* =========================
   Component - Premium Floral Theme
========================= */

export const WelcomeTemplate = forwardRef<HTMLDivElement, WelcomeTemplateProps>(({ data }, ref) => {
  const startDateText = formatStartDate(data.tenant.joiningDate);
  const dayWithSuffix = formatDayWithSuffix(data.tenant.joiningDate);
  const hasSecurityDeposit = data.payment.securityDeposit && data.payment.securityDeposit > 0;
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";

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
      {/* Top Right Flowers - positioned on edge, moved left */}
      <img
        src={flowersTop}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          top: "-5px",
          right: "15px",
          width: "120px",
          height: "120px",
          objectFit: "contain",
          opacity: 1,
        }}
      />

      {/* Bottom Right Flowers - smaller, positioned on edge, moved left */}
      <img
        src={flowersBottom}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          bottom: "-12px",
          right: "5px",
          width: "150px",
          height: "150px",
          objectFit: "contain",
          opacity: 1,
        }}
      />

      {/* Header with Centered Logo */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "30px 0 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <img
          src={pgLogoUrl}
          alt={pgName}
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "180px",
            height: "auto",
            display: "block",
            maxHeight: "100px",
            objectFit: "contain",
          }}
        />
        <div style={{ 
          fontSize: "16px", 
          fontWeight: 600, 
          color: "#831843", 
          marginTop: "8px" 
        }}>
          {pgName}
        </div>
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
            Welcome to {pgName}!
            <br />
            We're happy to have you with us.
          </p>
        </div>

        {/* Rent Period - updated text */}
        <div style={{ marginBottom: "18px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            Your rent period will start on{" "}
            <strong style={{ fontSize: "18px", color: "#831843" }}>{startDateText}</strong>,
            <br />
            and you need to make the payment on the{" "}
            <strong style={{ color: "#831843" }}>{dayWithSuffix}</strong> of every month.
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
            <span style={{ fontWeight: 600 }}>@{pgName}</span>
          </p>
        </div>
      </div>
    </div>
  );
});

WelcomeTemplate.displayName = "WelcomeTemplate";
