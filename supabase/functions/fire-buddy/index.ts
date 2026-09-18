// Fire Buddy — OpenAI chat via Edge Function (API key stays server-side).
// Deploy: supabase functions deploy fire-buddy --no-verify-jwt
// Secrets: supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Fire Buddy, the helpful admin assistant for Fire-Fire International Evangelical Church (ffiem.org).
You help church admins write and edit website content, blog posts, announcements, Daily Manna / Bible study drafts, Sunday sermon blurbs, emails, WhatsApp notices, and admin workflow tips.
Be clear, warm, and practical. Prefer concise drafts the admin can paste into the CMS.
Do not invent private member data. If unsure, say so and suggest checking the admin portal.
When writing content, match a reverent church tone without being stiff.
Always introduce yourself as Fire Buddy when greeting.`;

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
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const model = (Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini").trim() || "gpt-4o-mini";
    if (!openaiKey) {
      return json(
        {
          error: "Fire Buddy is not configured on the server",
          hint: "Set OPENAI_API_KEY with: supabase secrets set OPENAI_API_KEY=sk-...",
        },
        503
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    if (!sessionOk) return json({ error: "Unauthorized" }, 401);

    // Confirm Fire Buddy permission (or legacy utilities grant)
    const { data: allowed, error: permErr } = await supabase.rpc("admin_ai_quota", {
      p_token: token,
    });
    if (permErr) {
      return json({ error: permErr.message || "Permission check failed" }, 403);
    }
    if (allowed?.limit_reached && allowed?.limit_reason === "disabled") {
      return json({ error: "Fire Buddy access is disabled for this admin" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const cleaned = messages
      .filter((m: { role?: string; content?: string }) =>
        m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim()
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: String(m.content),
      }))
      .slice(-40);

    if (!cleaned.length) return json({ error: "messages required" }, 400);

    const payload = {
      model,
      temperature: 0.7,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cleaned],
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json(
        { error: data?.error?.message || `OpenAI error (${res.status})` },
        res.status >= 400 && res.status < 600 ? res.status : 502
      );
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const usage = data?.usage || {};

    return json({
      content,
      model: data?.model || model,
      prompt_tokens: Number(usage.prompt_tokens) || 0,
      completion_tokens: Number(usage.completion_tokens) || 0,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
