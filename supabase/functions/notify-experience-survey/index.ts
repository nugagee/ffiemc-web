// Notify superadmin via Resend when an experience survey is submitted.
// Deploy: supabase functions deploy notify-experience-survey --no-verify-jwt
// Secrets: RESEND_API_KEY, FROM_EMAIL (same as send-email)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ADMIN = "adenugaolajideadewale@gmail.com";

/** Labels for each comfort survey step (keep in sync with src/features/experienceSurvey/surveyHelpers.js). */
const SURVEY_FEATURE_LABELS: Record<string, string> = {
  worship: "Worship & services",
  content: "Teachings & content",
  community: "Community connection",
  prayer_care: "Prayer & care",
  overall_ease: "Ease of using the website",
};

const SURVEY_FEATURE_ORDER = [
  "worship",
  "content",
  "community",
  "prayer_care",
  "overall_ease",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || Deno.env.get("DIGEST_FROM_EMAIL");
    if (!resendApiKey || !fromEmail) {
      return json(
        {
          error: "Missing RESEND_API_KEY or FROM_EMAIL secrets",
          hint: "Set them with: supabase secrets set RESEND_API_KEY=... FROM_EMAIL=...",
        },
        500
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Supabase env not configured" }, 500);
    }

    // Public callers use the anon JWT; still require a Bearer token.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const surveyId = String(body.surveyId || body.survey_id || "").trim();
    if (!surveyId) return json({ error: "surveyId required" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: survey, error: surveyErr } = await supabase
      .from("experience_survey_responses")
      .select(
        "id, name, email, audience, path, overall_rating, comfort_scores, average_comfort, improvements, wished_features, feedback_text, metadata, created_at"
      )
      .eq("id", surveyId)
      .maybeSingle();

    if (surveyErr) return json({ error: surveyErr.message }, 500);
    if (!survey) return json({ error: "Survey not found" }, 404);

    const createdAt = survey.created_at ? new Date(survey.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > 15 * 60 * 1000) {
      return json({ error: "Survey notify window expired" }, 410);
    }

    const meta = survey.metadata && typeof survey.metadata === "object" ? survey.metadata : {};
    if (meta.email_notified) {
      return json({ ok: true, skipped: true, reason: "already_notified" });
    }

    const { data: settingsRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "site")
      .maybeSingle();

    const settings = settingsRow?.value || {};
    const church = settings?.pages?.contact?.church || {};
    const recipients = parseEmails(
      settings.notificationEmail,
      settings.secondaryNotificationEmails,
      church.notificationEmail,
      church.secondaryNotificationEmails,
      body.adminEmail,
      body.secondaryEmails
    );
    if (!recipients.length) recipients.push(DEFAULT_ADMIN);

    const displayName = String(survey.name || "").trim() || "Anonymous visitor";
    const rating = String(survey.overall_rating ?? "—");
    const avg =
      survey.average_comfort != null && Number.isFinite(Number(survey.average_comfort))
        ? String(survey.average_comfort)
        : "—";
    const siteOrigin = String(body.siteOrigin || "https://ffiem.org").replace(/\/$/, "");
    const inboxUrl = `${siteOrigin}/admin/experience-surveys`;
    const comfortScores =
      survey.comfort_scores && typeof survey.comfort_scores === "object" ? survey.comfort_scores : {};
    const comfortRows = formatComfortScoreRows(comfortScores);
    const improvements = String(survey.improvements || "").trim() || "(none)";
    const wished = String(survey.wished_features || "").trim() || "(none)";
    const emailAddr = String(survey.email || "").trim() || "Not provided";
    const audience = String(survey.audience || "visitor");
    const pagePath = String(survey.path || "/");

    const subjectTpl =
      settings?.emailSubjects?.experienceSurvey ||
      "New website experience survey — {rating}/5 — {fullName}";
    const subject = subjectTpl
      .replace(/\{fullName\}/g, displayName)
      .replace(/\{rating\}/g, rating)
      .replace(/\{averageComfort\}/g, avg)
      .replace(/\{[a-zA-Z0-9_]+\}/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const comfortText = comfortRows
      .map((row) => `  - ${row.label}: ${row.score}/5`)
      .join("\n");

    const text =
      `A new website experience survey was submitted.\n\n` +
      `── Step 1: About you ──\n` +
      `Name: ${displayName}\n` +
      `Email: ${emailAddr}\n` +
      `Audience: ${audience}\n` +
      `Page: ${pagePath}\n\n` +
      `── Step 2: Comfort with each area (1–5) ──\n` +
      `${comfortText || "  (no comfort scores)"}\n` +
      `Average comfort: ${avg}/5\n\n` +
      `── Step 3: Overall experience ──\n` +
      `Overall rating: ${rating}/5\n\n` +
      `── Step 4: What to improve ──\n` +
      `${improvements}\n\n` +
      `── Step 5: Features they would like ──\n` +
      `${wished}\n\n` +
      `Review in admin: ${inboxUrl}\n`;

    const comfortHtmlRows = comfortRows
      .map(
        (row) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#374151">${escapeHtml(row.label)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;text-align:right;white-space:nowrap">${escapeHtml(String(row.score))}/5</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 16px">New website experience survey</h2>

        <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b">Step 1 — About you</h3>
        <table style="width:100%;border-collapse:collapse;margin:0 0 16px;background:#fafafa;border-radius:8px">
          <tr><td style="padding:8px 12px;color:#6b7280;width:140px">Name</td><td style="padding:8px 12px;font-weight:600">${escapeHtml(displayName)}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Email</td><td style="padding:8px 12px">${escapeHtml(emailAddr)}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Audience</td><td style="padding:8px 12px">${escapeHtml(audience)}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Page</td><td style="padding:8px 12px">${escapeHtml(pagePath)}</td></tr>
        </table>

        <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b">Step 2 — Comfort with each area</h3>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px">How comfortable they feel with each part of the website (1 = low, 5 = high).</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 8px;background:#fafafa;border-radius:8px">
          ${comfortHtmlRows || `<tr><td style="padding:12px;color:#6b7280">(no comfort scores)</td></tr>`}
          <tr>
            <td style="padding:10px 12px;font-weight:600">Average comfort</td>
            <td style="padding:10px 12px;font-weight:700;text-align:right;color:#b91c1c">${escapeHtml(avg)}/5</td>
          </tr>
        </table>

        <h3 style="margin:16px 0 8px;font-size:15px;color:#991b1b">Step 3 — Overall experience</h3>
        <p style="margin:0 0 16px;font-size:18px;font-weight:700">${escapeHtml(rating)}<span style="font-size:14px;font-weight:500;color:#6b7280"> / 5</span></p>

        <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b">Step 4 — What to improve</h3>
        <pre style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:8px;margin:0 0 16px">${escapeHtml(improvements)}</pre>

        <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b">Step 5 — Features they would like</h3>
        <pre style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:8px;margin:0 0 16px">${escapeHtml(wished)}</pre>

        <p style="margin:20px 0 0"><a href="${escapeHtml(inboxUrl)}">Open experience surveys in admin</a></p>
      </div>
    `;

    const replyTo = String(survey.email || "").trim() || undefined;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        text,
        html,
        reply_to: replyTo,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ error: result.message || "Resend failed", detail: result }, 502);
    }

    await supabase
      .from("experience_survey_responses")
      .update({
        metadata: {
          ...meta,
          email_notified: true,
          email_notified_at: new Date().toISOString(),
          email_provider: "resend",
          email_id: result.id || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", surveyId);

    // anonKey unused except documenting public auth path; keep lint quiet
    void anonKey;

    return json({ ok: true, id: result.id, provider: "resend", recipients });
  } catch (err) {
    return json({ error: err?.message || "Send failed" }, 500);
  }
});

function parseEmails(...values) {
  const seen = new Set();
  const out = [];
  String(values.flat().filter(Boolean).join(","))
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    .forEach((email) => {
      if (!seen.has(email)) {
        seen.add(email);
        out.push(email);
      }
    });
  return out;
}

function formatComfortScoreRows(scores: Record<string, unknown>) {
  const keys = [
    ...SURVEY_FEATURE_ORDER,
    ...Object.keys(scores || {}).filter((k) => !SURVEY_FEATURE_ORDER.includes(k)),
  ];
  const seen = new Set<string>();
  return keys
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((key) => {
      const raw = scores?.[key];
      const num = Number(raw);
      const score = Number.isFinite(num) ? num : raw != null && String(raw).trim() ? String(raw) : "—";
      return {
        key,
        label: SURVEY_FEATURE_LABELS[key] || key.replace(/_/g, " "),
        score,
      };
    })
    .filter((row) => scores?.[row.key] != null || SURVEY_FEATURE_ORDER.includes(row.key));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
