import assert from "node:assert/strict";
import test from "node:test";
import { CONTRIBUTION_PAYMENT_UPDATED, PUBLIC_PURPOSES, consumesBulkEmailQuota, gatePurpose } from "./policy.ts";

test("contribution updates require an admin session and stay off the bulk quota", () => {
  assert.equal(PUBLIC_PURPOSES.has(CONTRIBUTION_PAYMENT_UPDATED), false);
  assert.deepEqual(
    gatePurpose({ sessionOk: false, bearerIsService: false, purpose: CONTRIBUTION_PAYMENT_UPDATED }),
    { ok: false, status: 403, error: "Admin session required" }
  );
  assert.deepEqual(
    gatePurpose({ sessionOk: false, bearerIsService: true, purpose: CONTRIBUTION_PAYMENT_UPDATED }),
    { ok: false, status: 403, error: "Admin session required" }
  );
  assert.deepEqual(
    gatePurpose({ sessionOk: true, bearerIsService: false, purpose: CONTRIBUTION_PAYMENT_UPDATED }),
    { ok: true }
  );
  assert.equal(consumesBulkEmailQuota(CONTRIBUTION_PAYMENT_UPDATED, 2), false);
  assert.equal(consumesBulkEmailQuota("member_announcement", 1), true);
  assert.equal(consumesBulkEmailQuota("meeting_invite", 1), true);
  assert.equal(consumesBulkEmailQuota("compose", 2), true);
  assert.equal(consumesBulkEmailQuota("media_contribution", 1), false);
  assert.equal(consumesBulkEmailQuota("contact", 1), false);
});

test("existing public and service purposes keep their gates", () => {
  assert.deepEqual(
    gatePurpose({ sessionOk: false, bearerIsService: false, purpose: "media_contribution" }),
    { ok: true }
  );
  assert.deepEqual(
    gatePurpose({ sessionOk: false, bearerIsService: true, purpose: "daily_growth_alert" }),
    { ok: true }
  );
  assert.equal(
    gatePurpose({ sessionOk: false, bearerIsService: false, purpose: "daily_growth_alert" }).ok,
    false
  );
  assert.equal(
    gatePurpose({ sessionOk: false, bearerIsService: true, purpose: "compose" }).ok,
    false
  );
  assert.deepEqual(gatePurpose({ sessionOk: true, bearerIsService: false, purpose: "compose" }), { ok: true });
});
