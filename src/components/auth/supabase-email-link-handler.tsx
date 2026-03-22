"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { clearMetaReportsSessionCache } from "@/components/dashboard/meta-reports-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const PASSWORD_LINK_TYPES = new Set(["invite", "recovery"] as const);

type PasswordLinkType = "invite" | "recovery";

function buildLoginErrorPath() {
  return "/login?skipRedirect=1&authError=invalid_or_expired";
}

export function SupabaseEmailLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const errorCode = params.get("error_code") || params.get("error");

    if (errorCode) {
      router.replace(buildLoginErrorPath());
      return;
    }

    if (!accessToken || !refreshToken || !type || !PASSWORD_LINK_TYPES.has(type as PasswordLinkType)) {
      return;
    }

    const flowType = type as PasswordLinkType;
    const nextAccessToken = accessToken;
    const nextRefreshToken = refreshToken;
    const supabaseClient = createBrowserSupabaseClient();

    if (!supabaseClient) {
      router.replace(buildLoginErrorPath());
      return;
    }

    const client = supabaseClient;
    let isCancelled = false;

    async function consumeEmailLink() {
      clearMetaReportsSessionCache();

      const { error } = await client.auth.setSession({
        access_token: nextAccessToken,
        refresh_token: nextRefreshToken,
      });

      if (isCancelled) {
        return;
      }

      if (error) {
        router.replace(buildLoginErrorPath());
        return;
      }

      router.replace(`/login/atualizar-senha?flow=${flowType}`);
    }

    void consumeEmailLink();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return null;
}
