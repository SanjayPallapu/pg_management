import { numberToWords, formatIndianCurrency } from '@/utils/numberToWords';
import receiptHeader from '@/assets/receipt-header.png';
import receiptFooter from '@/assets/receipt-footer.png';

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
      }}
    >
      {/* Header Image */}
      <img
        src={receiptHeader}
        alt="Header"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />

      {/* Content */}
      <div style={{ padding: '20px 30px' }}>
        {/* Title */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1a365d',
              margin: 0,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '10px',
            }}
          >
            Building Rent Receipt
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', margin: '8px 0 0 0' }}>
            {data.forMonth}
          </p>
        </div>

        {/* Receipt Details */}
        <div
          style={{
            backgroundColor: '#f7fafc',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          {/* Date */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '15px',
            }}
          >
            <span
              style={{
                backgroundColor: '#edf2f7',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#4a5568',
              }}
            >
              Date: {formatDate(data.date)}
            </span>
          </div>

          {/* From/To */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                marginBottom: '12px',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: '110px',
                  fontSize: '14px',
                  color: '#718096',
                  fontWeight: '500',
                }}
              >
                Received From:
              </span>
              <span
                style={{
                  fontSize: '15px',
                  color: '#2d3748',
                  fontWeight: '600',
                }}
              >
                {data.receivedFrom}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: '110px',
                  fontSize: '14px',
                  color: '#718096',
                  fontWeight: '500',
                }}
              >
                Paid To:
              </span>
              <span
                style={{
                  fontSize: '15px',
                  color: '#2d3748',
                  fontWeight: '600',
                }}
              >
                {data.paidTo}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div
            style={{
              backgroundColor: '#1a365d',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#a0aec0',
                margin: '0 0 5px 0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Total Amount
            </p>
            <p
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: 0,
              }}
            >
              ₹{formatIndianCurrency(data.amount)}
            </p>
            <p
              style={{
                fontSize: '13px',
                color: '#cbd5e0',
                margin: '8px 0 0 0',
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
              }}
            >
              {data.upiAmount > 0 && (
                <div
                  style={{
                    backgroundColor: '#ebf8ff',
                    border: '1px solid #90cdf4',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#2b6cb0',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                      fontWeight: '600',
                    }}
                  >
                    UPI
                  </p>
                  <p
                    style={{
                      fontSize: '18px',
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
                    border: '1px solid #9ae6b4',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#276749',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                      fontWeight: '600',
                    }}
                  >
                    Cash
                  </p>
                  <p
                    style={{
                      fontSize: '18px',
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
        </div>

        {/* Purpose */}
        <div
          style={{
            textAlign: 'center',
            padding: '15px',
            backgroundColor: '#faf5ff',
            borderRadius: '6px',
            border: '1px solid #e9d8fd',
          }}
        >
          <p style={{ fontSize: '13px', color: '#553c9a', margin: 0 }}>
            <strong>Purpose:</strong> Building Rent for {data.forMonth}
          </p>
        </div>

        {/* Stamps Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '25px',
            padding: '0 10px',
          }}
        >
          {/* PAID Stamp */}
          <div
            style={{
              border: '3px solid #c53030',
              borderRadius: '4px',
              padding: '8px 25px',
              transform: 'rotate(-5deg)',
            }}
          >
            <span
              style={{
                color: '#c53030',
                fontWeight: 'bold',
                fontSize: '20px',
                letterSpacing: '3px',
              }}
            >
              PAID
            </span>
          </div>

          {/* Signature area */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                borderTop: '1px solid #a0aec0',
                width: '150px',
                marginBottom: '5px',
              }}
            />
            <span style={{ fontSize: '12px', color: '#718096' }}>
              Authorized Signature
            </span>
          </div>
        </div>
      </div>

      {/* Footer Image */}
      <img
        src={receiptFooter}
        alt="Footer"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  );
};
