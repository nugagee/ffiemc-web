// Daily Growth email body. No Deno, network, or database calls.
// Riddle answers are never interpolated. An image is optional and sits at the top.

export function safeGrowthImageUrl(value: string): string {
  const url = String(value || "").trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) return "";
  if (/\.(svg|html?|xhtml)($|\?)/i.test(url)) return "";
  return url;
}

/** Include the image only when a probe succeeded and the type is an image (or unknown). */
export function resolveGrowthEmailImage(input: {
  imageUrl?: string;
  probeOk: boolean;
  contentType?: string;
}): string {
  const url = safeGrowthImageUrl(input.imageUrl || "");
  if (!url || !input.probeOk) return "";
  const type = String(input.contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!type) return url;
  if (type.includes("svg") || type.includes("html") || type.includes("xml")) return "";
  if (!type.startsWith("image/")) return "";
  return url;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html = ""): string {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CAT_LABEL: Record<string, string> = {
  trait: "Character Trait",
  prophecy: "Prophecy",
  fact: "Bible Fact",
  riddle: "Bible Riddle",
};

export type DigestItem = {
  category?: string;
  title?: string;
  body?: string;
  scripture_ref?: string;
  answer?: string;
};

export function buildGrowthDigest(input: {
  items: DigestItem[];
  runDate: string;
  imageUrl?: string;
  blogLink: string;
}): { text: string; html: string } {
  const imageUrl = safeGrowthImageUrl(input.imageUrl || "");
  const lines: string[] = [`FFIEMC Daily Growth — ${input.runDate}`, ""];
  if (imageUrl) {
    lines.push(imageUrl, "");
  }
  lines.push(
    "Here is today's spiritual growth content. Read, meditate, and share with someone.",
    ""
  );
  const blocks: string[] = [];

  for (const item of input.items || []) {
    const cat = String(item.category || "");
    const label = CAT_LABEL[cat] || "Daily Growth";
    const title = String(item.title || "");
    const body = stripHtml(String(item.body || "")).slice(0, 280);
    const scripture = String(item.scripture_ref || "");
    lines.push(`• ${label}: ${title}`);
    if (body) lines.push(`  ${body}`);
    if (scripture) lines.push(`  Scripture: ${scripture}`);
    if (cat === "riddle") lines.push("  (Answer on the website)");
    lines.push("");

    blocks.push(`
      <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#b91c1c;font-weight:700">${label}</p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">${escapeHtml(title)}</p>
        <p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#374151">${escapeHtml(body)}</p>
        ${scripture ? `<p style="margin:0;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(scripture)}</p>` : ""}
        ${cat === "riddle" ? `<p style="margin:6px 0 0;font-size:12px;color:#9ca3af">Answer on the website</p>` : ""}
      </td></tr>`);
  }

  lines.push(`Read more: ${input.blogLink}`);
  lines.push("");
  lines.push("— Fire-Fire International Evangelical Church");

  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Daily Growth" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;background:#f3f4f6" />`
    : "";

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f9fafb;font-family:Georgia,serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#b91c1c;color:#fff;padding:20px 24px">
      <p style="margin:0;font-size:12px;opacity:.9;letter-spacing:.08em;text-transform:uppercase">FFIEMC</p>
      <h1 style="margin:6px 0 0;font-size:22px">Daily Growth</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.9">${escapeHtml(input.runDate)}</p>
    </div>
    ${imageHtml}
    <div style="padding:8px 24px 24px">
      <p style="font-size:14px;color:#374151;line-height:1.5">Here is today's spiritual growth content. Read, meditate, and share with someone.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${blocks.join("")}</table>
      <p style="margin:20px 0 0;text-align:center">
        <a href="${escapeHtml(input.blogLink)}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Open Daily Growth</a>
      </p>
    </div>
  </div>
  </body></html>`;

  return { text: lines.join("\n"), html };
}
