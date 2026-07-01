import { forwardRef } from "react";
import { format } from "date-fns";

export interface VisitorFollowUpData {
  visitorName: string;
  visitDate: string; // ISO
  roomNoInterested?: string;
  sharingType?: string;
  pgName?: string;
  pgLogoUrl?: string;
}

interface Props {
  data: VisitorFollowUpData;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy");
};

export const VisitorFollowUpTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const pgName = data.pgName || "PG Management";
  const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";

  return (
    <div
      ref={ref}
      style={{
        width: "500px",
        height: "650px",
        background: "#ffffff",
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #f0f0f0",
      }}
    >
      {/* Top Banner Accent */}
      <div style={{ height: "6px", background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)", width: "100%" }} />

      {/* Header with Logo */}
      <div style={{ width: "100%", textAlign: "center", padding: "24px 24px 12px", background: "#ffffff" }}>
        <img
          src={pgLogoUrl}
          alt={pgName}
          crossOrigin="anonymous"
          loading="eager"
          style={{
            width: "200px",
            height: "auto",
            margin: "0 auto",
            display: "block",
            maxHeight: "90px",
            objectFit: "contain",
          }}
        />
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#4b5563", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {pgName}
        </div>
      </div>

      {/* Title / Icon section */}
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "20px",
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            🏡
          </div>
          <span>Visit Confirmation Enquiry</span>
        </div>
      </div>

      {/* Message Box */}
      <div
        style={{
          margin: "0 24px 16px",
          background: "#fafaf9",
          borderRadius: "12px",
          padding: "20px",
          border: "1px dashed #e7e5e4",
          textAlign: "center",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "15px", color: "#44403c", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          Hello <strong style={{ color: "#1c1917" }}>{data.visitorName}</strong>,
        </p>
        <p style={{ fontSize: "14px", color: "#57534e", lineHeight: 1.6, marginTop: "12px", marginBottom: 0 }}>
          Thank you for visiting <strong style={{ color: "#d97706" }}>{pgName}</strong>! We hope you enjoyed exploring our rooms and facilities.
        </p>
        <p style={{ fontSize: "14px", color: "#57534e", lineHeight: 1.6, marginTop: "8px", marginBottom: 0 }}>
          We would love to welcome you to our community. Could you please confirm if you plan to move in, so we can reserve a bed for you?
        </p>
        <p style={{ fontSize: "13px", color: "#d97706", fontWeight: 600, marginTop: "16px", marginBottom: 0 }}>
          🚨 Spots are filling up fast for the upcoming month!
        </p>
      </div>

      {/* Visit Details card */}
      <div
        style={{
          margin: "0 24px 20px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#fef3c7",
            color: "#78350f",
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: "13px",
            borderBottom: "1px solid #e5e7eb",
            textAlign: "left",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Visit Information
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280", width: "40%", textAlign: "left" }}>Visitor Name:</td>
              <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1f2937", textAlign: "left" }}>{data.visitorName}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 16px", color: "#6b7280", textAlign: "left" }}>Visit Date:</td>
              <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1f2937", textAlign: "left" }}>{formatDate(data.visitDate)}</td>
            </tr>
            {(data.roomNoInterested || data.sharingType) && (
              <tr>
                <td style={{ padding: "10px 16px", color: "#6b7280", textAlign: "left" }}>Interested Room:</td>
                <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1f2937", textAlign: "left" }}>
                  {[
                    data.roomNoInterested ? `Room ${data.roomNoInterested}` : "",
                    data.sharingType ? `${data.sharingType} Sharing` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
          padding: "12px 24px",
          textAlign: "center",
          fontSize: "11px",
          color: "#ffffff",
          fontWeight: 500,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        Hope to see you soon! 🙏
      </div>
    </div>
  );
});

VisitorFollowUpTemplate.displayName = "VisitorFollowUpTemplate";
