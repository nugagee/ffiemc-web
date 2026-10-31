// Supabase Edge Function: transactional email via Resend (admin compose + public notifications).
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Secrets: RESEND_API_KEY, FROM_EMAIL (e.g. "FFIEMC <contact@ffiem.org>")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildContributionPaymentUpdatedMail,
  readContributionPaymentId,
  resolveContributionPaymentRecipients,
} from "./contributionPayment.ts";
import {
  CONTRIBUTION_PAYMENT_UPDATED,
  PUBLIC_PURPOSES,
  consumesBulkEmailQuota,
  gatePurpose,
} from "./policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ADMIN = "adenugaolajideadewale@gmail.com";

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
    const anonKey = String(Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("ANON_KEY") || "").trim();
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const apiKeyHeader = String(req.headers.get("apikey") || "").trim();
    if (!token && !apiKeyHeader) return json({ error: "Unauthorized" }, 401);

    // Read body early so public purposes can authenticate via anon apikey
    // even when Authorization carries a stale admin_sessions token.
    const body = await req.json().catch(() => ({}));
    const purposeHint = String(body.purpose || "").trim().toLowerCase();

    const { data: sessionRow } = token
      ? await supabase
          .from("admin_sessions")
          .select("admin_id, expires_at, admins(id, email, full_name, is_active)")
          .eq("token", token)
          .maybeSingle()
      : { data: null };

    const adminActive = sessionRow?.admins?.is_active !== false;
    const sessionOk =
      Boolean(sessionRow?.admin_id) &&
      adminActive &&
      (!sessionRow.expires_at || new Date(sessionRow.expires_at) > new Date());

    let allowed = sessionOk;
    const bearerIsAnon = Boolean(anonKey) && (token === anonKey || apiKeyHeader === anonKey);
    const bearerIsService =
      Boolean(serviceKey) && (token === serviceKey || apiKeyHeader === serviceKey);
    const jwtRole = jwtRoleOf(token) || jwtRoleOf(apiKeyHeader);
    const looksLikeAnon = bearerIsAnon || jwtRole === "anon";

    if (!allowed && looksLikeAnon) {
      allowed = true;
    }

    // Public transactional mail: accept project anon JWT (Authorization or apikey)
    // even if SUPABASE_ANON_KEY env is missing/mismatched in the function runtime.
    if (!allowed && PUBLIC_PURPOSES.has(purposeHint) && (jwtRole === "anon" || jwtRole === "authenticated")) {
      allowed = true;
    }

    // spool-daily-growth calls this with the service role to email church admins.
    // The purpose is not public, so an anon key cannot send it.
    if (!allowed && bearerIsService && purposeHint === "daily_growth_alert") {
      allowed = true;
    }

    if (!allowed && token) {
      const anonClient = createClient(supabaseUrl, anonKey || serviceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await anonClient.auth.getUser();
      allowed = Boolean(userData?.user?.id);
    }

    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const purpose = String(body.purpose || (sessionOk ? "compose" : "")).trim().toLowerCase();
    const gate = gatePurpose({ sessionOk, bearerIsService, purpose });
    if (!gate.ok) {
      return json({ error: gate.error, purpose }, gate.status);
    }

    if (purpose === CONTRIBUTION_PAYMENT_UPDATED) {
      return await deliverContributionPaymentUpdated({
        supabase,
        token,
        resendApiKey,
        fromEmail,
        contributionId: readContributionPaymentId(body),
      });
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

    if (consumesBulkEmailQuota(purpose, recipients.length)) {
      const claim = await supabase.rpc("claim_bulk_email_slots", { p_count: recipients.length });
      const missingGuard = claim.error && /claim_bulk_email_slots|schema cache|Could not find the function/i.test(claim.error.message || "");
      if (claim.error && !missingGuard) {
        return json({ error: claim.error.message }, 500);
      }
      if (!claim.error && Number(claim.data?.granted ?? 0) < recipients.length) {
        return json(
          {
            error: claim.data?.reason || "Daily email budget reached. This send was stopped so OTP and other transactional mail can still go out.",
            code: "email_budget",
            granted: Number(claim.data?.granted ?? 0),
            requested: recipients.length,
          },
          429
        );
      }
    }

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

async function deliverContributionPaymentUpdated(opts: {
  supabase: ReturnType<typeof createClient>;
  token: string;
  resendApiKey: string;
  fromEmail: string;
  contributionId: string;
}) {
  const id = opts.contributionId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: "Valid contribution id required" }, 400);
  }

  const { data, error } = await opts.supabase.rpc("contribution_payment_email_context", {
    p_token: opts.token,
    p_id: id,
  });
  if (error) {
    const message = error.message || "Could not load this payment";
    const status = /permission/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 400;
    return json({ error: message }, status);
  }

  const row = (data || {}) as Record<string, unknown>;
  // Empty body: do not honour adminEmail / to from the browser.
  const adminEmails = await loadAdminEmails(opts.supabase, {});
  const resolved = resolveContributionPaymentRecipients({
    memberEmail: row.member_email,
    adminEmails,
  });

  let memberSent = false;
  let memberReason: string | null = resolved.member ? null : "no_email";
  let adminSent = false;
  let adminReason: string | null = resolved.admins.length ? null : "no_admin";

  if (resolved.member) {
    try {
      const mail = buildContributionPaymentUpdatedMail(row, "member");
      await resendSend(opts.resendApiKey, {
        from: opts.fromEmail,
        to: [resolved.member],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      memberSent = true;
      memberReason = null;
    } catch {
      memberSent = false;
      memberReason = "send_failed";
    }
  }

  if (resolved.admins.length) {
    try {
      const mail = buildContributionPaymentUpdatedMail(row, "admin");
      await resendSend(opts.resendApiKey, {
        from: opts.fromEmail,
        to: resolved.admins,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      adminSent = true;
      adminReason = null;
    } catch {
      adminSent = false;
      adminReason = "send_failed";
    }
  }

  const ok = memberSent || adminSent;
  return json(
    {
      ok,
      purpose: CONTRIBUTION_PAYMENT_UPDATED,
      memberSent,
      memberReason,
      adminSent,
      adminReason,
    },
    ok ? 200 : 502
  );
}

function jwtRoleOf(token = "") {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return "";
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return String(payload.role || "").toLowerCase();
  } catch {
    return "";
  }
}

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
