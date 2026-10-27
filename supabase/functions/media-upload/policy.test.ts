import assert from "node:assert/strict";
import test from "node:test";
import { assertDeletableMediaPath, planMediaUpload } from "./policy.ts";

const base = { nowMs: 1700000000000, nonce: "abc123" };

test("plans an image under blog/ and rejects svg and html", () => {
  const plan = planMediaUpload({
    ...base,
    purpose: "image",
    contentType: "image/png",
    fileName: "banner.png",
    size: 1200,
  });
  assert.equal(plan.path, "blog/1700000000000-abc123.png");
  assert.equal(plan.contentType, "image/png");
  assert.equal(plan.upsert, false);

  assert.throws(
    () => planMediaUpload({ ...base, purpose: "image", contentType: "image/svg+xml", fileName: "x.svg", size: 100 }),
    /SVG and HTML/
  );
  assert.throws(
    () => planMediaUpload({ ...base, purpose: "document", contentType: "text/html", fileName: "notes.html", size: 100 }),
    /SVG and HTML/
  );
});

test("daily growth images are dated and documents keep pdf and word", () => {
  const image = planMediaUpload({
    ...base,
    purpose: "daily_growth",
    contentType: "image/jpeg",
    fileName: "cover.jpg",
    size: 2000,
    imageDate: "2026-10-28",
  });
  assert.equal(image.path, "daily-growth/2026-10-28/1700000000000-abc123.jpg");

  assert.throws(
    () =>
      planMediaUpload({
        ...base,
        purpose: "daily_growth",
        contentType: "image/png",
        fileName: "x.png",
        size: 10,
      }),
    /date/
  );

  const doc = planMediaUpload({
    ...base,
    purpose: "document",
    contentType: "application/pdf",
    fileName: "study.pdf",
    size: 5000,
  });
  assert.equal(doc.path, "documents/1700000000000-abc123.pdf");

  const receipt = planMediaUpload({
    ...base,
    purpose: "receipt",
    contentType: "",
    fileName: "receipt.pdf",
    size: 4000,
  });
  assert.equal(receipt.path, "contributions/1700000000000-abc123.pdf");
  assert.equal(receipt.contentType, "application/pdf");
});

test("delete paths stay inside known folders", () => {
  assert.equal(
    assertDeletableMediaPath("/daily-growth/2026-10-28/a.jpg"),
    "daily-growth/2026-10-28/a.jpg"
  );
  assert.throws(() => assertDeletableMediaPath("../secrets.env"), /Invalid storage path/);
  assert.throws(() => assertDeletableMediaPath("other/file.png"), /cannot be removed/);
});
