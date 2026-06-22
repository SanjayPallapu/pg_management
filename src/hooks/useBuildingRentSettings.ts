import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';

export interface BuildingRentSettings {
  amount: number;
  receivedFrom: string;
  paidTo: string;
  whatsappNumber: string;
}

const STORAGE_KEY = 'building-rent-settings';

export const useBuildingRentSettings = () => {
  const { user } = useAuth();

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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      setSettings(defaultSettings);
    }
  }, [defaultSettings]);

  const updateSettings = (newSettings: Partial<BuildingRentSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
  };

  return { settings, updateSettings, resetSettings };
};
