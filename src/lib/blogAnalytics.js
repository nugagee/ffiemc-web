export const BLOG_REACTIONS = [
  { id: "amen", emoji: "🙏", label: "Amen" },
  { id: "fire", emoji: "🔥", label: "On fire" },
  { id: "heart", emoji: "❤️", label: "Blessed" },
  { id: "clap", emoji: "👏", label: "Helpful" },
  { id: "inspired", emoji: "💡", label: "Inspired" },
];

export function reactionMeta(id) {
  return BLOG_REACTIONS.find((r) => r.id === id) || { id, emoji: "•", label: id };
}

export function formatReadTime(seconds) {
  const n = Number(seconds) || 0;
  if (n < 1) return "0s";
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export function postAnalyticsKey(post) {
  return post?.slug || String(post?.id || "");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

export function postAnalyticsId(post) {
  return isUuid(post?.id) ? post.id : null;
}

export function scrollPercent() {
  if (typeof window === "undefined") return 0;
  const doc = document.documentElement;
  const scrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}
