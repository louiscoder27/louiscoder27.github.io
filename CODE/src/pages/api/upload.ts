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

  // Defence-in-depth (route is admin-only, but the bucket is public): allow only
  // raster images — no SVG (can carry script) — and cap the size.
  const ALLOWED = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
  ]);
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (!ALLOWED.has(file.type)) {
    return new Response(JSON.stringify({ error: 'Only PNG/JPEG/GIF/WebP/AVIF images are allowed' }), { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'Image is too large (max 10 MB)' }), { status: 413 });
  }

  // Build the key from a random UUID + a sanitised extension so nothing from the
  // client filename can shape the storage path.
  const ext =
    (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
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
