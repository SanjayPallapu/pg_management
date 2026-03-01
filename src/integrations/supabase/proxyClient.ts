import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// JioBase proxy URL — routes through Cloudflare to avoid ISP DNS issues
const PROXY_URL = 'https://pg-management.jiobase.com';
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error('[ProxyClient] Missing anon key');
}

export const supabase = createClient<Database>(PROXY_URL, ANON_KEY!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
