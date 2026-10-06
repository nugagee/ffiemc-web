import assert from "node:assert/strict";
import test from "node:test";
import {
  CHRISTIAN_ACRONYM_RE,
  CHRISTIAN_RE,
  cronAuthorized,
  dedupeArticles,
  EDUCATION_RE,
  extractRssImage,
  FAITH_RE,
  feedUrlForSource,
  isEducationRssOnly,
  normaliseLink,
  normaliseTitle,
  parseLagosDateTime,
  parseRfc822,
  parseRss,
  parseTopicHtml,
  passesChristianContent,
  passesSourceFilter,
  resolveCategory,
  RSS_ITEM_LIMIT,
  shouldScrape,
  sourceRank,
  type Source,
} from "./newsParse.ts";

function source(partial: Partial<Source> & Pick<Source, "id">): Source {
  return {
    name: partial.id,
    homepage_url: "https://example.com/",
    feed_url: "",
    scrape_url: "",
    category: "education",
    enabled: true,
    ...partial,
  };
}

const legit = source({
  id: "legit-education",
  name: "Legit.ng — Education",
  homepage_url: "https://www.legit.ng/education",
  feed_url: "https://www.legit.ng/rss/education.rss",
  category: "education",
});

const tribune = source({
  id: "tribune-education",
  name: "Nigerian Tribune — Education",
  homepage_url: "https://tribuneonlineng.com/category/education/",
  feed_url: "https://tribuneonlineng.com/category/education/feed/",
});

const pm = source({
  id: "pmnews-education",
  name: "PM News — Education",
  homepage_url: "https://pmnewsnigeria.com/category/education/",
  feed_url: "https://pmnewsnigeria.com/category/education/feed/",
});

const businessday = source({
  id: "businessday-education",
  name: "BusinessDay — Education",
  homepage_url: "https://businessday.ng/category/education/",
  feed_url: "https://businessday.ng/category/education/feed/",
});

const bbc = source({
  id: "bbc-education",
  name: "BBC — Education",
  homepage_url: "https://www.bbc.co.uk/news/education",
  feed_url: "https://feeds.bbci.co.uk/news/education/rss.xml",
});

const punch = source({
  id: "punch-education",
  name: "Punch — Education",
  homepage_url: "https://punchng.com/topics/education/",
  feed_url: "https://rss.punchng.com/v1/category/education",
  scrape_url: "https://punchng.com/topics/education/",
  category: "education",
});

test("education keyword filter keeps lecturers, professors, graduate, and tertiary", () => {
  for (const title of [
    "UNILORIN promotes 13 lecturers to professors",
    "I stopped cramming, studied smarter to graduate with first class — Babcock graduate",
    "FG to rank tertiary institutions nationwide on 22 indicators",
    "Crawford varsity gets NUC nod for six postgraduate programmes",
    "FG releases final approved textbooks for 2026-2028",
  ]) {
    assert.equal(EDUCATION_RE.test(title), true, title);
    assert.equal(passesSourceFilter(punch, title, "", "https://punchng.com/some-education-story-slug/"), true, title);
  }
  assert.equal(
    passesSourceFilter(punch, "APC rally holds in Lagos tomorrow", "", "https://punchng.com/apc-rally-holds-in-lagos-tomorrow/"),
    false
  );
});

test("education-only RSS feeds skip the keyword filter and the HTML scrape", () => {
  for (const feed of [legit, tribune, pm, businessday, bbc]) {
    assert.equal(isEducationRssOnly(feed), true);
    assert.equal(shouldScrape(feed, 0), false);
    assert.equal(passesSourceFilter(feed, "Potty training scheme to roll out to 20 more areas", "", "https://www.bbc.co.uk/news/articles/example"), true);
  }
  assert.equal(isEducationRssOnly(punch), false);
  assert.equal(shouldScrape(punch, 0), true);
  assert.equal(shouldScrape(punch, 5), false);
});

test("does not follow the Punch education topic feed", () => {
  assert.equal(
    feedUrlForSource({ ...punch, feed_url: "https://punchng.com/topics/education/feed/" }),
    ""
  );
  assert.equal(
    feedUrlForSource({ ...punch, feed_url: "https://punchng.com/topics/education/feed" }),
    ""
  );
  assert.equal(feedUrlForSource(punch), punch.feed_url);
});

test("parses pubDate and images from each education feed shape", () => {
  const legitXml = `<?xml version="1.0"?><rss><channel><item>
      <title><![CDATA[Abia students win debate award]]></title>
      <link>https://www.legit.ng/education/1734339-abia-students/</link>
      <description><![CDATA[Students from Abia public schools have won an award.]]></description>
      <pubDate>Mon, 05 Oct 2026 11:41:52 +0100</pubDate>
      <enclosure url="https://cdn.legit.ng/images/1200x675/715bbec4b8b032cd.jpeg?v=1" type="image/jpeg" length="14072"></enclosure>
    </item></channel></rss>`;
  const [legitItem] = parseRss(legitXml, legit);
  assert.equal(legitItem.published_at, "2026-10-05T10:41:52.000Z");
  assert.equal(legitItem.image_url, "https://cdn.legit.ng/images/1200x675/715bbec4b8b032cd.jpeg?v=1");
  assert.equal(legitItem.source_name, "Legit.ng — Education");

  const tribuneXml = `<?xml version="1.0"?><rss><channel><item>
      <title>Sokoto records exam success</title>
      <link>https://tribuneonlineng.com/sokoto-records-exam-success/</link>
      <dc:creator><![CDATA[Tribune Online]]></dc:creator>
      <pubDate>Sun, 04 Oct 2026 21:02:28 +0000</pubDate>
      <description><![CDATA[<p>Students performed well.</p>]]></description>
      <media:thumbnail url="https://tribuneonlineng.com/wp-content/uploads/2025/08/Sokoto-map.jpg" />
    </item></channel></rss>`;
  const [tribuneItem] = parseRss(tribuneXml, tribune);
  assert.equal(tribuneItem.published_at, "2026-10-04T21:02:28.000Z");
  assert.equal(tribuneItem.image_url, "https://tribuneonlineng.com/wp-content/uploads/2025/08/Sokoto-map.jpg");
  assert.equal(tribuneItem.author, "Tribune Online");

  const pmXml = `<?xml version="1.0"?><rss><channel><item>
      <title>School calendar released for the new term</title>
      <link>https://pmnewsnigeria.com/2026/10/05/school-calendar/</link>
      <pubDate>Mon, 05 Oct 2026 09:00:00 +0000</pubDate>
      <description><![CDATA[<p>No image in this item.</p>]]></description>
    </item></channel></rss>`;
  const [pmItem] = parseRss(pmXml, pm);
  assert.equal(pmItem.published_at, "2026-10-05T09:00:00.000Z");
  assert.equal(pmItem.image_url, "");

  const businessdayXml = `<?xml version="1.0"?><rss><channel><item>
      <title>FG unveils plan for the teaching profession</title>
      <link>https://businessday.ng/education/article/fg-unveils-plan/</link>
      <pubDate>Mon, 05 Oct 2026 08:55:43 +0000</pubDate>
      <description><![CDATA[<img width="1024" height="576" src="https://cdn.businessday.ng/wp-content/uploads/2026/02/Tunji-Alausa-large.jpg" alt="Minister" /><p>The federal government announced a plan.</p>]]></description>
    </item></channel></rss>`;
  const [businessdayItem] = parseRss(businessdayXml, businessday);
  assert.equal(businessdayItem.image_url, "https://cdn.businessday.ng/wp-content/uploads/2026/02/Tunji-Alausa-large.jpg");
  assert.match(businessdayItem.excerpt, /federal government/);
  assert.equal(businessdayItem.published_at, "2026-10-05T08:55:43.000Z");

  const bbcXml = `<?xml version="1.0"?><rss><channel><item>
      <title><![CDATA[Potty training scheme to roll out to 20 more areas]]></title>
      <description><![CDATA[The government wants children ready for school.]]></description>
      <link>https://www.bbc.co.uk/news/articles/ck4glnl2v9p5o?at_medium=RSS&amp;at_campaign=rss</link>
      <pubDate>Mon, 05 Oct 2026 07:56:41 GMT</pubDate>
      <media:thumbnail width="240" height="134" url="https://ichef.bbci.co.uk/ace/standard/240/example.jpg"/>
    </item></channel></rss>`;
  const [bbcItem] = parseRss(bbcXml, bbc);
  assert.equal(bbcItem.published_at, "2026-10-05T07:56:41.000Z");
  assert.equal(bbcItem.image_url, "https://ichef.bbci.co.uk/ace/standard/240/example.jpg");
  assert.equal(bbcItem.category, "education");
});

test("image extractor prefers media content, then thumbnail, then enclosure, then description img", () => {
  const block = `<item>
    <media:content url="https://cdn.example/video.mp4" medium="video" />
    <media:content url="https://cdn.example/photo.jpg" medium="image" />
    <enclosure url="https://cdn.example/other.jpg" type="image/jpeg" />
    <description><![CDATA[<img src="https://cdn.example/desc.jpg" />]]></description>
  </item>`;
  assert.equal(extractRssImage(block, legit), "https://cdn.example/photo.jpg");
});

test("Punch topic HTML dates meta-time and post-date in Africa/Lagos", () => {
  assert.equal(parseLagosDateTime("October 3, 2026 12:02 am"), "2026-10-02T23:02:00.000Z");
  assert.equal(parseLagosDateTime("October 5, 2026 9:45 am"), "2026-10-05T08:45:00.000Z");
  assert.equal(parseRfc822("Mon, 05 Oct 2026 11:41:52 +0100"), "2026-10-05T10:41:52.000Z");

  const html = `
    <article class="entry-item-simple">
      <div class="entry-meta"><div class="meta-time"><span> October 3, 2026 12:02 am </span></div></div>
      <h3 class="entry-title"><a href="https://punchng.com/babcock-graduate-studied-smarter-for-first-class/">I stopped cramming, studied smarter to graduate with first class</a></h3>
    </article>
    <div class="post-content">
      <h2 class="post-title"><a href="https://punchng.com/unilorin-promotes-13-lecturers-to-professors/">UNILORIN promotes 13 lecturers to professors</a></h2>
      <span class="post-date"> October 5, 2026 9:45 am </span>
    </div>
    <h2 class="post-title"><a href="https://punchng.com/apc-rally-holds-in-lagos-tomorrow-night/">APC rally holds in Lagos tomorrow night</a></h2>
  `;
  const items = parseTopicHtml(html, punch);
  assert.equal(items.length, 2);
  assert.equal(items[0].published_at, "2026-10-02T23:02:00.000Z");
  assert.equal(items[1].published_at, "2026-10-05T08:45:00.000Z");
  assert.equal(items[1].title.includes("lecturers"), true);
});

test("dedupes by normalised title and link inside the recent window, and still refreshes the same url", () => {
  const first = {
    title: "FG unveils 5-pillar plan to transform teaching!",
    url: "https://www.legit.ng/education/plan/",
  };
  const syndicated = {
    title: "FG unveils 5-pillar plan to transform teaching",
    url: "https://tribuneonlineng.com/fg-plan/",
  };
  const sameLink = {
    title: "A different headline that is long enough here",
    url: "https://www.bbc.co.uk/news/articles/abc?at_medium=RSS&at_campaign=rss",
  };
  const tracked = {
    title: "Another different headline that is long enough",
    url: "https://bbc.co.uk/news/articles/abc",
  };
  const batch = dedupeArticles([first, syndicated, sameLink, tracked], []);
  assert.deepEqual(batch.map((row) => row.url), [first.url, sameLink.url]);

  const refresh = dedupeArticles([first], [first]);
  assert.equal(refresh.length, 1);

  assert.equal(
    normaliseLink("https://www.bbc.co.uk/news/articles/abc?at_medium=RSS&at_campaign=rss"),
    normaliseLink("https://bbc.co.uk/news/articles/abc")
  );
  assert.equal(normaliseTitle("FG unveils 5-pillar plan!"), normaliseTitle("fg unveils 5 pillar plan"));
});

test("faith and christian patterns keep church vocabulary and case-sensitive acronyms", () => {
  for (const word of [
    "pope",
    "prayer",
    "worship",
    "chapel",
    "cathedral",
    "crusade",
    "revival",
    "tithe",
    "prophet",
    "apostle",
    "Jesus",
    "Christ",
    "Vatican",
    "cardinal",
    "communion",
    "choir",
    "evangelist",
    "pastor",
    "bishop",
    "church",
    "gospel",
    "Winners",
    "MFM",
    "Deeper Life",
    "RCCG",
    "CAC",
  ]) {
    assert.equal(FAITH_RE.test(`Leaders discuss ${word} today`), true, word);
    assert.equal(CHRISTIAN_RE.test(`Leaders discuss ${word} today`), true, word);
  }
  assert.equal(CHRISTIAN_ACRONYM_RE.test("CAN warns churches"), true);
  assert.equal(CHRISTIAN_ACRONYM_RE.test("PFN president speaks"), true);
  assert.equal(CHRISTIAN_ACRONYM_RE.test("CBCN meets in Abuja"), true);
  assert.equal(CHRISTIAN_ACRONYM_RE.test("You can help the parish"), false);
  assert.equal(CHRISTIAN_ACRONYM_RE.test("the pfn chapter"), false);
});

test("christian filter keeps Christian rows and drops Islamic-only rows", () => {
  const desk = source({
    id: "tribune-religion",
    category: "nigeria",
    filter_mode: "christian",
    homepage_url: "https://tribuneonlineng.com/category/religion/",
    feed_url: "https://tribuneonlineng.com/category/religion/feed/",
  });
  const keep = [
    ["Pope leads prayer in the cathedral", ""],
    ["CAN chair tells Tinubu to reduce food prices", "Christian Association of Nigeria"],
    ["Christians and Muslims meet in Kaduna", ""],
    ["Deeper Life holds a crusade", ""],
    ["Seeking the Saviour for genuine salvation and eternal life", ""],
  ];
  for (const [title, excerpt] of keep) {
    assert.equal(passesChristianContent(title, excerpt), true, title);
    assert.equal(passesSourceFilter(desk, title, excerpt, "https://tribuneonlineng.com/story-title-long-enough/"), true, title);
  }
  const drop = [
    ["Imam leads Eid prayer at the central mosque", ""],
    ["NSCIA expands its executive council", "The apex Islamic body met in Abuja"],
    ["Sultan of Sokoto speaks on Ramadan", ""],
    ["APC rally holds in Lagos tomorrow", ""],
  ];
  for (const [title, excerpt] of drop) {
    assert.equal(passesSourceFilter(desk, title, excerpt, "https://tribuneonlineng.com/story-title-long-enough/"), false, title);
  }
});

test("filter_mode none skips the keyword gate and Nigeria routing is stable", () => {
  const today = source({
    id: "christian-today",
    name: "Christian Today",
    category: "christian",
    filter_mode: "none",
    nigeria_route: "mention",
    homepage_url: "https://www.christiantoday.com/",
    feed_url: "https://www.christiantoday.com/rss.xml",
  });
  assert.equal(
    passesSourceFilter(today, "Market report for the week ahead", "", "https://www.christiantoday.com/news/markets"),
    true
  );
  assert.equal(resolveCategory(today, "Pope visits Rome", "A Vatican liturgy"), "christian");
  assert.equal(resolveCategory(today, "Pastor killed in Plateau", "Gunmen attacked a church"), "nigeria");
  assert.equal(resolveCategory(today, "CAN meets in Abuja", ""), "nigeria");
  assert.equal(resolveCategory(today, "Pastor killed in Plateau", "Gunmen attacked a church"), "nigeria");

  const icc = source({
    id: "icc",
    category: "nigeria",
    filter_mode: "christian",
    nigeria_route: "only",
    homepage_url: "https://www.persecution.org/",
    feed_url: "https://www.persecution.org/feed/",
  });
  assert.equal(resolveCategory(icc, "Chinese pastor detained", "Officials arrested him at home"), null);
  assert.equal(resolveCategory(icc, "Plateau governor imposes a curfew", "A pastor and 27 others were killed"), "nigeria");
});

test("parseRss keeps the newest items when the feed is unordered, then caps the list", () => {
  const feed = source({
    id: "christian-today",
    name: "Christian Today",
    category: "christian",
    filter_mode: "none",
    nigeria_route: "mention",
    homepage_url: "https://www.christiantoday.com/",
    feed_url: "https://www.christiantoday.com/rss.xml",
  });
  const total = RSS_ITEM_LIMIT + 8;
  const blocks: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const day = String((i % 27) + 1).padStart(2, "0");
    const link = `https://www.christiantoday.com/news/story-${i}`;
    blocks.push(`<item>
      <title>Church story number ${i} from the feed</title>
      <link>${link}</link>
      <description>A congregation met for worship.</description>
      <pubDate>${day} Sep 2026 09:00:00 +0000</pubDate>
    </item>`);
  }
  blocks.push(`<item>
    <title>Plateau church attacked overnight</title>
    <link>https://www.christiantoday.com/news/plateau-church?utm_source=rss&utm_medium=rss</link>
    <description>Older copy of the same link.</description>
    <pubDate>05 Oct 2026 09:57:00 +0000</pubDate>
  </item>`);
  blocks.push(`<item>
    <title>Plateau church attacked overnight</title>
    <link>https://www.christiantoday.com/news/plateau-church</link>
    <description>Gunmen attacked a church in Plateau.</description>
    <pubDate>06 Oct 2026 09:57:00 +0000</pubDate>
  </item>`);
  const items = parseRss(`<rss><channel>${blocks.join("")}</channel></rss>`, feed);
  assert.equal(items.length, RSS_ITEM_LIMIT);
  assert.equal(items[0].title, "Plateau church attacked overnight");
  assert.equal(items[0].category, "nigeria");
  assert.equal(items[0].published_at, "2026-10-06T09:57:00.000Z");
  assert.equal(items.filter((row) => row.url.includes("plateau-church")).length, 1);
  assert.equal(items.some((row) => row.url.endsWith("story-0")), false);
  assert.ok(items.every((row, index) => index === 0 || String(row.published_at) <= String(items[index - 1].published_at)));
});

test("images fall back to an empty url when the item has none", () => {
  const feed = source({
    id: "christian-today",
    category: "christian",
    filter_mode: "none",
    homepage_url: "https://www.christiantoday.com/",
    feed_url: "https://www.christiantoday.com/rss.xml",
  });
  const xml = `<rss><channel><item>
    <title>Churches connect poverty work with the gospel</title>
    <link>https://www.christiantoday.com/news/poverty-and-gospel</link>
    <description>No image in this item.</description>
    <pubDate>Fri, 02 Oct 2026 12:38:00 +0000</pubDate>
    <media:content url="https://cdn.example/spacer.gif" medium="image" />
    <media:content url="https://cdn.example/photo.jpg" medium="image" type="image/jpeg"></media:content>
    <content:encoded><![CDATA[<img src="https://cdn.example/ignored-because-media-won.jpg" />]]></content:encoded>
  </item></channel></rss>`;
  const [item] = parseRss(xml, feed);
  assert.equal(item.image_url, "https://cdn.example/photo.jpg");

  const bare = `<rss><channel><item>
    <title>Churches connect poverty work with the gospel</title>
    <link>https://www.christiantoday.com/news/no-picture</link>
    <description>No image in this item.</description>
    <pubDate>Fri, 02 Oct 2026 12:38:00 +0000</pubDate>
  </item></channel></rss>`;
  assert.equal(parseRss(bare, feed)[0].image_url, "");

  const encodedOnly = `<item>
    <content:encoded><![CDATA[<p>Text</p><img src="https://cdn.example/from-encoded.jpg" />]]></content:encoded>
  </item>`;
  assert.equal(extractRssImage(encodedOnly, feed), "https://cdn.example/from-encoded.jpg");
});

test("near-identical titles match once stopwords are dropped", () => {
  assert.equal(
    normaliseTitle("Church attacked in the Plateau"),
    normaliseTitle("Church attacked on Plateau")
  );
  assert.equal(normaliseTitle("The choir sings at the cathedral"), "choir sings cathedral");
  const first = {
    title: "Church attacked in the Plateau state",
    url: "https://www.christiantoday.com/news/plateau-a",
  };
  const restated = {
    title: "Church attacked on Plateau state",
    url: "https://tribuneonlineng.com/church-attacked-plateau/",
  };
  const kept = dedupeArticles([first, restated], []);
  assert.deepEqual(kept.map((row) => row.url), [first.url]);
  assert.equal(sourceRank("christian-today") < 100, true);
  assert.equal(sourceRank("icc") < sourceRank("christian-today"), true);
});

test("cron auth prefers the header and still accepts the query secret briefly", () => {
  assert.equal(cronAuthorized({ headerSecret: "abc", cronSecret: "abc" }), true);
  assert.equal(cronAuthorized({ querySecret: "abc", cronSecret: "abc" }), true);
  assert.equal(cronAuthorized({ bearerToken: "service", serviceKey: "service" }), true);
  assert.equal(cronAuthorized({ headerSecret: "nope", querySecret: "nope", cronSecret: "abc" }), false);
  assert.equal(cronAuthorized({ headerSecret: "abc", cronSecret: "" }), false);
});
