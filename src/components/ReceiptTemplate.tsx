import { forwardRef } from 'react';
import receiptHeader from '@/assets/receipt-header.png';
import receiptFooter from '@/assets/receipt-footer.png';

export interface ReceiptData {
  tenant: {
    name: string;
    joiningDate: string;
  };
  stay: {
    month: string;
    roomNo: string;
    sharingType: string;
  };
  payment: {
    type: 'FULL' | 'PARTIAL';
    amount: number;
    paid: number;
    balance: number;
    mode: string;
    date: string;
  };
}

interface ReceiptTemplateProps {
  data: ReceiptData;
}

const formatCurrency = (amount: number): string => {
  return `₹ ${Math.floor(amount).toLocaleString('en-IN')}`;
};

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ data }, ref) => {
    const isFullPayment = data.payment.type === 'FULL';
    
    return (
      <div
        ref={ref}
        style={{
          width: '500px',
          background: '#ffffff',
          fontFamily: "'Segoe UI', 'Roboto', sans-serif",
          position: 'absolute',
          left: '-9999px',
          top: 0,
        }}
      >
        {/* Header with Logo */}
        <div style={{ 
          width: '100%', 
          textAlign: 'center',
          paddingTop: '20px',
          background: '#ffffff'
        }}>
          <img 
            src={receiptHeader} 
            alt="Amma Women's Hostel" 
            style={{ 
              width: '280px',
              height: 'auto',
              margin: '0 auto'
            }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Payment Successful Badge */}
        <div style={{
          textAlign: 'center',
          padding: '15px 0',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: 600,
            color: '#1a1a1a',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#22c55e"/>
              <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Payment Successful!</span>
          </div>
        </div>

        {/* Payment Summary Card */}
        <div style={{
          margin: '0 20px 15px',
          background: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          border: '1px solid #a7f3d0',
        }}>
          <div style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '8px',
          }}>
            {formatCurrency(data.payment.paid)} {isFullPayment ? 'Full Payment' : 'Partial Payment'}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#4b5563',
            marginBottom: isFullPayment ? '0' : '12px',
          }}>
            {isFullPayment 
              ? 'Your full payment has been successfully completed.'
              : `You have made a partial payment of ${formatCurrency(data.payment.paid)}.`
            }
          </div>
          {!isFullPayment && (
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#dc2626',
            }}>
              {formatCurrency(data.payment.balance)} Remaining Balance
            </div>
          )}
        </div>

        {/* Tenant & Transaction Details */}
        <div style={{
          margin: '0 20px 15px',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          <div style={{
            background: '#ecfdf5',
            padding: '12px 16px',
            fontWeight: 600,
            fontSize: '15px',
            color: '#1a1a1a',
            borderBottom: '1px solid #e5e7eb',
          }}>
            Tenant & Transaction Details
          </div>
          <div style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px', width: '45%' }}>Tenant Name:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.tenant.name}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>Payment Mode:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.payment.mode}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>Payment Date:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.payment.date}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>Joining Date:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.tenant.joiningDate}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Stay & Payment Details */}
        <div style={{
          margin: '0 20px 15px',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          <div style={{
            background: '#ecfdf5',
            padding: '12px 16px',
            fontWeight: 600,
            fontSize: '15px',
            color: '#1a1a1a',
            borderBottom: '1px solid #e5e7eb',
          }}>
            Stay & Payment Details
          </div>
          <div style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px', width: '45%' }}>For Month:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.stay.month}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>Room No:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.stay.roomNo}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>Sharing Type:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{data.stay.sharingType}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>Amount:</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '14px' }}>{formatCurrency(data.payment.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
          padding: '20px',
          position: 'relative',
          marginTop: '10px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}>
            {/* Footer Illustration */}
            <div style={{ width: '150px' }}>
              <img 
                src={receiptFooter}
                alt="Hostel Illustration"
                style={{ width: '100%', height: 'auto' }}
                crossOrigin="anonymous"
              />
            </div>
            
            {/* Thank You Message */}
            <div style={{ 
              textAlign: 'right',
              paddingRight: '10px',
              flex: 1,
            }}>
              <div style={{
                fontFamily: "'Georgia', serif",
                fontSize: '28px',
                fontWeight: 700,
                color: '#166534',
                fontStyle: 'italic',
                marginBottom: '8px',
              }}>
                Thank You!
              </div>
              <div style={{
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: 1.5,
                maxWidth: '220px',
                marginLeft: 'auto',
              }}>
                {isFullPayment 
                  ? 'Your full payment has been successfully completed.'
                  : `You have successfully made a partial payment of ${formatCurrency(data.payment.paid)}. Please pay the remaining ${formatCurrency(data.payment.balance)} at your earliest convenience.`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = 'ReceiptTemplate';
