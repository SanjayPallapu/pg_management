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
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  
  return digits.length > 10 ? digits.slice(-10) : digits;
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
    const mod: any = await import('@capgo/capacitor-contacts');
    const Contacts: any = mod.Contacts ?? mod.CapacitorContacts ?? mod.default;
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
    const mod: any = await import('@capgo/capacitor-contacts');
    const Contacts: any = mod.Contacts ?? mod.CapacitorContacts ?? mod.default;
    
    const permissionGranted = await requestContactPermission();
    if (!permissionGranted) {
      throw new Error('Contact permission denied');
    }
    
    const result = await Contacts.getContacts();
    if (result && result.contacts) {
      return result.contacts.map((c: any) => {
        const name = c.fullName || 
                     [c.givenName, c.familyName].filter(Boolean).join(' ') || 
                     'Unknown';
        const phones = (c.phoneNumbers || [])
          .map((p: any) => p.value)
          .filter(Boolean);
        return { name, phones };
      }).filter((c: any) => c.name && c.phones.length > 0);
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
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts: any = await (navigator.contacts as any).select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          const webContact: any = contacts[0];
          const name = webContact.name?.[0] || 'Unknown';
          const phones = webContact.tel || [];
          return { name, phones };
        }
      } catch (e: any) {
        console.error('Web contact picker API failed:', e);
        const errStr = String(e?.message || e?.name || '').toLowerCase();
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

