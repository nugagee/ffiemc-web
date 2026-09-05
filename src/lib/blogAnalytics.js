export const BLOG_REACTIONS = [
  { id: "amen", emoji: "🙏", label: "Amen" },
  { id: "fire", emoji: "🔥", label: "On fire" },
  { id: "heart", emoji: "❤️", label: "Blessed" },
  { id: "clap", emoji: "👏", label: "Helpful" },
  { id: "inspired", emoji: "💡", label: "Inspired" },
];

export const BLOG_SHARE_CHANNELS = [
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "email", label: "Email" },
  { id: "copy", label: "Copy link" },
  { id: "native", label: "Device share" },
];

export function reactionMeta(id) {
  return BLOG_REACTIONS.find((r) => r.id === id) || { id, emoji: "•", label: id };
}

export function shareChannelLabel(id) {
  return BLOG_SHARE_CHANNELS.find((c) => c.id === id)?.label || id || "—";
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

export function blogPostShareUrl(post) {
  if (typeof window === "undefined") return "";
  // Prefer the live page URL when already viewing this post (avoids empty Facebook shares).
  const path = window.location.pathname || "";
  const slug = postAnalyticsKey(post);
  if (slug && path.includes(`/blog/${slug}`)) {
    return window.location.href.split("#")[0].split("?")[0];
  }
  if (!slug) return window.location.href.split("#")[0].split("?")[0];
  return `${window.location.origin}/blog/${encodeURIComponent(slug)}`;
}

export function blogPostShareSummary(post, maxLen = 160) {
  const raw = String(post?.excerpt || post?.summary || post?.content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen - 1).trim()}…`;
}

/** Set document title + Open Graph tags so share previews can pick up the article. */
export function applyBlogShareMeta(post) {
  if (typeof document === "undefined" || !post) return () => {};
  const title = post.title || "Blog";
  const description = blogPostShareSummary(post, 200) || title;
  const url = blogPostShareUrl(post);
  const image = post.image || post.cover_image || "";
  const previousTitle = document.title;

  document.title = `${title} | Fire-Fire International`;

  const upsert = (attr, key, value) => {
    if (!value) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  };

  upsert("property", "og:type", "article");
  upsert("property", "og:title", title);
  upsert("property", "og:description", description);
  upsert("property", "og:url", url);
  if (image) upsert("property", "og:image", image);
  upsert("name", "twitter:card", image ? "summary_large_image" : "summary");
  upsert("name", "twitter:title", title);
  upsert("name", "twitter:description", description);
  if (image) upsert("name", "twitter:image", image);
  upsert("name", "description", description);

  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);

  return () => {
    document.title = previousTitle;
  };
}
