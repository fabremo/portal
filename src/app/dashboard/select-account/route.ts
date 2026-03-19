import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACTIVE_AD_ACCOUNT_COOKIE_NAME,
  getDashboardAccessContext,
} from "@/lib/dashboard/access";

export async function POST(request: Request) {
  const formData = await request.formData();
  const adAccountId = formData.get("adAccountId");
  const redirectTo = formData.get("redirectTo");
  const accessContext = await getDashboardAccessContext();

  const referer = (await headers()).get("referer");
  const fallbackUrl = new URL("/dashboard", request.url);
  const nextUrl =
    typeof redirectTo === "string" && redirectTo.startsWith("/dashboard")
      ? new URL(redirectTo, request.url)
      : referer
        ? new URL(referer)
        : fallbackUrl;

  if (!accessContext || typeof adAccountId !== "string") {
    return NextResponse.redirect(nextUrl);
  }

  const isAllowedAccount = accessContext.accessibleAccounts.some((account) => account.id === adAccountId);

  if (!isAllowedAccount) {
    return NextResponse.redirect(nextUrl);
  }

  const cookieStore = await cookies();
  cookieStore.set({
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    name: ACTIVE_AD_ACCOUNT_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    value: adAccountId,
  });

  return NextResponse.redirect(nextUrl);
}
