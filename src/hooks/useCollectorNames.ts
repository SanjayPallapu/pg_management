import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/proxyClient';
import { useAuth } from '@/hooks/useAuth';

export interface CollectorConfig {
  id: string;
  displayName: string;
}

const STORAGE_KEY = 'collector-names';

const DEFAULT_COLLECTORS: CollectorConfig[] = [
  { id: 'Me', displayName: 'Owner' },
  { id: 'Staff', displayName: 'Staff' },
];

const DEFAULT_COLLECTOR_NAME_BY_ID = new Map(
  DEFAULT_COLLECTORS.map((collector) => [collector.id, collector.displayName])
);

const normalizeCollectors = (raw: unknown, defaults: CollectorConfig[] = DEFAULT_COLLECTORS): CollectorConfig[] => {
  if (!Array.isArray(raw)) return defaults;

  const defaultNameById = new Map(defaults.map(c => [c.id, c.displayName]));
  const seen = new Set<string>();
  const normalized: CollectorConfig[] = [];

  raw.forEach((item) => {
    let id = '';
    let displayName = '';

    if (typeof item === 'string') {
      id = item.trim();
      displayName = defaultNameById.get(id) ?? id;
    } else if (item && typeof item === 'object') {
      const obj = item as Partial<CollectorConfig>;
      id = String(obj.id ?? '').trim();
      displayName = String(obj.displayName ?? '').trim();

      if (!id && displayName) {
        id = displayName;
      }
      if (!displayName && id) {
        displayName = defaultNameById.get(id) ?? id;
      }
    }

    if (!id || !displayName) return;
    if (seen.has(id)) return;

    seen.add(id);
    normalized.push({ id, displayName });
  });

  if (normalized.length === 0) return defaults;

  const normalizedIds = new Set(normalized.map((collector) => collector.id));
  const withDefaults = [...normalized];

  defaults.forEach((collector) => {
    if (!normalizedIds.has(collector.id)) {
      withDefaults.push(collector);
    }
  });

  return withDefaults;
};

export const useCollectorNames = () => {
  const { user } = useAuth();

  const defaultCollectors = useMemo<CollectorConfig[]>(() => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Owner';
    const firstName = name.split(' ')[0];
    return [
      { id: 'Me', displayName: firstName },
      { id: 'Staff', displayName: 'Staff' },
    ];
  }, [user]);

  const [collectors, setCollectors] = useState<CollectorConfig[]>(defaultCollectors);

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

  // Sync state with localStorage and dynamic defaults when defaults or user changes
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let nextCollectors = defaultCollectors;
    let shouldPersist = !stored;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        nextCollectors = normalizeCollectors(parsed, defaultCollectors);
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
  }, [defaultCollectors]);

  const syncFromServer = useCallback(async () => {
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from('collector_names')
      .select('collector_key, display_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Collectors] Failed to load collector names', error);
      return;
    }

    if (!data || data.length === 0) {
      const seed = defaultCollectors.map((collector) => ({
        user_id: user.id,
        collector_key: collector.id,
        display_name: collector.displayName,
      }));

      const { error: seedError } = await (supabase as any).from('collector_names').insert(seed);
      if (seedError) {
        console.error('[Collectors] Failed to seed collector names', seedError);
        return;
      }
      await syncFromServer();
      return;
    }

    const nextCollectors = normalizeCollectors(
      data.map((row: any) => ({ id: row.collector_key, displayName: row.display_name })),
      defaultCollectors
    );

    setCollectors(nextCollectors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCollectors));
    window.dispatchEvent(new Event('collector-names-changed'));
  }, [user, defaultCollectors]);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setCollectors(defaultCollectors);
        return;
      }

      try {
        setCollectors(normalizeCollectors(JSON.parse(stored), defaultCollectors));
      } catch {
        setCollectors(defaultCollectors);
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
  }, [defaultCollectors]);

  useEffect(() => {
    if (!user) return;
    syncFromServer();

    const channel = supabase
      .channel(`collector-names-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collector_names',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          syncFromServer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, syncFromServer]);

  const saveCollectors = useCallback((updated: CollectorConfig[]) => {
    const normalized = normalizeCollectors(updated, defaultCollectors);
    setCollectors(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('collector-names-changed'));
  }, [defaultCollectors]);

  const addCollector = useCallback((displayName: string) => {
    const id = displayName.trim();
    if (!id) return;

    if (user) {
      (supabase as any)
        .from('collector_names')
        .insert({ user_id: user.id, collector_key: id, display_name: id })
        .then(({ error }) => {
          if (error) {
            console.error('[Collectors] Failed to add collector', error);
          }
        });
      return;
    }

    const updated = [...collectors, { id, displayName: id }];
    saveCollectors(updated);
  }, [collectors, saveCollectors, user]);

  const updateCollector = useCallback((index: number, displayName: string) => {
    const nextDisplay = displayName.trim();
    if (!nextDisplay) return;

    const target = collectors[index];
    if (!target) return;

    if (user) {
      (supabase as any)
        .from('collector_names')
        .update({ display_name: nextDisplay })
        .eq('user_id', user.id)
        .eq('collector_key', target.id)
        .then(({ error }) => {
          if (error) {
            console.error('[Collectors] Failed to update collector', error);
          }
        });
      return;
    }

    const updated = collectors.map((c, i) =>
      i === index ? { ...c, displayName: nextDisplay } : c
    );
    saveCollectors(updated);
  }, [collectors, saveCollectors, user]);

  const removeCollector = useCallback((index: number) => {
    if (collectors.length <= 1) return; // Must have at least one
    const target = collectors[index];
    if (!target) return;

    if (user) {
      (supabase as any)
        .from('collector_names')
        .delete()
        .eq('user_id', user.id)
        .eq('collector_key', target.id)
        .then(({ error }) => {
          if (error) {
            console.error('[Collectors] Failed to remove collector', error);
          }
        });
      return;
    }

    const updated = collectors.filter((_, i) => i !== index);
    saveCollectors(updated);
  }, [collectors, saveCollectors, user]);

  const resetToDefaults = useCallback(() => {
    if (user) {
      (supabase as any)
        .from('collector_names')
        .delete()
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('[Collectors] Failed to reset collectors', error);
            return;
          }
          const seed = defaultCollectors.map((collector) => ({
            user_id: user.id,
            collector_key: collector.id,
            display_name: collector.displayName,
          }));
          (supabase as any).from('collector_names').insert(seed).then(({ error: seedError }: any) => {
            if (seedError) {
              console.error('[Collectors] Failed to seed collectors', seedError);
            }
          });
        });
      return;
    }

    saveCollectors(defaultCollectors);
  }, [saveCollectors, user, defaultCollectors]);

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
