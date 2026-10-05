/** Admin "Fetch now" must send the cron secret as a header, never in the URL. */
export function newsFetchRequest(endpoint, secret) {
  const raw = String(endpoint || "").trim();
  if (!raw) return null;
  let url = raw;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete("secret");
    url = parsed.toString();
  } catch {
    url = raw;
  }
  return {
    url,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {}),
      },
    },
  };
}
