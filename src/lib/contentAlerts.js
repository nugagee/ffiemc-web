const DISMISS_KEY = "ffiemc_content_alert_dismissed";
const MAX_DISMISSED = 120;

export function loadDismissedAlertIds() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function dismissContentAlert(id) {
  if (!id) return;
  try {
    const next = [String(id), ...loadDismissedAlertIds().filter((x) => x !== String(id))].slice(
      0,
      MAX_DISMISSED
    );
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function filterUndismissedAlerts(alerts = []) {
  const dismissed = new Set(loadDismissedAlertIds());
  return (alerts || []).filter((a) => a?.id && !dismissed.has(String(a.id)));
}
