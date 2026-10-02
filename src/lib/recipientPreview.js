/** Normalise preview RPC results from both the older array shape and the capped object. */
export function readRecipientPreview(result) {
  if (Array.isArray(result)) {
    return {
      recipients: result,
      email_count: result.length,
      audience_count: result.length,
      max_recipients: null,
    };
  }
  const recipients = Array.isArray(result?.recipients) ? result.recipients : [];
  return {
    recipients,
    email_count: Number(result?.email_count ?? recipients.length) || 0,
    audience_count: Number(result?.audience_count ?? recipients.length) || 0,
    max_recipients: result?.max_recipients ?? null,
  };
}

export function previewSummary(preview, { sms = false } = {}) {
  if (!preview) return "";
  const max = preview.max_recipients ? ` Max ${preview.max_recipients} per send.` : "";
  const extra = preview.audience_count > preview.email_count
    ? ` ${preview.audience_count} people match this category and team. Priority members in that audience go first, then Member records fill the rest. One email is sent per household address.`
    : " One email is sent per household address.";
  const smsNote = sms ? " SMS still goes to everyone in the audience who has a phone." : "";
  return `${preview.email_count} email recipient(s).${max}${extra}${smsNote}`;
}
