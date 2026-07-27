import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { CATEGORIES } from '../../lib/categories';

export const prerender = false;

// The middleware guarantees an authenticated admin reached here, and it stashes
// a session-bound client on locals. Fall back to building one from cookies.
function client(context: Parameters<APIRoute>[0]) {
  return (
    context.locals.supabase ??
    createSupabaseServer({
      headers: context.request.headers,
      cookies: context.cookies,
    })
  );
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Whitelist + normalise the writable fields shared by create and update.
function normalise(body: Record<string, any>) {
  const title = String(body.title ?? '').trim();
  const category = CATEGORIES.includes(body.category)
    ? body.category
    : CATEGORIES[0];
  const slug = slugify(String(body.slug || title));
  return {
    fields: {
      slug,
      title,
      description: String(body.description ?? '').trim(),
      category,
      published: Boolean(body.published),
      body_json: body.body_json ?? null,
      body_html: String(body.body_html ?? ''),
      pub_date: body.pub_date ? new Date(body.pub_date).toISOString() : undefined,
    },
    title,
    slug,
  };
}

// Create
export const POST: APIRoute = async (context) => {
  const body = await context.request.json();
  const { fields, title, slug } = normalise(body);
  if (!title || !slug) return json({ error: 'Title is required' }, 400);

  const supabase = client(context);
  const insert = { ...fields, pub_date: fields.pub_date ?? new Date().toISOString() };
  const { data, error } = await supabase
    .from('posts')
    .insert(insert)
    .select('id, slug')
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ post: data });
};

// Full update
export const PUT: APIRoute = async (context) => {
  const body = await context.request.json();
  const id = String(body.id ?? '');
  if (!id) return json({ error: 'Missing id' }, 400);
  const { fields, title, slug } = normalise(body);
  if (!title || !slug) return json({ error: 'Title is required' }, 400);

  const supabase = client(context);
  const update = { ...fields, updated_date: new Date().toISOString() };
  if (update.pub_date === undefined) delete (update as any).pub_date;
  const { data, error } = await supabase
    .from('posts')
    .update(update)
    .eq('id', id)
    .select('id, slug')
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ post: data });
};

// Toggle published (used by dashboard)
export const PATCH: APIRoute = async (context) => {
  const body = await context.request.json();
  const id = String(body.id ?? '');
  if (!id) return json({ error: 'Missing id' }, 400);
  const supabase = client(context);
  const { error } = await supabase
    .from('posts')
    .update({ published: Boolean(body.published) })
    .eq('id', id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
};

// Delete
export const DELETE: APIRoute = async (context) => {
  const id =
    context.url.searchParams.get('id') ??
    (await context.request.json().catch(() => ({}))).id;
  if (!id) return json({ error: 'Missing id' }, 400);
  const supabase = client(context);
  const { error } = await supabase.from('posts').delete().eq('id', String(id));
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
};
