import { forwardRef } from 'react';

export interface SettlementRefundTemplateData {
  tenantName: string;
  tenantPhone?: string;
  roomNo: string;
  sharingType?: string;
  fromDate: string;
  toDate: string;
  daysStayed: number;
  monthlyRent: number;
  dailyRate: number;
  rateMode: 'standard-30' | 'calendar' | 'custom';
  proRataRent: number;
  amountPaid: number;
  deductions: number;
  deductionReason?: string;
  discounts: number;
  netRefund: number;
  netDue: number;
  isRefund: boolean;
  settlementStatus?: string;
  pgName?: string;
  pgLogoUrl?: string;
  pgPhone?: string;
  generatedDate?: string;
}

interface Props {
  data: SettlementRefundTemplateData;
}

const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

export const SettlementRefundTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const pgName = data.pgName || 'PG Management';
  const pgLogoUrl = data.pgLogoUrl || '/icon-512.png';
  const voucherNo = `SETTL-${data.roomNo}-${data.daysStayed}D-${Date.now().toString().slice(-4)}`;

  return (
    <div
      ref={ref}
      style={{
        width: '500px',
        minHeight: '680px',
        background: '#ffffff',
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        color: '#0f172a',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header ── */}
      <div
        style={{
          position: 'relative',
          padding: '16px 20px',
          borderBottom: '2px dashed #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <img
          src={pgLogoUrl}
          alt={pgName}
          crossOrigin="anonymous"
          style={{
            width: '64px',
            height: '64px',
            objectFit: 'contain',
            borderRadius: '12px',
            background: '#ffffff',
            padding: '4px',
            border: '1px solid #cbd5e1',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#3b82f6',
              textTransform: 'uppercase',
            }}
          >
            Move-Out Settlement Voucher
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
              marginTop: '2px',
            }}
          >
            {pgName}
          </div>
          {data.pgPhone && (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Contact: {data.pgPhone}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
          <div>VOUCHER NO:</div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            {voucherNo}
          </div>
          <div style={{ marginTop: '2px' }}>{data.generatedDate || new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      {/* ── Tenant & Dates Banner ── */}
      <div
        style={{
          padding: '14px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Tenant Details
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {data.tenantName}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '1px' }}>
              Room {data.roomNo} {data.sharingType ? `• ${data.sharingType}` : ''}
              {data.tenantPhone ? ` • ${data.tenantPhone}` : ''}
            </div>
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '6px 12px',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase' }}>
              Stay Duration
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af' }}>
              {data.daysStayed} Days
            </div>
          </div>
        </div>

        {/* Date range strip */}
        <div
          style={{
            marginTop: '10px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#334155',
          }}
        >
          <span>
            <strong>From:</strong> {data.fromDate}
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span>
            <strong>To:</strong> {data.toDate}
          </span>
        </div>
      </div>

      {/* ── Calculation Breakdown ── */}
      <div style={{ padding: '14px 20px', flex: 1 }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}
        >
          Pro-Rata Settlement Breakdown
        </div>

        <div
          style={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          {/* Row 1: Monthly rent */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '9px 12px',
              fontSize: '12px',
              borderBottom: '1px solid #f1f5f9',
              background: '#ffffff',
            }}
          >
            <span style={{ color: '#64748b' }}>Full Monthly Rent:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(data.monthlyRent)}</span>
          </div>

          {/* Row 2: Day rate */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '9px 12px',
              fontSize: '12px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <span style={{ color: '#64748b' }}>
              Day-wise Rate:
            </span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {formatCurrency(data.dailyRate)} / day
            </span>
          </div>

          {/* Row 3: Pro-rata rent */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '9px 12px',
              fontSize: '12px',
              borderBottom: '1px solid #f1f5f9',
              background: '#ffffff',
            }}
          >
            <span style={{ color: '#0f172a', fontWeight: 600 }}>
              Pro-Rata Rent for {data.daysStayed} Days:
            </span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {formatCurrency(data.proRataRent)}
            </span>
          </div>

          {/* Row 4: Upfront paid */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '9px 12px',
              fontSize: '12px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <span style={{ color: '#16a34a', fontWeight: 600 }}>Rent Paid Upfront:</span>
            <span style={{ fontWeight: 700, color: '#16a34a' }}>
              {formatCurrency(data.amountPaid)}
            </span>
          </div>

          {/* Row 5: Deductions if any */}
          {data.deductions > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 12px',
                fontSize: '12px',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff',
                color: '#dc2626',
              }}
            >
              <span>Deductions ({data.deductionReason || 'Utilities'}):</span>
              <span style={{ fontWeight: 600 }}>- {formatCurrency(data.deductions)}</span>
            </div>
          )}

          {/* Row 6: Discounts if any */}
          {data.discounts > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 12px',
                fontSize: '12px',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff',
                color: '#16a34a',
              }}
            >
              <span>Discount Granted:</span>
              <span style={{ fontWeight: 600 }}>- {formatCurrency(data.discounts)}</span>
            </div>
          )}
        </div>

        {/* ── Net Amount Banner ── */}
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '14px',
            background: data.netRefund > 0 
              ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' 
              : 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            border: data.netRefund > 0 ? '1.5px solid #a7f3d0' : '1.5px solid #fecdd3',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: data.netRefund > 0 ? '#065f46' : '#9f1239',
            }}
          >
            {data.netRefund > 0 ? 'Refund Amount To Return' : 'Pending Rent Due from Tenant'}
          </div>

          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: data.netRefund > 0 ? '#047857' : '#be123c',
              lineHeight: 1.1,
              marginTop: '4px',
            }}
          >
            {data.netRefund > 0 ? formatCurrency(data.netRefund) : formatCurrency(data.netDue)}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: data.netRefund > 0 ? '#065f46' : '#9f1239',
              marginTop: '4px',
              opacity: 0.9,
            }}
          >
            {data.netRefund > 0
              ? `Tenant vacated early • Calculated strictly for ${data.daysStayed} days`
              : `Pending balance for ${data.daysStayed} days of stay`}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#64748b',
        }}
      >
        <div>
          Status: <strong>{data.settlementStatus || (data.netRefund > 0 ? 'Refund Calculated' : 'Settlement Pending')}</strong>
        </div>
        <div>Generated via PG Hub</div>
      </div>
    </div>
  );
});

SettlementRefundTemplate.displayName = 'SettlementRefundTemplate';
