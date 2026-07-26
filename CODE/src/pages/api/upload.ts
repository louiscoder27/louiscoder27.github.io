import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Receives a file from the BlockNote editor, stores it in the public
// `post-assets` bucket, and returns its public URL to embed in the post.
export const POST: APIRoute = async (context) => {
  const supabase =
    context.locals.supabase ??
    createSupabaseServer({
      headers: context.request.headers,
      cookies: context.cookies,
    });

  const form = await context.request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('post-assets')
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  const { data } = supabase.storage.from('post-assets').getPublicUrl(path);
  return new Response(JSON.stringify({ url: data.publicUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
