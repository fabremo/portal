import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "./env";

export async function createServerSupabaseClient() {
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies during render, but writes are optional here.
        }
      },
    },
  });
}

