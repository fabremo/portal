const SUPABASE_AUTH_COOKIE_MARKER = "-auth-token";
const SUPABASE_AUTH_COOKIE_PREFIX = "sb-";

type CookieLike = {
  name: string;
};

export function hasSupabaseAuthCookie(cookies: CookieLike[]) {
  return cookies.some(
    ({ name }) =>
      name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) && name.includes(SUPABASE_AUTH_COOKIE_MARKER)
  );
}
