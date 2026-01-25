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
   Component - Futuristic Design
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
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: "20px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Animated gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          left: "-60px",
          width: "250px",
          height: "250px",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(50px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          right: "-30px",
          width: "150px",
          height: "150px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(30px)",
        }}
      />

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
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "16px",
            display: "inline-block",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <img
            src={hostelLogo}
            alt="Amma Women's Hostel"
            crossOrigin="anonymous"
            loading="eager"
            style={{
              width: "120px",
              height: "auto",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Welcome Content */}
      <div
        style={{
          padding: "0 35px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Welcome Badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #ec4899, #8b5cf6)",
              padding: "8px 24px",
              borderRadius: "30px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            ✨ Welcome Aboard ✨
          </div>
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 700,
              background: "linear-gradient(90deg, #f472b6, #c084fc, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
            }}
          >
            Hi {data.tenant.name}!
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255, 255, 255, 0.8)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Welcome to Amma Women's Hostel!
            <br />
            We're thrilled to have you with us.
          </p>
        </div>

        {/* Info Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {/* Room & Sharing Card */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(10px)",
              borderRadius: "14px",
              padding: "16px 20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                Your Room
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                Room {data.stay.roomNo}
              </div>
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#fff",
              }}
            >
              {data.stay.sharingType}
            </div>
          </div>

          {/* Billing Period Card */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(10px)",
              borderRadius: "14px",
              padding: "16px 20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Rent Period
            </div>
            <div style={{ fontSize: "17px", fontWeight: 600, color: "#a78bfa" }}>
              {billingPeriod}
            </div>
          </div>

          {/* Payment Details Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))",
              backdropFilter: "blur(10px)",
              borderRadius: "14px",
              padding: "16px 20px",
              border: "1px solid rgba(236, 72, 153, 0.3)",
            }}
          >
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              Payment Details
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasSecurityDeposit ? "10px" : "0" }}>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>Monthly Rent</span>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#f472b6" }}>
                {formatCurrency(data.payment.monthlyRent)}
              </span>
            </div>
            {hasSecurityDeposit && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>Security Advance</span>
                <span style={{ fontSize: "18px", fontWeight: 600, color: "#c084fc" }}>
                  {formatCurrency(data.payment.securityDeposit!)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Request Message */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "20px",
            borderLeft: "3px solid #8b5cf6",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Please let me know once the payment{hasSecurityDeposit ? " and advance are" : " is"} completed. Feel free to reach out if you have any questions!
          </p>
        </div>

        {/* Thank You */}
        <div style={{ marginTop: "auto", paddingBottom: "30px", textAlign: "center" }}>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 5px 0",
            }}
          >
            Thank you!
          </p>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 600,
              background: "linear-gradient(90deg, #f472b6, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
            }}
          >
            @Amma Women's Hostel
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "100px",
          right: "20px",
          fontSize: "20px",
          opacity: 0.4,
        }}
      >
        ✨
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "120px",
          left: "20px",
          fontSize: "16px",
          opacity: 0.3,
        }}
      >
        💜
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "60px",
          right: "30px",
          fontSize: "14px",
          opacity: 0.3,
        }}
      >
        🏠
      </div>
    </div>
  );
});

WelcomeTemplate.displayName = "WelcomeTemplate";
