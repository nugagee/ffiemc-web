import assert from "node:assert/strict";
import test from "node:test";
import {
  cronAuthorized,
  dedupeArticles,
  EDUCATION_RE,
  extractRssImage,
  feedUrlForSource,
  isEducationRssOnly,
  normaliseLink,
  normaliseTitle,
  parseLagosDateTime,
  parseRfc822,
  parseRss,
  parseTopicHtml,
  passesSourceFilter,
  shouldScrape,
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

test("cron auth prefers the header and still accepts the query secret briefly", () => {
  assert.equal(cronAuthorized({ headerSecret: "abc", cronSecret: "abc" }), true);
  assert.equal(cronAuthorized({ querySecret: "abc", cronSecret: "abc" }), true);
  assert.equal(cronAuthorized({ bearerToken: "service", serviceKey: "service" }), true);
  assert.equal(cronAuthorized({ headerSecret: "nope", querySecret: "nope", cronSecret: "abc" }), false);
  assert.equal(cronAuthorized({ headerSecret: "abc", cronSecret: "" }), false);
});
