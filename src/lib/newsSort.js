/** Newest-first timestamp: publication time, otherwise when the row was stored. */
export function newsSortTime(item) {
  const raw = item?.published_at || item?.created_at || "";
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

export function compareNewsNewest(a, b) {
  return newsSortTime(b) - newsSortTime(a);
}
