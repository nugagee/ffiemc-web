// Pure Daily Growth seed selection. No Deno or network calls.
// The queued-first path lives in SQL spool_daily_growth(); this module only
// chooses a seed when a category queue is empty.

export const REPEAT_WINDOW_DAYS = 365;
export const LOW_QUEUE_DAYS = 7;

export type Seed = {
  category: "trait" | "prophecy" | "fact" | "riddle";
  title: string;
  scripture: string;
  body: string;
  answer?: string;
};

export type PublishedRef = {
  title: string;
  scripture: string;
  /** YYYY-MM-DD */
  publishedOn: string;
};

export type HistorySource = {
  title?: string;
  scripture_ref?: string;
  published_on?: string | null;
  status?: string;
  created_at?: string | null;
};

export const GROWTH_SEEDS: Seed[] = [
  // Traits
  { category: "trait", title: "Love", scripture: "1 Corinthians 13:4-7", body: "Love is patient and kind. Let this mark how you treat others today." },
  { category: "trait", title: "Joy", scripture: "Nehemiah 8:10", body: "The joy of the Lord is your strength — choose rejoicing even in pressure." },
  { category: "trait", title: "Peace", scripture: "Philippians 4:6-7", body: "Trade anxiety for prayer, and God’s peace will guard your heart." },
  { category: "trait", title: "Patience", scripture: "James 1:2-4", body: "Trials produce steadfastness. Wait on God without complaining." },
  { category: "trait", title: "Kindness", scripture: "Ephesians 4:32", body: "Be kind and tenderhearted, forgiving as Christ forgave you." },
  { category: "trait", title: "Faithfulness", scripture: "Luke 16:10", body: "Faithfulness in little things prepares you for greater trust." },
  { category: "trait", title: "Gentleness", scripture: "Galatians 5:22-23", body: "Gentleness is fruit of the Spirit — respond softly, not harshly." },
  { category: "trait", title: "Self-control", scripture: "Proverbs 25:28", body: "A person without self-control is like a city without walls." },
  { category: "trait", title: "Humility", scripture: "Philippians 2:3-4", body: "Count others more significant than yourself; look to their interests." },
  { category: "trait", title: "Courage", scripture: "Joshua 1:9", body: "Be strong and courageous — the Lord your God is with you." },
  { category: "trait", title: "Integrity", scripture: "Proverbs 11:3", body: "Integrity guides the upright; walk honestly before God and people." },
  { category: "trait", title: "Gratitude", scripture: "1 Thessalonians 5:16-18", body: "Rejoice, pray, and give thanks in all circumstances." },

  // Prophecies
  { category: "prophecy", title: "Born in Bethlehem", scripture: "Micah 5:2", body: "Centuries before Christ, Micah foretold the Messiah’s birthplace — fulfilled in Matthew 2." },
  { category: "prophecy", title: "A suffering Servant", scripture: "Isaiah 53:5", body: "Isaiah saw One pierced for our transgressions — fulfilled at the cross." },
  { category: "prophecy", title: "The virgin birth", scripture: "Isaiah 7:14", body: "A virgin would bear a son called Immanuel — God with us." },
  { category: "prophecy", title: "Triumphal entry", scripture: "Zechariah 9:9", body: "Your King comes humble, riding on a donkey — fulfilled on Palm Sunday." },
  { category: "prophecy", title: "Betrayed for silver", scripture: "Zechariah 11:12-13", body: "Thirty pieces of silver and the potter’s field — fulfilled in Judas’ betrayal." },
  { category: "prophecy", title: "Pierced hands and feet", scripture: "Psalm 22:16", body: "David’s psalm describes crucifixion long before Rome practiced it." },
  { category: "prophecy", title: "Resurrection hope", scripture: "Psalm 16:10", body: "God would not abandon His Holy One to the grave — fulfilled in Christ’s rising." },
  { category: "prophecy", title: "A new covenant", scripture: "Jeremiah 31:31-33", body: "God promised a new covenant written on hearts — sealed in Jesus’ blood." },
  { category: "prophecy", title: "Light to the nations", scripture: "Isaiah 49:6", body: "Salvation would reach the ends of the earth through the Servant." },
  { category: "prophecy", title: "Spirit poured out", scripture: "Joel 2:28-29", body: "God would pour out His Spirit on all flesh — fulfilled at Pentecost." },

  // Facts
  { category: "fact", title: "Shortest verse", scripture: "John 11:35", body: "“Jesus wept.” — the shortest verse in many English Bibles, showing His compassion." },
  { category: "fact", title: "Longest chapter", scripture: "Psalm 119:105", body: "Psalm 119 is the longest chapter, celebrating God’s word as a lamp to our feet." },
  { category: "fact", title: "Creation word", scripture: "Genesis 1:3", body: "God spoke light into being — His word still creates and orders life." },
  { category: "fact", title: "Two of every kind?", scripture: "Genesis 7:2-3", body: "Noah took more than two of clean animals — provision for sacrifice after the flood." },
  { category: "fact", title: "The Shema", scripture: "Deuteronomy 6:4-5", body: "Israel’s core confession: the Lord is one — love Him with all your heart." },
  { category: "fact", title: "Armor of God", scripture: "Ephesians 6:11", body: "Believers are called to put on the whole armor of God against spiritual schemes." },
  { category: "fact", title: "Fruit of the Spirit", scripture: "Galatians 5:22-23", body: "Nine Spirit-produced virtues mark a life led by God, not the flesh." },
  { category: "fact", title: "Great Commission", scripture: "Matthew 28:19-20", body: "Jesus sends disciples to all nations, promising His presence to the end of the age." },
  { category: "fact", title: "New creation", scripture: "2 Corinthians 5:17", body: "In Christ, the old has passed away — a person becomes a new creation." },
  { category: "fact", title: "Living water", scripture: "John 4:13-14", body: "Jesus offers water that becomes a spring of eternal life within." },

  // Riddles
  { category: "riddle", title: "A bush that burned", scripture: "Exodus 3:2", body: "What burned with fire yet was not consumed — and spoke God’s call?", answer: "The burning bush (Moses at Horeb)." },
  { category: "riddle", title: "Stronger than a lion?", scripture: "Judges 14:14", body: "Out of the eater came something to eat; out of the strong came something sweet. What was it?", answer: "Samson’s riddle — honey from the lion’s carcass." },
  { category: "riddle", title: "What fell but never broke?", scripture: "Acts 9:4", body: "Who fell to the ground on the Damascus road yet rose with a new name and mission?", answer: "Saul of Tarsus (Paul)." },
  { category: "riddle", title: "Walls without hands", scripture: "Joshua 6:20", body: "Which city walls fell after a shout and trumpet blast, not by siege engines?", answer: "Jericho." },
  { category: "riddle", title: "Fed by birds", scripture: "1 Kings 17:6", body: "Which prophet was fed bread and meat by ravens beside a brook?", answer: "Elijah at the brook Cherith." },
  { category: "riddle", title: "Sleeping in a storm", scripture: "Mark 4:38-39", body: "Who slept in a boat during a storm, then stilled wind and waves with a word?", answer: "Jesus." },
  { category: "riddle", title: "Writing on the wall", scripture: "Daniel 5:5", body: "Whose feast ended when a hand wrote judgment on the palace wall?", answer: "Belshazzar of Babylon." },
  { category: "riddle", title: "Three in the fire", scripture: "Daniel 3:25", body: "Who walked unbound in a blazing furnace with a fourth like a son of the gods?", answer: "Shadrach, Meshach, and Abednego." },
];

export function normalizeDay(value: string | null | undefined): string {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function addDaysISO(isoDay: string, days: number): string {
  const day = normalizeDay(isoDay);
  if (!day) throw new Error(`Invalid day ${isoDay}`);
  const [year, month, date] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, date));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function formatDayISO(date: Date, timeZone = "Africa/Lagos"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    /* use UTC below */
  }
  return date.toISOString().slice(0, 10);
}

export function normalizeTitle(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Compare scripture references, not verse text. Dashes and spacing are ignored. */
export function normalizeScripture(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Full reference plus each semicolon-separated passage. */
export function scriptureKeys(value: string): string[] {
  const full = normalizeScripture(value);
  if (!full) return [];
  const parts = full
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set([full, ...parts])];
}

function maxDay(current: string | undefined, next: string): string {
  if (!current) return next;
  return next > current ? next : current;
}

export function rowsToHistory(rows: HistorySource[], today: string): PublishedRef[] {
  const out: PublishedRef[] = [];
  for (const row of rows || []) {
    const status = String(row.status || "").toLowerCase();
    if (status === "draft") continue;
    let day = normalizeDay(row.published_on || "");
    if (!day && status === "queued") day = normalizeDay(today);
    if (!day && status === "published") day = normalizeDay(row.created_at || "") || normalizeDay(today);
    if (!day) continue;
    out.push({
      title: String(row.title || ""),
      scripture: String(row.scripture_ref || ""),
      publishedOn: day,
    });
  }
  return out;
}

export function noEligibleSeedMessage(category: string, windowDays = REPEAT_WINDOW_DAYS): string {
  return `${category}: no unused title or scripture in the last ${windowDays} days; skipped instead of repeating`;
}

/**
 * Least-recently-used seed whose title and scripture were not published
 * inside the repeat window. Returns null when every seed is still in that
 * window — callers must skip the category instead of cycling the list.
 * Equal ages rotate by dayIndex so a tie does not stick on one row.
 */
export function pickGrowthSeed(input: {
  category: string;
  seeds: Seed[];
  history: PublishedRef[];
  today: string;
  dayIndex: number;
  repeatWindowDays?: number;
}): Seed | null {
  const windowDays = input.repeatWindowDays ?? REPEAT_WINDOW_DAYS;
  const pool = input.seeds.filter((seed) => seed.category === input.category);
  if (!pool.length) return null;

  const today = normalizeDay(input.today);
  if (!today) return null;
  const cutoff = addDaysISO(today, -windowDays);

  const titleLast = new Map<string, string>();
  const scriptureLast = new Map<string, string>();
  for (const row of input.history || []) {
    const day = normalizeDay(row.publishedOn);
    if (!day) continue;
    const titleKey = normalizeTitle(row.title);
    if (titleKey) titleLast.set(titleKey, maxDay(titleLast.get(titleKey), day));
    for (const key of scriptureKeys(row.scripture)) {
      scriptureLast.set(key, maxDay(scriptureLast.get(key), day));
    }
  }

  const eligible: { seed: Seed; last: string }[] = [];
  for (const seed of pool) {
    const titleKey = normalizeTitle(seed.title);
    let last = titleKey ? titleLast.get(titleKey) || "" : "";
    let blocked = Boolean(last && last >= cutoff);
    for (const key of scriptureKeys(seed.scripture)) {
      const seen = scriptureLast.get(key) || "";
      if (seen && seen >= cutoff) blocked = true;
      if (seen > last) last = seen;
    }
    if (!blocked) eligible.push({ seed, last });
  }

  if (!eligible.length) return null;

  let oldest = eligible[0].last;
  for (const item of eligible) {
    if (item.last < oldest) oldest = item.last;
  }
  const tied = eligible.filter((item) => item.last === oldest);
  const index = Math.abs(Math.trunc(input.dayIndex) || 0) % tied.length;
  return tied[index].seed;
}

export type QueueAlertItem = {
  category: string;
  label: string;
  queued: number;
  detail: string;
};

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLowQueueAlert(input: {
  today: string;
  adminUrl: string;
  items: QueueAlertItem[];
  lowQueueDays?: number;
}): { subject: string; text: string; html: string } {
  const days = input.lowQueueDays ?? LOW_QUEUE_DAYS;
  const labels = input.items.map((item) => item.label || item.category);
  const subject = `Daily Growth queue low — ${labels.join(", ") || "categories"}`;
  const lines = [
    `FFIEMC Daily Growth queues are below ${days} days (${input.today}).`,
    "",
    ...input.items.map((item) => `• ${item.label || item.category}: ${item.detail}`),
    "",
    `Add queued items: ${input.adminUrl}`,
    "",
    "At most one alert is sent per category per day.",
  ];
  const rows = input.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;color:#111">${escapeHtml(item.label || item.category)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151">${escapeHtml(item.detail)}</td>
      </tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f9fafb;font-family:Georgia,serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#b91c1c;color:#fff;padding:20px 24px">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase">FFIEMC</p>
      <h1 style="margin:6px 0 0;font-size:22px">Daily Growth queue low</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.9">${escapeHtml(input.today)}</p>
    </div>
    <div style="padding:8px 24px 24px">
      <p style="font-size:14px;color:#374151;line-height:1.5">These categories have fewer than ${days} queued items, including empty queues. Queued items are still published first. A seed is used only when that title and scripture were not published in the last ${REPEAT_WINDOW_DAYS} days.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <p style="margin:20px 0 0;text-align:center">
        <a href="${escapeHtml(input.adminUrl)}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Open Daily Growth admin</a>
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280">At most one alert is sent per category per day.</p>
    </div>
  </div>
</body></html>`;
  return { subject, text: lines.join("\n"), html };
}
