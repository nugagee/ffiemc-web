// Daily Growth spool: ensure queue (Bible API when empty) → publish one/category → email members.
// Deploy: supabase functions deploy spool-daily-growth --no-verify-jwt
// Secrets: GROWTH_CRON_SECRET, RESEND_API_KEY, FROM_EMAIL
// Schedule: 0 5 * * * UTC (~6:00 Africa/Lagos)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

type Seed = {
  category: "trait" | "prophecy" | "fact" | "riddle";
  title: string;
  scripture: string;
  body: string;
  answer?: string;
};

/** Rotating catalog — verse text is filled from bible-api.com at spool time. */
const GROWTH_SEEDS: Seed[] = [
  // Traits
  { category: "trait", title: "Love", scripture: "1 Corinthians 13:4-7", body: "Love is patient and kind. Let this mark how you treat others today." },
  { category: "trait", title: "Joy", scripture: "Nehemiah 8:10", body: "The joy of the Lord is your strength — choose rejoicing even in pressure." },
  { category: "trait", title: "Peace", scripture: "Philippians 4:6-7", body: "Trade anxiety for prayer, and God’s peace will guard your heart." },
  { category: "trait", title: "Patience", scripture: "James 1:2-4", body: "Trials produce steadfastness. Wait on God without complaining." },
  { category: "trait", title: "Kindness", scripture: "Ephesians 4:32", body: "Be kind and tenderhearted, forgiving as Christ forgave you." },
  { category: "trait", title: "Faithfulness", scripture: "Luke 16:10", body: "Faithfulness in little things prepares you for greater trust." },
  { category: "trait", title: "Gentleness", scripture: "Galatians 5:22-23", body: "Gentleness is fruit of the Spirit — respond softly, not harshly." },
  { category: "trait", title: "Self-control", scripture: "Proverbs 25:28", body: "A person without self-control is like a city without walls." },
  { category: "trait", title: "Humility", scripture: "Philippians 2:3-4", body: "Count others more significant than yourself; look to their interests." },
  { category: "trait", title: "Courage", scripture: "Joshua 1:9", body: "Be strong and courageous — the Lord your God is with you." },
  { category: "trait", title: "Integrity", scripture: "Proverbs 11:3", body: "Integrity guides the upright; walk honestly before God and people." },
  { category: "trait", title: "Gratitude", scripture: "1 Thessalonians 5:16-18", body: "Rejoice, pray, and give thanks in all circumstances." },

  // Prophecies
  { category: "prophecy", title: "Born in Bethlehem", scripture: "Micah 5:2", body: "Centuries before Christ, Micah foretold the Messiah’s birthplace — fulfilled in Matthew 2." },
  { category: "prophecy", title: "A suffering Servant", scripture: "Isaiah 53:5", body: "Isaiah saw One pierced for our transgressions — fulfilled at the cross." },
  { category: "prophecy", title: "The virgin birth", scripture: "Isaiah 7:14", body: "A virgin would bear a son called Immanuel — God with us." },
  { category: "prophecy", title: "Triumphal entry", scripture: "Zechariah 9:9", body: "Your King comes humble, riding on a donkey — fulfilled on Palm Sunday." },
  { category: "prophecy", title: "Betrayed for silver", scripture: "Zechariah 11:12-13", body: "Thirty pieces of silver and the potter’s field — fulfilled in Judas’ betrayal." },
  { category: "prophecy", title: "Pierced hands and feet", scripture: "Psalm 22:16", body: "David’s psalm describes crucifixion long before Rome practiced it." },
  { category: "prophecy", title: "Resurrection hope", scripture: "Psalm 16:10", body: "God would not abandon His Holy One to the grave — fulfilled in Christ’s rising." },
  { category: "prophecy", title: "A new covenant", scripture: "Jeremiah 31:31-33", body: "God promised a new covenant written on hearts — sealed in Jesus’ blood." },
  { category: "prophecy", title: "Light to the nations", scripture: "Isaiah 49:6", body: "Salvation would reach the ends of the earth through the Servant." },
  { category: "prophecy", title: "Spirit poured out", scripture: "Joel 2:28-29", body: "God would pour out His Spirit on all flesh — fulfilled at Pentecost." },

  // Facts
  { category: "fact", title: "Shortest verse", scripture: "John 11:35", body: "“Jesus wept.” — the shortest verse in many English Bibles, showing His compassion." },
  { category: "fact", title: "Longest chapter", scripture: "Psalm 119:105", body: "Psalm 119 is the longest chapter, celebrating God’s word as a lamp to our feet." },
  { category: "fact", title: "Creation word", scripture: "Genesis 1:3", body: "God spoke light into being — His word still creates and orders life." },
  { category: "fact", title: "Two of every kind?", scripture: "Genesis 7:2-3", body: "Noah took more than two of clean animals — provision for sacrifice after the flood." },
  { category: "fact", title: "The Shema", scripture: "Deuteronomy 6:4-5", body: "Israel’s core confession: the Lord is one — love Him with all your heart." },
  { category: "fact", title: "Armor of God", scripture: "Ephesians 6:11", body: "Believers are called to put on the whole armor of God against spiritual schemes." },
  { category: "fact", title: "Fruit of the Spirit", scripture: "Galatians 5:22-23", body: "Nine Spirit-produced virtues mark a life led by God, not the flesh." },
  { category: "fact", title: "Great Commission", scripture: "Matthew 28:19-20", body: "Jesus sends disciples to all nations, promising His presence to the end of the age." },
  { category: "fact", title: "New creation", scripture: "2 Corinthians 5:17", body: "In Christ, the old has passed away — a person becomes a new creation." },
  { category: "fact", title: "Living water", scripture: "John 4:13-14", body: "Jesus offers water that becomes a spring of eternal life within." },

  // Riddles
  { category: "riddle", title: "A bush that burned", scripture: "Exodus 3:2", body: "What burned with fire yet was not consumed — and spoke God’s call?", answer: "The burning bush (Moses at Horeb)." },
  { category: "riddle", title: "Stronger than a lion?", scripture: "Judges 14:14", body: "Out of the eater came something to eat; out of the strong came something sweet. What was it?", answer: "Samson’s riddle — honey from the lion’s carcass." },
  { category: "riddle", title: "What fell but never broke?", scripture: "Acts 9:4", body: "Who fell to the ground on the Damascus road yet rose with a new name and mission?", answer: "Saul of Tarsus (Paul)." },
  { category: "riddle", title: "Walls without hands", scripture: "Joshua 6:20", body: "Which city walls fell after a shout and trumpet blast, not by siege engines?", answer: "Jericho." },
  { category: "riddle", title: "Fed by birds", scripture: "1 Kings 17:6", body: "Which prophet was fed bread and meat by ravens beside a brook?", answer: "Elijah at the brook Cherith." },
  { category: "riddle", title: "Sleeping in a storm", scripture: "Mark 4:38-39", body: "Who slept in a boat during a storm, then stilled wind and waves with a word?", answer: "Jesus." },
  { category: "riddle", title: "Writing on the wall", scripture: "Daniel 5:5", body: "Whose feast ended when a hand wrote judgment on the palace wall?", answer: "Belshazzar of Babylon." },
  { category: "riddle", title: "Three in the fire", scripture: "Daniel 3:25", body: "Who walked unbound in a blazing furnace with a fourth like a son of the gods?", answer: "Shadrach, Meshach, and Abednego." },
];

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

function pickSeed(category: string, dayIndex: number, usedTitles: Set<string>): Seed | null {
  const pool = GROWTH_SEEDS.filter((s) => s.category === category);
  if (!pool.length) return null;
  for (let i = 0; i < pool.length; i++) {
    const seed = pool[(dayIndex + i) % pool.length];
    if (!usedTitles.has(seed.title.toLowerCase())) return seed;
  }
  return pool[dayIndex % pool.length];
}

async function ensureQueueFromBibleApi(
  supabase: SupabaseClient,
  categories: string[]
): Promise<{ created: string[]; errors: string[] }> {
  const created: string[] = [];
  const errors: string[] = [];
  const dayIndex = lagosDayIndex();

  const { data: existingRows } = await supabase
    .from("daily_growth_items")
    .select("title, category, status")
    .in("status", ["queued", "published"]);

  const usedTitles = new Set(
    (existingRows || [])
      .filter((r: { status?: string }) => r.status === "published")
      .map((r: { title?: string }) => String(r.title || "").toLowerCase())
  );

  for (const category of categories) {
    if (!["trait", "prophecy", "fact", "riddle"].includes(category)) continue;

    const { count } = await supabase
      .from("daily_growth_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("category", category);

    if ((count || 0) > 0) continue;

    const seed = pickSeed(category, dayIndex, usedTitles);
    if (!seed) {
      errors.push(`No seed for ${category}`);
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
      usedTitles.add(seed.title.toLowerCase());
      await delay(350);
    } catch (e) {
      errors.push(`${category}: ${String((e as Error)?.message || e)}`);
    }
  }

  return { created, errors };
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

    let autofill: { created: string[]; errors: string[] } = { created: [], errors: [] };
    let spool: Record<string, unknown> = {};

    if (!emailOnly) {
      const cats = await enabledCategories(supabase);
      autofill = await ensureQueueFromBibleApi(supabase, cats);

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

    return json({
      ok: true,
      autofill,
      spool,
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
