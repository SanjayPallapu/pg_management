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
        position: 'relative',
        border: '3px solid #1a365d',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
          padding: '25px 30px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffffff',
            margin: 0,
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          Building Rent Receipt
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e0', margin: '8px 0 0 0' }}>
          {data.forMonth}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '25px 30px' }}>
        {/* Date */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              backgroundColor: '#edf2f7',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#4a5568',
              fontWeight: '500',
            }}
          >
            Date: {formatDate(data.date)}
          </span>
        </div>

        {/* From/To Section */}
        <div
          style={{
            backgroundColor: '#f7fafc',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              marginBottom: '15px',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: '130px',
                fontSize: '14px',
                color: '#718096',
                fontWeight: '600',
              }}
            >
              Received From:
            </span>
            <span
              style={{
                fontSize: '16px',
                color: '#1a365d',
                fontWeight: '700',
              }}
            >
              {data.receivedFrom}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: '130px',
                fontSize: '14px',
                color: '#718096',
                fontWeight: '600',
              }}
            >
              Paid To:
            </span>
            <span
              style={{
                fontSize: '16px',
                color: '#1a365d',
                fontWeight: '700',
              }}
            >
              {data.paidTo}
            </span>
          </div>
        </div>

        {/* Amount Box */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#a0aec0',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Total Amount
          </p>
          <p
            style={{
              fontSize: '42px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: 0,
            }}
          >
            ₹{formatIndianCurrency(data.amount)}
          </p>
          <p
            style={{
              fontSize: '14px',
              color: '#cbd5e0',
              margin: '10px 0 0 0',
              fontStyle: 'italic',
            }}
          >
            {numberToWords(data.amount)}
          </p>
        </div>

        {/* Payment Mode Split */}
        {(data.upiAmount > 0 || data.cashAmount > 0) && (
          <div
            style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            {data.upiAmount > 0 && (
              <div
                style={{
                  backgroundColor: '#ebf8ff',
                  border: '2px solid #90cdf4',
                  borderRadius: '10px',
                  padding: '15px 25px',
                  textAlign: 'center',
                  flex: 1,
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: '#2b6cb0',
                    margin: '0 0 6px 0',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    letterSpacing: '1px',
                  }}
                >
                  UPI Payment
                </p>
                <p
                  style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: '#2c5282',
                    margin: 0,
                  }}
                >
                  ₹{formatIndianCurrency(data.upiAmount)}
                </p>
              </div>
            )}
            {data.cashAmount > 0 && (
              <div
                style={{
                  backgroundColor: '#f0fff4',
                  border: '2px solid #9ae6b4',
                  borderRadius: '10px',
                  padding: '15px 25px',
                  textAlign: 'center',
                  flex: 1,
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: '#276749',
                    margin: '0 0 6px 0',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    letterSpacing: '1px',
                  }}
                >
                  Cash Payment
                </p>
                <p
                  style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: '#22543d',
                    margin: 0,
                  }}
                >
                  ₹{formatIndianCurrency(data.cashAmount)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Purpose */}
        <div
          style={{
            textAlign: 'center',
            padding: '15px',
            backgroundColor: '#faf5ff',
            borderRadius: '8px',
            border: '1px solid #e9d8fd',
            marginBottom: '25px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#553c9a', margin: 0 }}>
            <strong>Purpose:</strong> Building Rent for {data.forMonth}
          </p>
        </div>

        {/* Stamps Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 10px',
          }}
        >
          {/* PAID Stamp */}
          <div
            style={{
              border: '4px solid #c53030',
              borderRadius: '6px',
              padding: '10px 30px',
              transform: 'rotate(-5deg)',
            }}
          >
            <span
              style={{
                color: '#c53030',
                fontWeight: 'bold',
                fontSize: '24px',
                letterSpacing: '4px',
              }}
            >
              PAID
            </span>
          </div>

          {/* Signature area */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                borderTop: '2px solid #a0aec0',
                width: '160px',
                marginBottom: '8px',
              }}
            />
            <span style={{ fontSize: '13px', color: '#718096' }}>
              Authorized Signature
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
          padding: '15px 30px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '12px', color: '#cbd5e0', margin: 0 }}>
          Thank you for your payment • This is a computer-generated receipt
        </p>
      </div>
    </div>
  );
};
