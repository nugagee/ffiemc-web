// Local dry run of the faith RSS parser against live feeds.
// Does not write to Supabase. Mirrors news_sources rows in
// 20261108_nigeria_christian_only.sql (international wires) and the Nigerian
// rows left in place by 20261107_faith_rss_sources.sql.
//
// Disabled international feeds are still fetched. Their nigeria_christian_probe
// counts are not included in the category totals.
//
//   node --experimental-strip-types scripts/dry-run-faith-feeds.ts

import {
  dedupeArticles,
  DEDUP_WINDOW_MS,
  looksLikeFeed,
  parseRss,
  RSS_ITEM_LIMIT,
  sourceRank,
  type Article,
  type Source,
} from "../supabase/functions/fetch-christian-news/newsParse.ts";

const SOURCES: Source[] = [
  {
    id: "christian-today",
    name: "Christian Today",
    homepage_url: "https://www.christiantoday.com/",
    feed_url: "https://www.christiantoday.com/rss.xml",
    scrape_url: "",
    category: "christian",
    enabled: true,
    filter_mode: "nigeria_christian",
    nigeria_route: "off",
  },
  {
    id: "ct-feed",
    name: "Christianity Today",
    homepage_url: "https://www.christianitytoday.com/",
    feed_url: "https://www.christianitytoday.com/feed/",
    scrape_url: "",
    category: "christian",
    enabled: false,
    filter_mode: "nigeria_christian",
    nigeria_route: "off",
  },
  {
    id: "ct-nigeria",
    name: "Christianity Today — Nigeria",
    homepage_url: "https://www.christianitytoday.com/tag/nigeria/",
    feed_url: "https://www.christianitytoday.com/tag/nigeria/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "none",
    nigeria_route: "off",
  },
  {
    id: "christian-post",
    name: "The Christian Post",
    homepage_url: "https://www.christianpost.com/",
    feed_url: "https://www.christianpost.com/rss",
    scrape_url: "",
    category: "christian",
    enabled: false,
    filter_mode: "nigeria_christian",
    nigeria_route: "off",
  },
  {
    id: "rns",
    name: "Religion News Service",
    homepage_url: "https://religionnews.com/",
    feed_url: "https://religionnews.com/feed/",
    scrape_url: "",
    category: "christian",
    enabled: false,
    filter_mode: "nigeria_christian",
    nigeria_route: "off",
  },
  {
    id: "ewtn-news",
    name: "EWTN News",
    homepage_url: "https://www.ewtnnews.com/",
    feed_url: "https://www.ewtnnews.com/rss",
    scrape_url: "",
    category: "christian",
    enabled: false,
    filter_mode: "nigeria_christian",
    nigeria_route: "off",
  },
  {
    id: "christian-daily",
    name: "Christian Daily International",
    homepage_url: "https://www.christiandaily.com/",
    feed_url: "https://www.christiandaily.com/rss.xml",
    scrape_url: "",
    category: "christian",
    enabled: true,
    filter_mode: "nigeria_christian",
    nigeria_route: "off",
  },
  {
    id: "tribune-religion",
    name: "Nigerian Tribune — Religion",
    homepage_url: "https://tribuneonlineng.com/category/religion/",
    feed_url: "https://tribuneonlineng.com/category/religion/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "christian",
    nigeria_route: "off",
  },
  {
    id: "morningstar-nigeria",
    name: "Morning Star News — Nigeria",
    homepage_url: "https://morningstarnews.org/tag/nigeria/",
    feed_url: "https://morningstarnews.org/tag/nigeria/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "none",
    nigeria_route: "off",
  },
  {
    id: "dailypost-can",
    name: "Daily Post — CAN",
    homepage_url: "https://dailypost.ng/tag/can/",
    feed_url: "https://dailypost.ng/tag/can/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "christian",
    nigeria_route: "off",
  },
  {
    id: "newtelegraph-faith",
    name: "New Telegraph — Faith",
    homepage_url: "https://newtelegraphng.com/category/faith/",
    feed_url: "https://newtelegraphng.com/category/faith/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "christian",
    nigeria_route: "off",
  },
  {
    id: "leadership-religion",
    name: "Leadership — Religion",
    homepage_url: "https://leadership.ng/religion/",
    feed_url: "https://leadership.ng/religion/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "christian",
    nigeria_route: "off",
  },
  {
    id: "icc",
    name: "International Christian Concern",
    homepage_url: "https://www.persecution.org/",
    feed_url: "https://www.persecution.org/feed/",
    scrape_url: "",
    category: "nigeria",
    enabled: true,
    filter_mode: "christian",
    nigeria_route: "only",
  },
];

function newestRawIndex(xml: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  let best = -1;
  let bestMs = Number.NEGATIVE_INFINITY;
  blocks.forEach((block, index) => {
    const raw = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || "";
    const ms = Date.parse(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = index;
    }
  });
  return { rawItems: blocks.length, newestIndex: best };
}

async function fetchFeed(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FFIEMCNewsBot/1.1; +https://ffiem.org)",
      Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!looksLikeFeed(text)) throw new Error("response was not a feed");
  return text;
}

function inLast7Days(article: Article, cutoff: number) {
  if (!article.published_at) return false;
  const ms = Date.parse(article.published_at);
  return Number.isFinite(ms) && ms >= cutoff;
}

const INTERNATIONAL = new Set([
  "christian-today",
  "ct-feed",
  "christian-post",
  "rns",
  "ewtn-news",
  "christian-daily",
]);

const cutoff = Date.now() - DEDUP_WINDOW_MS;
const ordered = [...SOURCES].sort((a, b) => sourceRank(a.id) - sourceRank(b.id) || a.name.localeCompare(b.name));
const parsed: Article[] = [];
const rows: Record<string, unknown>[] = [];

for (const source of ordered) {
  try {
    const xml = await fetchFeed(source.feed_url);
    const position = newestRawIndex(xml);
    const qualified = source.enabled ? parseRss(xml, source, 10000) : [];
    const articles = qualified.slice(0, RSS_ITEM_LIMIT);
    if (source.enabled) parsed.push(...articles);
    const recent = articles.filter((article) => inLast7Days(article, cutoff));
    const recentAll = qualified.filter((article) => inLast7Days(article, cutoff));
    const dated = articles.filter((article) => article.published_at);
    const newest = dated[0]?.published_at || qualified.find((article) => article.published_at)?.published_at || null;
    const row: Record<string, unknown> = {
      source: source.id,
      enabled: source.enabled,
      filter_mode: source.filter_mode,
      nigeria_route: source.nigeria_route,
      category: source.category,
      raw_items: position.rawItems,
      newest_raw_index: position.newestIndex,
      qualified: qualified.length,
      kept: articles.length,
      dated: dated.length,
      undated: articles.length - dated.length,
      newest,
      with_image: articles.filter((article) => article.image_url).length,
      last7d_christian: recent.filter((article) => article.category === "christian").length,
      last7d_nigeria: recent.filter((article) => article.category === "nigeria").length,
      last7d_before_cap_christian: recentAll.filter((article) => article.category === "christian").length,
      last7d_before_cap_nigeria: recentAll.filter((article) => article.category === "nigeria").length,
      error: null,
    };
    if (INTERNATIONAL.has(source.id)) {
      const probed = parseRss(
        xml,
        { ...source, enabled: true, filter_mode: "nigeria_christian", nigeria_route: "off", category: "christian" },
        10000
      );
      const probedRecent = probed.filter((article) => inLast7Days(article, cutoff));
      row.nigeria_christian_probe = {
        qualified: probed.length,
        last7d: probedRecent.length,
        last7d_titles: probedRecent.map((article) => article.title),
      };
    }
    rows.push(row);
  } catch (error) {
    rows.push({
      source: source.id,
      enabled: source.enabled,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const batch = dedupeArticles(parsed, []);
const recentBatch = batch.filter((article) => inLast7Days(article, cutoff));
const summary = {
  at: new Date().toISOString(),
  window_start: new Date(cutoff).toISOString(),
  note: "Counts are parser output only. They do not include rows already stored in news_articles. Disabled sources are fetched for nigeria_christian_probe only and are excluded from qualified, kept, and after_cross_source_dedupe. The SQL upsert still skips a different link or title from the last 7 days.",
  per_source: rows,
  after_cross_source_dedupe: {
    kept: batch.length,
    dated: batch.filter((article) => article.published_at).length,
    last7d_total: recentBatch.length,
    last7d_christian: recentBatch.filter((article) => article.category === "christian").length,
    last7d_nigeria: recentBatch.filter((article) => article.category === "nigeria").length,
    last7d_with_image: recentBatch.filter((article) => article.image_url).length,
  },
};

console.log(JSON.stringify(summary, null, 2));
