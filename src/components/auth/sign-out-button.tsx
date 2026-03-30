"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearMetaReportsSessionCache } from "@/components/dashboard/meta-reports-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
  title?: string;
};

export function SignOutButton({ className, compact = false, title }: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();

    clearMetaReportsSessionCache();

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
      className={[
        "inline-flex items-center gap-2 border border-gray-200 bg-white text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand",
        compact ? "h-10 w-10 justify-center rounded-2xl px-0 py-0" : "rounded-lg px-3 py-2",
        className ?? "",
      ].join(" ")}
      onClick={handleSignOut}
      title={title}
      type="button"
    >
      <LogOut className="h-4 w-4" />
      {compact ? <span className="sr-only">{isLoading ? "Saindo..." : "Sair"}</span> : isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}
