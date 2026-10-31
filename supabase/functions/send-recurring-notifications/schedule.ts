// Weekly slot check. Postgres uses the same rule in claim_due_member_notification_runs:
// local weekday (Sunday = 0) matches, and the local time is at or after the slot.
// The occurrence key is that local date, so a later tick the same day does not send again.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function localSlot(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  const weekday = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
  const hour = String(parts.hour || "00").padStart(2, "0");
  const minute = String(parts.minute || "00").padStart(2, "0");
  const second = String(parts.second || "00").padStart(2, "0");
  return {
    weekday,
    occurrenceOn: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${minute}:${second}`,
  };
}

export function isWeeklySlotDue(input: {
  now: Date;
  weekday: number;
  time: string;
  timeZone: string;
  enabled?: boolean;
}) {
  if (input.enabled === false) return { due: false, occurrenceOn: "" };
  const slot = String(input.time || "").trim().slice(0, 8);
  const slotTime = slot.length === 5 ? `${slot}:00` : slot;
  const local = localSlot(input.now, input.timeZone);
  const due = local.weekday === input.weekday && local.time >= slotTime;
  return { due, occurrenceOn: due ? local.occurrenceOn : local.occurrenceOn };
}
