import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/proxyClient';

export type AppRole = 'admin' | 'staff';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isNewSignup: boolean;
  isAuthenticated: boolean;
  hasRole: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const forceLoadingTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(prev => {
          if (prev) {
            console.warn('[Auth] Force-ending loading state after 2s deadline');
            return false;
          }
          return prev;
        });
      }
    }, 2000);

    const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) {
          console.error('[Auth] Error fetching user role:', error.message);
          // Retry once after a short delay (proxy/timing issues)
          await new Promise(r => setTimeout(r, 500));
          const retry = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();
          if (retry.error) {
            console.error('[Auth] Retry also failed:', retry.error.message);
            return null;
          }
          console.log('[Auth] Retry succeeded, role:', retry.data?.role);
          return retry.data?.role as AppRole | null;
        }
        console.log('[Auth] User role fetched:', data?.role);
        return data?.role as AppRole | null;
      } catch (e) {
        console.error('[Auth] Exception fetching role:', e);
        return null;
      }
    };

    const checkIsNewSignup = (): boolean => {
      return sessionStorage.getItem('isNewSignup') === 'true';
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          fetchUserRole(newSession.user.id).then(r => {
            if (isMounted) setRole(r);
          });
          if (isMounted) setIsNewSignup(checkIsNewSignup());
          // End loading immediately when we get a valid session from auth state change
          if (isMounted) setIsLoading(false);
        } else {
          setRole(null);
          setIsNewSignup(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 800)
        );

        const result = await Promise.race([
          sessionPromise.then(r => r.data.session).catch(() => null),
          timeoutPromise,
        ]);

        if (!isMounted) return;

        if (!result) {
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
        }

        setSession(result ?? null);
        setUser(result?.user ?? null);

        if (result?.user) {
          const r = await fetchUserRole(result.user.id);
          if (isMounted) {
            setRole(r);
            setIsNewSignup(checkIsNewSignup());
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(forceLoadingTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (!error && data?.user) {
      sessionStorage.setItem('isNewSignup', 'true');
    }
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    role,
    isLoading,
    isNewSignup,
    isAuthenticated: !!session,
    hasRole: !!role,
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Return a safe default during initial render before provider mounts
    return {
      user: null,
      session: null,
      role: null,
      isLoading: true,
      isNewSignup: false,
      isAuthenticated: false,
      hasRole: false,
      isAdmin: false,
      isStaff: false,
      signIn: async () => ({ error: new Error('Auth not ready') }),
      signUp: async () => ({ data: null, error: new Error('Auth not ready') }),
      signOut: async () => ({ error: new Error('Auth not ready') }),
    };
  }
  return ctx;
};
