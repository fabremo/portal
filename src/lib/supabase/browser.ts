"use client";

import { createBrowserClient } from "@supabase/ssr";

import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "./env";

export function createBrowserSupabaseClient() {
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

