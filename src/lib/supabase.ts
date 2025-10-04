import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create the client if environment variables are present
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            cache: "no-store",
          });
        },
      },
    })
  : null;

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = !!supabase;
