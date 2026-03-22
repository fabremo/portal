import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACTIVE_AD_ACCOUNT_COOKIE_NAME,
  getDashboardAccessContext,
} from "@/lib/dashboard/access";

function resolveSafeRedirectTarget(
  request: Request,
  redirectTo: FormDataEntryValue | null,
  referer: string | null
) {
  const fallbackUrl = new URL("/dashboard", request.url);

  if (typeof redirectTo === "string" && redirectTo.startsWith("/dashboard")) {
    return new URL(redirectTo, request.url);
  }

  if (!referer) {
    return fallbackUrl;
  }

  try {
    const refererUrl = new URL(referer);
    const requestUrl = new URL(request.url);

    if (refererUrl.origin === requestUrl.origin && refererUrl.pathname.startsWith("/dashboard")) {
      return refererUrl;
    }
  } catch {
    return fallbackUrl;
  }

  return fallbackUrl;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const adAccountId = formData.get("adAccountId");
  const redirectTo = formData.get("redirectTo");
  const accessContext = await getDashboardAccessContext();

  const referer = (await headers()).get("referer");
  const nextUrl = resolveSafeRedirectTarget(request, redirectTo, referer);

  if (!accessContext || typeof adAccountId !== "string") {
    return NextResponse.redirect(nextUrl, { status: 303 });
  }

  const isAllowedAccount = accessContext.accessibleAccounts.some((account) => account.id === adAccountId);

  if (!isAllowedAccount) {
    return NextResponse.redirect(nextUrl, { status: 303 });
  }

  const cookieStore = await cookies();
  cookieStore.set({
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    name: ACTIVE_AD_ACCOUNT_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: adAccountId,
  });

  return NextResponse.redirect(nextUrl, { status: 303 });
}
