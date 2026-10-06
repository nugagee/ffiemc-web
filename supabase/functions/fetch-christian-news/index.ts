// Fetch Nigerian Christian news and education headlines (link aggregation — no full bodies).
// Education RSS: Legit.ng, Nigerian Tribune, PM News, BusinessDay, BBC.
// Faith is Nigerian only.
//   Nigerian desks (category nigeria): CT Nigeria, Tribune religion, Morning Star Nigeria,
//   Daily Post CAN, New Telegraph faith, Leadership religion, ICC (nigeria_route only).
//   International wires that still yield Nigerian items (category christian,
//   filter_mode nigeria_christian): Christian Today, Christian Daily International.
//   Disabled international wires, same filter if re-enabled: Christianity Today main feed,
//   Christian Post, Religion News Service, EWTN.
// punch-faith and punch-education stay in news_sources but disabled.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  cronAuthorized,
  dedupeArticles,
  DEDUP_WINDOW_MS,
  feedUrlForSource,
  isEducationRssOnly,
  looksLikeFeed,
  parseRss,
  parseTopicHtml,
  shouldScrape,
  sourceRank,
  type Article,
  type Source,
} from "./newsParse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function authorized(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("Authorization") || "";
  return cronAuthorized({
    headerSecret: req.headers.get("x-cron-secret") || "",
    querySecret: url.searchParams.get("secret") || "",
    bearerToken: auth.replace(/^Bearer\s+/i, "").trim(),
    cronSecret: Deno.env.get("NEWS_CRON_SECRET") || "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  });
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
  const feedUrl = feedUrlForSource(source);
  try {
    if (feedUrl) {
      try {
        const xml = await fetchText(feedUrl);
        if (!looksLikeFeed(xml)) throw new Error(`Feed was not RSS for ${source.id}`);
        articles.push(...parseRss(xml, source));
      } catch (e) {
        if (isEducationRssOnly(source) || !source.scrape_url) throw e;
      }
    }
    // Education RSS feeds are not keyword-filtered and are not HTML-scraped.
    // Punch topic pages are scraped when RSS is missing or keeps fewer than 5 headlines.
    if (shouldScrape(source, articles.length)) {
      const html = await fetchText(source.scrape_url);
      const scraped = parseTopicHtml(html, source);
      for (const article of scraped) {
        if (!articles.some((row) => row.url === article.url)) articles.push(article);
      }
    }
    return { articles };
  } catch (e) {
    return { articles, error: String((e as Error)?.message || e) };
  }
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

    const ordered = ((sources || []) as Source[]).sort(
      (a, b) => sourceRank(a.id) - sourceRank(b.id) || a.name.localeCompare(b.name)
    );

    const report: Record<string, unknown>[] = [];
    const all: Article[] = [];

    for (const source of ordered) {
      const result = await collectFromSource(source);
      report.push({
        source: source.id,
        count: result.articles.length,
        error: result.error || null,
      });
      all.push(...result.articles);
    }

    const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString().slice(0, 10);
    const { data: recent, error: recentErr } = await supabase
      .from("news_articles")
      .select("title, url, published_at, created_at")
      .or(`published_at.gte.${since},created_at.gte.${since}`)
      .limit(1000);
    if (recentErr) throw recentErr;

    const batch = dedupeArticles(all, recent || []);

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
