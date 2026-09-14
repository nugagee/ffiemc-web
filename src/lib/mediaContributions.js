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
