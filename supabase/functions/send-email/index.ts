// Supabase Edge Function: send transactional email via Resend (same pattern as AdaptBuddy digests).
// Deploy: supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="FFIEMC <noreply@yourdomain.com>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Prefer custom admin session token used by FFIEMC admin auth
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

    // Fallback: allow authenticated supabase JWT for workers
    let allowed = sessionOk;
    if (!allowed) {
      const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY"), {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await anon.auth.getUser();
      allowed = Boolean(userData?.user?.id);
    }
    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const toList = Array.isArray(body.to) ? body.to : String(body.to || "").split(/[,;\n]+/);
    const recipients = toList.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    if (!recipients.length) return json({ error: "No recipients" }, 400);
    if (!body.subject || !String(body.subject).trim()) return json({ error: "Subject required" }, 400);

    const text = String(body.text || body.html || "").trim();
    if (!text) return json({ error: "Message body required" }, 400);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: String(body.subject).trim(),
        text,
        html: body.html || undefined,
        reply_to: body.replyTo || undefined,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ error: result.message || "Resend failed", detail: result }, 502);
    }

    return json({ ok: true, id: result.id, provider: "resend" });
  } catch (err) {
    return json({ error: err?.message || "Send failed" }, 500);
  }
});

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
