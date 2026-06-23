import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';

export interface BuildingRentSettings {
  amount: number;
  receivedFrom: string;
  paidTo: string;
  whatsappNumber: string;
}

const STORAGE_KEY_PREFIX = 'building-rent-settings';

export const useBuildingRentSettings = () => {
  const { user } = useAuth();

  // Scope storage key by user ID to prevent data leaking between accounts
  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;

  const defaultSettings = useMemo<BuildingRentSettings>(() => {
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Owner';
    return {
      amount: 50000,
      receivedFrom: fullName,
      paidTo: 'Landlord',
      whatsappNumber: '',
    };
  }, [user]);

  const [settings, setSettings] = useState<BuildingRentSettings>(defaultSettings);

  useEffect(() => {
    // Try user-scoped key first, then fall back to legacy global key for migration
    const stored = localStorage.getItem(storageKey) || localStorage.getItem(STORAGE_KEY_PREFIX);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
        // Migrate legacy global key to user-scoped key
        if (!localStorage.getItem(storageKey) && localStorage.getItem(STORAGE_KEY_PREFIX) && user?.id) {
          localStorage.setItem(storageKey, stored);
        }
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      setSettings(defaultSettings);
    }
  }, [defaultSettings, storageKey]);

  const updateSettings = (newSettings: Partial<BuildingRentSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
  };

  return { settings, updateSettings, resetSettings };
};
