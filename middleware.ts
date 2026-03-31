import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAuthCookie = hasSupabaseAuthCookie(request.cookies.getAll());

  if (!hasAuthCookie && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
