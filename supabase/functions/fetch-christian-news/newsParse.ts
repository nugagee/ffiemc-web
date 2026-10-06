// Pure helpers for fetch-christian-news. No Deno or network calls.

export type FilterMode = "none" | "faith" | "christian";
/** off: keep source.category. mention: Nigeria wording → nigeria. only: Nigeria wording → nigeria, otherwise drop. */
export type NigeriaRoute = "off" | "mention" | "only";

export type Source = {
  id: string;
  name: string;
  homepage_url: string;
  feed_url: string;
  scrape_url: string;
  category: string;
  enabled: boolean;
  /** Keyword gate. Missing means faith, except education RSS feeds which stay unfiltered. */
  filter_mode?: FilterMode | string;
  /** Deterministic category from title + excerpt. Same text always maps to the same category. */
  nigeria_route?: NigeriaRoute | string;
};

export type Article = {
  source_id: string;
  source_name: string;
  category: string;
  title: string;
  url: string;
  excerpt: string;
  image_url: string;
  author: string;
  published_at: string | null;
};

/** Cross-source duplicates inside this window are dropped. Same value as the SQL upsert. */
export const DEDUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const DEDUP_TITLE_MIN = 12;

/**
 * Newest rows kept per feed after every item is parsed.
 * Christian Today's rss.xml is ~550 overlapping items and is not date-ordered;
 * the newest entries sit near the end, so this cap is applied only after sorting.
 */
export const RSS_ITEM_LIMIT = 30;

/** Dropped from normalised titles. Kept in sync with news_normalise_title(). */
export const TITLE_STOPWORDS = [
  "a",
  "an",
  "the",
  "in",
  "on",
  "at",
  "of",
  "for",
  "to",
  "and",
  "or",
  "by",
  "with",
  "from",
];

const CHRISTIAN_STRONG_WORDS =
  "church(?:es)?|bishops?|pastors?|christians?|christianity|anglicans?|catholics?|gospels?|clergy|dioceses?|synods?|priests?|congregations?|evangelicals?|pentecostals?|rccg|redeemed|baptists?|methodists?|presbyterians?|reverends?|archbishops?|primates?|parishes|parish|sermons?|bibles?|ministries|ministry|popes?|chapels?|cathedrals?|crusades?|revivals?|tithes?|jesus|christ|vatican|cardinals?|communion|choirs?|evangelists?|winners|mfm|deeper life|cac";

const CHRISTIAN_SOFT_WORDS =
  "pray|prays|prayed|praying|prayer|prayers|worship|worships|worshipper|worshippers|worshipping|worshiped|worshipped|prophet|prophets|apostle|apostles";

/** Christian vocabulary, case-insensitive. Acronyms CAN / PFN / CBCN are separate so they stay case-sensitive. */
export const CHRISTIAN_RE = new RegExp(
  `\\b(?:${CHRISTIAN_STRONG_WORDS}|${CHRISTIAN_SOFT_WORDS})\\b|\\brev\\.`,
  "i"
);

const CHRISTIAN_STRONG_RE = new RegExp(`\\b(?:${CHRISTIAN_STRONG_WORDS})\\b|\\brev\\.`, "i");
const CHRISTIAN_SOFT_RE = new RegExp(`\\b(?:${CHRISTIAN_SOFT_WORDS})\\b`, "i");

/** Whole-word, case-sensitive. Lowercase "can" in ordinary English must not match. */
export const CHRISTIAN_ACRONYM_RE = /\b(?:CAN|PFN|CBCN)\b/;

const ISLAMIC_RE =
  /\b(?:mosques?|imams?|islamic|islamists?|islam|muslims?|qur['’]?ans?|koran|ramadan|hajj|eids?|shari['’]?a|muhammad|mohammed|mohammad|nscia|muric|sultan)\b/i;

/** Faith-wide gate: Christian terms above, plus general religion and Islamic desks. */
export const FAITH_RE = new RegExp(
  `\\b(?:${CHRISTIAN_STRONG_WORDS}|${CHRISTIAN_SOFT_WORDS}|faith|religion|religious|mosques?|imams?|islamic|muslims?|cleric|clerics)\\b|\\brev\\.`,
  "i"
);

// Plurals are listed explicitly: \blecturer\b does not match "lecturers".
export const EDUCATION_RE =
  /\b(educations?|educational|schools?|schooling|universit(?:y|ies)|varsit(?:y|ies)|students?|teachers?|teaching|lecturers?|professors?|profs?|graduates?|graduations?|undergraduates?|postgraduates?|tertiary|academics?|facult(?:y|ies)|polytechnics?|colleges?|curricul(?:um|a)|admissions?|scholarships?|campuses?|vice[- ]?chancellors?|chancellors?|vcs?|unilag|lasu|noun|unilorin|unical|asuu|waec|jamb|nelfund|neco|nabteb|tetfund|nuc|utme|ssce|matriculations?|convocations?|pupils?|classrooms?|literacy|tuitions?|bursar(?:y|ies)|hostels?|alumn(?:us|i)|doctorates?|phds?|nurser(?:y|ies)|headteachers?|principals?|rectors?|provosts?|deans?|examinations?|exams?|essays?|textbooks?)\b/i;

const POLITICS_NOISE_RE =
  /\b(apc|pdp|labour party|election 2027|governorship|senator|house of reps|national assembly|inec|campaign rally)\b/i;

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/** Africa/Lagos is UTC+1 all year (WAT). */
const LAGOS_OFFSET_MINUTES = 60;

const SOURCE_RANK: Record<string, number> = {
  "legit-education": 10,
  "tribune-education": 20,
  "pmnews-education": 30,
  "businessday-education": 40,
  "bbc-education": 50,
  "ct-nigeria": 60,
  "morningstar-nigeria": 62,
  "tribune-religion": 64,
  "dailypost-can": 66,
  "newtelegraph-faith": 68,
  "leadership-religion": 70,
  "icc": 72,
  "christian-today": 80,
  "christian-daily": 82,
  "ct-feed": 84,
  "christian-post": 86,
  "rns": 88,
  "ewtn-news": 90,
  "punch-faith": 94,
  "punch-education": 96,
};

const TRACKING_KEYS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "at_medium",
  "at_campaign",
  "at_source",
  "at_custom1",
  "at_custom2",
  "at_custom3",
  "at_custom4",
]);

export function sourceRank(id: string) {
  return SOURCE_RANK[id] ?? 100;
}

export function stripHtml(html = "") {
  return decodeEntities(
    String(html)
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function decodeEntities(s = "") {
  return String(s || "")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function truncate(text = "", max = 280) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function absUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString().split("#")[0];
  } catch {
    return href;
  }
}

export function decodeXml(s = "") {
  return decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

function isPunchHost(url: string) {
  try {
    return new URL(url).hostname.includes("punchng.com");
  } catch {
    return /punchng\.com/i.test(url);
  }
}

export function sanitizeImageUrl(url: string, source: Source) {
  const cleaned = String(url || "").trim();
  if (!cleaned) return "";
  // Never store Punch logos / CDN assets on cards. Empty keeps the Blog gradient placeholder.
  if (source.id.startsWith("punch") || isPunchHost(cleaned)) return "";
  return cleaned;
}

function isPunchArticleUrl(url: string) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("punchng.com")) return false;
    if (/\/(topics|category|tags?|author|page)\//i.test(u.pathname)) return false;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length === 1 && parts[0].length > 12;
  } catch {
    return false;
  }
}

/** Education category feeds with no HTML scrape URL are already education-only. */
export function isEducationRssOnly(source: Source) {
  return source.category === "education" && !String(source.scrape_url || "").trim();
}

/**
 * punchng.com/topics/education/feed/ redirects to latest news.
 * Never request it; the topic page scrape is the Punch fallback.
 */
export function feedUrlForSource(source: Source) {
  const url = String(source.feed_url || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("punchng.com") &&
      /\/topics\/education\/feed\/?$/i.test(parsed.pathname)
    ) {
      return "";
    }
  } catch {
    if (/punchng\.com\/topics\/education\/feed\/?/i.test(url)) return "";
  }
  return url;
}

export function shouldScrape(source: Source, rssCount: number) {
  if (isEducationRssOnly(source)) return false;
  return Boolean(String(source.scrape_url || "").trim()) && rssCount < 5;
}

export function looksLikeFeed(body: string) {
  return /<(rss|feed|rdf:RDF)\b/i.test(String(body || ""));
}

export function filterMode(source: Source): FilterMode {
  const mode = String(source.filter_mode || "").trim().toLowerCase();
  if (mode === "none" || mode === "faith" || mode === "christian") return mode;
  return "faith";
}

function matchesStrongChristian(text: string) {
  return CHRISTIAN_STRONG_RE.test(text) || CHRISTIAN_ACRONYM_RE.test(text);
}

/**
 * Christian gate for mixed religion desks.
 * A Christian term keeps the row. Prayer/worship/prophet/apostle alone do not keep
 * an Islamic-only story (mosque, imam, Eid, NSCIA, and similar).
 */
export function passesChristianContent(title: string, excerpt: string) {
  const hay = `${title} ${excerpt}`;
  const strong = matchesStrongChristian(hay);
  const soft = CHRISTIAN_SOFT_RE.test(hay);
  if (ISLAMIC_RE.test(hay) && !strong) return false;
  if (!strong && !soft) return false;
  const titleHit = matchesStrongChristian(title) || CHRISTIAN_SOFT_RE.test(title);
  if (POLITICS_NOISE_RE.test(hay) && !titleHit) return false;
  return true;
}

export function passesSourceFilter(source: Source, title: string, excerpt: string, url: string) {
  if (isEducationRssOnly(source)) return true;

  const hay = `${title} ${excerpt}`;

  if (source.category === "education" || source.id === "punch-education") {
    if (!EDUCATION_RE.test(hay)) return false;
    if (source.id.startsWith("punch") && !isPunchArticleUrl(url)) return false;
    if (POLITICS_NOISE_RE.test(hay) && !EDUCATION_RE.test(title)) return false;
    return true;
  }

  const mode = filterMode(source);
  if (mode === "none") return true;

  if (source.id.startsWith("punch") && !isPunchArticleUrl(url)) return false;

  // Scraped Christianity Today topic pages used to include nav links. RSS items are articles.
  if (source.id === "ct-nigeria" && !String(source.feed_url || "").trim()) {
    return /christianitytoday\.com\/\d{4}\/\d{2}\//i.test(url);
  }

  if (mode === "christian") return passesChristianContent(title, excerpt);

  if (!FAITH_RE.test(hay) && !CHRISTIAN_ACRONYM_RE.test(hay)) return false;
  if (POLITICS_NOISE_RE.test(hay) && !FAITH_RE.test(title) && !CHRISTIAN_ACRONYM_RE.test(title)) return false;
  return true;
}

const NIGERIA_RE =
  /\b(?:nigeria|nigerian|nigerians|abuja|lagos|plateau|benue|kaduna|kano|borno|maiduguri|yobe|adamawa|taraba|bauchi|gombe|sokoto|zamfara|katsina|jigawa|kebbi|kwara|kogi|nasarawa|nassarawa|fct|jos|makurdi|enugu|anambra|onitsha|awka|owerri|abia|umuahia|ebonyi|abakaliki|calabar|akwa ibom|uyo|port harcourt|portharcourt|bayelsa|yenagoa|warri|asaba|benin city|ogun|abeokuta|ibadan|osun|osogbo|ondo|akure|ekiti|ado[- ]ekiti|ilorin|minna|lokoja|jalingo|dutse|birnin kebbi|gusau|damaturu|yola|lafia|middle belt|niger state|imo state|rivers state|delta state|cross river|ogun state|oyo state|ondo state|osun state|edo state|boko haram)\b/i;

export function mentionsNigeria(title: string, excerpt: string) {
  const hay = `${title} ${excerpt}`;
  return NIGERIA_RE.test(hay) || CHRISTIAN_ACRONYM_RE.test(hay);
}

/**
 * Category is a pure function of the source route plus title/excerpt.
 * Re-fetching the same text cannot flip the category.
 * Returns null when the source keeps Nigeria rows only and this one is not Nigeria.
 */
export function resolveCategory(source: Source, title: string, excerpt: string): string | null {
  const route = String(source.nigeria_route || "off").trim().toLowerCase();
  if (route !== "mention" && route !== "only") return source.category || "christian";
  if (mentionsNigeria(title, excerpt)) return "nigeria";
  if (route === "only") return null;
  return source.category || "christian";
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || "";
}

function allTagAttrs(block: string, tagName: string) {
  const re = new RegExp(`<${tagName}\\b([^>]*?)\\/?>`, "gi");
  return [...block.matchAll(re)].map((match) => match[1] || "");
}

function usableImage(url: string) {
  const cleaned = decodeXml(String(url || "")).trim();
  if (!cleaned || /^data:/i.test(cleaned)) return "";
  if (/spacer|1x1|pixel\.gif|blank\.gif|feedburner\.com/i.test(cleaned)) return "";
  return cleaned;
}

function imageFromMedia(attrs: string) {
  const medium = attr(attrs, "medium");
  const type = attr(attrs, "type");
  const url = usableImage(attr(attrs, "url"));
  if (!url || /video|audio/i.test(medium)) return "";
  const imageLike =
    !medium ||
    /image/i.test(medium) ||
    /image/i.test(type) ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
  return imageLike ? url : "";
}

/** Empty string means the Blog card keeps its gradient placeholder. */
export function extractRssImage(block: string, source: Source) {
  for (const mediaAttrs of allTagAttrs(block, "media:content")) {
    const url = imageFromMedia(mediaAttrs);
    if (url) return sanitizeImageUrl(absUrl(url, source.homepage_url || source.feed_url), source);
  }

  for (const thumbAttrs of allTagAttrs(block, "media:thumbnail")) {
    const thumb = usableImage(attr(thumbAttrs, "url"));
    if (thumb) return sanitizeImageUrl(absUrl(thumb, source.homepage_url || source.feed_url), source);
  }

  for (const enclosureAttrs of allTagAttrs(block, "enclosure")) {
    const url = usableImage(attr(enclosureAttrs, "url"));
    const type = attr(enclosureAttrs, "type");
    if (url && (/image/i.test(type) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url))) {
      return sanitizeImageUrl(absUrl(url, source.homepage_url || source.feed_url), source);
    }
  }

  const encoded = (block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) || [])[1] || "";
  const description = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "";
  const html = decodeXml(`${description}\n${encoded}`);
  const imgRe = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRe.exec(html))) {
    const img = usableImage(imgMatch[1]);
    if (img) return sanitizeImageUrl(absUrl(img, source.homepage_url || source.feed_url), source);
  }
  return "";
}

export function parseRfc822(raw: string): string | null {
  const text = decodeXml(String(raw || "")).trim();
  if (!text) return null;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Punch topic pages: "October 3, 2026 12:02 am" in Africa/Lagos. */
export function parseLagosDateTime(raw: string): string | null {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  const match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const ampm = match[6].toLowerCase();
  if (hour < 1 || hour > 12 || minute > 59 || day < 1 || day > 31) return null;
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  const utcMs = Date.UTC(year, month, day, hour, minute) - LAGOS_OFFSET_MINUTES * 60 * 1000;
  const lagos = new Date(utcMs + LAGOS_OFFSET_MINUTES * 60 * 1000);
  if (
    lagos.getUTCFullYear() !== year ||
    lagos.getUTCMonth() !== month ||
    lagos.getUTCDate() !== day ||
    lagos.getUTCHours() !== hour ||
    lagos.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return new Date(utcMs).toISOString();
}

function publishedAtNear(html: string, index: number): string | null {
  // Date belongs to this heading only: after the previous heading closes, and before the next one.
  const prior = html.slice(0, index);
  const closeRe = /<\/h[1-3]>/gi;
  let priorEnd = 0;
  let close: RegExpExecArray | null;
  while ((close = closeRe.exec(prior))) priorEnd = close.index + close[0].length;
  const between = prior.slice(priorEnd);
  const before = between.length > 1200 ? between.slice(-1200) : between;
  const rest = html.slice(index + 1);
  const nextHeading = rest.search(/<h[1-3]\b/i);
  const after = html.slice(index, nextHeading === -1 ? index + 900 : index + 1 + nextHeading);

  const metaBefore = [...before.matchAll(/<div[^>]*class=["'][^"']*\bmeta-time\b[^"']*["'][^>]*>(?:\s*<span[^>]*>)?\s*([^<]+)/gi)].pop();
  if (metaBefore) {
    const parsed = parseLagosDateTime(metaBefore[1]);
    if (parsed) return parsed;
  }
  const post = after.match(/<(?:span|div|time)[^>]*class=["'][^"']*\bpost-date\b[^"']*["'][^>]*>\s*([^<]+)/i);
  if (post) {
    const parsed = parseLagosDateTime(post[1]);
    if (parsed) return parsed;
  }
  const metaAfter = after.match(/<div[^>]*class=["'][^"']*\bmeta-time\b[^"']*["'][^>]*>(?:\s*<span[^>]*>)?\s*([^<]+)/i);
  if (metaAfter) return parseLagosDateTime(metaAfter[1]);
  return null;
}

function publishedMs(iso: string | null) {
  if (!iso) return Number.NEGATIVE_INFINITY;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

function preferNewer(current: Article, incoming: Article) {
  return publishedMs(incoming.published_at) > publishedMs(current.published_at) ? incoming : current;
}

export function parseRss(xml: string, source: Source, limit = RSS_ITEM_LIMIT): Article[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const byLink = new Map<string, Article>();
  for (const block of blocks) {
    const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link = decodeXml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "").trim();
    const descRaw = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "";
    const desc = stripHtml(descRaw);
    const author =
      decodeXml((block.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i) || [])[1] || "") ||
      decodeXml((block.match(/<author[^>]*>([\s\S]*?)<\/author>/i) || [])[1] || "");
    const pub =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] ||
      (block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) || [])[1] ||
      "";
    if (!title || !link) continue;
    const url = absUrl(link, source.homepage_url || source.feed_url);
    if (!passesSourceFilter(source, title, desc, url)) continue;
    const category = resolveCategory(source, title, desc);
    if (!category) continue;

    const article: Article = {
      source_id: source.id,
      source_name: source.name,
      category,
      title: truncate(stripHtml(title), 220),
      url,
      excerpt: truncate(desc, 280),
      image_url: extractRssImage(block, source),
      author: truncate(stripHtml(author), 120),
      published_at: parseRfc822(pub),
    };
    const key = normaliseLink(url) || url.trim().toLowerCase();
    const existing = byLink.get(key);
    byLink.set(key, existing ? preferNewer(existing, article) : article);
  }

  return [...byLink.values()]
    .sort((a, b) => publishedMs(b.published_at) - publishedMs(a.published_at) || a.url.localeCompare(b.url))
    .slice(0, Math.max(0, limit));
}

/** Punch / CT topic pages: collect article links with nearby headings, blurbs, and dates. */
export function parseTopicHtml(html: string, source: Source): Article[] {
  const items: Article[] = [];
  const seen = new Set<string>();
  const scoped = html;

  const headingLinkRe =
    /<(h[1-3]|h2)[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingLinkRe.exec(scoped)) && items.length < 40) {
    const href = absUrl(m[2], source.scrape_url || source.homepage_url);
    const title = truncate(stripHtml(m[3]), 220);
    if (!title || title.length < 12) continue;
    if (seen.has(href)) continue;
    const after = scoped.slice(m.index, m.index + 700);
    const p = stripHtml((after.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");
    if (!passesSourceFilter(source, title, p, href)) continue;
    if (source.id.startsWith("punch") && !isPunchArticleUrl(href)) continue;
    if (source.id === "ct-nigeria" && !String(source.feed_url || "").trim() && !/christianitytoday\.com\/\d{4}\/\d{2}\//i.test(href)) continue;
    const category = resolveCategory(source, title, p);
    if (!category) continue;
    seen.add(href);
    items.push({
      source_id: source.id,
      source_name: source.name,
      category,
      title,
      url: href,
      excerpt: truncate(p, 280),
      image_url: "",
      author: "",
      published_at: publishedAtNear(scoped, m.index),
    });
  }

  if (items.length < 5) {
    const re = /<a[^>]+href=["'](https?:\/\/[^"']+|\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = re.exec(scoped)) && items.length < 40) {
      const href = absUrl(m[1], source.scrape_url || source.homepage_url);
      const title = truncate(stripHtml(m[2]), 220);
      if (!title || title.length < 18) continue;
      if (seen.has(href)) continue;
      if (source.id.startsWith("punch") && !isPunchArticleUrl(href)) continue;
      if (source.id === "ct-nigeria" && !String(source.feed_url || "").trim() && !/christianitytoday\.com\/\d{4}\/\d{2}\//i.test(href)) continue;
      const after = scoped.slice(m.index, m.index + 900);
      const p = stripHtml((after.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");
      if (!passesSourceFilter(source, title, p, href)) continue;
      const category = resolveCategory(source, title, p);
      if (!category) continue;
      seen.add(href);
      items.push({
        source_id: source.id,
        source_name: source.name,
        category,
        title,
        url: href,
        excerpt: truncate(p, 280),
        image_url: "",
        author: "",
        published_at: publishedAtNear(scoped, m.index),
      });
    }
  }

  return items;
}

const TITLE_STOPWORD_SET = new Set(TITLE_STOPWORDS);

export function normaliseTitle(title: string) {
  return stripHtml(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !TITLE_STOPWORD_SET.has(word))
    .join(" ");
}

/** Host + path, www stripped, tracking params removed. Kept in sync with news_normalise_link(). */
export function normaliseLink(url: string) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_KEYS.has(lower)) parsed.searchParams.delete(key);
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    const qs = parsed.searchParams.toString();
    return `${host}${path}${qs ? `?${qs}` : ""}`.toLowerCase();
  } catch {
    return raw
      .toLowerCase()
      .split("#")[0]
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\/+$/, "");
  }
}

export function dedupeArticles<T extends { title: string; url: string }>(
  incoming: T[],
  recent: { title: string; url: string }[] = []
): T[] {
  const titles = new Set<string>();
  const links = new Set<string>();
  const remember = (title: string, url: string) => {
    const normalisedTitle = normaliseTitle(title);
    const link = normaliseLink(url);
    if (normalisedTitle.length >= DEDUP_TITLE_MIN) titles.add(normalisedTitle);
    if (link) links.add(link);
  };

  for (const row of recent) remember(row.title, row.url);

  const kept: T[] = [];
  for (const item of incoming) {
    const exact = item.url.trim().toLowerCase();
    if (kept.some((row) => row.url.trim().toLowerCase() === exact)) continue;
    const refresh = recent.some((row) => row.url.trim().toLowerCase() === exact);
    const title = normaliseTitle(item.title);
    const link = normaliseLink(item.url);
    if (!refresh) {
      if (link && links.has(link)) continue;
      if (title.length >= DEDUP_TITLE_MIN && titles.has(title)) continue;
    }
    remember(item.title, item.url);
    kept.push(item);
  }
  return kept;
}

function safeEqual(a: string, b: string) {
  if (!a || !b) return false;
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const len = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}

/**
 * Header secret is the supported cron auth. The query param is still accepted
 * so a cron row that has not picked up the header-only SQL keeps working.
 * Callers must not put the secret in the URL.
 */
export function cronAuthorized(input: {
  headerSecret?: string;
  querySecret?: string;
  bearerToken?: string;
  cronSecret?: string;
  serviceKey?: string;
}) {
  const cronSecret = input.cronSecret || "";
  if (cronSecret && safeEqual(input.headerSecret || "", cronSecret)) return true;
  const serviceKey = input.serviceKey || "";
  if (serviceKey && safeEqual(input.bearerToken || "", serviceKey)) return true;
  if (cronSecret && safeEqual(input.querySecret || "", cronSecret)) return true;
  return false;
}
