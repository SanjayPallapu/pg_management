import { numberToWords, formatIndianCurrency } from "@/utils/numberToWords";
import buildingLogo from "@/assets/building-logo.jpeg";

export interface BuildingRentReceiptData {
  receivedFrom: string;
  paidTo: string;
  amount: number;
  upiAmount: number;
  cashAmount: number;
  date: string;
  forMonth: string;
}

interface BuildingRentReceiptTemplateProps {
  data: BuildingRentReceiptData;
}

// Fixed building rent amount - always displayed as 1,50,000
const FIXED_BUILDING_RENT = 150000;

export const BuildingRentReceiptTemplate = ({ data }: BuildingRentReceiptTemplateProps) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div
      style={{
        width: "600px",
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        padding: "40px 50px",
      }}
    >
      {/* Header with Building Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
        <img src={buildingLogo} alt="Building Logo" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "800",
            color: "#1E3A5F",
            margin: 0,
            letterSpacing: "2px",
          }}
        >
          BUILDING RENT RECEIPT
        </h1>
      </div>

      {/* Black line under header */}
      <div style={{ height: "2px", backgroundColor: "#000000", marginBottom: "30px" }} />

      {/* Date and Month Row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px" }}>
        <div style={{ fontSize: "15px", color: "#1E3A5F" }}>
          <span style={{ fontWeight: "700", color: "#000000" }}>Date:</span> <strong>{formatDate(data.date)}</strong>
        </div>
        <div style={{ fontSize: "15px", color: "#1E3A5F" }}>
          <span style={{ fontWeight: "700", color: "#000000" }}>For Month:</span> <strong>{data.forMonth}</strong>
        </div>
      </div>

      {/* From Field */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: "16px", color: "#000000", fontWeight: "700", width: "130px" }}>From:</span>
          <span
            style={{
              flex: 1,
              fontSize: "16px",
              color: "#1E3A5F",
              fontWeight: "800",
              borderBottom: "2px solid #9CA3AF",
              paddingBottom: "5px",
            }}
          >
            {data.receivedFrom}
          </span>
        </div>
      </div>

      {/* To Field */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: "16px", color: "#000000", fontWeight: "700", width: "130px" }}>To:</span>
          <span
            style={{
              flex: 1,
              fontSize: "16px",
              color: "#1E3A5F",
              fontWeight: "800",
              borderBottom: "2px solid #9CA3AF",
              paddingBottom: "5px",
            }}
          >
            {data.paidTo}
          </span>
        </div>
      </div>

      {/* Building Rent Field */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: "16px", color: "#000000", fontWeight: "700", width: "130px" }}>Building Rent:</span>
          <span
            style={{
              flex: 1,
              fontSize: "16px",
              color: "#1E3A5F",
              fontWeight: "800",
              borderBottom: "2px solid #9CA3AF",
              paddingBottom: "5px",
            }}
          >
            ₹{formatIndianCurrency(FIXED_BUILDING_RENT)} ({numberToWords(FIXED_BUILDING_RENT)})
          </span>
        </div>
      </div>

      {/* UPI/Cash Split - always show actual amounts paid */}
      {(data.upiAmount > 0 || data.cashAmount > 0) && (
        <div style={{ marginBottom: "20px", marginLeft: "130px" }}>
          <div style={{ display: "flex", gap: "30px", fontSize: "15px", color: "#1E3A5F" }}>
            {data.upiAmount > 0 && (
              <span>
                <strong>UPI:</strong> <strong>₹{formatIndianCurrency(data.upiAmount)}</strong>
              </span>
            )}
            {data.cashAmount > 0 && (
              <span>
                <strong>Cash:</strong> <strong>₹{formatIndianCurrency(data.cashAmount)}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mode of Payment with badges */}
      <div style={{ marginBottom: "25px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={{ fontSize: "16px", color: "#000000", fontWeight: "700" }}>Mode of Payment:</span>

            {/* UPI Badge */}
            {data.upiAmount > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#1F2937",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <polygon points="5,4 12,12 5,20" fill="#FF9800" />
                  <polygon points="12,4 19,12 12,20" fill="#4CAF50" />
                </svg>
                UPI
              </div>
            )}

            {/* Cash Badge */}
            {data.cashAmount > 0 && (
              <div
                style={{
                  backgroundColor: "#1F2937",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                CASH
              </div>
            )}
          </div>

          {/* PAID Badge - moved to right */}
          <div
            style={{
              backgroundColor: "#2563EB",
              color: "#fff",
              padding: "8px 24px",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "800",
              letterSpacing: "2px",
              border: "2px solid #1E40AF",
            }}
          >
            PAID
          </div>
        </div>
      </div>

      {/* Bottom black line */}
      <div style={{ height: "2px", backgroundColor: "#000000", marginTop: "20px" }} />
    </div>
  );
};
