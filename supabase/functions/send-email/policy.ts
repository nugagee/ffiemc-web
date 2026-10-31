// Purpose gates for send-email. No Deno, network, or secrets.

export const PUBLIC_PURPOSES = new Set([
  "contact",
  "testimony_submit",
  "testimony_published",
  "prayer_submit",
  "prayer_reply",
  "pastor_assignment",
  "pastor_credentials",
  "program_registration",
  "membership",
  "membership_approved",
  "volunteer",
  "volunteer_followup",
  "member_announcement",
  "meeting_invite",
  "media_contribution",
  "experience_survey",
]);

/** Admin session only. Recipients are loaded from the payment, never from the body. */
export const CONTRIBUTION_PAYMENT_UPDATED = "contribution_payment_updated";

export function consumesBulkEmailQuota(purpose: string, recipientCount: number) {
  const normalized = String(purpose || "").trim().toLowerCase();
  // One member confirmation plus the church notification inbox. These are
  // transactional, same as contact or a new contribution alert, and must not
  // take a slot from the daily scheduled/bulk budget (OTP keeps that reserve).
  if (normalized === CONTRIBUTION_PAYMENT_UPDATED) return false;
  const bulkPurpose = normalized === "member_announcement" || normalized === "meeting_invite";
  const bulkCompose = (normalized === "compose" || normalized === "") && recipientCount > 1;
  return bulkPurpose || bulkCompose;
}

export function gatePurpose(input: {
  sessionOk: boolean;
  bearerIsService: boolean;
  purpose: string;
}): { ok: true } | { ok: false; status: number; error: string } {
  const purpose = String(input.purpose || "").trim().toLowerCase();
  if (purpose === CONTRIBUTION_PAYMENT_UPDATED) {
    if (!input.sessionOk) {
      return { ok: false, status: 403, error: "Admin session required" };
    }
    return { ok: true };
  }
  const internalAdminAlert = input.bearerIsService && purpose === "daily_growth_alert";
  if (!input.sessionOk && !internalAdminAlert && !PUBLIC_PURPOSES.has(purpose)) {
    return { ok: false, status: 403, error: "Purpose not allowed for public sends" };
  }
  return { ok: true };
}
