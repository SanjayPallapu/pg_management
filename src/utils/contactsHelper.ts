import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeContactPickerPlugin {
  pickContact(): Promise<{ name: string; phoneNumber: string }>;
}

const NativeContactPicker = registerPlugin<NativeContactPickerPlugin>('NativeContactPicker');

export interface SelectedContact {
  name: string;
  phones: string[];
}

export interface MockContact {
  id: string;
  name: string;
  phones: string[];
}

type ContactApi = {
  checkPermissions: () => Promise<Record<string, string>>;
  requestPermissions: () => Promise<Record<string, string>>;
  getContacts: () => Promise<{ contacts?: ContactRecord[] }>;
};
type ContactRecord = { fullName?: string; givenName?: string; familyName?: string; phoneNumbers?: Array<{ value?: string }> };
type WebContact = { name?: string[]; tel?: string[] };
type ContactNavigator = Navigator & { contacts?: { select: (properties: string[], options: { multiple: boolean }) => Promise<WebContact[]> } };

// Pre-populated mock contacts for web testing
export const MOCK_CONTACTS: MockContact[] = [
  {
    id: '1',
    name: 'Aarav Sharma',
    phones: ['+91 98765 43210'],
  },
  {
    id: '2',
    name: 'Priya Patel',
    phones: ['+91 91234 56789', '098761 23450'],
  },
  {
    id: '3',
    name: 'Rahul Verma',
    phones: ['8888888888'],
  },
  {
    id: '4',
    name: 'Sneha Reddy',
    phones: ['+91 99999-99999'],
  },
  {
    id: '5',
    name: 'Amit Singh',
    phones: [], // Test no-phone case
  },
  {
    id: '6',
    name: 'Vikram Malhotra',
    phones: ['7777777777', '9898989898'],
  },
];

/**
 * Sanitizes phone numbers by:
 * 1. Removing all non-digit characters.
 * 2. Trimming country prefixes like '91' (12 digits) or '0' (11 digits) for Indian standard 10-digit numbers.
 * 3. Returning the last 10 digits if the number is longer, or all digits if shorter.
 */
export const sanitizePhoneNumber = (phone: string): string => {
  const raw = String(phone ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+91') && digits.length === 12) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.length === 10 ? digits : digits.length > 10 ? digits.slice(-10) : digits;
};

export const isValidIndianPhoneNumber = (phone: string): boolean => {
  const normalized = sanitizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(normalized);
};

export const toIndianPhoneNumber = (phone: string): string | null =>
  isValidIndianPhoneNumber(phone) ? `+91${sanitizePhoneNumber(phone)}` : null;

export const getContactPhone = (contact: SelectedContact | null | undefined): string | null => {
  const phone = contact?.phones.find((candidate) => isValidIndianPhoneNumber(candidate));
  return phone ? sanitizePhoneNumber(phone) : null;
};

/**
 * Requests contact permission on native platforms.
 * Always resolves to true on Web.
 */
export const requestContactPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const mod = await import('@capgo/capacitor-contacts');
    const Contacts = (mod.Contacts ?? mod.CapacitorContacts ?? mod.default) as unknown as ContactApi;
    const status = await Contacts.checkPermissions();
    if (status.readContacts === 'granted' || status.contacts === 'granted') {
      return true;
    }
    const requestStatus = await Contacts.requestPermissions();
    return requestStatus.readContacts === 'granted' || requestStatus.contacts === 'granted';
  } catch (error) {
    console.error('Error requesting contact permissions:', error);
    return false;
  }
};

/**
 * Fetches all contact details from the phone.
 */
export const getDeviceContacts = async (): Promise<SelectedContact[]> => {
  if (!Capacitor.isNativePlatform()) {
    return MOCK_CONTACTS;
  }
  try {
    const mod = await import('@capgo/capacitor-contacts');
    const Contacts = (mod.Contacts ?? mod.CapacitorContacts ?? mod.default) as unknown as ContactApi;
    
    const permissionGranted = await requestContactPermission();
    if (!permissionGranted) {
      throw new Error('Contact permission denied');
    }
    
    const result = await Contacts.getContacts();
    if (result && result.contacts) {
      return result.contacts.map((c) => {
        const name = c.fullName ||
                     [c.givenName, c.familyName].filter(Boolean).join(' ') ||
                     'Unknown';
        const phones = (c.phoneNumbers || [])
          .map((p) => p.value)
          .filter((value): value is string => Boolean(value));
        return { name, phones };
      }).filter((c) => c.name && c.phones.length > 0);
    }
    return [];
  } catch (error) {
    console.error('Error fetching device contacts:', error);
    throw error;
  }
};

/**
 * Attempts to pick a contact from the device.
 * If running on a native platform, it uses our high-reliability native system contact picker intent.
 * If running in a web browser, it tries the native Web Contact Picker API if supported.
 * Returns null if the browser picker is unsupported or failed, indicating that the UI should show the mock contact picker instead.
 */
export const pickContactFromDevice = async (): Promise<SelectedContact | null | undefined> => {
  if (!Capacitor.isNativePlatform()) {
    // Attempt to use standard Web Contact Picker API (supported in mobile Chrome/Safari)
    const contactNavigator = navigator as ContactNavigator;
    if (contactNavigator.contacts) {
      try {
        const contacts = await contactNavigator.contacts.select(['name', 'tel'], { multiple: false });
        if (contacts.length > 0) {
          const webContact = contacts[0];
          const name = webContact.name?.[0] || 'Unknown';
          const phones = webContact.tel || [];
          return { name, phones };
        }
      } catch (e: unknown) {
        console.error('Web contact picker API failed:', e);
        const error = e instanceof Error ? e : new Error(String(e));
        const errStr = String(error.message || error.name || '').toLowerCase();
        if (errStr.includes('cancel') || errStr.includes('abort')) {
          return undefined; // User explicitly cancelled
        }
      }
    }
    return null; // Fallback to mock selector UI
  }

  try {
    const result = await NativeContactPicker.pickContact();
    if (result && (result.name || result.phoneNumber)) {
      return {
        name: result.name || 'Unknown',
        phones: result.phoneNumber ? [result.phoneNumber] : []
      };
    }
    return null;
  } catch (error: any) {
    console.error('NativeContactPicker error/result:', error);
    const errStr = String(error?.message || error || '').toLowerCase();
    if (errStr.includes('cancel')) {
      return undefined; // User explicitly cancelled in system UI
    }
    throw error;
  }
};

/**
 * Gets the simulated contact list from localStorage, or returns default MOCK_CONTACTS if empty.
 */
export const getSimulatedContacts = (): MockContact[] => {
  if (typeof window === 'undefined') return MOCK_CONTACTS;
  
  const stored = localStorage.getItem('simulated_contacts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing simulated contacts:', e);
    }
  }
  return MOCK_CONTACTS;
};

/**
 * Saves a new simulated contact to localStorage and returns the updated list.
 */
export const saveSimulatedContact = (name: string, phoneString: string): MockContact[] => {
  const current = getSimulatedContacts();
  
  // Split phone numbers by comma, trim spaces, and filter out empties
  const phones = phoneString
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
    
  const newContact: MockContact = {
    id: Date.now().toString(),
    name,
    phones,
  };
  
  const updated = [...current, newContact];
  localStorage.setItem('simulated_contacts', JSON.stringify(updated));
  return updated;
};

