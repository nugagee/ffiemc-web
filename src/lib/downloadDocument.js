/** Build and download a utility document in a chosen format. */

export const DOCUMENT_FORMATS = [
  { id: "txt", label: "Plain text (.txt)", hint: "Opens anywhere" },
  { id: "md", label: "Markdown (.md)", hint: "Notes apps, GitHub" },
  { id: "html", label: "Web page (.html)", hint: "Browser" },
  { id: "doc", label: "Microsoft Word (.doc)", hint: "Word, Google Docs" },
  { id: "rtf", label: "Rich text (.rtf)", hint: "Word, Pages" },
  { id: "pdf", label: "PDF (print / save)", hint: "Use Save as PDF in the print dialog" },
];

export function slugFilename(title, fallback = "document") {
  const base = String(title || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || fallback;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeDoc(doc) {
  const title = (doc?.title || "Untitled").trim() || "Untitled";
  const meta = (doc?.meta || "").trim();
  const sections = Array.isArray(doc?.sections) && doc.sections.length
    ? doc.sections.map((s) => ({
      heading: (s.heading || "").trim(),
      body: String(s.body ?? ""),
    }))
    : [{ heading: "", body: String(doc?.body ?? "") }];
  return { title, meta, sections };
}

function asPlainText({ title, meta, sections }) {
  const parts = [title];
  if (meta) parts.push(meta, "");
  else parts.push("");
  sections.forEach((s) => {
    if (s.heading) parts.push(s.heading, "");
    parts.push(s.body.trimEnd(), "");
  });
  return parts.join("\n").trimEnd() + "\n";
}

function asMarkdown({ title, meta, sections }) {
  const parts = [`# ${title}`];
  if (meta) parts.push(`*${meta}*`, "");
  else parts.push("");
  sections.forEach((s) => {
    if (s.heading) parts.push(`## ${s.heading}`, "");
    parts.push(s.body.trimEnd(), "");
  });
  return parts.join("\n").trimEnd() + "\n";
}

function asHtml({ title, meta, sections }, forWord = false) {
  const body = sections
    .map((s) => {
      const h = s.heading ? `<h2>${escapeHtml(s.heading)}</h2>` : "";
      const p = `<div style="white-space:pre-wrap;font-family:Calibri,Georgia,serif;font-size:12pt;line-height:1.5">${escapeHtml(s.body)}</div>`;
      return `${h}${p}`;
    })
    .join("");
  const office = forWord
    ? ` xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"`
    : "";
  return `<!DOCTYPE html>
<html${office}>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Calibri, Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; }
  h1 { font-size: 22pt; margin-bottom: 4px; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 24px; }
  h2 { font-size: 14pt; margin-top: 24px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
${body}
</body>
</html>`;
}

function rtfUnicode(text) {
  let out = "";
  for (const ch of String(text ?? "")) {
    const code = ch.codePointAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === "{") out += "\\{";
    else if (ch === "}") out += "\\}";
    else if (ch === "\n") out += "\\par\n";
    else if (ch === "\r") continue;
    else if (code > 127) {
      const u = code > 0xffff ? 0xfffd : code;
      const signed = u > 32767 ? u - 65536 : u;
      out += `\\u${signed}?`;
    } else out += ch;
  }
  return out;
}

function asRtf({ title, meta, sections }) {
  const bits = [`{\\b ${rtfUnicode(title)}}\\par\n`];
  if (meta) bits.push(`${rtfUnicode(meta)}\\par\\par\n`);
  else bits.push("\\par\n");
  sections.forEach((s) => {
    if (s.heading) bits.push(`{\\b ${rtfUnicode(s.heading)}}\\par\n`);
    bits.push(`${rtfUnicode(s.body)}\\par\\par\n`);
  });
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs24\n${bits.join("")}}`;
}

function triggerDownload(filename, mime, content, bom = false) {
  const parts = bom ? ["\uFEFF", content] : [content];
  const blob = new Blob(parts, { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printAsPdf(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html.replace(
    "</head>",
    `<style>@media print { body { margin: 16mm; } }</style></head>`
  ));
  doc.close();
  let printed = false;
  const run = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1500);
  };
  iframe.onload = run;
  setTimeout(run, 400);
}

/**
 * @param {object} doc { title, meta?, body? } or { title, meta?, sections: [{ heading, body }] }
 * @param {string} formatId txt | md | html | doc | rtf | pdf
 */
export function downloadDocument(doc, formatId = "txt") {
  const normalized = normalizeDoc(doc);
  const base = slugFilename(normalized.title);
  switch (formatId) {
    case "md":
      triggerDownload(`${base}.md`, "text/markdown;charset=utf-8", asMarkdown(normalized), true);
      return "md";
    case "html":
      triggerDownload(`${base}.html`, "text/html;charset=utf-8", asHtml(normalized), false);
      return "html";
    case "doc":
      triggerDownload(`${base}.doc`, "application/msword", asHtml(normalized, true), false);
      return "doc";
    case "rtf":
      triggerDownload(`${base}.rtf`, "application/rtf", asRtf(normalized), false);
      return "rtf";
    case "pdf":
      printAsPdf(asHtml(normalized));
      return "pdf";
    default:
      triggerDownload(`${base}.txt`, "text/plain;charset=utf-8", asPlainText(normalized), true);
      return "txt";
  }
}

export function noteToDocument(row) {
  return {
    title: row?.title || "Untitled",
    meta: [row?.kind, row?.entry_date].filter(Boolean).join(" · "),
    body: row?.body || "",
  };
}
