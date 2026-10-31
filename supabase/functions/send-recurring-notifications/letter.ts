// Announcement letter for the weekly sender. Same church shell as the manual
// member announcement: greeting, message, optional images, red footer.

const SITE_URL = "https://ffiem.org";
const CHURCH = "Fire-Fire International Evangelical Church";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHttpUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2000 || /[\s<>"']/.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (parsed.username || parsed.password) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function firstName(fullName: unknown) {
  const part = String(fullName || "").trim().split(/\s+/)[0];
  return part || "Friend";
}

export function buildRecurringAnnouncement(input: {
  fullName?: unknown;
  subject?: unknown;
  title?: unknown;
  body?: unknown;
  programTitle?: unknown;
  headerImageUrl?: unknown;
}) {
  const name = firstName(input.fullName);
  const subject = String(input.subject || input.title || "Church announcement").trim() || "Church announcement";
  const message = String(input.body || "").trim();
  const program = String(input.programTitle || "").trim();
  const header = safeHttpUrl(input.headerImageUrl);
  const text = [
    `Hi ${name},`,
    "",
    message,
    program ? `\nProgram: ${program}` : "",
    header ? `\nHeader image: ${header}` : "",
    "",
    `— ${CHURCH}`,
    SITE_URL,
  ].filter((line) => line !== undefined).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background:#fff;border:1px solid #fecaca">
        <tr><td style="background:#b91c1c;padding:18px 24px">
          <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#fff">${escapeHtml(CHURCH)}</p>
        </td></tr>
        ${header ? `<tr><td style="padding:0;line-height:0"><img src="${escapeHtml(header)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"/></td></tr>` : ""}
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827">${escapeHtml(subject)}</h1>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1f2937">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1f2937">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
          ${program ? `<p style="margin:0;font-size:15px;color:#7f1d1d"><strong>Program:</strong> ${escapeHtml(program)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 24px 20px;border-top:1px solid #fecaca;background:#fff7f7;color:#6b7280;font-size:13px;line-height:1.5">
          <p style="margin:0">Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria · <a href="${SITE_URL}" style="color:#b91c1c">ffiem.org</a></p>
          <p style="margin:8px 0 0">Motto: Teach one by one another</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}
