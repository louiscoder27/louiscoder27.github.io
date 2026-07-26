import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer({
    headers: context.request.headers,
    cookies: context.cookies,
  });
  await supabase.auth.signOut();
  return context.redirect('/login');
};
