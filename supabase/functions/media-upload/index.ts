// Signed uploads into the public media bucket.
// Deploy: supabase functions deploy media-upload --no-verify-jwt
// Admin calls send the site admin_login token (x-admin-token). Receipt uploads
// are unauthenticated and can only create a new file under contributions/.
// The anon key cannot insert, update, or delete objects directly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { assertDeletableMediaPath, planMediaUpload } from "./policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminToken(req: Request) {
  const header = (req.headers.get("x-admin-token") || "").trim();
  if (header) return header;
  const auth = req.headers.get("Authorization") || "";
  return auth.replace(/^Bearer\s+/i, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "sign");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json({ error: "Storage upload is not configured" }, 503);
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === "delete") {
      let path = "";
      try {
        path = assertDeletableMediaPath(String(body.path || ""));
      } catch (e) {
        return json({ error: String((e as Error).message || e) }, 400);
      }
      const purpose = path.startsWith("daily-growth/") ? "daily_growth" : "image";
      const { error } = await supabase.rpc("admin_authorize_media_upload", {
        p_token: adminToken(req),
        p_purpose: purpose,
      });
      if (error) return json({ error: error.message || "Unauthorized" }, 401);
      const removed = await supabase.storage.from("media").remove([path]);
      if (removed.error && !/not found/i.test(removed.error.message || "")) {
        return json({ error: removed.error.message }, 400);
      }
      return json({ ok: true, path });
    }

    let plan;
    try {
      plan = planMediaUpload({
        purpose: String(body.purpose || ""),
        contentType: String(body.contentType || ""),
        fileName: String(body.fileName || ""),
        size: Number(body.size || 0),
        imageDate: String(body.imageDate || ""),
        nonce: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      });
    } catch (e) {
      return json({ error: String((e as Error).message || e) }, 400);
    }

    if (plan.purpose !== "receipt") {
      const purpose = plan.purpose === "document" ? "document" : plan.purpose === "daily_growth" ? "daily_growth" : "image";
      const { error } = await supabase.rpc("admin_authorize_media_upload", {
        p_token: adminToken(req),
        p_purpose: purpose,
      });
      if (error) return json({ error: error.message || "Unauthorized" }, 401);
    }

    const signed = await supabase.storage.from("media").createSignedUploadUrl(plan.path, { upsert: false });
    if (signed.error || !signed.data?.token) {
      return json({ error: signed.error?.message || "Could not start upload" }, 500);
    }
    const pub = supabase.storage.from("media").getPublicUrl(signed.data.path || plan.path);
    return json({
      ok: true,
      path: signed.data.path || plan.path,
      token: signed.data.token,
      contentType: plan.contentType,
      publicUrl: pub.data.publicUrl,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
