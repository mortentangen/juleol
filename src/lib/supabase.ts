import { createClient } from '@supabase/supabase-js';
import { localSupabase } from './localSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Development data and identities stay in this browser, isolated from Supabase.
export const supabase = import.meta.env.DEV
    ? localSupabase
    : createClient(supabaseUrl || '', supabaseKey || '');
