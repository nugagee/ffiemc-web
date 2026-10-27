import assert from "node:assert/strict";
import test from "node:test";
import { buildGrowthDigest, resolveGrowthEmailImage, safeGrowthImageUrl } from "./digest.ts";

const ANSWER = "The burning bush (Moses at Horeb).";
const IMAGE = "https://mpdvjaotalklzftktuuv.supabase.co/storage/v1/object/public/media/daily-growth/2026-10-28/abc.jpg";

const items = [
  {
    category: "riddle",
    title: "A bush that burned",
    body: "What burned with fire yet was not consumed?",
    scripture_ref: "Exodus 3:2",
    answer: ANSWER,
  },
  {
    category: "fact",
    title: "Shortest verse",
    body: "Jesus wept.",
    scripture_ref: "John 11:35",
    answer: "should-not-matter",
  },
];

test("puts the day's image at the top and never includes a riddle answer", () => {
  const mail = buildGrowthDigest({
    items,
    runDate: "2026-10-28",
    imageUrl: IMAGE,
    blogLink: "https://ffiem.org/blog?tab=daily-growth",
  });
  const imageAt = mail.html.indexOf("<img ");
  const titleAt = mail.html.indexOf("A bush that burned");
  assert.ok(imageAt >= 0);
  assert.ok(imageAt < titleAt);
  assert.match(mail.html, new RegExp(`src="${IMAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(mail.text, new RegExp(IMAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(mail.text.indexOf(IMAGE) < mail.text.indexOf("A bush that burned"), true);
  assert.doesNotMatch(mail.html, /burning bush \(Moses/);
  assert.doesNotMatch(mail.text, /burning bush \(Moses/);
  assert.doesNotMatch(mail.html, /should-not-matter/);
  assert.doesNotMatch(mail.text, /should-not-matter/);
  assert.match(mail.html, /Answer on the website/);
  assert.match(mail.text, /Answer on the website/);
});

test("sends the same letter without an image when none is set or the probe fails", () => {
  const missing = buildGrowthDigest({
    items,
    runDate: "2026-10-28",
    blogLink: "https://ffiem.org/blog?tab=daily-growth",
  });
  assert.doesNotMatch(missing.html, /<img /);
  assert.doesNotMatch(missing.text, /https:\/\/mpdvjaotalklzftktuuv/);
  assert.match(missing.text, /Here is today's spiritual growth content/);

  assert.equal(resolveGrowthEmailImage({ imageUrl: IMAGE, probeOk: false, contentType: "image/jpeg" }), "");
  assert.equal(
    resolveGrowthEmailImage({ imageUrl: IMAGE, probeOk: true, contentType: "text/html" }),
    ""
  );
  assert.equal(
    resolveGrowthEmailImage({ imageUrl: IMAGE, probeOk: true, contentType: "image/svg+xml" }),
    ""
  );
  assert.equal(resolveGrowthEmailImage({ imageUrl: IMAGE, probeOk: true, contentType: "image/jpeg" }), IMAGE);
  assert.equal(resolveGrowthEmailImage({ imageUrl: IMAGE, probeOk: true, contentType: "" }), IMAGE);
  assert.equal(safeGrowthImageUrl("https://cdn.example.com/flyer.svg"), "");
  assert.equal(safeGrowthImageUrl("javascript:alert(1)"), "");
});
