import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PG, Subscription } from '@/types/pg';
import { useAuth } from '@/hooks/useAuth';

interface PGContextType {
  pgs: PG[];
  currentPG: PG | null;
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  selectPG: (pgId: string) => void;
  refreshPGs: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  canCreatePG: boolean;
  isProUser: boolean;
  needsSetup: boolean;
}

const PGContext = createContext<PGContextType | undefined>(undefined);

export const usePG = () => {
  const context = useContext(PGContext);
  if (!context) {
    throw new Error('usePG must be used within PGProvider');
  }
  return context;
};

interface PGProviderProps {
  children: ReactNode;
}

const CURRENT_PG_KEY = 'currentPgId';

export const PGProvider = ({ children }: PGProviderProps) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [pgs, setPgs] = useState<PG[]>([]);
  const [currentPG, setCurrentPG] = useState<PG | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPGs = useCallback(async () => {
    if (!user) {
      setPgs([]);
      setCurrentPG(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('pgs')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const mappedPGs: PG[] = (data || []).map(pg => ({
        id: pg.id,
        ownerId: pg.owner_id,
        name: pg.name,
        address: pg.address || undefined,
        logoUrl: pg.logo_url || undefined,
        floors: pg.floors,
        createdAt: pg.created_at,
        updatedAt: pg.updated_at,
      }));

      setPgs(mappedPGs);

      // Restore or set current PG
      const savedPgId = localStorage.getItem(CURRENT_PG_KEY);
      const savedPG = mappedPGs.find(pg => pg.id === savedPgId);
      
      if (savedPG) {
        setCurrentPG(savedPG);
      } else if (mappedPGs.length > 0) {
        setCurrentPG(mappedPGs[0]);
        localStorage.setItem(CURRENT_PG_KEY, mappedPGs[0].id);
      } else {
        setCurrentPG(null);
        localStorage.removeItem(CURRENT_PG_KEY);
      }
    } catch (err) {
      console.error('Error fetching PGs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PGs');
    }
  }, [user]);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSubscription({
          id: data.id,
          userId: data.user_id,
          plan: data.plan as 'free' | 'pro',
          status: data.status as 'free' | 'pending' | 'active' | 'expired',
          maxPgs: data.max_pgs,
          maxTenantsPerPg: data.max_tenants_per_pg,
          features: {
            autoReminders: (data.features as any)?.auto_reminders ?? false,
            dailyReports: (data.features as any)?.daily_reports ?? false,
            aiLogo: (data.features as any)?.ai_logo ?? false,
          },
          paymentProofUrl: data.payment_proof_url || undefined,
          paymentRequestedAt: data.payment_requested_at || undefined,
          paymentApprovedAt: data.payment_approved_at || undefined,
          approvedBy: data.approved_by || undefined,
          expiresAt: data.expires_at || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  }, [user]);

  const selectPG = useCallback((pgId: string) => {
    const pg = pgs.find(p => p.id === pgId);
    if (pg) {
      setCurrentPG(pg);
      localStorage.setItem(CURRENT_PG_KEY, pgId);
    }
  }, [pgs]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      Promise.all([fetchPGs(), fetchSubscription()]).finally(() => {
        setIsLoading(false);
      });
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchPGs, fetchSubscription]);

  const canCreatePG = subscription 
    ? (subscription.maxPgs === -1 || pgs.length < subscription.maxPgs)
    : pgs.length < 1;

  const isProUser = subscription?.status === 'active' && subscription?.plan === 'pro';
  const needsSetup = pgs.length === 0;

  const value: PGContextType = {
    pgs,
    currentPG,
    subscription,
    isLoading: isLoading || authLoading,
    error,
    selectPG,
    refreshPGs: fetchPGs,
    refreshSubscription: fetchSubscription,
    canCreatePG,
    isProUser,
    needsSetup,
  };

  return <PGContext.Provider value={value}>{children}</PGContext.Provider>;
};
