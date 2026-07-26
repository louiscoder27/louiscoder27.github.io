import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import './editor.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { PartialBlock } from '@blocknote/core';
import { useEffect, useRef, useState } from 'react';

export interface EditorPost {
  id: string | null; // null => new post
  slug: string;
  title: string;
  description: string;
  category: string;
  reading_time: string;
  published: boolean;
  body_json: PartialBlock[] | null;
  body_html: string;
}

interface Props {
  post: EditorPost;
  categories: string[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Upload an embedded image to Supabase storage via our API, return its URL.
async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url as string;
}

export default function Editor({ post, categories }: Props) {
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugTouched, setSlugTouched] = useState(!!post.id);
  const [description, setDescription] = useState(post.description);
  const [category, setCategory] = useState(post.category || categories[0]);
  const [readingTime, setReadingTime] = useState(post.reading_time);
  const [published, setPublished] = useState(post.published);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const editor = useCreateBlockNote({
    initialContent:
      post.body_json && post.body_json.length ? post.body_json : undefined,
    uploadFile,
  });

  // Seeded posts carry only HTML — convert it to blocks once on mount.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if ((!post.body_json || !post.body_json.length) && post.body_html) {
      editor
        .tryParseHTMLToBlocks(post.body_html)
        .then((blocks) => editor.replaceBlocks(editor.document, blocks))
        .catch(() => {});
    }
  }, [editor, post.body_json, post.body_html]);

  // Auto-fill the slug from the title until the user edits it by hand.
  function onTitle(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function save(nextPublished?: boolean) {
    if (!title.trim()) {
      setStatus('Please add a title first.');
      return;
    }
    setSaving(true);
    setStatus('Saving…');
    const publishedValue = nextPublished ?? published;
    let html = '';
    try {
      html = await editor.blocksToFullHTML(editor.document);
    } catch {
      html = '';
    }
    const payload = {
      id: post.id ?? undefined,
      slug: slug || slugify(title),
      title,
      description,
      category,
      reading_time: readingTime,
      published: publishedValue,
      body_json: editor.document,
      body_html: html,
    };
    const res = await fetch('/api/posts', {
      method: post.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus('Error: ' + (data.error || 'save failed'));
      return;
    }
    setPublished(publishedValue);
    if (!post.id && data.post?.id) {
      // Move to the edit URL of the freshly created post.
      window.location.href = `/admin/edit/${data.post.id}`;
      return;
    }
    setStatus('Saved ✓');
  }

  return (
    <div className="ed">
      <div className="ed__meta">
        <label className="ed__field ed__field--wide">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Post title"
          />
        </label>

        <label className="ed__field">
          <span>Slug</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="url-slug"
          />
        </label>

        <label className="ed__field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="ed__field">
          <span>Reading time</span>
          <input
            value={readingTime}
            onChange={(e) => setReadingTime(e.target.value)}
            placeholder="5 min read"
          />
        </label>

        <label className="ed__field ed__field--wide">
          <span>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-line summary shown on cards and post header"
          />
        </label>
      </div>

      <div className="ed__editor">
        <BlockNoteView editor={editor} />
      </div>

      <div className="ed__bar">
        <label className="ed__pub">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span>Published</span>
        </label>
        <span className="ed__status">{status}</span>
        <div className="ed__actions">
          <button
            className="ed__btn"
            type="button"
            disabled={saving}
            onClick={() => save()}
          >
            Save
          </button>
          {!published && (
            <button
              className="ed__btn ed__btn--primary"
              type="button"
              disabled={saving}
              onClick={() => save(true)}
            >
              Save & publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
