// Public read-only feed of scheduled content emails Resend accepted.
// Deploy: supabase functions deploy content-email-feed --no-verify-jwt
// No secrets beyond the usual SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// Returns titles, excerpts, categories, and https://ffiem.org links only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300",
};

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
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Feed unavailable" }, 503);
    }

    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") || 14);
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.rpc("public_content_email_feed", {
      p_days: Number.isFinite(days) ? days : 14,
    });
    if (error) {
      return json({ error: "Feed unavailable" }, 503);
    }

    return json({ sends: Array.isArray(data) ? data : [] });
  } catch {
    return json({ error: "Feed unavailable" }, 503);
  }
});
