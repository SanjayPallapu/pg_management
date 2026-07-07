import { forwardRef } from 'react';
import { format } from 'date-fns';

export interface SecurityDepositReceiptData {
  tenant: {
    name: string;
    joiningDate: string;
  };
  room: {
    roomNo: string;
    sharingType: string;
  };
  deposit: {
    amount: number;
    date: string;
    mode: 'upi' | 'cash';
    collectedBy?: string;
  };
  // PG Branding
  pgName?: string;
  pgLogoUrl?: string;
}

interface SecurityDepositReceiptTemplateProps {
  data: SecurityDepositReceiptData;
}

const formatCurrency = (amount: number): string => {
  return `₹ ${Math.floor(amount).toLocaleString('en-IN')}`;
};

export const SecurityDepositReceiptTemplate = forwardRef<HTMLDivElement, SecurityDepositReceiptTemplateProps>(
  ({ data }, ref) => {
    const formattedDepositDate = (() => {
      try {
        return format(new Date(data.deposit.date), 'dd MMM yyyy');
      } catch {
        return data.deposit.date;
      }
    })();

    const formattedJoiningDate = (() => {
      try {
        return format(new Date(data.tenant.joiningDate), 'dd MMM yyyy');
      } catch {
        return data.tenant.joiningDate;
      }
    })();

    const pgName = data.pgName || "PG Management";
    const pgLogoUrl = data.pgLogoUrl || "/icon-512.png";

    const depositMonthAbbr = (() => {
      try {
        const d = new Date(data.deposit.date);
        if (isNaN(d.getTime())) return "";
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return `${monthNames[d.getMonth()]}${d.getFullYear()}`;
      } catch {
        return "";
      }
    })();

    return (
      <div
        ref={ref}
        style={{
          width: '500px',
          background: '#ffffff',
          fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "16px 20px 12px",
            borderBottom: "1px solid #f1f5f9",
            marginBottom: "12px",
            minHeight: "115px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Left Side: Logo */}
          <div
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
            }}
          >
            <img
              src={pgLogoUrl}
              alt={pgName}
              crossOrigin="anonymous"
              loading="eager"
              style={{
                width: "105px",
                height: "105px",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {/* Top Right: Receipt Details */}
          <div
            style={{
              position: "absolute",
              top: "24px",
              right: "20px",
              textAlign: "right",
              fontSize: "9px",
              color: "#64748b",
              lineHeight: "1.3",
              fontWeight: 500,
            }}
          >
            <div style={{ textTransform: "uppercase", letterSpacing: "0.3px" }}>Receipt No:</div>
            <div
              style={{
                fontWeight: 700,
                color: "#334155",
                fontFamily: "monospace",
                fontSize: "10px",
              }}
            >
              SD-{data.room.roomNo}-{depositMonthAbbr}
            </div>
          </div>

          {/* Center: PG Details & Invoice Title */}
          <div style={{ width: "100%", paddingLeft: "80px", paddingRight: "80px" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {pgName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "17px",
                fontWeight: 700,
                color: "#0f172a",
                marginTop: "3px",
              }}
            >
              <span style={{ fontSize: "15px" }}>🔒</span>
              <span>Security Deposit Receipt</span>
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#475569",
                marginTop: "5px",
                background: "#f1f5f9",
                padding: "2px 8px",
                borderRadius: "6px",
                display: "inline-block",
                width: "fit-content",
              }}
            >
              {formattedDepositDate}
            </div>
          </div>
        </div>

        {/* Security Deposit Badge */}
        <div style={{
          textAlign: 'center',
          padding: '8px 0',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '18px',
            fontWeight: 600,
            color: '#1a1a1a',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>✓</div>
            <span>Security Deposit Received!</span>
          </div>
        </div>

        {/* Deposit Summary Card */}
        <div style={{
          margin: '0 15px 8px',
          background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '10px',
          padding: '12px',
          textAlign: 'center',
          border: '1px solid #c4b5fd',
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '4px',
          }}>
            {formatCurrency(data.deposit.amount)}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#4b5563',
          }}>
            Security Deposit via {data.deposit.mode === 'upi' ? 'UPI/Online' : 'Cash'}
          </div>
        </div>

        {/* Tenant Details */}
        <div style={{
          margin: '0 15px 8px',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#ffffff',
        }}>
          <div style={{
            background: '#f5f3ff',
            padding: '8px 12px',
            fontWeight: 600,
            fontSize: '13px',
            color: '#1a1a1a',
            borderBottom: '1px solid #e5e7eb',
          }}>
            Tenant Details
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px', width: '45%' }}>Tenant Name:</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>{data.tenant.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}>Room No:</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>{data.room.roomNo}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}>Sharing Type:</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>{data.room.sharingType}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}>Joining Date:</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>{formattedJoiningDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deposit Details */}
        <div style={{
          margin: '0 15px 8px',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#ffffff',
        }}>
          <div style={{
            background: '#f5f3ff',
            padding: '8px 12px',
            fontWeight: 600,
            fontSize: '13px',
            color: '#1a1a1a',
            borderBottom: '1px solid #e5e7eb',
          }}>
            Deposit Details
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px', width: '45%' }}>Amount:</td>
                <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: '12px', color: '#8b5cf6' }}>{formatCurrency(data.deposit.amount)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}>Payment Mode:</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>
                  {data.deposit.mode === 'upi' ? 'UPI/Online' : 'Cash'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}>Deposit Date:</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>{formattedDepositDate}</td>
              </tr>
              {data.deposit.collectedBy && (
                <tr>
                  <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}>Collected By:</td>
                  <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '12px', color: '#1a1a1a' }}>{data.deposit.collectedBy}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
          padding: '12px 15px',
          marginTop: '5px',
        }}>
          <div style={{
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: '24px',
              fontWeight: 700,
              color: '#7c3aed',
              fontStyle: 'italic',
              marginBottom: '4px',
            }}>
              Thank You!
            </div>
            <div style={{
              fontSize: '11px',
              color: '#4b5563',
              lineHeight: 1.4,
              maxWidth: '320px',
              margin: '0 auto',
            }}>
              Your security deposit of {formatCurrency(data.deposit.amount)} has been received successfully. This amount is refundable upon vacating the hostel.
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SecurityDepositReceiptTemplate.displayName = 'SecurityDepositReceiptTemplate';
