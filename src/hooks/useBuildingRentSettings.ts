import { useState, useEffect } from 'react';

export interface BuildingRentSettings {
  amount: number;
  receivedFrom: string;
  paidTo: string;
  whatsappNumber: string;
}

const DEFAULT_SETTINGS: BuildingRentSettings = {
  amount: 150000,
  receivedFrom: 'Pallapu Sanjay Kumar',
  paidTo: 'Vishvanathan',
  whatsappNumber: '9989568666',
};

const STORAGE_KEY = 'building-rent-settings';

export const useBuildingRentSettings = () => {
  const [settings, setSettings] = useState<BuildingRentSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<BuildingRentSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  };

  return { settings, updateSettings, resetSettings };
};
