import type { Rule, RulesLanguage, RulesTemplateStyle } from '@/lib/pgRules';

interface RulesPosterContentProps {
  pgName: string;
  pgLogoUrl: string;
  rules: Rule[];
  language?: RulesLanguage;
  templateStyle?: RulesTemplateStyle;
}

const RULE_ICONS: Record<string, string> = {
  'Meal Timings': '🍽️',
  'Night Gate Timing': '🚪',
  'Corridor Lights': '💡',
  'Room Cleaning': '🧹',
  'Visitors Policy': '👥',
  'Noise & Behavior': '🔔',
  'Rent Policy': '💰',
  'Notice Period': '📅',
  'Security Deposit': '🔒',
  'Luggage Charges': '🧳',
  'Issues & Support': '🆘',
};

const getIcon = (title: string): string => RULE_ICONS[title] || '📌';

interface TemplateInnerProps {
  pgName: string;
  pgLogoUrl: string;
  rules: Rule[];
  getTitle: (rule: Rule) => string;
  getDetails: (rule: Rule) => string[];
}

const ProfessionalTemplate = ({ pgName, pgLogoUrl, rules, getTitle, getDetails }: TemplateInnerProps) => (
  <>
    <div style={{ width: '100%', height: '10px', background: 'linear-gradient(90deg, #1e40af 0%, #60a5fa 50%, #1e40af 100%)' }} />

    <div style={{ padding: '28px 36px 18px', display: 'flex', alignItems: 'center', gap: '18px', borderBottom: '2px solid #dbe4f0' }}>
      <img
        src={pgLogoUrl}
        alt={pgName}
        crossOrigin="anonymous"
        loading="eager"
        style={{ width: '92px', height: '92px', objectFit: 'contain', borderRadius: '18px', border: '2px solid #dbe4f0', background: '#ffffff', padding: '8px' }}
        onError={(e) => { (e.target as HTMLImageElement).src = '/icon-512.png'; }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '34px', fontWeight: 800, color: '#172554', letterSpacing: '-0.8px', lineHeight: 1.15 }}>{pgName}</div>
        <div style={{ fontSize: '14px', color: '#475569', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Rules & Regulations</div>
      </div>
      <div style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', borderRadius: '999px', color: '#ffffff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', whiteSpace: 'nowrap' }}>Resident Guide</div>
    </div>

    <div style={{ margin: '18px 36px 14px', padding: '16px 18px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '16px', borderLeft: '6px solid #2563eb' }}>
      <div style={{ fontSize: '24px', color: '#1d4ed8', fontWeight: 900, marginBottom: '6px' }}>Dear Residents,</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: '#334155', lineHeight: 1.65 }}>Please read and follow these rules carefully for a comfortable, clean, and peaceful stay.</div>
    </div>

    <div style={{ padding: '0 36px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {rules.map((rule, idx) => (
        <div key={rule.id} style={{ padding: '14px 16px', background: idx % 2 === 0 ? '#f8fbff' : '#ffffff', borderRadius: '16px', border: '1px solid #dbe4f0', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{getIcon(rule.title)}</span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1d4ed8', lineHeight: 1.35 }}>{idx + 1}. {getTitle(rule)}</div>
          </div>

          {getDetails(rule).map((detail, detailIndex) => (
            <div key={detailIndex} style={{ fontSize: '20px', fontWeight: 600, color: '#334155', lineHeight: 1.7, paddingLeft: '24px', position: 'relative', marginBottom: '4px' }}>
              <span style={{ position: 'absolute', left: '6px', top: '11px', color: '#60a5fa', fontSize: '12px' }}>•</span>
              {detail}
            </div>
          ))}
        </div>
      ))}
    </div>

    <div style={{ margin: '18px 36px 0', padding: '16px 20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', borderRadius: '16px', border: '1px solid #dbe4f0', textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e40af', marginBottom: '4px' }}>Thank you for your cooperation</div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#475569', lineHeight: 1.6 }}>For any issue or support, please contact the management team.</div>
    </div>

    <div style={{ marginTop: '18px', width: '100%', height: '10px', background: 'linear-gradient(90deg, #1e40af 0%, #60a5fa 50%, #1e40af 100%)' }} />
  </>
);

const ElegantTemplate = ({ pgName, pgLogoUrl, rules, getTitle, getDetails }: TemplateInnerProps) => (
  <div style={{ width: '100%', minHeight: '1123px', background: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 35%, #f5f3ff 68%, #fff7ed 100%)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '180px', height: '180px', opacity: 0.22 }}>
      <div style={{ fontSize: '80px', position: 'absolute', top: '-10px', left: '-10px', transform: 'rotate(-30deg)' }}>🌸</div>
      <div style={{ fontSize: '40px', position: 'absolute', top: '50px', left: '60px', transform: 'rotate(15deg)' }}>🌺</div>
      <div style={{ fontSize: '30px', position: 'absolute', top: '10px', left: '100px', transform: 'rotate(-10deg)' }}>🌷</div>
    </div>
    <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', opacity: 0.22 }}>
      <div style={{ fontSize: '80px', position: 'absolute', top: '-10px', right: '-10px', transform: 'rotate(30deg)' }}>🌸</div>
      <div style={{ fontSize: '40px', position: 'absolute', top: '50px', right: '60px', transform: 'rotate(-15deg)' }}>🌺</div>
      <div style={{ fontSize: '30px', position: 'absolute', top: '10px', right: '100px', transform: 'rotate(10deg)' }}>🌷</div>
    </div>

    <div style={{ width: '100%', height: '8px', background: 'linear-gradient(90deg, #ec4899, #a855f7, #fb7185)' }} />

    <div style={{ margin: '12px', border: '2px solid #f5b6d2', borderRadius: '20px', minHeight: 'calc(100% - 32px)', position: 'relative', padding: '0 0 22px', background: 'rgba(255,255,255,0.55)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '26px 34px 16px' }}>
        <div style={{ width: '106px', height: '106px', flexShrink: 0, borderRadius: '28px', background: 'linear-gradient(135deg, #ffffff, #fdf2f8)', border: '3px solid #f9a8d4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 22px rgba(236, 72, 153, 0.16)' }}>
          <img
            src={pgLogoUrl}
            alt={pgName}
            crossOrigin="anonymous"
            loading="eager"
            style={{ width: '82px', height: '82px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/icon-512.png'; }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: '34px', fontWeight: 700, color: '#7c3aed', lineHeight: 1.2, marginBottom: '6px', textShadow: '0 1px 2px rgba(124, 58, 237, 0.12)' }}>{pgName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0 12px' }}>
            <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg, transparent, #ec4899)' }} />
            <span style={{ fontSize: '16px' }}>✿</span>
            <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg, #ec4899, transparent)' }} />
          </div>
          <div style={{ display: 'inline-block', padding: '10px 28px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: '999px', color: '#ffffff', fontSize: '15px', fontWeight: 700, letterSpacing: '2.6px', textTransform: 'uppercase', boxShadow: '0 6px 16px rgba(124, 58, 237, 0.24)' }}>Rules & Regulations</div>
        </div>
      </div>

      <div style={{ margin: '4px 34px 14px', padding: '15px 18px', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(253,242,248,0.82))', borderRadius: '16px', borderLeft: '5px solid #db2777' }}>
        <div style={{ fontSize: '24px', fontWeight: 900, color: '#a21caf', marginBottom: '6px' }}>Please Note</div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#4b5563', lineHeight: 1.65 }}>Kindly follow these house rules to keep the stay safe, neat, and respectful for everyone.</div>
      </div>

      <div style={{ padding: '6px 34px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rules.filter((rule) => rule.title !== 'Luggage Charges').map((rule, idx) => (
          <div key={rule.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.78)', borderRadius: '18px', border: '1px solid #e9d5ff', boxShadow: '0 8px 20px rgba(168, 85, 247, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{getIcon(rule.title)}</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#7c3aed', lineHeight: 1.35 }}>{idx + 1}. {getTitle(rule)}</div>
            </div>

            {getDetails(rule).map((detail, detailIndex) => (
              <div key={detailIndex} style={{ fontSize: '20px', fontWeight: 600, color: '#374151', lineHeight: 1.7, paddingLeft: '24px', position: 'relative', marginBottom: '4px' }}>
                <span style={{ position: 'absolute', left: '6px', top: '11px', color: '#c026d3', fontSize: '12px' }}>•</span>
                {detail}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ margin: '16px 34px 0', padding: '16px 20px', background: 'linear-gradient(135deg, #fff1f2 0%, #fdf2f8 100%)', borderRadius: '16px', border: '1px solid #fbcfe8', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Georgia', serif", fontSize: '22px', fontWeight: 900, color: '#a21caf', marginBottom: '6px' }}>Thank you for your cooperation</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#6b7280', lineHeight: 1.6 }}>If you need help, please contact the management.</div>
      </div>
    </div>
  </div>
);

export const RulesPosterContent = ({
  pgName,
  pgLogoUrl,
  rules,
  language = 'en',
  templateStyle = 'professional',
}: RulesPosterContentProps) => {
  const getTitle = (rule: Rule) => language === 'te' && rule.titleTe ? rule.titleTe : rule.title;
  const getDetails = (rule: Rule) => language === 'te' && rule.detailsTe ? rule.detailsTe : rule.details;

  return (
    <div
      style={{
        width: '794px',
        minHeight: '1123px',
        margin: '0 auto',
        background: '#ffffff',
        fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {templateStyle === 'professional' ? (
        <ProfessionalTemplate
          pgName={pgName}
          pgLogoUrl={pgLogoUrl}
          rules={rules}
          getTitle={getTitle}
          getDetails={getDetails}
        />
      ) : (
        <ElegantTemplate
          pgName={pgName}
          pgLogoUrl={pgLogoUrl}
          rules={rules}
          getTitle={getTitle}
          getDetails={getDetails}
        />
      )}
    </div>
  );
};