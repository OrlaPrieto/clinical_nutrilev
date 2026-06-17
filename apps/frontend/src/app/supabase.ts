import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

const supabaseUrl = environment.supabaseUrl;
const supabaseKey = environment.supabaseKey;

// Capturar el hash o query string de recuperación antes de que el cliente de Supabase lo limpie de la URL
if (typeof window !== 'undefined') {
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const href = window.location.href || '';
  if (search.includes('recovery=true') || search.includes('recovery') || hash.includes('type=recovery') || href.includes('type=recovery') || hash.includes('recovery')) {
    console.log('Supabase: Recovery token captured synchronously before client creation.');
    (window as any).__supabase_recovery_mode = true;
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    lock: (name, acquireTimeout, fn) => fn()
  }
});
