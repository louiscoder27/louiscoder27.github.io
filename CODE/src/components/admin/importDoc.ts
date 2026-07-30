// Converts an uploaded Markdown / Word (.docx) / PDF file into HTML that the
// BlockNote editor can parse with `tryParseHTMLToBlocks`, so an admin can pull
// an existing document straight into the editor. Heavy parsers (mammoth for
// docx, pdf.js for pdf) are dynamically imported so they only load when a file
// of that type is actually chosen.

export interface ImportResult {
  html: string;
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

// Escape text so it can be dropped into HTML safely.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function markdownToHtml(file: File): Promise<string> {
  const text = await file.text();
  const { marked } = await import('marked');
  return marked.parse(text, { async: false }) as string;
}

async function docxToHtml(file: File): Promise<string> {
  const mammoth = (await import('mammoth')).default ?? (await import('mammoth'));
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as any).convertToHtml({ arrayBuffer });
  return result.value as string;
}

async function pdfToHtml(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist');
  // Bundled worker URL (Vite resolves `?url` to the emitted asset path).
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url'))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const paragraphs: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Rebuild lines from text items: pdf.js flags the last item on a line with
    // `hasEOL`, and larger vertical gaps start a new paragraph.
    let line = '';
    let lastY: number | null = null;
    const lines: string[] = [];
    for (const item of content.items as any[]) {
      if (!('str' in item)) continue;
      const y = item.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && line) {
        lines.push(line.trim());
        line = '';
      }
      line += item.str;
      if (item.hasEOL) line += ' ';
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    // Group consecutive non-empty lines into paragraphs.
    let buf: string[] = [];
    const flush = () => {
      if (buf.length) {
        paragraphs.push(`<p>${esc(buf.join(' '))}</p>`);
        buf = [];
      }
    };
    for (const l of lines) {
      if (l) buf.push(l);
      else flush();
    }
    flush();
  }

  return paragraphs.join('\n') || '<p></p>';
}

// Turn a chosen file into HTML. Throws with a friendly message for unsupported
// types (notably the legacy binary .doc, which needs re-saving as .docx).
export async function fileToHtml(file: File): Promise<ImportResult> {
  const ext = extOf(file.name);
  let html: string;
  switch (ext) {
    case 'md':
    case 'markdown':
    case 'txt':
      html = await markdownToHtml(file);
      break;
    case 'docx':
      html = await docxToHtml(file);
      break;
    case 'doc':
      throw new Error(
        'File .doc (Word cũ) không đọc được trực tiếp. Hãy mở trong Word và “Save As” lại thành .docx rồi nhập.',
      );
    case 'pdf':
      html = await pdfToHtml(file);
      break;
    default:
      throw new Error(`Định dạng .${ext || '?'} chưa được hỗ trợ (dùng .md, .docx, .pdf).`);
  }
  return { html };
}
