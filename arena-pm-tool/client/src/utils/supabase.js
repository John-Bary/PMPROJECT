// Supabase Client Configuration (Client-Side)
// This module provides a browser-safe Supabase client using the anon key
// NEVER include service role key in client-side code

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create client only if configured
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Log configuration status in development
if (process.env.NODE_ENV === 'development') {
  if (isSupabaseConfigured()) {
    console.log('Supabase client configured');
  } else {
    console.log('Supabase not configured - using REST API only');
  }
}

export default supabase;
