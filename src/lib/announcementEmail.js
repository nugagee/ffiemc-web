/**
 * HTML + plain-text body for member announcement emails.
 * Images are remote https URLs (public Supabase Storage), which Gmail, Outlook,
 * and Apple Mail can display inline. The plain-text part lists those same URLs
 * for clients that do not load HTML.
 */

const SITE_URL = "https://ffiem.org";
const CHURCH_NAME = "Fire-Fire International Evangelical Church";
const MAX_URL_LENGTH = 2000;
const MAX_ALT_LENGTH = 180;
const MAX_BUTTON_LABEL = 80;
const MAX_IMAGES = 8;

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Accept only absolute http(s) URLs. Drops javascript:, data:, and broken values. */
export function safeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return "";
  if (/[\s<>"']/.test(raw)) return "";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
  if (parsed.username || parsed.password) return "";
  return parsed.href;
}

export function normalizeAnnouncementImages(value, { limit = MAX_IMAGES } = {}) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();
  list.forEach((item) => {
    if (out.length >= limit) return;
    const url = safeHttpUrl(typeof item === "string" ? item : item?.url || item?.src);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const altSource = typeof item === "object" && item ? item.alt || item.name || "" : "";
    const alt = String(altSource).replace(/\s+/g, " ").trim().slice(0, MAX_ALT_LENGTH);
    out.push({ url, alt });
  });
  return out;
}

export function announcementMediaFromRow(row = {}) {
  return {
    headerImageUrl: row.header_image_url || row.headerImageUrl || "",
    images: normalizeAnnouncementImages(row.images),
    buttonUrl: row.button_url || row.buttonUrl || "",
    buttonLabel: row.button_label || row.buttonLabel || "",
  };
}

export function announcementHasImages(row = {}) {
  const media = announcementMediaFromRow(row);
  return Boolean(media.headerImageUrl) || media.images.length > 0;
}

function plainBlocks(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((block) => {
      const lines = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">${lines}</p>`;
    })
    .join("");
}

function emailImage({ url, alt, width = 600 }) {
  const safeAlt = escapeHtml(alt || "Announcement image");
  const safeUrl = escapeHtml(url);
  return `<img src="${safeUrl}" alt="${safeAlt}" width="${width}" border="0" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;
}

function emailButton(url, label) {
  const href = escapeHtml(url);
  const text = escapeHtml(label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 0;">
    <tr>
      <td align="center" bgcolor="#b91c1c" style="border-radius:8px;background-color:#b91c1c;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" stroke="f" fillcolor="#b91c1c">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;">${text}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#b91c1c;mso-padding-alt:0;">${text}</a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>
  <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#6b7280;word-break:break-all;overflow-wrap:anywhere;">Or open this link: <a href="${href}" target="_blank" style="color:#b91c1c;word-break:break-all;overflow-wrap:anywhere;">${href}</a></p>`;
}

function preheaderText(body) {
  return String(body || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

/**
 * Build the subject, plain text, and HTML for one recipient.
 * Text-only announcements (no images, no button) stay a simple letter.
 */
export function buildMemberAnnouncementContent({
  fullName,
  subject,
  title,
  body,
  programTitle = "",
  fromName = CHURCH_NAME,
  headerImageUrl = "",
  images = [],
  buttonUrl = "",
  buttonLabel = "",
} = {}) {
  const first = String(fullName || "").trim().split(/\s+/)[0] || "Friend";
  const mailSubject = String(subject || title || "Church announcement").trim() || "Church announcement";
  const message = String(body || "").trim();
  const program = String(programTitle || "").trim();
  const header = safeHttpUrl(headerImageUrl);
  const gallery = normalizeAnnouncementImages(images).filter((img) => img.url !== header);
  const link = safeHttpUrl(buttonUrl);
  const label = String(buttonLabel || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_BUTTON_LABEL);
  const buttonText = link ? label || "Learn more" : "";

  const textParts = [`Hi ${first},`, "", message];
  if (program) textParts.push("", `Program: ${program}`);
  if (header) textParts.push("", `Header image: ${header}`);
  if (gallery.length) {
    textParts.push("", "Images:");
    gallery.forEach((img) => {
      textParts.push(img.alt ? `- ${img.alt}: ${img.url}` : `- ${img.url}`);
    });
  }
  if (link) textParts.push("", `${buttonText}: ${link}`);
  textParts.push("", `— ${fromName}`, SITE_URL);
  const text = textParts.join("\n");

  const headerRow = header
    ? `<tr><td style="padding:0;line-height:0;font-size:0;">${emailImage({
        url: header,
        alt: title || "Announcement header",
        width: 600,
      })}</td></tr>`
    : "";

  const galleryHtml = gallery
    .map(
      (img) =>
        `<tr><td style="padding:0 0 16px;line-height:0;font-size:0;">${emailImage({
          url: img.url,
          alt: img.alt || title || "Announcement image",
          width: 552,
        })}</td></tr>`
    )
    .join("");

  const programHtml = program
    ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#7f1d1d;"><strong>Program:</strong> ${escapeHtml(program)}</p>`
    : "";

  const buttonHtml = link ? emailButton(link, buttonText) : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${escapeHtml(mailSubject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;word-spacing:normal;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheaderText(message))}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #fecaca;">
          <tr>
            <td bgcolor="#b91c1c" style="background-color:#b91c1c;padding:18px 24px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">${escapeHtml(CHURCH_NAME)}</p>
            </td>
          </tr>
          ${headerRow}
          <tr>
            <td style="padding:24px 24px 8px;">
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(mailSubject)}</h1>
              <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">Hi ${escapeHtml(first)},</p>
              ${plainBlocks(message)}
              ${programHtml}
            </td>
          </tr>
          ${
            galleryHtml
              ? `<tr><td style="padding:0 24px 8px;"><table role="presentation" width="552" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:552px;">${galleryHtml}</table></td></tr>`
              : ""
          }
          ${
            buttonHtml
              ? `<tr><td style="padding:8px 24px 8px;word-break:break-all;overflow-wrap:anywhere;">${buttonHtml}</td></tr>`
              : ""
          }
          <tr>
            <td style="padding:8px 24px 22px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#374151;">— ${escapeHtml(fromName)}</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#fff7f7" style="padding:16px 24px 20px;border-top:1px solid #fecaca;background-color:#fff7f7;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria · <a href="${SITE_URL}" style="color:#b91c1c;text-decoration:underline;">ffiem.org</a></p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">Motto: Teach one by one another</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: mailSubject,
    text,
    html,
    headerImageUrl: header,
    images: gallery,
    buttonUrl: link,
    buttonLabel: buttonText,
  };
}

/** SMS stays text. A button link is appended when it still fits in one message. */
export function memberAnnouncementSmsText({ title, body, buttonUrl }) {
  const base = `${String(title || "").trim()}\n\n${String(body || "").trim()}`.trim();
  const link = safeHttpUrl(buttonUrl);
  if (!link) return base.slice(0, 480);
  const withLink = `${base}\n${link}`;
  if (withLink.length <= 480) return withLink;
  return base.slice(0, 480);
}
