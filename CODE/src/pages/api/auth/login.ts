import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

// Send a magic-link email. Signups are disabled in Supabase, so only the
// pre-added admin address actually receives a working link.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  if (!email) return context.redirect('/login?error=1');

  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  const origin = new URL(context.request.url).origin;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/api/auth/callback` },
  });

  if (error) {
    console.error('[auth] signInWithOtp failed:', error.message);
    return context.redirect('/login?error=1');
  }
  return context.redirect('/login?sent=1');
};
