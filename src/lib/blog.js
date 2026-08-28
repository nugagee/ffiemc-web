export const BLOG_STATUSES = ["draft", "scheduled", "published"];

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

export function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function wordCount(html) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

export function isPublicBlogPost(post) {
  if (!post) return false;
  const due =
    post.status === "scheduled" &&
    post.scheduled_at &&
    new Date(post.scheduled_at) <= new Date();
  if (post.published === true && post.status !== "scheduled") return true;
  if (due) return true;
  if (post.published === true && !post.status) return true;
  return false;
}

export function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function postStatus(post) {
  if (!post) return "draft";
  if (post.status === "scheduled" && post.scheduled_at && new Date(post.scheduled_at) <= new Date()) {
    return "published";
  }
  if (BLOG_STATUSES.includes(post.status)) return post.status;
  return post.published ? "published" : "draft";
}

export function statusLabel(status) {
  if (status === "published") return "Published";
  if (status === "scheduled") return "Scheduled";
  return "Draft";
}

export function statusTone(status) {
  if (status === "published") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "scheduled") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export function displayDate(post) {
  return post?.published_at || post?.scheduled_at || post?.created_at;
}

export const BLOG_PREVIEW_KEY = "ffiemc_blog_preview";

export function writeBlogPreview(post) {
  const payload = {
    title: post.title?.trim() || "Untitled post",
    excerpt: post.excerpt || "",
    content: post.content || "",
    author: post.author || "",
    category: post.category || "General",
    image: post.image || "",
    tags: post.tags || "",
    published_at: post.published_at || new Date().toISOString(),
    created_at: post.created_at || new Date().toISOString(),
    preview: true,
  };
  sessionStorage.setItem(BLOG_PREVIEW_KEY, JSON.stringify(payload));
  return payload;
}

export function readBlogPreview() {
  try {
    const raw = sessionStorage.getItem(BLOG_PREVIEW_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function extractImageUrls(html) {
  const matches = String(html || "").matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  return Array.from(matches, (match) => match[1]).filter(Boolean);
}
