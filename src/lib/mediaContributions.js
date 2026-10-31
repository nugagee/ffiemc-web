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

/** Client-side checks. The admin upsert RPC enforces the same rules. */
export function validateContributionPayment(form = {}, { today } = {}) {
  const errors = [];
  const amountRaw = String(form.amount ?? "").trim();
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    errors.push("Enter an amount greater than 0");
  } else if (amount > 9999999999.99) {
    errors.push("Amount is too large");
  }

  const paymentDate = String(form.payment_date || "").trim();
  const todayIso = today || new Date().toISOString().slice(0, 10);
  const parsed = new Date(`${paymentDate}T12:00:00Z`);
  if (!DATE_RE.test(paymentDate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== paymentDate) {
    errors.push("Enter a valid payment date");
  } else if (paymentDate > todayIso) {
    errors.push("Payment date cannot be in the future");
  }

  const name = String(form.full_name || "").trim();
  if (!form.team_member_id && name.length < 2) {
    errors.push("Select a team member or enter a name");
  }

  if (String(form.note || "").trim().length > 1000) {
    errors.push("Note must be 1000 characters or less");
  }

  const receipt = String(form.receipt_url || "").trim();
  if (receipt && !/^https?:\/\//i.test(receipt)) {
    errors.push("Receipt link must start with http");
  }

  if (form.month_id !== undefined && form.month_id !== null && !String(form.month_id).trim()) {
    errors.push("Month is required");
  }

  return errors;
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
