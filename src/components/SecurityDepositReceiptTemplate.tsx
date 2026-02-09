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
        {/* Header with Logo (kept in-sync with PaymentReminderTemplate) */}
        <div style={{
          width: '100%',
          textAlign: 'center',
          padding: '20px 0 1px',
          background: '#ffffff',
        }}>
          <img 
            src={pgLogoUrl}
            alt={pgName}
            crossOrigin="anonymous"
            loading="eager"
            style={{
              width: '260px',
              height: 'auto',
              margin: '0 auto',
              display: 'block',
              maxHeight: '140px',
              objectFit: 'contain',
            }}
          />
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#4b5563', 
            marginTop: '4px' 
          }}>
            {pgName}
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
