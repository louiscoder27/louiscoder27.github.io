import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL;

// Redirect back to /login with a human-readable reason so the exact failure is
// visible on the page (temporary diagnostic aid).
const fail = (context: Parameters<APIRoute>[0], reason: string) =>
  context.redirect(`/login?error=${encodeURIComponent(reason)}`);

// Email + password sign-in. The admin user (with a password) must exist in
// Supabase Auth; middleware still enforces user.email === ADMIN_EMAIL. On
// success the SSR client writes the session cookies onto this redirect.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return fail(context, 'Enter both email and password.');

  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth] signInWithPassword failed:', error.message);
    return fail(context, error.message);
  }

  // Signed in OK, but middleware only lets ADMIN_EMAIL into /admin — surface that
  // mismatch here instead of silently bouncing back to /login.
  if (ADMIN_EMAIL && data.user?.email !== ADMIN_EMAIL) {
    return fail(
      context,
      `Signed in as ${data.user?.email}, but ADMIN_EMAIL on Vercel is set to a different address.`,
    );
  }
  return context.redirect('/admin');
};
