export const formatContributionPaymentDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const isReceiptImage = (url) => {
  if (!url) return false;
  const path = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(path);
};

/** Mask individual contribution amounts on public team reports. */
export const PRIVATE_AMOUNT_MASK = "₦****";

export const isPrivateContributionAmount = (entry) =>
  Boolean(entry?.amount_private) || entry?.amount == null || entry?.amount === "";

export const formatPrivateOrMoney = (entry, moneyFn) => {
  if (isPrivateContributionAmount(entry)) return PRIVATE_AMOUNT_MASK;
  return moneyFn(entry.amount);
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Client-side checks for the admin form. The RPC still accepts omitted fields. */
export function validateContributionPayment(form = {}) {
  const errors = [];
  const amountRaw = String(form.amount ?? "").trim();
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    errors.push("Enter an amount greater than 0");
  }

  const paymentDate = String(form.payment_date || "").trim();
  if (paymentDate) {
    const parsed = new Date(`${paymentDate}T12:00:00Z`);
    if (!DATE_RE.test(paymentDate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== paymentDate) {
      errors.push("Enter a valid payment date");
    }
  }

  const name = String(form.full_name || "").trim();
  if (!form.team_member_id && name.length < 2) {
    errors.push("Select a team member or enter a name");
  }

  const receipt = String(form.receipt_url || "").trim();
  if (receipt && !receipt.toLowerCase().startsWith("http")) {
    errors.push("Receipt link must start with http");
  }

  if (form.month_id !== undefined && form.month_id !== null && !String(form.month_id).trim()) {
    errors.push("Month is required");
  }

  return errors;
}

/**
 * Payload for admin_upsert_media_contribution.
 * Older callers omit keys and the database keeps the stored value.
 * The edit form sets update_month, and clear_team_member only when the
 * member select is cleared, so a blank member id does not unlink anyone.
 */
export function buildContributionUpsertData(form = {}, { editing = false } = {}) {
  const data = {
    month_id: form.month_id,
    amount: form.amount,
    full_name: form.full_name ?? "",
  };
  if (Object.prototype.hasOwnProperty.call(form, "note")) data.note = form.note ?? "";
  if (Object.prototype.hasOwnProperty.call(form, "receipt_url")) data.receipt_url = form.receipt_url ?? "";
  if (form.payment_date) data.payment_date = form.payment_date;
  if (form.team_member_id) {
    data.team_member_id = form.team_member_id;
  } else if (editing) {
    data.clear_team_member = true;
  }
  if (editing) data.update_month = true;
  return data;
}

export const formatContributionShareLine = (entry, { money, hideAmount = false } = {}) => {
  const amountLabel =
    hideAmount || isPrivateContributionAmount(entry)
      ? PRIVATE_AMOUNT_MASK
      : money(entry.amount);
  const parts = [`• ${entry.full_name} — ${amountLabel}`];
  const paidOn = formatContributionPaymentDate(entry.payment_date);
  if (paidOn) parts.push(`paid ${paidOn}`);
  if (entry.receipt_url) parts.push("receipt attached");
  return parts.join(" · ");
};
