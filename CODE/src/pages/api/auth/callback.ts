import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

// The magic link lands here with `?code=...`. Exchange it for a session; the
// SSR client writes the auth cookies, then we send the admin to the dashboard.
export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get('code');
  if (!code) return context.redirect('/login?error=1');

  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth] exchangeCodeForSession failed:', error.message);
    return context.redirect('/login?error=1');
  }
  return context.redirect('/admin');
};
