import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The client is intentionally optional while the pilot still runs in local mode.
// It becomes available automatically after Vercel/Supabase environment variables are set.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isCloudConfigured = Boolean(supabase);
