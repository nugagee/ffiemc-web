import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContributionPaymentUpdatedMail,
  readContributionPaymentId,
  resolveContributionPaymentRecipients,
} from "./contributionPayment.ts";

const row = {
  full_name: "Ada Okonkwo",
  amount: 5000,
  payment_date: "2026-10-28",
  note: "October dues",
  receipt_url: "https://mpdvjaotalklzftktuuv.supabase.co/storage/v1/object/public/media/contributions/receipt.pdf",
  month_label: "October 2026",
  month_slug: "october",
  updated_by_name: "Adenuga",
  source: "public",
  member_email: "ada@example.com",
};

test("resolves the roster address and ignores a browser recipient", () => {
  const resolved = resolveContributionPaymentRecipients({
    memberEmail: " Ada@Example.com ",
    adminEmails: ["adenugaolajideadewale@gmail.com", "not-an-email", "adenugaolajideadewale@gmail.com"],
    clientTo: "attacker@evil.test",
  });
  assert.equal(resolved.member, "ada@example.com");
  assert.deepEqual(resolved.admins, ["adenugaolajideadewale@gmail.com"]);
  assert.equal(readContributionPaymentId({
    contributionId: "abc",
    to: "attacker@evil.test",
    subject: "ignore me",
  }), "abc");
});

test("drops a member with no usable email", () => {
  const resolved = resolveContributionPaymentRecipients({
    memberEmail: "",
    adminEmails: ["admin@ffiem.org"],
  });
  assert.equal(resolved.member, null);
  assert.deepEqual(resolved.admins, ["admin@ffiem.org"]);
});

test("letters use the church template and the saved payment details", () => {
  const member = buildContributionPaymentUpdatedMail(row, "member");
  const admin = buildContributionPaymentUpdatedMail(row, "admin");

  assert.match(member.subject, /updated — ₦5,000/);
  assert.match(member.text, /Dear Ada Okonkwo/);
  assert.match(member.text, /28 Oct 2026/);
  assert.match(member.text, /October 2026/);
  assert.match(member.text, /October dues/);
  assert.match(member.text, /Updated by: Adenuga/);
  assert.match(member.html, /Fire-Fire International Evangelical Church/);
  assert.match(member.html, /Teach one by one another/);
  assert.match(member.html, /#b91c1c/);
  assert.doesNotMatch(member.html, /admin\/utilities/);

  assert.match(admin.subject, /Ada Okonkwo/);
  assert.match(admin.text, /updated by Adenuga/);
  assert.match(admin.html, /admin\/utilities\/media-contributions/);
  assert.match(admin.text, /Via payment link/);
});

test("escapes payment notes so the letter cannot inject markup", () => {
  const mail = buildContributionPaymentUpdatedMail({
    ...row,
    full_name: "Ada <script>",
    note: `<img src=x onerror="alert(1)">`,
  }, "member");
  assert.match(mail.html, /Ada &lt;script&gt;/);
  assert.match(mail.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.doesNotMatch(mail.html, /<img src=x/);
});
