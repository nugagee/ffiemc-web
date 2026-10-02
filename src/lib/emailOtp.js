import { getSupabase } from "./supabase";

function functionsUrl() {
  const base = String(process.env.REACT_APP_SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("Supabase is not configured");
  return `${base}/functions/v1/email-otp`;
}

/**
 * Ask the email-otp edge function to email a 6-digit code.
 * The code is generated and stored in Postgres and sent with Resend.
 * It is not returned to the browser.
 */
export async function requestEmailOtp({ email, purpose, payload, challengeId, asAdmin = false }) {
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Supabase is not configured");
  const headers = {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
  if (purpose === "admin_membership" || asAdmin) {
    const token = localStorage.getItem("ffiemc_admin_token") || sessionStorage.getItem("ffiemc_admin_token") || "";
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(functionsUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "send",
      email,
      purpose,
      payload: payload || {},
      challengeId: challengeId || null,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || body.error || "Could not send the verification code");
    error.suggestion = body.suggestion || "";
    throw error;
  }
  return {
    challengeId: body.challengeId,
    expiresAt: body.expiresAt,
    resendAvailableAt: body.resendAvailableAt,
  };
}

export async function completeEmailOtp(challengeId, code) {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.rpc("complete_email_otp", {
    p_challenge_id: challengeId,
    p_code: String(code || "").trim(),
  });
  if (error) throw new Error(error.message);
  return data;
}
