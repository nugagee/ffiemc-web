/** Parse a date-only value (YYYY-MM-DD) as a local calendar day. */
export function parseEventDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The date an event should leave "Upcoming": end_date if set, otherwise the start date. */
export function eventEffectiveEnd(event) {
  if (!event) return null;
  return parseEventDate(event.endDate || event.end_date || event.ends_at || event.date);
}

export function eventStartDate(event) {
  return parseEventDate(event?.date);
}

/** Single day: short date. Ranges: "1–21 December 2026", "28 November – 3 December 2026", both years across a year boundary. */
export function formatEventDateRange(event) {
  const start = eventStartDate(event);
  const end = parseEventDate(event?.endDate || event?.end_date || event?.ends_at);
  if (!start) return event?.date || "";
  const sameDay = !end || end.getTime() === start.getTime();
  if (sameDay) {
    return start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    const monthYear = end.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return `${start.getDate()}–${end.getDate()} ${monthYear}`;
  }
  if (sameYear) {
    const startPart = start.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const endPart = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    return `${startPart} – ${endPart}`;
  }
  const startPart = start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const endPart = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `${startPart} – ${endPart}`;
}
