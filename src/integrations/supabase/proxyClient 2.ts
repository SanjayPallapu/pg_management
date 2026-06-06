import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Temporarily using direct Supabase URL while proxy is down
// To restore proxy, change SUPABASE_URL back to 'https://pg-management.jiobase.com'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mbawqixtfxfjrliudbwy.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error('[ProxyClient] Missing anon key');
}

export const supabase = createClient<Database>(SUPABASE_URL, ANON_KEY!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
