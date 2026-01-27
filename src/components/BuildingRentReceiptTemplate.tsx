import { numberToWords, formatIndianCurrency } from '@/utils/numberToWords';

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

export const BuildingRentReceiptTemplate = ({ data }: BuildingRentReceiptTemplateProps) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div
      style={{
        width: '600px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        padding: '40px 50px',
      }}
    >
      {/* Header with Building Icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        {/* Building Icon SVG */}
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <rect x="5" y="20" width="25" height="35" fill="#3B82F6" rx="2" />
          <rect x="30" y="10" width="25" height="45" fill="#1E40AF" rx="2" />
          <rect x="10" y="25" width="5" height="6" fill="#93C5FD" />
          <rect x="20" y="25" width="5" height="6" fill="#93C5FD" />
          <rect x="10" y="35" width="5" height="6" fill="#93C5FD" />
          <rect x="20" y="35" width="5" height="6" fill="#93C5FD" />
          <rect x="10" y="45" width="5" height="6" fill="#93C5FD" />
          <rect x="20" y="45" width="5" height="6" fill="#93C5FD" />
          <rect x="35" y="15" width="5" height="6" fill="#93C5FD" />
          <rect x="45" y="15" width="5" height="6" fill="#93C5FD" />
          <rect x="35" y="25" width="5" height="6" fill="#93C5FD" />
          <rect x="45" y="25" width="5" height="6" fill="#93C5FD" />
          <rect x="35" y="35" width="5" height="6" fill="#93C5FD" />
          <rect x="45" y="35" width="5" height="6" fill="#93C5FD" />
          <rect x="35" y="45" width="5" height="6" fill="#93C5FD" />
          <rect x="45" y="45" width="5" height="6" fill="#93C5FD" />
        </svg>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1E3A5F',
            margin: 0,
            letterSpacing: '2px',
          }}
        >
          BUILDING RENT RECEIPT
        </h1>
      </div>

      {/* Blue line under header */}
      <div style={{ height: '3px', backgroundColor: '#2563EB', marginBottom: '30px' }} />

      {/* Date and Month Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
        <div style={{ fontSize: '14px', color: '#4B5563' }}>
          <span style={{ fontWeight: '600' }}>Date:</span> {formatDate(data.date)}
        </div>
        <div style={{ fontSize: '14px', color: '#4B5563' }}>
          <span style={{ fontWeight: '600' }}>For Month:</span> {data.forMonth}
        </div>
      </div>

      {/* From Field */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: '16px', color: '#1E3A5F', fontWeight: '500', width: '130px' }}>
            From:
          </span>
          <span
            style={{
              flex: 1,
              fontSize: '16px',
              color: '#1E3A5F',
              fontWeight: '600',
              borderBottom: '1px solid #9CA3AF',
              paddingBottom: '5px',
            }}
          >
            {data.receivedFrom}
          </span>
        </div>
      </div>

      {/* To Field */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: '16px', color: '#1E3A5F', fontWeight: '500', width: '130px' }}>
            To:
          </span>
          <span
            style={{
              flex: 1,
              fontSize: '16px',
              color: '#1E3A5F',
              fontWeight: '600',
              borderBottom: '1px solid #9CA3AF',
              paddingBottom: '5px',
            }}
          >
            {data.paidTo}
          </span>
        </div>
      </div>

      {/* Building Rent Field */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: '16px', color: '#1E3A5F', fontWeight: '500', width: '130px' }}>
            Building Rent:
          </span>
          <span
            style={{
              flex: 1,
              fontSize: '16px',
              color: '#1E3A5F',
              fontWeight: '700',
              borderBottom: '1px solid #9CA3AF',
              paddingBottom: '5px',
            }}
          >
            ₹{formatIndianCurrency(data.amount)} ({numberToWords(data.amount)})
          </span>
        </div>
      </div>

      {/* UPI/Cash Split if applicable */}
      {data.upiAmount > 0 && data.cashAmount > 0 && (
        <div style={{ marginBottom: '20px', marginLeft: '130px' }}>
          <div style={{ display: 'flex', gap: '30px', fontSize: '14px', color: '#4B5563' }}>
            <span>UPI: ₹{formatIndianCurrency(data.upiAmount)}</span>
            <span>Cash: ₹{formatIndianCurrency(data.cashAmount)}</span>
          </div>
        </div>
      )}

      {/* Mode of Payment with badges */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '16px', color: '#1E3A5F', fontWeight: '500' }}>
            Mode of Payment:
          </span>

          {/* UPI Badge */}
          {data.upiAmount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1F2937',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
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
                backgroundColor: '#1F2937',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              CASH
            </div>
          )}

          {/* PAID Badge */}
          <div
            style={{
              backgroundColor: '#2563EB',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '1px',
              border: '2px solid #1E40AF',
            }}
          >
            PAID
          </div>
        </div>
      </div>

      {/* Bottom blue line */}
      <div style={{ height: '3px', backgroundColor: '#2563EB', marginTop: '20px' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
          This is a computer-generated receipt
        </p>
      </div>
    </div>
  );
};
