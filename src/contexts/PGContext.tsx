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

      let subData = data;
      if (!subData) {
        // Automatically grant a 7-day free trial so user is never locked out
        const trialExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: createdSub, error: insertError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: user.id,
              plan: 'pro',
              status: 'active',
              max_pgs: 4,
              max_tenants_per_pg: 500,
              features: {
                auto_reminders: true,
                daily_reports: true,
                ai_logo: true,
                billing_cycle: 'trial',
                included_tenants: 500,
              },
              expires_at: trialExpiry,
            },
            { onConflict: 'user_id' }
          )
          .select()
          .maybeSingle();

        if (!insertError && createdSub) {
          subData = createdSub;
        }
      }

      if (subData) {
        const features = getFeatureMap(subData.features);
        const billingCycle = (features.billing_cycle as Subscription['billingCycle']) || (subData.plan === 'free' ? 'free' : 'trial');

        setSubscription({
          id: subData.id,
          userId: subData.user_id,
          plan: subData.plan as 'free' | 'pro',
          status: subData.status as 'free' | 'pending' | 'active' | 'expired',
          billingCycle,
          maxPgs: subData.max_pgs,
          maxTenantsPerPg: subData.max_tenants_per_pg,
          features: {
            autoReminders: features.auto_reminders === true,
            dailyReports: features.daily_reports === true,
            aiLogo: features.ai_logo === true,
          },
          paymentProofUrl: subData.payment_proof_url || undefined,
          paymentRequestedAt: subData.payment_requested_at || undefined,
          paymentApprovedAt: subData.payment_approved_at || undefined,
          approvedBy: subData.approved_by || undefined,
          expiresAt: subData.expires_at || undefined,
          createdAt: subData.created_at,
          updatedAt: subData.updated_at,
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
    const pgTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    if (!authLoading && isAuthenticated) {
      Promise.all([fetchPGs(), fetchSubscription()]).finally(() => {
        clearTimeout(pgTimeout);
        setIsLoading(false);
      });
    } else if (!authLoading) {
      clearTimeout(pgTimeout);
      setIsLoading(false);
    }

    return () => clearTimeout(pgTimeout);
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
