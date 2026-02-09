import { useState, useEffect, useCallback, useMemo } from 'react';

export interface CollectorConfig {
  id: string;
  displayName: string;
}

const STORAGE_KEY = 'collector-names';

const DEFAULT_COLLECTORS: CollectorConfig[] = [
  { id: 'Me', displayName: 'Sanjay' },
  { id: 'Brother', displayName: 'Sai' },
];

const DEFAULT_COLLECTOR_NAME_BY_ID = new Map(
  DEFAULT_COLLECTORS.map((collector) => [collector.id, collector.displayName])
);

const normalizeCollectors = (raw: unknown): CollectorConfig[] => {
  if (!Array.isArray(raw)) return DEFAULT_COLLECTORS;

  const seen = new Set<string>();
  const normalized: CollectorConfig[] = [];

  raw.forEach((item) => {
    let id = '';
    let displayName = '';

    if (typeof item === 'string') {
      id = item.trim();
      displayName = DEFAULT_COLLECTOR_NAME_BY_ID.get(id) ?? id;
    } else if (item && typeof item === 'object') {
      const obj = item as Partial<CollectorConfig>;
      id = String(obj.id ?? '').trim();
      displayName = String(obj.displayName ?? '').trim();

      if (!id && displayName) {
        id = displayName;
      }
      if (!displayName && id) {
        displayName = DEFAULT_COLLECTOR_NAME_BY_ID.get(id) ?? id;
      }
    }

    if (!id || !displayName) return;
    if (seen.has(id)) return;

    seen.add(id);
    normalized.push({ id, displayName });
  });

  if (normalized.length === 0) return DEFAULT_COLLECTORS;

  const normalizedIds = new Set(normalized.map((collector) => collector.id));
  const withDefaults = [...normalized];

  DEFAULT_COLLECTORS.forEach((collector) => {
    if (!normalizedIds.has(collector.id)) {
      withDefaults.push(collector);
    }
  });

  return withDefaults;
};

export const useCollectorNames = () => {
  const [collectors, setCollectors] = useState<CollectorConfig[]>(DEFAULT_COLLECTORS);

  const collectorDisplayNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    DEFAULT_COLLECTOR_NAME_BY_ID.forEach((displayName, id) => {
      map[id] = displayName;
    });

    collectors.forEach((collector) => {
      map[collector.id] = collector.displayName;
      map[collector.displayName] = collector.displayName;
    });

    return map;
  }, [collectors]);

  const getCollectorDisplayName = useCallback(
    (rawId: string) => collectorDisplayNameMap[rawId] || rawId,
    [collectorDisplayNameMap]
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let nextCollectors = DEFAULT_COLLECTORS;
    let shouldPersist = !stored;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        nextCollectors = normalizeCollectors(parsed);
        if (JSON.stringify(nextCollectors) !== stored) {
          shouldPersist = true;
        }
      } catch {
        shouldPersist = true;
      }
    }

    setCollectors(nextCollectors);
    if (shouldPersist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCollectors));
    }
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setCollectors(DEFAULT_COLLECTORS);
        return;
      }

      try {
        setCollectors(normalizeCollectors(JSON.parse(stored)));
      } catch {
        setCollectors(DEFAULT_COLLECTORS);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncFromStorage();
      }
    };

    const handleCustomEvent = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('collector-names-changed', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('collector-names-changed', handleCustomEvent as EventListener);
    };
  }, []);

  const saveCollectors = useCallback((updated: CollectorConfig[]) => {
    const normalized = normalizeCollectors(updated);
    setCollectors(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('collector-names-changed'));
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
    collectorDisplayNameMap,
    getCollectorDisplayName,
  };
};
