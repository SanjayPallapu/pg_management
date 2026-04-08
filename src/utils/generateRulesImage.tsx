import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { RulesPosterContent } from '@/components/RulesPosterContent';
import type { Rule, RulesLanguage, RulesTemplateStyle } from '@/lib/pgRules';
import { generateReceiptImage } from '@/utils/generateReceiptImage';

interface GenerateRulesImageOptions {
  pgName: string;
  pgLogoUrl: string;
  rules: Rule[];
  language?: RulesLanguage;
  templateStyle?: RulesTemplateStyle;
}

export const generateRulesImage = async ({
  pgName,
  pgLogoUrl,
  rules,
  language = 'en',
  templateStyle = 'professional',
}: GenerateRulesImageOptions): Promise<string> => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.transform = 'translateX(-200vw)';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(
        <RulesPosterContent
          pgName={pgName}
          pgLogoUrl={pgLogoUrl}
          rules={rules}
          language={language}
          templateStyle={templateStyle}
        />,
      );
    });

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const element = host.firstElementChild as HTMLElement | null;
    if (!element) {
      throw new Error('Rules poster could not be rendered');
    }

    return await generateReceiptImage(element);
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
};