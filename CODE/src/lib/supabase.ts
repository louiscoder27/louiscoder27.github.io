import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a missing .env is obvious instead of a cryptic runtime crash.
  console.warn(
    '[supabase] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in.',
  );
}

/**
 * A stateless anon client for PUBLIC reads (home page, individual posts).
 * RLS makes the anon role see only `published = true` rows, so no session is
 * needed here.
 */
export function createSupabaseAnon() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A request-bound client that carries the logged-in admin's session via the
 * Astro cookies. Use in middleware, protected pages, and API routes so RLS
 * grants the `authenticated` role (read drafts, insert/update/delete).
 */
export function createSupabaseServer(context: {
  headers: Headers;
  cookies: AstroCookies;
}) {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get('Cookie') ?? '').map(
          (c) => ({ name: c.name, value: c.value ?? '' }),
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options),
        );
      },
    },
  });
}
