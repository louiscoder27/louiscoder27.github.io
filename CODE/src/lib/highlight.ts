import { codeToHtml } from 'shiki';

// The BlockNote editor stores code blocks as plain text — `<pre><code
// class="language-xxx">line<br>line</code></pre>` — with the syntax colours
// coming from the editor's own highlighter, which the public reader never runs.
// We re-highlight each code block server-side with Shiki so the reading page
// shows the same coloured tokens. Dual light/dark themes are emitted as CSS
// variables (see the `.shiki` rules in global.css) so the page's theme toggle
// switches them without a re-render.

const CODE_BLOCK = /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g;

// Turn the stored inline HTML back into raw source: <br> → newline, and undo the
// entity escaping BlockNote applied (Shiki re-escapes on output).
function decode(inner: string): string {
  return inner
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, '&'); // must be last
}

function langFrom(attrs: string): string {
  const m = attrs.match(/language-([a-z0-9+#.-]+)/i);
  return m ? m[1].toLowerCase() : 'text';
}

const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

// Highlight every fenced code block in an HTML string. Fails soft: any block (or
// the whole pass) that errors is left exactly as it was.
export async function highlightCodeBlocks(html: string): Promise<string> {
  if (!html || !html.includes('<pre>')) return html;
  try {
    let result = '';
    let lastIndex = 0;
    for (const m of html.matchAll(CODE_BLOCK)) {
      const [full, attrs, inner] = m;
      const code = decode(inner);
      const lang = langFrom(attrs);
      let highlighted: string;
      try {
        highlighted = await codeToHtml(code, { lang, themes: THEMES });
      } catch {
        // Unknown/unsupported language → render as plain text, still themed.
        highlighted = await codeToHtml(code, { lang: 'text', themes: THEMES });
      }
      result += html.slice(lastIndex, m.index) + highlighted;
      lastIndex = (m.index ?? 0) + full.length;
    }
    return result + html.slice(lastIndex);
  } catch {
    return html;
  }
}
