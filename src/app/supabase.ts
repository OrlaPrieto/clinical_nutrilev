import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjkqyqwhmqqtrknxxryk.supabase.co';
const supabaseAnonKey = 'sb_publishable_vb_QCq6e74XxWRwtsyLEgA__qnd93_j';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
