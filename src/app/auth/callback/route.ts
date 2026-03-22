import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const PASSWORD_FLOW_TYPES = new Set<EmailOtpType>(["invite", "recovery"]);

function resolveSafeNextPath(rawNext: string | null, fallbackPath: string) {
  if (typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    return rawNext;
  }

  return fallbackPath;
}

function buildLoginErrorUrl(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("skipRedirect", "1");
  loginUrl.searchParams.set("authError", "invalid_or_expired");
  return loginUrl;
}

function buildSuccessRedirectPath(type: EmailOtpType | null, rawNext: string | null) {
  if (type && PASSWORD_FLOW_TYPES.has(type)) {
    return resolveSafeNextPath(rawNext, `/login/atualizar-senha?flow=${type}`);
  }

  return resolveSafeNextPath(rawNext, "/dashboard");
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(buildLoginErrorUrl(request));
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const redirectPath = buildSuccessRedirectPath(type, next);

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return NextResponse.redirect(buildLoginErrorUrl(request));
}
