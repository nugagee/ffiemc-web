// Daily Growth spool: publish the oldest queued item per category; if a queue is empty, fill from a seed that was not published in the last 365 days, then email members.
// Deploy: supabase functions deploy spool-daily-growth --no-verify-jwt
// Secrets: GROWTH_CRON_SECRET, RESEND_API_KEY, FROM_EMAIL
// Schedule: 06:00 Europe/London. pg_cron is 0 5,6 * * * UTC and
// invoke_growth_at_london_6() sends only when the London hour is 6.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  GROWTH_SEEDS,
  LOW_QUEUE_DAYS,
  buildLowQueueAlert,
  formatDayISO,
  noEligibleSeedMessage,
  pickGrowthSeed,
  rowsToHistory,
} from "./pickSeed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://ffiem.org";
const BLOG_LINK = `${SITE_URL}/blog?tab=daily-growth`;
const BIBLE_API = "https://bible-api.com";

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

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lagosDayIndex() {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = Number(parts.find((p) => p.type === "year")?.value || 2026);
    const m = Number(parts.find((p) => p.type === "month")?.value || 1);
    const d = Number(parts.find((p) => p.type === "day")?.value || 1);
    const start = Date.UTC(y, 0, 0);
    const now = Date.UTC(y, m - 1, d);
    return Math.floor((now - start) / 86400000);
  } catch {
    return Math.floor(Date.now() / 86400000);
  }
}

async function fetchVerse(ref: string): Promise<string> {
  const path = encodeURIComponent(ref.trim()).replace(/%20/g, "+");
  const res = await fetch(`${BIBLE_API}/${path}?translation=kjv`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`bible-api ${res.status} for ${ref}`);
  const data = await res.json();
  const text = String(data?.text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) throw new Error(`Empty verse for ${ref}`);
  return text;
}

const GROWTH_CATEGORIES = ["trait", "prophecy", "fact", "riddle"];

type AutofillResult = {
  created: string[];
  errors: string[];
  skipped: { category: string; reason: string }[];
};

async function loadGrowthHistory(supabase: SupabaseClient) {
  const pageSize = 1000;
  const rows: {
    title?: string;
    scripture_ref?: string;
    published_on?: string | null;
    status?: string;
    created_at?: string | null;
  }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("daily_growth_items")
      .select("title, scripture_ref, published_on, status, created_at")
      .in("status", ["queued", "published", "archived"])
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function ensureQueueFromBibleApi(
  supabase: SupabaseClient,
  categories: string[]
): Promise<AutofillResult> {
  const created: string[] = [];
  const errors: string[] = [];
  const skipped: { category: string; reason: string }[] = [];
  const today = formatDayISO(new Date());
  const dayIndex = lagosDayIndex();

  let history;
  try {
    history = rowsToHistory(await loadGrowthHistory(supabase), today);
  } catch (e) {
    const message = `Could not read publication history: ${String((e as Error)?.message || e)}`;
    errors.push(message);
    console.error(`spool-daily-growth ${message}`);
    return { created, errors, skipped };
  }

  for (const category of categories) {
    if (!GROWTH_CATEGORIES.includes(category)) continue;

    const { count, error: countError } = await supabase
      .from("daily_growth_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("category", category);
    if (countError) {
      errors.push(`${category}: ${countError.message}`);
      continue;
    }
    // Queued items are published by spool_daily_growth() before any seed is used.
    if ((count || 0) > 0) continue;

    const seed = pickGrowthSeed({
      category,
      seeds: GROWTH_SEEDS,
      history,
      today,
      dayIndex,
    });
    if (!seed) {
      const reason = noEligibleSeedMessage(category);
      errors.push(reason);
      skipped.push({ category, reason });
      console.error(`spool-daily-growth ${reason}`);
      continue;
    }

    try {
      const verse = await fetchVerse(seed.scripture);
      const body = `${seed.body}\n\n“${verse}”`;
      const { error } = await supabase.from("daily_growth_items").insert({
        category,
        title: seed.title,
        body,
        scripture_ref: seed.scripture,
        answer: seed.answer || "",
        status: "queued",
        sort_order: 0,
      });
      if (error) throw error;
      created.push(`${category}:${seed.title}`);
      history.push({
        title: seed.title,
        scripture: seed.scripture,
        publishedOn: today,
      });
      await delay(350);
    } catch (e) {
      errors.push(`${category}: ${String((e as Error)?.message || e)}`);
    }
  }

  return { created, errors, skipped };
}

function isDuplicateAlert(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|unique constraint/i.test(error.message || "");
}

async function releaseQueueAlerts(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("daily_growth_queue_alerts").delete().in("id", ids);
  if (error) console.error(`spool-daily-growth could not release queue alert: ${error.message}`);
}

async function alertLowQueues(
  supabase: SupabaseClient,
  categories: string[],
  autofill: AutofillResult,
  supabaseUrl: string,
  serviceKey: string
) {
  const today = formatDayISO(new Date());
  const low: { category: string; queued: number; detail: string }[] = [];

  for (const category of categories) {
    if (!GROWTH_CATEGORIES.includes(category)) continue;
    const { count, error } = await supabase
      .from("daily_growth_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("category", category);
    if (error) return { sent: false, error: error.message, claimed: [] as string[] };
    const queued = count || 0;
    if (queued >= LOW_QUEUE_DAYS) continue;
    const skip = autofill.skipped.find((item) => item.category === category);
    const failure = autofill.errors.find((item) => item.startsWith(`${category}:`));
    const detail = [
      `${queued} queued (below ${LOW_QUEUE_DAYS} days of supply)`,
      skip?.reason || (!skip && failure ? failure : ""),
    ]
      .filter(Boolean)
      .join(". ");
    low.push({ category, queued, detail });
  }

  if (!low.length) return { sent: false, claimed: [] as string[], reason: "queues_ok" };

  const claimed: { id: string; category: string; queued: number; detail: string }[] = [];
  for (const item of low) {
    const { data, error } = await supabase
      .from("daily_growth_queue_alerts")
      .insert({
        category: item.category,
        alert_on: today,
        queued_count: item.queued,
        detail: item.detail.slice(0, 500),
      })
      .select("id")
      .maybeSingle();
    if (error) {
      if (isDuplicateAlert(error)) continue;
      await releaseQueueAlerts(supabase, claimed.map((row) => row.id));
      console.error(`spool-daily-growth queue alert claim failed: ${error.message}`);
      return {
        sent: false,
        error: error.message,
        claimed: [] as string[],
        released: claimed.length > 0,
        hint: "Apply migration 20261109_daily_growth_queue_alerts.sql before alerts can be sent.",
      };
    }
    if (data?.id) claimed.push({ ...item, id: String(data.id) });
  }

  if (!claimed.length) return { sent: false, claimed: [] as string[], reason: "already_alerted" };

  const mail = buildLowQueueAlert({
    today,
    adminUrl: `${SITE_URL}/admin/blog/daily-growth`,
    lowQueueDays: LOW_QUEUE_DAYS,
    items: claimed.map((item) => ({
      category: item.category,
      label: CAT_LABEL[item.category] || item.category,
      queued: item.queued,
      detail: item.detail,
    })),
  });

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purpose: "daily_growth_alert",
        notifyAdmins: true,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.error || body?.message || `send-email ${res.status}`);
    }
    console.log(
      `spool-daily-growth low-queue alert sent for ${claimed.map((item) => item.category).join(", ")}`
    );
    return {
      sent: true,
      claimed: claimed.map((item) => item.category),
      recipients: body.recipients || [],
    };
  } catch (e) {
    const message = String((e as Error)?.message || e);
    console.error(`spool-daily-growth low-queue alert failed: ${message}`);
    await releaseQueueAlerts(supabase, claimed.map((row) => row.id));
    return {
      sent: false,
      error: message,
      claimed: claimed.map((item) => item.category),
      released: true,
    };
  }
}

async function noteRunIssues(
  supabase: SupabaseClient,
  runId: unknown,
  notes: string[]
) {
  const extra = notes.map((note) => note.trim()).filter(Boolean);
  if (!runId || !extra.length) return;
  const { data, error } = await supabase
    .from("daily_growth_runs")
    .select("error")
    .eq("id", runId)
    .maybeSingle();
  if (error) {
    console.error(`spool-daily-growth could not read run note: ${error.message}`);
    return;
  }
  const prev = String(data?.error || "").trim();
  const addition = extra.join("; ");
  if (prev.includes(addition)) return;
  const errorText = [prev, addition].filter(Boolean).join(" | ").slice(0, 500);
  if (errorText === prev) return;
  const updated = await supabase.from("daily_growth_runs").update({ error: errorText }).eq("id", runId);
  if (updated.error) console.error(`spool-daily-growth could not save run note: ${updated.error.message}`);
}

async function enabledCategories(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("daily_growth_settings").select("categories_enabled").eq("id", 1).maybeSingle();
  const cats = data?.categories_enabled;
  if (Array.isArray(cats) && cats.length) return cats.map(String);
  return ["trait", "prophecy", "fact", "riddle"];
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
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const skipEmail = url.searchParams.get("skip_email") === "1" || url.searchParams.get("dry_run") === "1";
    const emailOnly = url.searchParams.get("email_only") === "1";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let autofill: AutofillResult = { created: [], errors: [], skipped: [] };
    let spool: Record<string, unknown> = {};
    let queueAlert: Record<string, unknown> = { sent: false };

    if (!emailOnly) {
      const cats = await enabledCategories(supabase);
      autofill = await ensureQueueFromBibleApi(supabase, cats);

      const { data, error } = await supabase.rpc("spool_daily_growth", { p_force: force });
      if (error) throw error;
      spool = (data || {}) as Record<string, unknown>;

      if (String(spool.reason || "") !== "disabled") {
        try {
          queueAlert = await alertLowQueues(supabase, cats, autofill, supabaseUrl, serviceKey);
        } catch (e) {
          const message = String((e as Error)?.message || e);
          queueAlert = { sent: false, error: message };
          console.error(`spool-daily-growth queue alert: ${message}`);
        }
      }
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
    let emailHeld = false;
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
        if (!list.length) {
          emailHeld = true;
          const hold = await supabase.rpc("scheduled_email_hold_reason", { p_job: "daily_growth" });
          const reason = !hold.error && hold.data?.reason
            ? String(hold.data.reason)
            : "No priority recipients or daily email budget is used.";
          emailErrors.push(reason);
        }
        const tpl = String(spool.subject_template || "FFIEMC Daily Growth — {{date}}");
        const subject = tpl.replace(/\{\{\s*date\s*\}\}/gi, runDate);
        const { text, html } = buildDigest(items, runDate);

        for (const row of list) {
          const to = String((row as { email?: string }).email || "").trim();
          if (!to) continue;
          const name = firstName(row as { greeting_name?: string; first_name?: string; full_name?: string });
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

        if (emailsSent > 0) {
          const feedItems = items.map((item) => ({
            title: String(item.title || ""),
            excerpt: stripHtml(String(item.body || "")).slice(0, 400),
            category: CAT_LABEL[String(item.category || "")] || "Daily Growth",
            url: "/blog?tab=daily-growth",
          }));
          const logged = await supabase.rpc("record_content_email_send", {
            p_type: "daily-growth",
            p_items: feedItems,
          });
          if (logged.error && emailErrors.length < 5) {
            emailErrors.push(`Feed log: ${logged.error.message}`);
          } else if (logged.data && logged.data.ok === false && emailErrors.length < 5) {
            emailErrors.push(`Feed log: ${logged.data.reason || "not recorded"}`);
          }
        }

        if (spool.run_id) {
          await supabase.rpc("update_daily_growth_run_email_stats", {
            p_run_id: spool.run_id,
            p_sent: emailsSent,
            p_failed: emailsFailed,
            p_status: !list.length ? "held" : emailsFailed && !emailsSent ? "email_failed" : "ok",
            p_error: emailErrors.join("; ").slice(0, 500),
          });
        }
      }
    }

    const runNotes = [
      ...autofill.errors,
      queueAlert.error ? `Queue alert: ${queueAlert.error}` : "",
    ];
    await noteRunIssues(supabase, spool.run_id, runNotes);

    return json({
      ok: true,
      autofill,
      spool,
      queue_alert: queueAlert,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      email_errors: emailErrors,
      skipped_email: skipEmail || !emailEnabled || items.length === 0 || emailHeld,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
