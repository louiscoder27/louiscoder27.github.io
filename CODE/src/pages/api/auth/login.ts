import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

// Email + password sign-in. The admin user (with a password) must exist in
// Supabase Auth; middleware still enforces user.email === ADMIN_EMAIL. On
// success the SSR client writes the session cookies onto this redirect.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return context.redirect('/login?error=1');

  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth] signInWithPassword failed:', error.message);
    return context.redirect('/login?error=1');
  }
  return context.redirect('/admin');
};
