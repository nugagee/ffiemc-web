import fallbackImage from "../assets/img/banners/happy-new-month-september-2025.png";

export const MONTH_WELCOME_FALLBACK_IMAGE = fallbackImage;

export const DEFAULT_MONTH_WELCOME = {
  enabled: true,
  image: "",
  title: "Happy New Month",
  alt: "Happy New Month — September from Fire-Fire International Evangelical Church Youth Ministry. A fresh start, greater grace.",
  body: `"This is the day the Lord has made; we will rejoice and be glad in it." — Psalm 118:24

As we welcome September, we thank God for His faithfulness and mercies that brought us this far. 🙏

May this new month bring you:
✨ Open doors and divine breakthroughs
✨ Peace that surpasses understanding
✨ Healing, strength, and divine health
✨ Favour in all you do
✨ A harvest of joy for every seed sown in tears

"Bless the Lord, O my soul, and forget not all His benefits." — Psalm 103:2

Happy New Month, family! May September be your best month yet, in Jesus' name. 🙏❤️

Amen! 🕊️`,
  starts_at: "2026-09-01T00:00:00.000Z",
  ends_at: "2026-09-08T23:59:59.999Z",
};

export function getMonthWelcomeConfig(settings) {
  const current = settings?.pages?.home?.monthWelcome;
  return { ...DEFAULT_MONTH_WELCOME, ...(current || {}) };
}

export function isMonthWelcomeActive(config, date = new Date()) {
  if (!config?.enabled) return false;
  const image = (config.image || "").trim() || MONTH_WELCOME_FALLBACK_IMAGE;
  if (!image) return false;

  const now = date.getTime();
  const start = config.starts_at ? new Date(config.starts_at).getTime() : null;
  const end = config.ends_at ? new Date(config.ends_at).getTime() : null;
  if (start && !Number.isNaN(start) && now < start) return false;
  if (end && !Number.isNaN(end) && now > end) return false;
  return true;
}

export function monthWelcomeStorageKey(config = {}) {
  const start = config.starts_at || "open";
  const end = config.ends_at || "open";
  return `ffiemc-month-welcome-${start}-${end}`;
}

export function monthWelcomeImage(config) {
  return (config?.image || "").trim() || MONTH_WELCOME_FALLBACK_IMAGE;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function toLocalDateTimeInput(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function fromLocalDateTimeInput(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString();
  } catch {
    return "";
  }
}

export function weekWindowFrom(date = new Date()) {
  const start = new Date(date);
  start.setSeconds(0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return {
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  };
}
