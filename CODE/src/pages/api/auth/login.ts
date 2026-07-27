import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL;

// Redirect back to /login with a fixed error CODE (never raw error text, so
// nothing internal leaks and no attacker-controlled string is reflected).
const fail = (context: Parameters<APIRoute>[0], code: string) =>
  context.redirect(`/login?error=${code}`);

// Email + password sign-in. The admin user (with a password) must exist in
// Supabase Auth; middleware still enforces user.email === ADMIN_EMAIL. On
// success the SSR client writes the session cookies onto this redirect.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return fail(context, 'missing');

  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth] signInWithPassword failed:', error.message);
    return fail(context, 'credentials');
  }

  // Signed in OK, but middleware only lets ADMIN_EMAIL into /admin. Reject here
  // (and drop the session) instead of silently bouncing back to /login.
  if (ADMIN_EMAIL && data.user?.email !== ADMIN_EMAIL) {
    console.warn('[auth] non-admin sign-in blocked:', data.user?.email);
    await supabase.auth.signOut();
    return fail(context, 'notadmin');
  }
  return context.redirect('/admin');
};
