import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session, AuthError, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/proxyClient';
import {
  PHONE_OTP_TEST_CODE,
  activatePhoneOtpTestSession,
  clearPhoneOtpTestMode,
  getPhoneOtpTestSession,
  hasPhoneOtpTestChallenge,
} from '@/lib/phoneOtpTestMode';

export type AppRole = 'admin' | 'owner';

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
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  requestPhoneOtp: (phone: string) => Promise<{ error: AuthError | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const DEV_MOCK_SIGNED_OUT_KEY = 'pgHubDevMockSignedOut';

const createPhoneTestAuth = (phone: string) => {
  const mockUser = {
    id: '92f3d1db-3e91-4b72-9712-ac756da63006',
    phone,
    app_metadata: { provider: 'phone-test', providers: ['phone-test'] },
    user_metadata: { full_name: 'PG Owner', phone },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;
  const mockSession = {
    access_token: 'phone-otp-test-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'phone-otp-test-refresh-token',
    user: mockUser,
  } as Session;

  return { mockUser, mockSession };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // DEV MOCK AUTO-LOGIN BYPASS
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true' &&
      sessionStorage.getItem(DEV_MOCK_SIGNED_OUT_KEY) !== 'true'
    ) {
      const mockUser = {
        id: "92f3d1db-3e91-4b72-9712-ac756da63006",
        email: "owner@pgmanagement.com",
        app_metadata: {},
        user_metadata: { full_name: "PG Owner" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };
      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: mockUser,
      };
      setSession(mockSession as Session);
      setUser(mockUser as User);
      setRole('owner');
      setIsLoading(false);
      return () => {};
    }

    const phoneTestSession = getPhoneOtpTestSession();
    if (phoneTestSession) {
      const { mockUser, mockSession } = createPhoneTestAuth(phoneTestSession);
      setSession(mockSession);
      setUser(mockUser);
      setRole('owner');
      setIsNewSignup(true);
      setIsLoading(false);
      return () => {};
    }

    const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) {
          console.error('[Auth] Error fetching user role:', error.message);
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
          return retry.data?.role as AppRole | null;
        }
        return data?.role as AppRole | null;
      } catch (e) {
        console.error('[Auth] Exception fetching role:', e);
        return null;
      }
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

    const checkIsNewSignup = (): boolean => {
      return sessionStorage.getItem('isNewSignup') === 'true';
    };

    // Get initial session and resolve loading state
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!isMounted) return;
      console.log('[Auth] Initial getSession:', !!initSession);
      if (initSession) {
        setSession(initSession);
        setUser(initSession.user);
        fetchUserRole(initSession.user.id).then(r => {
          if (isMounted) {
            setRole(r);
            setIsNewSignup(checkIsNewSignup());
          }
        });
        ensureOAuthProfile(initSession.user);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setIsNewSignup(false);
      }
      setIsLoading(false);
    }).catch(err => {
      console.error('[Auth] Initial getSession error:', err);
      if (isMounted) {
        setSession(null);
        setUser(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        console.log('[Auth] onAuthStateChange event:', event, 'session:', !!newSession);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession) {
          setIsLoading(false);
          // Sync profiles and roles asynchronously
          (async () => {
            try {
              await ensureOAuthProfile(newSession.user);
            } catch (e) {
              console.error('[Auth] OAuth Profile error:', e);
            }
            try {
              const r = await fetchUserRole(newSession.user.id);
              if (isMounted) {
                setRole(r);
                setIsNewSignup(checkIsNewSignup());
              }
            } catch (e) {
              console.error('[Auth] Fetch Role error:', e);
            }
          })();
        } else {
          setRole(null);
          setIsNewSignup(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
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
    return { data, error } as AuthResponse;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/`;
    sessionStorage.setItem('isNewSignup', 'true');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      sessionStorage.removeItem('isNewSignup');
    }
    return { error };
  }, []);

  const requestPhoneOtp = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    return { error };
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string) => {
    if (hasPhoneOtpTestChallenge(phone)) {
      if (token !== PHONE_OTP_TEST_CODE) {
        return {
          data: { user: null, session: null },
          error: new Error(`Use ${PHONE_OTP_TEST_CODE} while OTP test mode is active.`) as AuthError,
        } as AuthResponse;
      }

      activatePhoneOtpTestSession(phone);
      sessionStorage.setItem('isNewSignup', 'true');
      const { mockUser, mockSession } = createPhoneTestAuth(phone);
      setSession(mockSession);
      setUser(mockUser);
      setRole('owner');
      setIsNewSignup(true);
      return { data: { user: mockUser, session: mockSession }, error: null } as AuthResponse;
    }

    const response = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });

    if (!response.error && response.data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: response.data.user.id,
            phone,
            is_new_signup: true,
          },
          { onConflict: 'user_id' },
        );

      if (profileError) {
        console.error('[Auth] Failed to save phone profile:', profileError.message);
      }
    }

    return response;
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem("hasCompletedOnboarding");
    sessionStorage.removeItem('isNewSignup');
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true') {
      sessionStorage.setItem(DEV_MOCK_SIGNED_OUT_KEY, 'true');
    }
    const wasPhoneTestSession = Boolean(getPhoneOtpTestSession());
    clearPhoneOtpTestMode();

    // Clear the in-memory session immediately so the onboarding route cannot
    // redirect back to the dashboard while Supabase finishes signing out.
    setSession(null);
    setUser(null);
    setRole(null);
    setIsNewSignup(false);

    if (wasPhoneTestSession) {
      return { error: null };
    }
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
    isOwner: role === 'owner' || role === 'admin',
    signIn,
    signUp,
    signInWithGoogle,
    requestPhoneOtp,
    verifyPhoneOtp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Return a safe default during initial render before provider mounts
    const notReady = () => new Error('Auth not ready') as AuthError;
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
      signIn: async () => ({ error: notReady() }),
      signUp: async () => ({ data: { user: null, session: null }, error: notReady() }),
      signInWithGoogle: async () => ({ error: notReady() }),
      requestPhoneOtp: async () => ({ error: notReady() }),
      verifyPhoneOtp: async () => ({ data: { user: null, session: null }, error: notReady() }),
      signOut: async () => ({ error: notReady() }),
    };
  }
  return ctx;
};
