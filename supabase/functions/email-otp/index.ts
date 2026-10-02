// Email verification codes for church registration.
// Membership records live in church_members, not Supabase Auth, so this uses the
// same Resend transport as send-email instead of Supabase Auth OTP.
// Deploy: supabase functions deploy email-otp --no-verify-jwt
// Secrets: RESEND_API_KEY, FROM_EMAIL (already used by send-email)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://ffiem.org";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || Deno.env.get("DIGEST_FROM_EMAIL");
    if (!resendApiKey || !fromEmail) {
      return json({ error: "Missing RESEND_API_KEY or FROM_EMAIL secrets" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const apiKeyHeader = String(req.headers.get("apikey") || "").trim();
    if (!token && !apiKeyHeader) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "send").trim().toLowerCase();
    if (action !== "send") return json({ error: "Unsupported action" }, 400);

    const purpose = String(body.purpose || "").trim().toLowerCase();
    const allowed = ["membership", "admin_membership", "account_recovery", "beneficiary_link"];
    if (!allowed.includes(purpose)) {
      return json({ error: "Purpose not allowed" }, 403);
    }

    const email = String(body.email || "").trim().toLowerCase();
    const payload = body.payload && typeof body.payload === "object" ? { ...body.payload } : {};
    const challengeId = body.challengeId ? String(body.challengeId) : null;
    const householdOtp = purpose === "account_recovery" || purpose === "beneficiary_link";

    if (purpose === "admin_membership" || householdOtp) {
      const adminId = await adminIdForToken(supabase, token);
      if (purpose === "admin_membership" && !adminId) {
        return json({ error: "Admin sign-in is required to send this code" }, 401);
      }
      if (adminId) {
        payload.by_admin = true;
        payload.admin_id = adminId;
      } else {
        delete payload.by_admin;
        delete payload.admin_id;
      }
    } else {
      delete payload.by_admin;
      delete payload.admin_id;
    }

    let sendTo = email;
    if (!householdOtp) {
      const { data: check, error: checkError } = await supabase.rpc("validate_public_email", {
        p_email: email,
        p_required: true,
      });
      if (checkError) return json({ error: checkError.message }, 400);
      if (!check?.ok) {
        return json({ error: check?.message || "Enter a valid email address", suggestion: check?.suggestion || "" }, 400);
      }
      sendTo = String(check.email || email);
      const domain = sendTo.split("@")[1] || "";
      const mx = await domainAcceptsMail(domain);
      if (!mx.ok) return json({ error: mx.reason || "This email domain does not accept mail" }, 400);
    }

    const { data: issued, error: issueError } = await supabase.rpc("service_issue_email_otp", {
      p_email: householdOtp ? "recovery@ffiem.org" : sendTo,
      p_purpose: purpose,
      p_payload: payload,
      p_challenge_id: challengeId,
    });
    if (issueError) return json({ error: issueError.message }, 400);
    const code = String(issued?.code || "");
    const id = String(issued?.challenge_id || "");
    const recipient = String(issued?.email || sendTo || "");
    if (!code || !id || !recipient) return json({ error: "Could not create a verification code" }, 500);
    if (householdOtp) {
      const domain = recipient.split("@")[1] || "";
      const mx = await domainAcceptsMail(domain);
      if (!mx.ok) return json({ error: mx.reason || "This email domain does not accept mail" }, 400);
    }

    const verifyUrl = `${SITE_URL}/verify-email?c=${encodeURIComponent(id)}`;
    const intro = purpose === "beneficiary_link"
      ? "Someone is asking to register as part of your household."
      : purpose === "account_recovery"
        ? "Someone confirmed that this email is already registered with the church."
        : "Use this code to finish church registration.";
    const text =
      `${intro}\n\nYour Fire-Fire verification code is ${code}.\n\n` +
      `It expires in 10 minutes.\n` +
      (purpose === "admin_membership" ? `Or open ${verifyUrl}\n\n` : "\n") +
      `If you did not expect this, you can ignore this email.\n\n` +
      `Fire-Fire International Evangelical Church\n${SITE_URL}`;

    await resendSend(resendApiKey, {
      from: fromEmail,
      to: [recipient],
      subject: "Your Fire-Fire verification code",
      text,
      html: otpHtml(code, verifyUrl, purpose === "admin_membership"),
    });

    return json({
      ok: true,
      challengeId: id,
      expiresAt: issued.expires_at,
      resendAvailableAt: issued.resend_available_at,
    });
  } catch (err) {
    return json({ error: err?.message || "Could not send the verification code" }, 500);
  }
});

async function adminIdForToken(supabase: ReturnType<typeof createClient>, token: string) {
  if (!token) return "";
  const { data } = await supabase
    .from("admin_sessions")
    .select("admin_id, expires_at, admins(id, is_active)")
    .eq("token", token)
    .maybeSingle();
  const active = data?.admins?.is_active !== false;
  const fresh = !data?.expires_at || new Date(data.expires_at) > new Date();
  if (!data?.admin_id || !active || !fresh) return "";
  return String(data.admin_id);
}

async function domainAcceptsMail(domain: string): Promise<{ ok: boolean; reason?: string }> {
  if (!domain || !domain.includes(".")) return { ok: false, reason: "Enter a valid email address" };
  const missing = (err: unknown) => /not found|nxdomain|no records|enotfound/i.test(String((err as Error)?.message || err));
  try {
    const mx = await Deno.resolveDns(domain, "MX");
    if (Array.isArray(mx) && mx.length > 0) return { ok: true };
  } catch (err) {
    if (!missing(err)) return { ok: true };
  }
  try {
    const a = await Deno.resolveDns(domain, "A");
    if (Array.isArray(a) && a.length > 0) return { ok: true };
  } catch (err) {
    if (!missing(err)) return { ok: true };
    return { ok: false, reason: "This email domain does not accept mail" };
  }
  return { ok: false, reason: "This email domain does not accept mail" };
}

function otpHtml(code: string, verifyUrl: string, includeLink: boolean) {
  const link = includeLink
    ? `<p style="margin:16px 0 0"><a href="${verifyUrl}" style="color:#b91c1c">Enter the code on the church website</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#f3f4f6;padding:24px">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #fee2e2">
      <tr><td style="background:#b91c1c;color:#fff;padding:20px 24px">
        <p style="margin:0;letter-spacing:.12em;font-size:12px;text-transform:uppercase">Fire-Fire International Evangelical Church</p>
        <h1 style="margin:8px 0 0;font-size:22px">Verification code</h1>
      </td></tr>
      <tr><td style="padding:24px;color:#1f2937">
        <p style="margin:0 0 12px">Enter this code to finish registration. It expires in 10 minutes.</p>
        <p style="margin:0;font-size:32px;letter-spacing:.3em;font-weight:bold;color:#b91c1c">${code}</p>
        ${link}
      </td></tr>
    </table>
  </body></html>`;
}

async function resendSend(
  apiKey: string,
  payload: { from: string; to: string[]; subject: string; text: string; html?: string }
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Resend failed");
  return result;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
