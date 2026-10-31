import assert from "node:assert/strict";
import test from "node:test";
import { isWeeklySlotDue } from "./schedule.ts";

const SATURDAY = 6;
const LAGOS = "Africa/Lagos";

test("Saturday 18:00 in Lagos is due at 17:00 UTC and not a minute earlier", () => {
  const onTime = isWeeklySlotDue({
    now: new Date("2026-10-31T17:00:00Z"),
    weekday: SATURDAY,
    time: "18:00",
    timeZone: LAGOS,
    enabled: true,
  });
  assert.equal(onTime.due, true);
  assert.equal(onTime.occurrenceOn, "2026-10-31");

  const early = isWeeklySlotDue({
    now: new Date("2026-10-31T16:59:00Z"),
    weekday: SATURDAY,
    time: "18:00",
    timeZone: LAGOS,
    enabled: true,
  });
  assert.equal(early.due, false);
});

test("a later tick the same Lagos Saturday keeps the same occurrence", () => {
  const first = isWeeklySlotDue({
    now: new Date("2026-10-31T17:00:00Z"),
    weekday: SATURDAY,
    time: "18:00",
    timeZone: LAGOS,
    enabled: true,
  });
  const later = isWeeklySlotDue({
    now: new Date("2026-10-31T20:00:00Z"),
    weekday: SATURDAY,
    time: "18:00",
    timeZone: LAGOS,
    enabled: true,
  });
  assert.equal(first.due, true);
  assert.equal(later.due, true);
  assert.equal(first.occurrenceOn, later.occurrenceOn);
});

test("Sunday and a turned-off schedule are not due", () => {
  const sunday = isWeeklySlotDue({
    now: new Date("2026-11-01T17:00:00Z"),
    weekday: SATURDAY,
    time: "18:00",
    timeZone: LAGOS,
    enabled: true,
  });
  assert.equal(sunday.due, false);

  const off = isWeeklySlotDue({
    now: new Date("2026-10-31T17:00:00Z"),
    weekday: SATURDAY,
    time: "18:00",
    timeZone: LAGOS,
    enabled: false,
  });
  assert.equal(off.due, false);
});
