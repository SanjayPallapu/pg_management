import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session, AuthError, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/proxyClient';

export type AppRole = 'admin' | 'owner' | 'staff';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isNewSignup: boolean;
  isAuthenticated: boolean;
  hasRole: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
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
            console.warn('[Auth] Force-ending loading state after 5s deadline');
            return false;
          }
          return prev;
        });
      }
    }, 5000);

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

    const ensureOAuthProfile = async (authUser: User) => {
      const provider = authUser.app_metadata?.provider;
      if (provider !== 'google') return;

      const fullName =
        typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : typeof authUser.user_metadata?.name === 'string'
            ? authUser.user_metadata.name
            : authUser.email ?? null;

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: authUser.id,
            full_name: fullName,
            is_new_signup: true,
          },
          { onConflict: 'user_id' },
        );

      if (error) console.error('[Auth] Error ensuring Google profile:', error.message);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          ensureOAuthProfile(newSession.user);
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
        // Always wait for the real session — never wipe persisted tokens on a timeout.
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('[Auth] getSession error:', error.message);
        const result = data?.session ?? null;

        if (!isMounted) return;

        setSession(result);
        setUser(result?.user ?? null);

        if (result?.user) {
          await ensureOAuthProfile(result.user);
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
    // Set flag BEFORE signUp so onAuthStateChange handler picks it up
    sessionStorage.setItem('isNewSignup', 'true');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      // Remove flag on error
      sessionStorage.removeItem('isNewSignup');
    } else if (data?.user) {
      // Also update state directly in case onAuthStateChange already fired
      setIsNewSignup(true);
    }
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    return { error };
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
    isOwner: role === 'owner',
    isStaff: role === 'staff',
    signIn,
    signUp,
    signInWithGoogle,
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
      isOwner: false,
      isStaff: false,
      signIn: async () => ({ error: new Error('Auth not ready') }),
      signUp: async () => ({ data: null, error: new Error('Auth not ready') }),
      signInWithGoogle: async () => ({ error: new Error('Auth not ready') }),
      signOut: async () => ({ error: new Error('Auth not ready') }),
    };
  }
  return ctx;
};
