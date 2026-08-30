const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function randLetters(n) {
  let out = "";
  for (let i = 0; i < n; i += 1) {
    out += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return out;
}

/** Google Meet-style room code (aaa-bbbb-ccc). */
export function generateMeetCode() {
  return `${randLetters(3)}-${randLetters(4)}-${randLetters(3)}`;
}

export function defaultMeetUrl(code) {
  const slug = String(code || generateMeetCode()).replace(/[^a-z0-9-]/gi, "");
  // Usable video room (Google Meet cannot mint live rooms without Calendar API).
  return `https://meet.jit.si/FireFireIntl-${slug}`;
}

export function googleMeetUrl(code) {
  return `https://meet.google.com/${String(code || "").replace(/[^a-z0-9-]/gi, "")}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function toGcalStamp(date) {
  const d = new Date(date);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function formatMeetingWhen(startsAt, endsAt, timeZone = "Africa/Lagos") {
  try {
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;
    const date = start.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    });
    const opts = { hour: "2-digit", minute: "2-digit", timeZone };
    const t1 = start.toLocaleTimeString("en-GB", opts);
    const t2 = end ? end.toLocaleTimeString("en-GB", opts) : "";
    return t2 ? `${date} · ${t1} – ${t2}` : `${date} · ${t1}`;
  } catch {
    return String(startsAt || "");
  }
}

export function googleCalendarUrl({ title, description, location, startsAt, endsAt, meetUrl }) {
  const end = endsAt || new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
  const details = [description, meetUrl ? `Join meeting: ${meetUrl}` : ""].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Church meeting",
    dates: `${toGcalStamp(startsAt)}/${toGcalStamp(end)}`,
    details,
    location: location || meetUrl || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs({ id, title, description, location, startsAt, endsAt, meetUrl, organizerEmail }) {
  const uid = `${id || Date.now()}@firefireintl.org`;
  const end = endsAt || new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
  const desc = [description, meetUrl ? `Join: ${meetUrl}` : ""].filter(Boolean).join("\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FFIEMC//Meetings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toGcalStamp(new Date())}`,
    `DTSTART:${toGcalStamp(startsAt)}`,
    `DTEND:${toGcalStamp(end)}`,
    `SUMMARY:${(title || "Church meeting").replace(/\n/g, " ")}`,
    `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
    `LOCATION:${(location || meetUrl || "").replace(/\n/g, " ")}`,
    meetUrl ? `URL:${meetUrl}` : "",
    organizerEmail ? `ORGANIZER;CN=FFIEMC:MAILTO:${organizerEmail}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadIcs(filename, ics) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "meeting.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function siteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://firefireintl.org";
}
