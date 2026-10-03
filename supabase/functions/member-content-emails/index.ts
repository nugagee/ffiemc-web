// Member content digest + Bible Study / Sunday service reminder emails.
// Deploy: supabase functions deploy member-content-emails --no-verify-jwt
// Secrets: MEMBER_EMAILS_CRON_SECRET (or GROWTH_CRON_SECRET), RESEND_API_KEY, FROM_EMAIL
// Jobs: ?job=digest | bible_study | sunday_service

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://ffiem.org";

function authorized(req: Request) {
  const cronSecret =
    Deno.env.get("MEMBER_EMAILS_CRON_SECRET") ||
    Deno.env.get("GROWTH_CRON_SECRET") ||
    "";
  const header = req.headers.get("x-cron-secret") || "";
  if (cronSecret && header && header === cronSecret) return true;

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (token && serviceKey && token === serviceKey) return true;

  const url = new URL(req.url);
  const q = url.searchParams.get("secret") || "";
  if (cronSecret && q && q === cronSecret) return true;

  return false;
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(row: { greeting_name?: string; first_name?: string; full_name?: string } | string = "") {
  if (typeof row === "string") {
    return greetingFromParts("", row);
  }
  const fromRpc = String(row.greeting_name || "").trim();
  if (fromRpc) return fromRpc;
  return greetingFromParts(row.first_name || "", row.full_name || "");
}

const TITLE_SKIP = new Set([
  "mr", "mrs", "ms", "miss", "dr", "prof", "pastor", "rev", "reverend",
  "brother", "bro", "sister", "sis", "elder", "deacon", "deaconess",
  "evangelist", "apostle", "prophet", "prophetess", "bishop", "chief", "hon",
  "engr", "engineer", "barr", "barrister", "sir", "madam", "lady",
]);

function greetingFromParts(firstNameField = "", fullName = "") {
  const fromFirst = String(firstNameField || "")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^A-Za-z-]+$/g, "");
  if (fromFirst && fromFirst.length > 1 && !TITLE_SKIP.has(fromFirst.toLowerCase())) {
    return fromFirst.charAt(0).toUpperCase() + fromFirst.slice(1).toLowerCase();
  }

  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z-]+/g, ""))
    .filter(Boolean);

  for (const part of parts) {
    if (TITLE_SKIP.has(part.toLowerCase())) continue;
    if (part.length <= 1) continue;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  return "Beloved";
}

function absUrl(path = "/") {
  const p = String(path || "/").trim();
  if (/^https?:\/\//i.test(p)) return p;
  return `${SITE_URL}${p.startsWith("/") ? p : `/${p}`}`;
}

function lagosDateLabel() {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function brandedShell(title: string, bodyHtml: string, preheader = "") {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #fee2e2">
        <tr><td style="background:linear-gradient(135deg,#b91c1c,#ea580c);padding:22px 24px;color:#fff">
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.9">Fire-Fire International Evangelical Church</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:24px">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 24px 24px;border-top:1px solid #fee2e2;color:#6b7280;font-size:13px;line-height:1.5">
          <p style="margin:0">Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan · <a href="${SITE_URL}" style="color:#b91c1c">ffiem.org</a></p>
          <p style="margin:8px 0 0">Motto: Teach one by one another</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function buildDigestEmail(
  settings: Record<string, unknown>,
  items: Record<string, unknown>[],
  dateLabel: string
) {
  const intro = String(
    settings.digest_intro ||
      "Here is a short summary of new content published for you. Tap Read more to open each item on the website."
  );
  const subjectTpl = String(
    settings.digest_subject || "FFIEMC — What's new on the website ({{date}})"
  );
  const subject = subjectTpl.replace(/\{\{\s*date\s*\}\}/gi, dateLabel);

  const textLines = [
    `Dear {{name}},`,
    "",
    intro,
    "",
  ];
  const blocks: string[] = [];

  for (const item of items) {
    const label = String(item.kind_label || item.kind || "Update");
    const title = String(item.title || "Untitled");
    const summary = String(item.summary || "").trim();
    const link = absUrl(String(item.url || "/"));
    textLines.push(`• ${label}: ${title}`);
    if (summary) textLines.push(`  ${summary}`);
    textLines.push(`  Read more: ${link}`);
    textLines.push("");

    blocks.push(`
      <tr><td style="padding:14px 0;border-bottom:1px solid #f3f4f6">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#b91c1c;font-weight:700">${escapeHtml(label)}</p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">${escapeHtml(title)}</p>
        ${summary ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#374151">${escapeHtml(summary)}</p>` : ""}
        <a href="${escapeHtml(link)}" style="font-size:13px;color:#b91c1c;font-weight:600;text-decoration:none">Read more →</a>
      </td></tr>`);
  }

  textLines.push("— Fire-Fire International Evangelical Church");
  textLines.push(SITE_URL);

  const html = brandedShell(
    "What's new",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#374151">Dear {{name}}, ${escapeHtml(intro)}</p>
     <table width="100%" cellpadding="0" cellspacing="0">${blocks.join("")}</table>
     <p style="margin:20px 0 0;text-align:center">
       <a href="${SITE_URL}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Visit the website</a>
     </p>`,
    intro
  );

  return { subject, textTemplate: textLines.join("\n"), htmlTemplate: html };
}

function buildReminderEmail(
  kind: "bible_study" | "sunday_service",
  settings: Record<string, unknown>,
  imageUrl: string
) {
  const isBible = kind === "bible_study";
  const subject = String(
    isBible
      ? settings.bible_study_subject || "Reminder: Monday Bible Study"
      : settings.sunday_subject || "Reminder: Sunday Service"
  );
  const body = String(
    isBible
      ? settings.bible_study_body ||
        "Beloved, this is a gentle reminder that Monday Bible Study holds today."
      : settings.sunday_body ||
        "Beloved, tomorrow is the Lord's Day. Join us for Sunday Service."
  );
  const ctaLabel = String(
    isBible
      ? settings.bible_study_cta_label || "Open Bible Study"
      : settings.sunday_cta_label || "View Sunday sermons"
  );
  const ctaPath = String(
    isBible
      ? settings.bible_study_cta_path || "/sermons?tab=bible-study"
      : settings.sunday_cta_path || "/sermons?tab=sunday-sermon"
  );
  const cta = absUrl(ctaPath);
  const title = isBible ? "Monday Bible Study" : "Sunday Service";

  const imageBlock = imageUrl
    ? `<p style="margin:0 0 16px"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" style="width:100%;max-width:512px;border-radius:12px;display:block"/></p>`
    : "";

  const text = [
    "Dear {{name}},",
    "",
    body,
    "",
    `${ctaLabel}: ${cta}`,
    "",
    "— Fire-Fire International Evangelical Church",
    SITE_URL,
  ].join("\n");

  const html = brandedShell(
    title,
    `${imageBlock}
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">Dear {{name}},</p>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(body)}</p>
     <p style="margin:0;text-align:center">
       <a href="${escapeHtml(cta)}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600">${escapeHtml(ctaLabel)}</a>
     </p>`,
    body
  );

  return { subject, textTemplate: text, htmlTemplate: html };
}

async function resendSend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  text: string,
  html: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || body?.error || `Resend ${res.status}`);
  return body;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!authorized(req)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    let job = (url.searchParams.get("job") || "digest").toLowerCase().trim();
    const dryRun = url.searchParams.get("dry_run") === "1" || url.searchParams.get("skip_email") === "1";
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.job) job = String(body.job).toLowerCase().trim();
      } catch {
        /* empty body ok */
      }
    }

    if (!["digest", "bible_study", "sunday_service"].includes(job)) {
      return json({ error: "Invalid job. Use digest, bible_study, or sunday_service" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: settingsRaw, error: settingsErr } = await supabase.rpc(
      "get_content_email_settings_public"
    );
    if (settingsErr) throw settingsErr;
    const settings = (settingsRaw || {}) as Record<string, unknown>;

    if (job === "digest" && settings.digest_enabled === false && !force) {
      return json({ ok: true, skipped: true, reason: "digest_disabled" });
    }
    if (job === "bible_study" && settings.bible_study_enabled === false && !force) {
      return json({ ok: true, skipped: true, reason: "bible_study_disabled" });
    }
    if (job === "sunday_service" && settings.sunday_enabled === false && !force) {
      return json({ ok: true, skipped: true, reason: "sunday_disabled" });
    }

    let items: Record<string, unknown>[] = [];
    let imageUrl = "";
    let subject = "";
    let textTemplate = "";
    let htmlTemplate = "";

    if (job === "digest") {
      const { data: digestItems, error: digErr } = await supabase.rpc(
        "collect_content_digest_items",
        { p_since: null }
      );
      if (digErr) throw digErr;
      items = (Array.isArray(digestItems) ? digestItems : []).filter(
        (item) => String((item as { kind?: string }).kind || "") !== "daily_growth"
      );
      if (!items.length) {
        await supabase.rpc("record_content_email_run", {
          p_job: "digest",
          p_items: [],
          p_image_url: "",
          p_sent: 0,
          p_failed: 0,
          p_status: "skipped",
          p_error: "No new website content since last digest",
        });
        return json({ ok: true, skipped: true, reason: "no_new_content", items: [] });
      }
      const built = buildDigestEmail(settings, items, lagosDateLabel());
      subject = built.subject;
      textTemplate = built.textTemplate;
      htmlTemplate = built.htmlTemplate;
    } else {
      const imageKind = job === "bible_study" ? "bible_study" : "sunday_service";
      const { data: img, error: imgErr } = await supabase.rpc("pick_reminder_image", {
        p_kind: imageKind,
      });
      if (imgErr) throw imgErr;
      const imgRow = (img || {}) as Record<string, unknown>;
      imageUrl = String(imgRow.url || "").trim();
      const built = buildReminderEmail(
        job as "bible_study" | "sunday_service",
        settings,
        imageUrl
      );
      subject = built.subject;
      textTemplate = built.textTemplate;
      htmlTemplate = built.htmlTemplate;
    }

    if (dryRun) {
      return json({
        ok: true,
        dry_run: true,
        job,
        subject,
        item_count: items.length,
        image_url: imageUrl,
        preview_html: htmlTemplate.replace(/\{\{name\}\}/g, "Beloved").slice(0, 2000),
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || Deno.env.get("DIGEST_FROM_EMAIL");
    if (!resendApiKey || !fromEmail) {
      throw new Error("Missing RESEND_API_KEY or FROM_EMAIL");
    }

    let rec = await supabase.rpc("list_member_email_recipients", { p_job: job });
    if (rec.error && /p_job|schema cache|Could not find the function/i.test(rec.error.message || "")) {
      rec = await supabase.rpc("list_member_email_recipients");
    }
    if (rec.error) throw rec.error;
    const list = Array.isArray(rec.data) ? rec.data : [];

    if (!list.length) {
      let reason = "No priority recipients or daily email budget is used.";
      const hold = await supabase.rpc("scheduled_email_hold_reason", { p_job: job });
      if (!hold.error && hold.data?.reason) reason = String(hold.data.reason);
      await supabase.rpc("record_content_email_run", {
        p_job: job,
        p_items: items,
        p_image_url: imageUrl,
        p_sent: 0,
        p_failed: 0,
        p_status: "held",
        p_error: reason.slice(0, 500),
      });
      return json({
        ok: true,
        skipped: true,
        reason,
        job,
        subject,
        item_count: items.length,
        recipients: 0,
        emails_sent: 0,
        emails_failed: 0,
      });
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    const emailErrors: string[] = [];

    for (const row of list) {
      const to = String((row as { email?: string }).email || "").trim();
      if (!to) continue;
      const name = firstName(row as { greeting_name?: string; first_name?: string; full_name?: string });
      try {
        const text = textTemplate.replace(/\{\{name\}\}/g, name);
        const html = htmlTemplate.replace(/\{\{name\}\}/g, escapeHtml(name));
        await resendSend(resendApiKey, fromEmail, to, subject, text, html);
        emailsSent += 1;
      } catch (e) {
        emailsFailed += 1;
        if (emailErrors.length < 5) emailErrors.push(String((e as Error)?.message || e));
      }
      await delay(300);
    }

    if (job === "digest" && emailsSent > 0) {
      const feedItems = items.map((item) => ({
        title: String(item.title || ""),
        excerpt: String(item.summary || "").slice(0, 400),
        category: String(item.kind_label || item.kind || "Update"),
        url: String(item.url || "/"),
      }));
      const logged = await supabase.rpc("record_content_email_send", {
        p_type: "whats-new",
        p_items: feedItems,
      });
      if (logged.error && emailErrors.length < 5) {
        emailErrors.push(`Feed log: ${logged.error.message}`);
      } else if (logged.data && logged.data.ok === false && emailErrors.length < 5) {
        emailErrors.push(`Feed log: ${logged.data.reason || "not recorded"}`);
      }
    }

    const status =
      emailsFailed && !emailsSent ? "email_failed" : emailsFailed ? "partial" : "ok";

    await supabase.rpc("record_content_email_run", {
      p_job: job,
      p_items: items,
      p_image_url: imageUrl,
      p_sent: emailsSent,
      p_failed: emailsFailed,
      p_status: status,
      p_error: emailErrors.join("; ").slice(0, 500),
    });

    return json({
      ok: true,
      job,
      subject,
      item_count: items.length,
      image_url: imageUrl,
      recipients: list.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      email_errors: emailErrors,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
