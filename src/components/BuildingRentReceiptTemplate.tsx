import { numberToWords, formatIndianCurrency } from '@/utils/numberToWords';

export interface BuildingRentReceiptData {
  receivedFrom: string;
  amount: number;
  upiAmount: number;
  cashAmount: number;
  date: string;
  forMonth: string;
}

interface BuildingRentReceiptTemplateProps {
  data: BuildingRentReceiptData;
}

export const BuildingRentReceiptTemplate = ({ data }: BuildingRentReceiptTemplateProps) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day} / ${month} / ${year}`;
  };

  return (
    <div
      style={{
        width: '600px',
        padding: '40px',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '2px solid #d1d5db',
          padding: '30px',
          position: 'relative',
        }}
      >
        {/* Inner border */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            padding: '25px',
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid #1e3a8a',
              paddingBottom: '15px',
              marginBottom: '25px',
            }}
          >
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1e3a8a',
                margin: 0,
                letterSpacing: '4px',
              }}
            >
              RECEIPT
            </h1>
          </div>

          {/* Receipt Content */}
          <div style={{ lineHeight: '2.2' }}>
            <div style={{ marginBottom: '15px' }}>
              <span style={{ color: '#4b5563', fontWeight: '500' }}>Received From:</span>
              <span style={{ marginLeft: '20px', color: '#1e3a8a', fontWeight: '600' }}>
                Mr. {data.receivedFrom}
              </span>
            </div>

            <div style={{ marginBottom: '15px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <span style={{ color: '#4b5563', fontWeight: '500' }}>The Sum of Rupees:</span>
              <span style={{ marginLeft: '20px', color: '#1e3a8a', fontWeight: '500', fontStyle: 'italic' }}>
                {numberToWords(data.amount).replace(' Only', '')} Only
              </span>
            </div>

            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ color: '#4b5563', fontWeight: '500' }}>For Building Rent ({data.forMonth}):</span>
              <span
                style={{
                  marginLeft: '20px',
                  color: '#1e3a8a',
                  fontWeight: 'bold',
                  fontSize: '32px',
                }}
              >
                Rs. {formatIndianCurrency(data.amount)}/-
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '15px',
                borderTop: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
                padding: '12px 0',
              }}
            >
              <div>
                <span style={{ color: '#4b5563', fontWeight: '500' }}>UPI Amount:</span>
                <span style={{ marginLeft: '10px', color: '#2563eb', fontWeight: '600' }}>
                  {data.upiAmount > 0 ? `₹${formatIndianCurrency(data.upiAmount)}` : '-'}
                </span>
              </div>
              <div>
                <span style={{ color: '#4b5563', fontWeight: '500' }}>Cash:</span>
                <span style={{ marginLeft: '10px', color: '#16a34a', fontWeight: '600' }}>
                  {data.cashAmount > 0 ? `₹${formatIndianCurrency(data.cashAmount)}` : '-'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ color: '#4b5563', fontWeight: '500' }}>Amount Paid In Words:</span>
              <span style={{ marginLeft: '15px', color: '#1e3a8a', fontStyle: 'italic' }}>
                {numberToWords(data.amount).replace(' Only', '')} Rupees
              </span>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <span style={{ color: '#4b5563', fontWeight: '500' }}>Date:</span>
              <span style={{ marginLeft: '15px', color: '#374151', fontStyle: 'italic' }}>
                {formatDate(data.date)}
              </span>
            </div>

            {/* Stamps */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: '30px',
              }}
            >
              {/* PAID Stamp */}
              <div
                style={{
                  border: '3px solid #dc2626',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  color: '#dc2626',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  transform: 'rotate(-5deg)',
                }}
              >
                PAID
              </div>

              {/* Approved Stamp */}
              <div
                style={{
                  border: '3px solid #1e3a8a',
                  borderRadius: '50%',
                  width: '100px',
                  height: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  transform: 'rotate(5deg)',
                }}
              >
                <span style={{ fontSize: '8px', color: '#1e3a8a', fontWeight: '500' }}>
                  PROPERTY MANAGEMENT
                </span>
                <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 'bold' }}>
                  APPROVED
                </span>
                <span style={{ fontSize: '6px', color: '#1e3a8a' }}>★ ★ ★ ★ ★ ★ ★ ★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
