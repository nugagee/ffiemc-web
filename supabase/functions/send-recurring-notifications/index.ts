// Weekly member announcements.
// Deploy: supabase functions deploy send-recurring-notifications --no-verify-jwt
// Auth: MEMBER_EMAILS_CRON_SECRET (or GROWTH_CRON_SECRET) via x-cron-secret or ?secret=
//       or the service role bearer. Called by invoke_scheduled_edge_crons('member_notifications').
//
// Reuses the manual send's delivery rows and the shared bulk email quota.
// One claim per notification per local occurrence date, so a retry the same week does not send again.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildRecurringAnnouncement } from "./letter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function authorized(req: Request) {
  const cronSecret =
    Deno.env.get("MEMBER_EMAILS_CRON_SECRET") ||
    Deno.env.get("GROWTH_CRON_SECRET") ||
    "";
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resendSend(apiKey: string, from: string, to: string, subject: string, text: string, html: string) {
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

type Delivery = {
  id?: string;
  email?: string;
  full_name?: string;
  channel?: string;
  status?: string;
};

type Run = {
  notification_id?: string;
  occurrence_on?: string;
  title?: string;
  subject?: string;
  body?: string;
  program_title?: string;
  header_image_url?: string;
  deliveries?: Delivery[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "1" || url.searchParams.get("preview") === "1";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (dryRun) {
      const preview = await supabase.rpc("preview_due_member_notifications");
      if (preview.error) throw preview.error;
      return json({ ok: true, dry_run: true, runs: preview.data || [] });
    }

    const claimed = await supabase.rpc("claim_due_member_notification_runs");
    if (claimed.error) throw claimed.error;
    const runs = (Array.isArray(claimed.data) ? claimed.data : []) as Run[];
    if (!runs.length) return json({ ok: true, runs: 0, sent: 0 });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || Deno.env.get("DIGEST_FROM_EMAIL");
    if (!resendApiKey || !fromEmail) return json({ error: "Missing RESEND_API_KEY or FROM_EMAIL" }, 500);

    const summary = [];
    for (const run of runs) {
      const deliveries = (run.deliveries || []).filter((row) => row.channel === "email" && String(row.email || "").trim());
      const claim = await supabase.rpc("claim_bulk_email_slots", { p_count: deliveries.length });
      const granted = Number(claim.data?.granted ?? 0);
      if (claim.error || granted < deliveries.length) {
        await supabase.rpc("release_member_notification_run", {
          p_notification_id: run.notification_id,
          p_occurrence: run.occurrence_on,
        });
        summary.push({
          notification_id: run.notification_id,
          occurrence_on: run.occurrence_on,
          held: true,
          reason: claim.data?.reason || claim.error?.message || "Daily email budget reached",
          sent: 0,
          failed: 0,
        });
        continue;
      }

      let sent = 0;
      let failed = 0;
      for (const row of deliveries) {
        const mail = buildRecurringAnnouncement({
          fullName: row.full_name,
          subject: run.subject,
          title: run.title,
          body: run.body,
          programTitle: run.program_title,
          headerImageUrl: run.header_image_url,
        });
        let status = "sent";
        let errorMessage = "";
        try {
          await resendSend(resendApiKey, fromEmail, String(row.email).trim(), mail.subject, mail.text, mail.html);
          sent += 1;
        } catch (err) {
          status = "failed";
          errorMessage = String((err as Error)?.message || err).slice(0, 500);
          failed += 1;
        }
        await supabase.rpc("mark_member_notification_delivery", {
          p_id: row.id,
          p_status: status,
          p_error: errorMessage,
        });
        await delay(300);
      }

      await supabase.rpc("finish_member_notification_occurrence", {
        p_notification_id: run.notification_id,
        p_occurrence: run.occurrence_on,
      });
      summary.push({
        notification_id: run.notification_id,
        occurrence_on: run.occurrence_on,
        held: false,
        sent,
        failed,
      });
    }

    return json({ ok: true, runs: summary.length, summary, at: new Date().toISOString() });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
