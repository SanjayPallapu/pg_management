import { useState, useEffect, useCallback } from 'react';

export interface CollectorConfig {
  id: string;
  displayName: string;
}

const STORAGE_KEY = 'collector-names';

const DEFAULT_COLLECTORS: CollectorConfig[] = [
  { id: 'Me', displayName: 'Sanjay' },
  { id: 'Brother', displayName: 'Sai' },
];

export const useCollectorNames = () => {
  const [collectors, setCollectors] = useState<CollectorConfig[]>(DEFAULT_COLLECTORS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCollectors(parsed);
        }
      } catch {
        // Use defaults
      }
    }
  }, []);

  const saveCollectors = useCallback((updated: CollectorConfig[]) => {
    setCollectors(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addCollector = useCallback((displayName: string) => {
    const id = displayName.trim();
    if (!id) return;
    const updated = [...collectors, { id, displayName: id }];
    saveCollectors(updated);
  }, [collectors, saveCollectors]);

  const updateCollector = useCallback((index: number, displayName: string) => {
    const updated = collectors.map((c, i) => 
      i === index ? { ...c, displayName: displayName.trim() } : c
    );
    saveCollectors(updated);
  }, [collectors, saveCollectors]);

  const removeCollector = useCallback((index: number) => {
    if (collectors.length <= 1) return; // Must have at least one
    const updated = collectors.filter((_, i) => i !== index);
    saveCollectors(updated);
  }, [collectors, saveCollectors]);

  const resetToDefaults = useCallback(() => {
    saveCollectors(DEFAULT_COLLECTORS);
  }, [saveCollectors]);

  return {
    collectors,
    addCollector,
    updateCollector,
    removeCollector,
    resetToDefaults,
  };
};
