// Fetch faith / church + Nigerian education headlines only (link aggregation — no full bodies).
// Sources: CT Nigeria topic, Punch Education RSS, Punch religion tag.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type Source = {
  id: string;
  name: string;
  homepage_url: string;
  feed_url: string;
  scrape_url: string;
  category: string;
  enabled: boolean;
};

type Article = {
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

const FAITH_RE =
  /\b(church|churches|bishop|bishops|pastor|pastors|christian|christians|christianity|anglican|catholic|gospel|clergy|cleric|diocese|synod|priest|congregation|evangelical|pentecostal|rccg|redeemed|baptist|methodist|presbyterian|mosque|imam|islamic|muslim|faith|religion|religious|rev\.|reverend|archbishop|primate|parish|sermon|bible|ministry|ministries)\b/i;

const EDUCATION_RE =
  /\b(education|school|schools|university|universities|varsity|student|students|teacher|teachers|lecturer|asuu|waec|jamb|nelfund|polytechnic|college|curriculum|admission|scholarship|campus|vc|vice[- ]?chancellor|unilag|lasu|noun)\b/i;

const POLITICS_NOISE_RE =
  /\b(apc|pdp|labour party|election 2027|governorship|senator|house of reps|national assembly|inec|campaign rally)\b/i;

function stripHtml(html = "") {
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

function decodeEntities(s = "") {
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

function truncate(text = "", max = 280) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function absUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString().split("#")[0];
  } catch {
    return href;
  }
}

function decodeXml(s = "") {
  return decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

function isPunchHost(url: string) {
  try {
    return new URL(url).hostname.includes("punchng.com");
  } catch {
    return /punchng\.com/i.test(url);
  }
}

function sanitizeImageUrl(url: string, source: Source) {
  const cleaned = String(url || "").trim();
  if (!cleaned) return "";
  // Never store Punch logos / CDN assets on cards
  if (source.id.startsWith("punch") || isPunchHost(cleaned)) return "";
  return cleaned;
}

function isPunchArticleUrl(url: string) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("punchng.com")) return false;
    // Article slugs look like /some-headline-slug/ — exclude topics, category, author, tag pages
    if (/\/(topics|category|tags?|author|page)\//i.test(u.pathname)) return false;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length === 1 && parts[0].length > 12;
  } catch {
    return false;
  }
}

function passesSourceFilter(source: Source, title: string, excerpt: string, url: string) {
  const hay = `${title} ${excerpt}`;

  if (source.category === "education" || source.id === "punch-education") {
    // Require education terms so political sidebar/latest rails do not leak in
    if (!EDUCATION_RE.test(hay)) return false;
    if (source.id.startsWith("punch") && !isPunchArticleUrl(url)) return false;
    if (POLITICS_NOISE_RE.test(hay) && !EDUCATION_RE.test(title)) return false;
    return true;
  }

  if (source.category === "christian" || source.category === "nigeria" || source.id.includes("faith")) {
    if (source.id === "ct-nigeria") {
      // CT Nigeria topic page is already scoped
      return /christianitytoday\.com\/\d{4}\/\d{2}\//i.test(url);
    }
    if (source.id.startsWith("punch") && !isPunchArticleUrl(url)) return false;
    if (!FAITH_RE.test(hay)) return false;
    // Prefer faith over pure politics
    if (POLITICS_NOISE_RE.test(hay) && !FAITH_RE.test(title)) return false;
    return true;
  }

  return FAITH_RE.test(hay) || EDUCATION_RE.test(hay);
}

function parseRss(xml: string, source: Source): Article[] {
  const items: Article[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 30)) {
    const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link = decodeXml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "").trim();
    const desc = stripHtml((block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "");
    const author =
      decodeXml((block.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i) || [])[1] || "") ||
      decodeXml((block.match(/<author[^>]*>([\s\S]*?)<\/author>/i) || [])[1] || "");
    const pub = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || "";
    const imgMatch =
      block.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
      block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i) ||
      block.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (!title || !link) continue;
    const url = absUrl(link, source.homepage_url || source.feed_url);
    if (!passesSourceFilter(source, title, desc, url)) continue;

    let publishedAt: string | null = null;
    try {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    } catch {
      publishedAt = null;
    }

    items.push({
      source_id: source.id,
      source_name: source.name,
      category: source.category,
      title: truncate(stripHtml(title), 220),
      url,
      excerpt: truncate(desc, 280),
      image_url: sanitizeImageUrl(
        imgMatch?.[1] ? absUrl(imgMatch[1], source.homepage_url) : "",
        source
      ),
      author: truncate(stripHtml(author), 120),
      published_at: publishedAt,
    });
  }
  return items;
}

/** Punch / CT topic pages: collect article links with nearby headings & blurbs. */
function parseTopicHtml(html: string, source: Source): Article[] {
  const items: Article[] = [];
  const seen = new Set<string>();

  // Prefer heading+link pairs (Punch education / religion layout).
  // Do not truncate at "Latest News" — on Punch topic pages that heading is the main list.
  const scoped = html;

  // Prefer heading+link pairs (Punch education / religion layout)
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
    if (source.id === "ct-nigeria" && !/christianitytoday\.com\/\d{4}\/\d{2}\//i.test(href)) continue;
    seen.add(href);
    items.push({
      source_id: source.id,
      source_name: source.name,
      category: source.category,
      title,
      url: href,
      excerpt: truncate(p, 280),
      image_url: "",
      author: "",
      published_at: null,
    });
  }

  // Fallback: any article-like anchors
  if (items.length < 5) {
    const re = /<a[^>]+href=["'](https?:\/\/[^"']+|\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = re.exec(scoped)) && items.length < 40) {
      const href = absUrl(m[1], source.scrape_url || source.homepage_url);
      const title = truncate(stripHtml(m[2]), 220);
      if (!title || title.length < 18) continue;
      if (seen.has(href)) continue;
      if (source.id.startsWith("punch") && !isPunchArticleUrl(href)) continue;
      if (source.id === "ct-nigeria" && !/christianitytoday\.com\/\d{4}\/\d{2}\//i.test(href)) continue;
      const after = scoped.slice(m.index, m.index + 900);
      const p = stripHtml((after.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");
      if (!passesSourceFilter(source, title, p, href)) continue;
      seen.add(href);
      items.push({
        source_id: source.id,
        source_name: source.name,
        category: source.category,
        title,
        url: href,
        excerpt: truncate(p, 280),
        image_url: "",
        author: "",
        published_at: null,
      });
    }
  }

  return items;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FFIEMCNewsBot/1.1; +https://ffiem.org)",
      Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

async function collectFromSource(source: Source): Promise<{ articles: Article[]; error?: string }> {
  const articles: Article[] = [];
  try {
    if (source.feed_url) {
      try {
        const xml = await fetchText(source.feed_url);
        articles.push(...parseRss(xml, source));
      } catch (e) {
        if (!source.scrape_url) throw e;
      }
    }
    // Prefer scrape when RSS is empty (Punch education RSS often has no <item>s)
    // or when we have fewer than 5 kept headlines after filtering.
    if (source.scrape_url && articles.length < 5) {
      const html = await fetchText(source.scrape_url);
      const scraped = parseTopicHtml(html, source);
      for (const a of scraped) {
        if (!articles.some((x) => x.url === a.url)) articles.push(a);
      }
    }
    return { articles };
  } catch (e) {
    return { articles, error: String((e as Error)?.message || e) };
  }
}

function authorized(req: Request) {
  const cronSecret = Deno.env.get("NEWS_CRON_SECRET") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  if (cronSecret && headerSecret && headerSecret === cronSecret) return true;

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (token && serviceKey && token === serviceKey) return true;

  const url = new URL(req.url);
  const q = url.searchParams.get("secret") || "";
  if (cronSecret && q && q === cronSecret) return true;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!authorized(req)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: sources, error: srcErr } = await supabase
      .from("news_sources")
      .select("*")
      .eq("enabled", true);
    if (srcErr) throw srcErr;

    const report: Record<string, unknown>[] = [];
    const all: Article[] = [];

    for (const source of (sources || []) as Source[]) {
      const result = await collectFromSource(source);
      report.push({
        source: source.id,
        count: result.articles.length,
        error: result.error || null,
      });
      all.push(...result.articles);
    }

    const byUrl = new Map<string, Article>();
    for (const a of all) {
      if (!byUrl.has(a.url)) byUrl.set(a.url, a);
    }
    const batch = Array.from(byUrl.values());

    const { data: upsertResult, error: upErr } = await supabase.rpc("upsert_news_articles", {
      p_items: batch,
    });
    if (upErr) throw upErr;

    return json({
      ok: true,
      fetched: batch.length,
      sources: report,
      upsert: upsertResult,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
