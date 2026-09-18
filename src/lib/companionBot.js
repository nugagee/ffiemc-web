import { getAdminToken } from "./api";

function getSupabaseUrl() {
  return String(process.env.REACT_APP_SUPABASE_URL || "").trim().replace(/\/$/, "");
}

function getFireBuddyUrl() {
  const explicit = String(process.env.REACT_APP_FIRE_BUDDY_URL || "").trim();
  if (explicit) return explicit;
  const base = getSupabaseUrl();
  return base ? `${base}/functions/v1/fire-buddy` : "";
}

export function isCompanionConfigured() {
  return Boolean(getFireBuddyUrl());
}

export function companionModelName() {
  return String(process.env.REACT_APP_OPENAI_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
}

/**
 * Call Fire Buddy Edge Function (OpenAI key stays in Supabase secrets).
 * Returns { content, prompt_tokens, completion_tokens, model }.
 */
export async function runCompanionChat({ messages = [], signal } = {}) {
  const url = getFireBuddyUrl();
  if (!url) {
    const err = new Error(
      "Fire Buddy is not configured. Set REACT_APP_SUPABASE_URL (and deploy the fire-buddy function)."
    );
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const token = getAdminToken();
  if (!token) {
    const err = new Error("Please sign in again to use Fire Buddy.");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const anon = String(process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(anon ? { apikey: anon } : {}),
    },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.hint || `Fire Buddy error (${res.status})`;
    const err = new Error(msg);
    err.code = res.status === 503 ? "NOT_CONFIGURED" : "OPENAI_ERROR";
    throw err;
  }

  return {
    content: data?.content || "",
    model: data?.model || companionModelName(),
    prompt_tokens: Number(data?.prompt_tokens) || 0,
    completion_tokens: Number(data?.completion_tokens) || 0,
  };
}

export function limitReachedMessage(quota) {
  const reason = quota?.limit_reason;
  if (reason === "disabled") {
    return "Your Fire Buddy access has been paused by a superadmin. Please contact leadership if you need it re-enabled.";
  }
  if (reason === "tokens") {
    return "You’ve reached your monthly Fire Buddy token limit. Fire Buddy is resting until next month — or ask a superadmin to raise your allowance.";
  }
  if (reason === "requests") {
    return "You’ve reached your monthly Fire Buddy request limit. Pause chats until next month, or ask a superadmin to increase your quota.";
  }
  return "Your Fire Buddy usage limit has been reached for this month.";
}
