export interface Rule {
  id: string;
  title: string;
  titleTe?: string;
  description: string;
  descriptionTe?: string;
  details: string[];
  detailsTe?: string[];
}

export type RulesLanguage = 'en' | 'te';

export type RulesTemplateStyle = 'professional' | 'elegant';

export const DEFAULT_RULES: Rule[] = [
  { id: '1', title: 'Meal Timings', titleTe: 'భోజన సమయాలు', description: 'Food service timings for the PG residents', descriptionTe: 'PG నివాసులకు భోజన సేవ సమయాలు', details: ['Breakfast (Tiffin): 7:30 AM – 9:00 AM', 'Lunch: 12:30 PM – 2:00 PM', 'Dinner: 7:30 PM – 9:00 PM', 'Note: If food gets over during the above timings, residents may inform the management. We will be happy to prepare food again, subject to availability.'], detailsTe: ['అల్పాహారం (టిఫిన్): 7:30 AM – 9:00 AM', 'భోజనం: 12:30 PM – 2:00 PM', 'రాత్రి భోజనం: 7:30 PM – 9:00 PM', 'గమనిక: పై సమయాల్లో ఆహారం అయిపోతే, నిర్వహణకు తెలియజేయండి. మేము మళ్ళీ తయారు చేస్తాము.'] },
  { id: '2', title: 'Night Gate Timing', titleTe: 'రాత్రి గేట్ సమయం', description: 'Main gate closure timing', descriptionTe: 'ప్రధాన గేట్ మూసివేయు సమయం', details: ['The main gate will be closed at 10:00 PM.'], detailsTe: ['ప్రధాన గేట్ రాత్రి 10:00 గంటలకు మూసివేయబడుతుంది.'] },
  { id: '3', title: 'Corridor Lights', titleTe: 'కారిడార్ లైట్లు', description: 'Corridor lighting schedule', descriptionTe: 'కారిడార్ లైటింగ్ షెడ్యూల్', details: ['Corridor lights will be switched off at 10:00 PM.'], detailsTe: ['కారిడార్ లైట్లు రాత్రి 10:00 గంటలకు ఆఫ్ చేయబడతాయి.'] },
  { id: '4', title: 'Room Cleaning', titleTe: 'గది శుభ్రపరచడం', description: 'Room maintenance schedule', descriptionTe: 'గది నిర్వహణ షెడ్యూల్', details: ['Rooms will be cleaned once a week.'], detailsTe: ['గదులు వారానికి ఒకసారి శుభ్రం చేయబడతాయి.'] },
  { id: '5', title: 'Visitors Policy', titleTe: 'సందర్శకుల విధానం', description: 'Rules regarding visitors and guests', descriptionTe: 'సందర్శకులు మరియు అతిథుల నియమాలు', details: ['Friends, relatives, or any outsiders are not allowed inside rooms.', 'Bringing any friend into your room without prior permission will result in a fine of ₹1000.'], detailsTe: ['స్నేహితులు, బంధువులు లేదా బయటి వ్యక్తులను గదుల్లోకి అనుమతించరు.', 'అనుమతి లేకుండా స్నేహితులను గదిలోకి తీసుకురావడం వల్ల ₹1000 జరిమానా విధించబడుతుంది.'] },
  { id: '6', title: 'Noise & Behavior', titleTe: 'శబ్దం & ప్రవర్తన', description: 'Community conduct expectations', descriptionTe: 'సమాజ నడవడిక అంచనాలు', details: ['Loud noise inside or outside the rooms is not permitted.', 'Do not disturb others.', "Respect other residents' privacy at all times."], detailsTe: ['గదులలో లేదా బయట పెద్ద శబ్దం అనుమతించబడదు.', 'ఇతరులను ఇబ్బంది పెట్టవద్దు.', 'ఇతర నివాసుల గోప్యతను ఎల్లప్పుడూ గౌరవించండి.'] },
  { id: '7', title: 'Rent Policy', titleTe: 'అద్దె విధానం', description: 'Rent payment obligations', descriptionTe: 'అద్దె చెల్లింపు బాధ్యతలు', details: ['Full monthly rent must be paid even if you stay outside or go home for any duration.'], detailsTe: ['మీరు ఎంత కాలం బయట ఉన్నా లేదా ఇంటికి వెళ్ళినా పూర్తి నెలవారీ అద్దె చెల్లించాలి.'] },
  { id: '8', title: 'Notice Period', titleTe: 'నోటీసు వ్యవధి', description: 'Requirement before vacating', descriptionTe: 'గది ఖాళీ చేయడానికి ముందు అవసరం', details: ['Residents must inform 15–30 days in advance before vacating the room.'], detailsTe: ['నివాసులు గది ఖాళీ చేయడానికి 15–30 రోజుల ముందుగా తెలియజేయాలి.'] },
  { id: '9', title: 'Security Deposit', titleTe: 'భద్రతా డిపాజిట్', description: 'Security deposit terms', descriptionTe: 'భద్రతా డిపాజిట్ నిబంధనలు', details: ['The security deposit is refundable at the time of vacating, subject to applicable deductions.'], detailsTe: ['భద్రతా డిపాజిట్ ఖాళీ చేసేటప్పుడు తిరిగి చెల్లించబడుతుంది, వర్తించే తగ్గింపులకు లోబడి.'] },
  { id: '10', title: 'Luggage Charges', titleTe: 'లగేజీ చార్జీలు', description: 'Extra luggage storage charges', descriptionTe: 'అదనపు లగేజీ నిల్వ చార్జీలు', details: ['Extra luggage storage will be charged ₹150 per day.'], detailsTe: ['అదనపు లగేజీ నిల్వకు రోజుకు ₹150 వసూలు చేయబడుతుంది.'] },
  { id: '11', title: 'Issues & Support', titleTe: 'సమస్యలు & సహాయం', description: 'How to report and resolve issues', descriptionTe: 'సమస్యలను ఎలా నివేదించాలి మరియు పరిష్కరించాలి', details: ['If you face any issues or problems during your stay, please inform the management.', 'We will review the matter and try to resolve it as early as possible.'], detailsTe: ['మీ బస సమయంలో ఏవైనా సమస్యలు ఎదురైతే, దయచేసి నిర్వహణకు తెలియజేయండి.', 'మేము విషయాన్ని సమీక్షించి, వీలైనంత త్వరగా పరిష్కరించడానికి ప్రయత్నిస్తాము.'] },
];

const RULES_KEY_PREFIX = 'pgRules';
const LANGUAGE_KEY_PREFIX = 'pgRulesLanguage';

const getRulesKey = (pgId?: string | null) => `${RULES_KEY_PREFIX}:${pgId ?? 'default'}`;
const getLanguageKey = (pgId?: string | null) => `${LANGUAGE_KEY_PREFIX}:${pgId ?? 'default'}`;

const isRule = (value: unknown): value is Rule => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Rule>;
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.description === 'string'
    && Array.isArray(candidate.details);
};

export const getStoredPGRules = (pgId?: string | null): Rule[] => {
  if (typeof window === 'undefined') return DEFAULT_RULES;

  try {
    const raw = window.localStorage.getItem(getRulesKey(pgId));
    if (!raw) return DEFAULT_RULES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isRule)) return DEFAULT_RULES;

    return parsed;
  } catch {
    return DEFAULT_RULES;
  }
};

export const saveStoredPGRules = (pgId: string | null | undefined, rules: Rule[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getRulesKey(pgId), JSON.stringify(rules));
};

export const getStoredRulesLanguage = (pgId?: string | null): RulesLanguage => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(getLanguageKey(pgId));
  return stored === 'te' ? 'te' : 'en';
};

export const saveStoredRulesLanguage = (pgId: string | null | undefined, language: RulesLanguage) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLanguageKey(pgId), language);
};