// Build a table of contents from rendered post HTML and give every heading a
// stable anchor id, so the floating TOC on the reading page can jump to a
// section and so any heading can be deep-linked (copy-link) from another post.
//
// Runs server-side in blog/[...slug].astro, after code highlighting, so the ids
// are present in the delivered HTML — deep links resolve on first load with no
// JS, and the TOC list is derived from real content.

export interface TocEntry {
  level: number; // 1..6
  id: string;
  text: string;
}

const HEADING = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g;
const HAS_ID = /\sid\s*=\s*["'][^"']*["']/i;
const EXISTING_ID = /\sid\s*=\s*["']([^"']*)["']/i;

// Strip tags and decode the few entities BlockNote/Shiki emit, so the TOC label
// and the slug are built from plain text.
function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ASCII, url-safe slug (diacritics folded) so deep links stay clean and stable.
function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Inject unique ids on every heading and return the augmented HTML plus the TOC.
export function buildToc(html: string): { html: string; toc: TocEntry[] } {
  if (!html || !/<h[1-6][\s>]/i.test(html)) return { html, toc: [] };

  const toc: TocEntry[] = [];
  const used = new Set<string>();

  const out = html.replace(HEADING, (full, level, attrs, inner) => {
    const text = plainText(inner);
    if (!text) return full; // skip empty headings

    // Honour an id the editor already set; otherwise derive one from the text.
    let id: string;
    const existing = attrs.match(EXISTING_ID);
    if (existing && existing[1]) {
      id = existing[1];
    } else {
      id = slugify(text) || 'section';
    }

    // Guarantee uniqueness within the page (heading-2, heading-3, …).
    let unique = id;
    let n = 2;
    while (used.has(unique)) unique = `${id}-${n++}`;
    used.add(unique);

    toc.push({ level: Number(level), id: unique, text });

    const newAttrs = HAS_ID.test(attrs)
      ? attrs.replace(EXISTING_ID, ` id="${unique}"`)
      : `${attrs} id="${unique}"`;
    return `<h${level}${newAttrs}>${inner}</h${level}>`;
  });

  return { html: out, toc };
}
