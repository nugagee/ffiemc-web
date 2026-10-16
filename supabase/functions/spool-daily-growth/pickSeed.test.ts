import assert from "node:assert/strict";
import test from "node:test";
import {
  GROWTH_SEEDS,
  addDaysISO,
  buildLowQueueAlert,
  noEligibleSeedMessage,
  pickGrowthSeed,
  rowsToHistory,
  type Seed,
} from "./pickSeed.ts";

const TODAY = "2026-10-16";

function seed(partial: Partial<Seed> & Pick<Seed, "title" | "scripture">): Seed {
  return {
    category: "fact",
    body: "",
    ...partial,
  };
}

test("does not cycle a category once every seed was published this year", () => {
  const prophecy = GROWTH_SEEDS.filter((item) => item.category === "prophecy");
  assert.equal(prophecy.length, 10);
  const history = prophecy.map((item) => ({
    title: item.title,
    scripture: item.scripture,
    publishedOn: TODAY,
  }));
  const dayIndex = 5;
  const picked = pickGrowthSeed({
    category: "prophecy",
    seeds: GROWTH_SEEDS,
    history,
    today: TODAY,
    dayIndex,
  });
  assert.equal(picked, null);
  assert.notEqual(picked, prophecy[dayIndex % prophecy.length]);
});

test("picks the least recently used seed, and never-used before an old one", () => {
  const seeds = [
    seed({ title: "Older", scripture: "John 1:1" }),
    seed({ title: "Newer", scripture: "John 1:2" }),
    seed({ title: "Fresh", scripture: "John 1:3" }),
  ];
  const picked = pickGrowthSeed({
    category: "fact",
    seeds,
    history: [
      { title: "Older", scripture: "John 1:1", publishedOn: "2025-01-01" },
      { title: "Newer", scripture: "John 1:2", publishedOn: "2025-06-01" },
    ],
    today: TODAY,
    dayIndex: 0,
  });
  assert.equal(picked?.title, "Fresh");
});

test("after every seed has aged past a year, the oldest publication is next", () => {
  const seeds = [
    seed({ title: "Older", scripture: "John 1:1" }),
    seed({ title: "Newer", scripture: "John 1:2" }),
    seed({ title: "Recent", scripture: "John 1:3" }),
  ];
  const picked = pickGrowthSeed({
    category: "fact",
    seeds,
    history: [
      { title: "Older", scripture: "John 1:1", publishedOn: "2025-01-01" },
      { title: "Newer", scripture: "John 1:2", publishedOn: "2025-06-01" },
      { title: "Recent", scripture: "John 1:3", publishedOn: "2026-10-01" },
    ],
    today: TODAY,
    dayIndex: 99,
  });
  assert.equal(picked?.title, "Older");
});

test("a title or scripture published exactly 365 days ago is still blocked", () => {
  const cutoff = addDaysISO(TODAY, -365);
  assert.equal(cutoff, "2025-10-16");
  const seeds = [seed({ title: "Boundary", scripture: "John 11:35" })];
  assert.equal(
    pickGrowthSeed({
      category: "fact",
      seeds,
      history: [{ title: "Boundary", scripture: "John 11:35", publishedOn: cutoff }],
      today: TODAY,
      dayIndex: 0,
    }),
    null
  );
  assert.equal(
    pickGrowthSeed({
      category: "fact",
      seeds,
      history: [{ title: "Boundary", scripture: "John 11:35", publishedOn: "2025-10-15" }],
      today: TODAY,
      dayIndex: 0,
    })?.title,
    "Boundary"
  );
});

test("blocks a different title when the scripture was published recently", () => {
  const picked = pickGrowthSeed({
    category: "fact",
    seeds: [seed({ title: "Fruit of the Spirit", scripture: "Galatians 5:22-23" })],
    history: [{ title: "Gentleness", scripture: "Galatians 5:22-23", publishedOn: TODAY }],
    today: TODAY,
    dayIndex: 0,
  });
  assert.equal(picked, null);
});

test("a semicolon-separated reference blocks each passage", () => {
  const picked = pickGrowthSeed({
    category: "prophecy",
    seeds: [seed({ category: "prophecy", title: "The virgin birth", scripture: "Isaiah 7:14" })],
    history: [
      {
        title: "Immanuel",
        scripture: "Isaiah 7:14; Matthew 1:22–23",
        publishedOn: TODAY,
      },
    ],
    today: TODAY,
    dayIndex: 0,
  });
  assert.equal(picked, null);
});

test("dash and case differences still count as the same title and scripture", () => {
  const picked = pickGrowthSeed({
    category: "trait",
    seeds: [seed({ category: "trait", title: "Patience", scripture: "James 1:2-4" })],
    history: [{ title: "  patience ", scripture: "James 1:2–4", publishedOn: TODAY }],
    today: TODAY,
    dayIndex: 0,
  });
  assert.equal(picked, null);
});

test("queued rows count as used today, drafts do not", () => {
  const history = rowsToHistory(
    [
      { title: "Love", scripture_ref: "1 Corinthians 13:4-7", status: "queued" },
      { title: "Joy", scripture_ref: "Nehemiah 8:10", status: "draft", published_on: TODAY },
      {
        title: "Peace",
        scripture_ref: "Philippians 4:6-7",
        status: "archived",
        published_on: "2020-01-01",
      },
    ],
    TODAY
  );
  const seeds = [
    seed({ category: "trait", title: "Love", scripture: "1 Corinthians 13:4-7" }),
    seed({ category: "trait", title: "Joy", scripture: "Nehemiah 8:10" }),
    seed({ category: "trait", title: "Peace", scripture: "Philippians 4:6-7" }),
  ];
  const picked = pickGrowthSeed({
    category: "trait",
    seeds,
    history,
    today: TODAY,
    dayIndex: 0,
  });
  assert.equal(picked?.title, "Joy");
});

test("skip message names the category and does not invent a replacement", () => {
  assert.match(noEligibleSeedMessage("prophecy"), /prophecy/);
  assert.match(noEligibleSeedMessage("prophecy"), /365/);
  assert.match(noEligibleSeedMessage("prophecy"), /skipped/i);
});

test("low-queue alert names the categories and the once-a-day limit", () => {
  const mail = buildLowQueueAlert({
    today: TODAY,
    adminUrl: "https://ffiem.org/admin/blog/daily-growth",
    items: [
      {
        category: "prophecy",
        label: "Prophecy",
        queued: 0,
        detail: "0 queued (below 7 days of supply). <skipped>",
      },
    ],
  });
  assert.match(mail.subject, /Prophecy/);
  assert.match(mail.text, /below 7 days/);
  assert.match(mail.text, /one alert is sent per category per day/i);
  assert.match(mail.html, /&lt;skipped&gt;/);
  assert.doesNotMatch(mail.html, /<skipped>/);
});
