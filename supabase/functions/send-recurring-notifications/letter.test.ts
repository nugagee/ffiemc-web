import assert from "node:assert/strict";
import test from "node:test";
import { buildRecurringAnnouncement } from "./letter.ts";

test("uses the saved subject and church footer, and escapes the message", () => {
  const mail = buildRecurringAnnouncement({
    fullName: "Ada Okonkwo",
    subject: "Reminder: Weekly Social Media Team Meeting Tonight at 9:00 PM",
    title: "Social Media Meeting",
    body: "Join us tonight.\n\nBring <ideas>.",
    programTitle: "",
  });
  assert.equal(mail.subject, "Reminder: Weekly Social Media Team Meeting Tonight at 9:00 PM");
  assert.match(mail.text, /Hi Ada,/);
  assert.match(mail.text, /Join us tonight/);
  assert.match(mail.html, /Fire-Fire International Evangelical Church/);
  assert.match(mail.html, /Teach one by one another/);
  assert.match(mail.html, /#b91c1c/);
  assert.match(mail.html, /Bring &lt;ideas&gt;/);
  assert.doesNotMatch(mail.html, /<ideas>/);
});
