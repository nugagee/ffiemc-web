// Daily Growth spool: publish one queued item per category, then email digest to members.
// Deploy: supabase functions deploy spool-daily-growth --no-verify-jwt
// Secrets: GROWTH_CRON_SECRET, RESEND_API_KEY, FROM_EMAIL
// Schedule (Dashboard): 0 5 * * *  (= 6:00 Africa/Lagos)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://ffiem.org";
const BLOG_LINK = `${SITE_URL}/blog?tab=daily-growth`;

const CAT_LABEL: Record<string, string> = {
  trait: "Character Trait",
  prophecy: "Prophecy",
  fact: "Bible Fact",
  riddle: "Bible Riddle",
};

function authorized(req: Request) {
  const cronSecret = Deno.env.get("GROWTH_CRON_SECRET") || "";
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

function stripHtml(html = "") {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstName(full = "") {
  const t = String(full || "").trim();
  if (!t) return "Beloved";
  return t.split(/\s+/)[0];
}

function buildDigest(items: Record<string, unknown>[], runDate: string) {
  const lines: string[] = [
    `FFIEMC Daily Growth — ${runDate}`,
    "",
    "Here is today's spiritual growth content. Read, meditate, and share with someone.",
    "",
  ];
  const blocks: string[] = [];

  for (const item of items) {
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

  lines.push(`Read more: ${BLOG_LINK}`);
  lines.push("");
  lines.push("— Fire-Fire International Evangelical Church");

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f9fafb;font-family:Georgia,serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#b91c1c;color:#fff;padding:20px 24px">
      <p style="margin:0;font-size:12px;opacity:.9;letter-spacing:.08em;text-transform:uppercase">FFIEMC</p>
      <h1 style="margin:6px 0 0;font-size:22px">Daily Growth</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.9">${escapeHtml(runDate)}</p>
    </div>
    <div style="padding:8px 24px 24px">
      <p style="font-size:14px;color:#374151;line-height:1.5">Here is today's spiritual growth content. Read, meditate, and share with someone.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${blocks.join("")}</table>
      <p style="margin:20px 0 0;text-align:center">
        <a href="${BLOG_LINK}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Open Daily Growth</a>
      </p>
    </div>
  </div>
  </body></html>`;

  return { text: lines.join("\n"), html };
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resendSend(apiKey: string, from: string, to: string, subject: string, text: string, html: string) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!authorized(req)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const skipEmail = url.searchParams.get("skip_email") === "1" || url.searchParams.get("dry_run") === "1";
    const emailOnly = url.searchParams.get("email_only") === "1";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let spool: Record<string, unknown> = {};
    if (!emailOnly) {
      const { data, error } = await supabase.rpc("spool_daily_growth", { p_force: force });
      if (error) throw error;
      spool = (data || {}) as Record<string, unknown>;
    } else {
      const { data: items, error } = await supabase.rpc("list_daily_growth_published_on", { p_date: null });
      if (error) throw error;
      const list = Array.isArray(items) ? items : [];
      spool = {
        ok: true,
        items: list,
        count: list.length,
        email_enabled: true,
        subject_template: "FFIEMC Daily Growth — {{date}}",
        run_date: list[0]?.published_on || new Date().toISOString().slice(0, 10),
      };
    }

    const items = Array.isArray(spool.items) ? (spool.items as Record<string, unknown>[]) : [];
    const runDate = String(spool.run_date || "");
    const emailEnabled = Boolean(spool.email_enabled);
    let emailsSent = 0;
    let emailsFailed = 0;
    const emailErrors: string[] = [];

    if (!skipEmail && emailEnabled && items.length > 0) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("FROM_EMAIL") || Deno.env.get("DIGEST_FROM_EMAIL");
      if (!resendApiKey || !fromEmail) {
        emailErrors.push("Missing RESEND_API_KEY or FROM_EMAIL");
      } else {
        const { data: recipients, error: recErr } = await supabase.rpc("list_daily_growth_digest_recipients");
        if (recErr) throw recErr;
        const list = Array.isArray(recipients) ? recipients : [];
        const tpl = String(spool.subject_template || "FFIEMC Daily Growth — {{date}}");
        const subject = tpl.replace(/\{\{\s*date\s*\}\}/gi, runDate);
        const { text, html } = buildDigest(items, runDate);

        for (const row of list) {
          const to = String((row as { email?: string }).email || "").trim();
          if (!to) continue;
          const name = firstName((row as { full_name?: string }).full_name || "");
          try {
            const personalText = `Dear ${name},\n\n${text}`;
            const personalHtml = html.replace(
              "Here is today's spiritual growth content.",
              `Dear ${escapeHtml(name)}, here is today's spiritual growth content.`
            );
            await resendSend(resendApiKey, fromEmail, to, subject, personalText, personalHtml);
            emailsSent += 1;
          } catch (e) {
            emailsFailed += 1;
            if (emailErrors.length < 5) emailErrors.push(String((e as Error)?.message || e));
          }
          await delay(300);
        }

        if (spool.run_id) {
          await supabase.rpc("update_daily_growth_run_email_stats", {
            p_run_id: spool.run_id,
            p_sent: emailsSent,
            p_failed: emailsFailed,
            p_status: emailsFailed && !emailsSent ? "email_failed" : "ok",
            p_error: emailErrors.join("; ").slice(0, 500),
          });
        }
      }
    }

    return json({
      ok: true,
      spool,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      email_errors: emailErrors,
      skipped_email: skipEmail || !emailEnabled || items.length === 0,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
