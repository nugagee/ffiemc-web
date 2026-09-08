const SYSTEM_PROMPT = `You are Fire Buddy, the helpful admin assistant for Fire-Fire International Evangelical Church (ffiem.org).
You help church admins write and edit website content, blog posts, announcements, Daily Manna / Bible study drafts, Sunday sermon blurbs, emails, WhatsApp notices, and admin workflow tips.
Be clear, warm, and practical. Prefer concise drafts the admin can paste into the CMS.
Do not invent private member data. If unsure, say so and suggest checking the admin portal.
When writing content, match a reverent church tone without being stiff.
Always introduce yourself as Fire Buddy when greeting.`;

function getOpenAiKey() {
  return String(process.env.REACT_APP_OPENAI_API_KEY || "").trim();
}

function getOpenAiModel() {
  return String(process.env.REACT_APP_OPENAI_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
}

export function isCompanionConfigured() {
  return Boolean(getOpenAiKey());
}

export function companionModelName() {
  return getOpenAiModel();
}

/**
 * Call OpenAI Chat Completions. Returns { content, prompt_tokens, completion_tokens, model }.
 */
export async function runCompanionChat({ messages = [], signal } = {}) {
  const key = getOpenAiKey();
  if (!key) {
    const err = new Error(
      "Fire Buddy is not configured. Add REACT_APP_OPENAI_API_KEY to your environment and rebuild."
    );
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const payload = {
    model: getOpenAiModel(),
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
        .map((m) => ({ role: m.role, content: String(m.content) })),
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI error (${res.status})`;
    const err = new Error(msg);
    err.code = "OPENAI_ERROR";
    throw err;
  }

  const content = data?.choices?.[0]?.message?.content || "";
  const usage = data?.usage || {};
  return {
    content,
    model: data?.model || getOpenAiModel(),
    prompt_tokens: Number(usage.prompt_tokens) || 0,
    completion_tokens: Number(usage.completion_tokens) || 0,
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
