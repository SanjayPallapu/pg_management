import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/proxyClient';
import { PG, Subscription } from '@/types/pg';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';
import {
  getPhoneOtpTestSession,
  getPhoneOtpTestWorkspace,
} from '@/lib/phoneOtpTestMode';

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

const getFeatureMap = (features: Json): Record<string, Json> =>
  features && typeof features === 'object' && !Array.isArray(features) ? features : {};

export const PGProvider = ({ children }: PGProviderProps) => {
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
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

    if (getPhoneOtpTestSession()) {
      const workspace = getPhoneOtpTestWorkspace();
      const testPGs = workspace ? [workspace.pg] : [];
      setPgs(testPGs);
      setCurrentPG(workspace?.pg ?? null);
      setError(null);
      setIsLoading(false);
      if (workspace) localStorage.setItem(CURRENT_PG_KEY, workspace.pg.id);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('pgs')
        .select('*')
        .eq('owner_id', user.id)
        .not('is_archived', 'eq', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const mappedPGs: PG[] = (data || []).map(pg => ({
        id: pg.id,
        ownerId: pg.owner_id,
        name: pg.name,
        address: pg.address || undefined,
        logoUrl: pg.logo_url || undefined,
        floors: pg.floors || 3,
        electricityUnitPrice: pg.electricity_unit_price ?? 12,
        createdAt: pg.created_at,
        updatedAt: pg.updated_at,
      }));

      setPgs(mappedPGs);

      // Get currently selected PG ID
      const savedPgId = localStorage.getItem(CURRENT_PG_KEY);
      const savedPG = mappedPGs.find(pg => pg.id === savedPgId);
      
      if (savedPG) {
        // IMPORTANT: Always update currentPG with fresh data to reflect floor changes
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

    if (getPhoneOtpTestSession()) {
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
        const features = getFeatureMap(data.features);
        const billingCycle = features.billing_cycle as Subscription['billingCycle'];

        setSubscription({
          id: data.id,
          userId: data.user_id,
          plan: data.plan as 'free' | 'pro',
          status: data.status as 'free' | 'pending' | 'active' | 'expired',
          billingCycle,
          maxPgs: data.max_pgs,
          maxTenantsPerPg: data.max_tenants_per_pg,
          features: {
            autoReminders: features.auto_reminders === true,
            dailyReports: features.daily_reports === true,
            aiLogo: features.ai_logo === true,
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

  const allowedPgs = Math.min(4, subscription?.maxPgs === -1 ? 4 : (subscription?.maxPgs ?? 1));
  const canCreatePG = pgs.length < allowedPgs;

  const isProUser = subscription?.status === 'active' && subscription?.plan !== 'free';
  
  // User needs setup if no PGs created yet
  const needsSetup = !isLoading && !authLoading && pgs.length === 0;

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
