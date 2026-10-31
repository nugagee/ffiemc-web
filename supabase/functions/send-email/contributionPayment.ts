// Contribution payment update letters. No Deno, network, or database calls.
// The destination addresses are chosen by the caller from stored records.

const SITE_URL = "https://ffiem.org";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContributionNotice = {
  full_name?: unknown;
  amount?: unknown;
  payment_date?: unknown;
  note?: unknown;
  receipt_url?: unknown;
  month_label?: unknown;
  month_slug?: unknown;
  updated_by_name?: unknown;
  member_email?: unknown;
  source?: unknown;
};

export function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}

/**
 * Member address comes from the roster row. Admin addresses come from the
 * same site notification settings as other admin alerts. Anything the browser
 * put in `to` / adminEmail is ignored.
 */
export function resolveContributionPaymentRecipients(input: {
  memberEmail?: unknown;
  adminEmails?: unknown[];
  clientTo?: unknown;
}) {
  void input.clientTo;
  const member = normalizeEmail(input.memberEmail);
  const admins: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.adminEmails || []) {
    const email = normalizeEmail(raw);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    admins.push(email);
  }
  return { member: member || null, admins };
}

export function readContributionPaymentId(body: Record<string, unknown>) {
  return String(body.contributionId || body.contribution_id || "").trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moneyNaira(amount: unknown) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function formatPaidOn(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
  return new Date(`${raw}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fieldsTable(rows: Array<[string, string]>) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:38%;vertical-align:top">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#111827;vertical-align:top">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #fee2e2;border-radius:12px;overflow:hidden;margin:0 0 16px">${cells}</table>`;
}

function brandedHtml({ title, preheader, intro, rows }: { title: string; preheader: string; intro: string; rows: Array<[string, string]> }) {
  const introHtml = escapeHtml(intro).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #fee2e2">
        <tr><td style="background:linear-gradient(135deg,#b91c1c,#ea580c);padding:22px 24px;color:#fff">
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.9">Fire-Fire International Evangelical Church</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:24px"><p style="margin:0 0 14px;line-height:1.55;color:#1f2937">${introHtml}</p>${fieldsTable(rows)}</td></tr>
        <tr><td style="padding:16px 24px 24px;border-top:1px solid #fee2e2;color:#6b7280;font-size:13px;line-height:1.5">
          <p style="margin:0">Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria · <a href="${SITE_URL}" style="color:#b91c1c">ffiem.org</a></p>
          <p style="margin:8px 0 0">Motto: Teach one by one another</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildContributionPaymentUpdatedMail(row: ContributionNotice, audience: "member" | "admin") {
  const name = String(row.full_name || "").trim() || "Member";
  const money = moneyNaira(row.amount);
  const paidOn = formatPaidOn(row.payment_date);
  const month = String(row.month_label || "").trim() || "—";
  const note = String(row.note || "").trim() || "—";
  const receipt = String(row.receipt_url || "").trim() || "Not attached";
  const editor = String(row.updated_by_name || "").trim() || "An administrator";
  const slug = String(row.month_slug || "").trim();
  const report = slug ? `${SITE_URL}/contribute/media/${slug}/report` : "";
  const adminUrl = `${SITE_URL}/admin/utilities/media-contributions`;
  const source = String(row.source || "") === "admin" ? "Added by admin" : "Via payment link";

  const subject = audience === "member"
    ? `Your media contribution was updated — ${money}`
    : `Media contribution updated — ${name} (${money})`;

  const intro = audience === "member"
    ? `Dear ${name},\n\nYour social media team contribution was updated. These are the details now on record.`
    : `A social media team contribution was updated by ${editor}. These are the details now on record.`;

  const rows: Array<[string, string]> = [
    ["Name", name],
    ["Amount", money],
    ["Payment date", paidOn],
    ["Month", month],
    ["How it was recorded", source],
    ["Note", note],
    ["Receipt", receipt],
    ["Updated by", editor],
  ];
  if (report) rows.push(["Report", report]);
  if (audience === "admin") rows.push(["Admin", adminUrl]);

  const text = [intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", "Fire-Fire International Evangelical Church"].join("\n");
  const html = brandedHtml({
    title: audience === "member" ? "Your contribution was updated" : "Contribution payment updated",
    preheader: `${name} · ${money} · ${month}`,
    intro,
    rows,
  });
  return { subject, text, html };
}
