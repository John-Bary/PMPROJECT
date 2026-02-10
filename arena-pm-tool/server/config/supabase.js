// Supabase Client Configuration (Server-Side)
// This module provides both anon and service role clients for different use cases

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const logger = require('../lib/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
const validateConfig = () => {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    logger.warn(`Supabase config incomplete. Missing: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

// Create the anon client (for operations that respect RLS)
// Use this for user-scoped operations where RLS policies apply
let supabaseAnon = null;
if (supabaseUrl && supabaseAnonKey) {
  supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Create the service role client (for admin operations that bypass RLS)
// IMPORTANT: Never expose this client or its key to the browser
// Use this for server-side admin operations only
let supabaseAdmin = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Helper to check if admin client is available
const isAdminConfigured = () => {
  return !!(supabaseUrl && supabaseServiceKey);
};

// Log configuration status on startup
if (process.env.NODE_ENV !== 'test') {
  if (isSupabaseConfigured()) {
    logger.info('Supabase client configured');
    if (isAdminConfigured()) {
      logger.info('Supabase admin client configured (service role)');
    } else {
      logger.warn('Supabase admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing)');
    }
  } else {
    logger.info('Supabase not configured - using PostgreSQL directly');
  }
}

module.exports = {
  supabase: supabaseAnon,
  supabaseAdmin,
  isSupabaseConfigured,
  isAdminConfigured,
  validateConfig,
};
