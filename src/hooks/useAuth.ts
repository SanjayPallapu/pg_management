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
        console.debug('[Auth] Role fetched', { userId, role: data?.role });
        return data?.role as AppRole | null;
      } catch (err) {
        console.error('[Auth] Error in fetchUserRole:', err);
        return null;
      }
    };

    // Function to fetch if user is new signup
    const fetchIsNewSignup = async (userId: string): Promise<boolean> => {
      try {
        // Check if profile exists - if not, it's a new signup
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('[Auth] Error fetching profile:', error);
          return false;
        }
        return !data;
      } catch (err) {
        console.error('[Auth] Error in fetchIsNewSignup:', err);
        return false;
      }
    };

    // Set up auth state listener for ONGOING changes (does NOT control isLoading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        console.debug('[Auth] onAuthStateChange', { event, userId: session?.user?.id ?? null });
        
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Fire and forget for ongoing changes - don't await, don't set loading
        if (session?.user) {
          fetchUserRoleAsync(session.user.id).then(role => {
            if (isMounted) {
              setAuthState(prev => ({ ...prev, role }));
            }
          });
          fetchIsNewSignup(session.user.id).then(isNewSignup => {
            if (isMounted) {
              setAuthState(prev => ({ ...prev, isNewSignup }));
            }
          });
        } else {
          setAuthState(prev => ({ ...prev, role: null, isNewSignup: false }));
        }
      }
    );

    // INITIAL load (controls isLoading) - fetch session AND role before setting loading false
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        console.debug('[Auth] Initial session', { userId: session?.user?.id ?? null });

        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Fetch role BEFORE setting loading false
        if (session?.user) {
          const [role, isNewSignup] = await Promise.all([
            fetchUserRoleAsync(session.user.id),
            fetchIsNewSignup(session.user.id)
          ]);
          if (isMounted) {
            setAuthState(prev => ({ ...prev, role, isNewSignup }));
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
