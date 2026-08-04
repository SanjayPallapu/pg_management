import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Support both Vite-style and Vercel/Supabase project variable names.
// Do not fall back to a different Supabase project: that makes valid users
// appear to have invalid credentials.
const SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('[ProxyClient] Missing Supabase public environment variables');
}

export const supabase = createClient<Database>(SUPABASE_URL, ANON_KEY!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
