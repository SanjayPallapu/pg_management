import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'staff';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isNewSignup: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isNewSignup: false,
  });

  useEffect(() => {
    let isMounted = true;

    // HARD DEADLINE: Force loading to false after 1 second no matter what
    const forceLoadingTimer = setTimeout(() => {
      if (isMounted) {
        setAuthState(prev => {
          if (prev.isLoading) {
            console.warn('[Auth] Force-ending loading state after 1s deadline');
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }
    }, 1000);

    // Function to fetch user role
    const fetchUserRoleAsync = async (userId: string): Promise<AppRole | null> => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('[Auth] Error fetching user role:', error);
          return null;
        }
        return data?.role as AppRole | null;
      } catch (err) {
        console.error('[Auth] Error in fetchUserRole:', err);
        return null;
      }
    };

    const checkIsNewSignup = (): boolean => {
      return sessionStorage.getItem('isNewSignup') === 'true';
    };

    // Set up auth state listener for ONGOING changes (does NOT control isLoading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          fetchUserRoleAsync(session.user.id).then(role => {
            if (isMounted) {
              setAuthState(prev => ({ ...prev, role }));
            }
          });
          const isNew = checkIsNewSignup();
          if (isMounted) {
            setAuthState(prev => ({ ...prev, isNewSignup: isNew }));
          }
        } else {
          setAuthState(prev => ({ ...prev, role: null, isNewSignup: false }));
        }
      }
    );

    // INITIAL load - try to get session but don't block forever
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

        const session = result;

        // If no session obtained (timeout or error), clear stale local storage
        if (!session) {
          // Remove stale Supabase tokens from localStorage to stop infinite refresh
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
        }

        setAuthState(prev => ({
          ...prev,
          session: session ?? null,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          const [role] = await Promise.all([
            fetchUserRoleAsync(session.user.id),
          ]);
          if (isMounted) {
            setAuthState(prev => ({ ...prev, role, isNewSignup: checkIsNewSignup() }));
          }
        }
      } finally {
        if (isMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(forceLoadingTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    // Mark as new signup so onboarding flow triggers
    if (!error && data?.user) {
      sessionStorage.setItem('isNewSignup', 'true');
    }
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!authState.session,
    hasRole: !!authState.role,
    isAdmin: authState.role === 'admin',
    isStaff: authState.role === 'staff',
  };
};
