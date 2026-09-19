/** Normalize announcement image list (images[] + legacy image). */
export function announcementImageList(item) {
  const fromArray = Array.isArray(item?.images)
    ? item.images.map((u) => String(u || "").trim()).filter(Boolean)
    : [];
  if (fromArray.length) return fromArray;
  const single = String(item?.image || "").trim();
  return single ? [single] : [];
}

function isoWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function sessionSeed(id) {
  try {
    const key = `ffiemc_banner_img_seed_${id}`;
    let seed = sessionStorage.getItem(key);
    if (!seed) {
      seed = String(Math.floor(Math.random() * 1_000_000));
      sessionStorage.setItem(key, seed);
    }
    return Number(seed) || 0;
  } catch {
    return 0;
  }
}

/**
 * Pick which flyer to show for a multi-image announcement.
 * - weekly: stable per ISO week (rotates when more images are added)
 * - session: stable per browser tab session
 * - none: first image
 */
export function pickAnnouncementImage(item, now = new Date()) {
  const list = announcementImageList(item);
  if (!list.length) return "";
  if (list.length === 1) return list[0];

  const mode = String(item?.image_shuffle || "weekly").toLowerCase();
  if (mode === "none") return list[0];

  const seed =
    mode === "session"
      ? sessionSeed(item?.id || "anon")
      : isoWeekNumber(now) + String(item?.id || "").length;

  const index = Math.abs(Number(seed)) % list.length;
  return list[index] || list[0];
}
