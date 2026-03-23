import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

const supabaseUrl = environment.supabaseUrl;
const supabaseKey = environment.supabaseKey;

export const supabase = createClient(supabaseUrl, supabaseKey);
