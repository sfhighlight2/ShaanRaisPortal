import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        // Abort any Supabase request that takes longer than 15 seconds to
        // prevent the UI from hanging indefinitely on slow/dropped connections.
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15_000);
          return fetch(url, { ...options, signal: controller.signal }).finally(
            () => clearTimeout(timeout)
          );
        },
      },
    })
  : (null as unknown as SupabaseClient);
