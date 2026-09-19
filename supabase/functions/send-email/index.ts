// Supabase Edge Function: transactional email via Resend (admin compose + public notifications).
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Secrets: RESEND_API_KEY, FROM_EMAIL (e.g. "FFIEMC <contact@ffiem.org>")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ADMIN = "adenugaolajideadewale@gmail.com";

const PUBLIC_PURPOSES = new Set([
  "contact",
  "testimony_submit",
  "testimony_published",
  "prayer_submit",
  "prayer_reply",
  "pastor_assignment",
  "pastor_credentials",
  "program_registration",
  "membership",
  "membership_approved",
  "volunteer",
  "volunteer_followup",
  "member_announcement",
  "meeting_invite",
  "media_contribution",
  "experience_survey",
]);

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
          hint: 'Set with: supabase secrets set RESEND_API_KEY=... FROM_EMAIL="FFIEMC <contact@ffiem.org>"',
        },
        500
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: sessionRow } = await supabase
      .from("admin_sessions")
      .select("admin_id, expires_at, admins(id, email, full_name, is_active)")
      .eq("token", token)
      .maybeSingle();

    const adminActive = sessionRow?.admins?.is_active !== false;
    const sessionOk =
      Boolean(sessionRow?.admin_id) &&
      adminActive &&
      (!sessionRow.expires_at || new Date(sessionRow.expires_at) > new Date());

    let allowed = sessionOk;
    const isAnon = Boolean(anonKey) && token === anonKey;

    if (!allowed && isAnon) {
      allowed = true; // purpose checked below
    }

    if (!allowed) {
      const anonClient = createClient(supabaseUrl, anonKey || serviceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await anonClient.auth.getUser();
      allowed = Boolean(userData?.user?.id);
    }

    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const purpose = String(body.purpose || (sessionOk ? "compose" : "")).trim().toLowerCase();

    if (!sessionOk && !PUBLIC_PURPOSES.has(purpose)) {
      return json({ error: "Purpose not allowed for public sends", purpose }, 403);
    }

    const notifyAdmins = Boolean(body.notifyAdmins);
    let recipients = parseEmails(body.to);
    if (notifyAdmins || (!recipients.length && body.to == null)) {
      const adminList = await loadAdminEmails(supabase, body);
      recipients = uniqueEmails([...recipients, ...adminList]);
    }
    if (!recipients.length) return json({ error: "No recipients" }, 400);

    const subject = String(body.subject || "").trim();
    const text = String(body.text || "").trim();
    const html = body.html ? String(body.html) : undefined;
    if (!subject) return json({ error: "Subject required" }, 400);
    if (!text && !html) return json({ error: "Message body required" }, 400);

    const primary = await resendSend(resendApiKey, {
      from: fromEmail,
      to: recipients,
      subject,
      text: text || stripHtml(html || ""),
      html,
      reply_to: body.replyTo || undefined,
    });

    let confirmResult = null;
    if (body.confirm?.to && (body.confirm.text || body.confirm.html)) {
      const confirmTo = parseEmails(body.confirm.to);
      if (confirmTo.length) {
        confirmResult = await resendSend(resendApiKey, {
          from: fromEmail,
          to: confirmTo,
          subject: String(body.confirm.subject || subject).trim(),
          text: String(body.confirm.text || "").trim() || stripHtml(String(body.confirm.html || "")),
          html: body.confirm.html ? String(body.confirm.html) : undefined,
          reply_to: body.confirm.replyTo || body.replyTo || undefined,
        });
      }
    }

    return json({
      ok: true,
      purpose: purpose || "compose",
      id: primary.id,
      confirmId: confirmResult?.id || null,
      provider: "resend",
      recipients,
    });
  } catch (err) {
    return json({ error: err?.message || "Send failed" }, 500);
  }
});

async function loadAdminEmails(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const fromBody = parseEmails(body.adminEmail, body.secondaryEmails, body.adminEmails);
  try {
    const { data: settingsRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "site")
      .maybeSingle();
    const settings = (settingsRow?.value || {}) as Record<string, unknown>;
    const church = ((settings.pages as Record<string, unknown>)?.contact as Record<string, unknown>)
      ?.church as Record<string, unknown> | undefined;
    const fromSettings = parseEmails(
      settings.notificationEmail,
      settings.secondaryNotificationEmails,
      church?.notificationEmail,
      church?.secondaryNotificationEmails
    );
    const list = uniqueEmails([...fromBody, ...fromSettings]);
    return list.length ? list : [DEFAULT_ADMIN];
  } catch {
    return fromBody.length ? fromBody : [DEFAULT_ADMIN];
  }
}

async function resendSend(
  apiKey: string,
  payload: {
    from: string;
    to: string[];
    subject: string;
    text: string;
    html?: string;
    reply_to?: string;
  }
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Resend failed");
  }
  return result;
}

function parseEmails(...values: unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];
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

function uniqueEmails(list: string[]) {
  return [...new Set(list.map((e) => e.toLowerCase()).filter(Boolean))];
}

function stripHtml(value: string) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
