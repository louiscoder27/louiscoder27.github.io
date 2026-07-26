import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase';

const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL;

// Anything under these prefixes requires a logged-in admin.
function isProtected(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/api/posts' ||
    pathname === '/api/upload'
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  context.locals.user = null;
  context.locals.supabase = null;

  if (!isProtected(path)) return next();

  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = !!user && (!ADMIN_EMAIL || user.email === ADMIN_EMAIL);
  if (!allowed) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/login');
  }

  context.locals.user = user;
  context.locals.supabase = supabase;
  return next();
});
