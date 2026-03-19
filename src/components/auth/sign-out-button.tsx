"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand"
      onClick={handleSignOut}
      type="button"
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}

