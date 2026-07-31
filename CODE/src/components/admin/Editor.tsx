import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import 'katex/dist/katex.min.css';
import './editor.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { PartialBlock } from '@blocknote/core';
import renderMathInElement from 'katex/contrib/auto-render';
import { useEffect, useRef, useState } from 'react';
import { fileToHtml } from './importDoc';

// Render $…$ / $$…$$ LaTeX inside an element — shared delimiter config so the
// editor preview matches exactly what the reader page produces.
function typesetMath(el: HTMLElement) {
  renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
}

export interface EditorPost {
  id: string | null; // null => new post
  slug: string;
  title: string;
  description: string;
  category: string;
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

// Read a response as JSON, but fall back to text so a non-JSON error page (a
// 404/500 HTML page from Vercel/Astro) surfaces a useful message instead of a
// cryptic "Unexpected token ... is not valid JSON" crash.
async function readResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `${res.status} ${res.statusText} — ${text.replace(/<[^>]*>/g, ' ').trim().slice(0, 140)}`,
    };
  }
}

// Upload an embedded image to Supabase storage via our API, return its URL.
async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await readResponse(res);
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url as string;
}

export default function Editor({ post, categories }: Props) {
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugTouched, setSlugTouched] = useState(!!post.id);
  const [description, setDescription] = useState(post.description);
  const [category, setCategory] = useState(post.category || categories[0]);
  const [published, setPublished] = useState(post.published);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Live math preview: renders the current document (with KaTeX) so the author
  // can check formulas without leaving the editor.
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Keep the editor's light/dark theme in sync with the page toggle.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () =>
      setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    read();
    const onThemeChange = (e: Event) =>
      setDark(!!(e as CustomEvent).detail?.dark);
    document.addEventListener('themechange', onThemeChange);
    return () => document.removeEventListener('themechange', onThemeChange);
  }, []);

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

  // Recompute the preview HTML from the current document (same lossy HTML the
  // reader gets), so what you see previewed is what gets published.
  async function refreshPreview() {
    try {
      setPreviewHtml(await editor.blocksToHTMLLossy(editor.document));
    } catch {
      setPreviewHtml('');
    }
  }

  // When the preview is open, keep it in sync with edits + typeset the math.
  useEffect(() => {
    if (showPreview) refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);

  useEffect(() => {
    if (showPreview && previewRef.current) typesetMath(previewRef.current);
  }, [previewHtml, showPreview]);

  // Auto-fill the slug from the title until the user edits it by hand.
  function onTitle(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  // True when the document is just the empty starter paragraph, so importing
  // can safely replace it rather than appending.
  function docIsEmpty(): boolean {
    const doc = editor.document;
    if (doc.length === 0) return true;
    if (doc.length > 1) return false;
    const only: any = doc[0];
    const content = only?.content;
    if (!Array.isArray(content)) return true;
    return content.every((c: any) => !c?.text || !c.text.trim());
  }

  // Import an existing .md / .docx / .pdf file straight into the editor.
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!docIsEmpty() && !confirm('Nội dung nhập vào sẽ được chèn tiếp vào cuối bài. Tiếp tục?')) {
      return;
    }
    setImporting(true);
    setStatus(`Đang nhập ${file.name}…`);
    try {
      const { html } = await fileToHtml(file);
      const blocks = await editor.tryParseHTMLToBlocks(html);
      if (!blocks.length) {
        setStatus('Không đọc được nội dung từ file.');
        return;
      }
      if (docIsEmpty()) {
        editor.replaceBlocks(editor.document, blocks);
      } else {
        const last = editor.document[editor.document.length - 1];
        editor.insertBlocks(blocks, last, 'after');
      }
      // Fill an empty title from the file name (minus extension).
      if (!title.trim()) {
        const base = file.name.replace(/\.[^.]+$/, '');
        onTitle(base);
      }
      setStatus('Đã nhập ✓');
    } catch (err: any) {
      setStatus('Lỗi nhập file: ' + (err?.message || 'không rõ'));
    } finally {
      setImporting(false);
    }
  }

  async function save(nextPublished?: boolean) {
    if (!title.trim()) {
      setStatus('Please add a title first.');
      return;
    }
    setSaving(true);
    setStatus('Saving…');
    const publishedValue = nextPublished ?? published;
    // Export CLEAN, semantic HTML (<ul>/<ol>/<li>, <h1>, <span data-text-color>)
    // rather than blocksToFullHTML's editor-only <div class="bn-block…"> markup.
    // The full-HTML variant only looks right with BlockNote's own stylesheet
    // loaded; the public reader uses the site's .prose theme instead, so lists,
    // colours and headings would otherwise collapse to plain text there.
    let html = '';
    try {
      html = await editor.blocksToHTMLLossy(editor.document);
    } catch {
      html = '';
    }
    const payload = {
      id: post.id ?? undefined,
      slug: slug || slugify(title),
      title,
      description,
      category,
      published: publishedValue,
      body_json: editor.document,
      body_html: html,
    };
    const res = await fetch('/api/posts', {
      method: post.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readResponse(res);
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
      <div className="ed__import">
        <input
          ref={importInputRef}
          type="file"
          accept=".md,.markdown,.txt,.docx,.pdf"
          style={{ display: 'none' }}
          onChange={onImportFile}
        />
        <button
          className="ed__btn"
          type="button"
          disabled={importing}
          onClick={() => importInputRef.current?.click()}
        >
          {importing ? 'Đang nhập…' : 'Import'}
        </button>
      </div>

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
        <BlockNoteView
          editor={editor}
          theme={dark ? 'dark' : 'light'}
          onChange={() => {
            if (showPreview) refreshPreview();
          }}
        />
      </div>

      {showPreview && (
        <div className="ed__preview">
          <div className="ed__preview-label">Xem trước</div>
          <div
            ref={previewRef}
            className="prose"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

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
            className={`ed__btn${showPreview ? ' ed__btn--primary' : ''}`}
            type="button"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
          </button>
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
