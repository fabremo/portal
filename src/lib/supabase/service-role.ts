import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./env";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasServiceRoleSupabaseEnv = Boolean(supabaseUrl && supabaseServiceRoleKey);

export function createServiceRoleSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
