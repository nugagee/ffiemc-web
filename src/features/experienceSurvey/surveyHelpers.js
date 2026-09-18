import { getSessionId, getVisitDemographics, getVisitorId } from "../../lib/tracking";

export const EXPERIENCE_SURVEY_STORAGE_KEY = "ffiemc-experience-survey-v1";
export const EXPERIENCE_SURVEY_DELAY_MS = 3 * 60 * 1000;
export const EXPERIENCE_SURVEY_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPERIENCE_SURVEY_RESUBMIT_MS = 30 * 24 * 60 * 60 * 1000;

export const SURVEY_FEATURES = [
  {
    key: "worship",
    label: "Worship & services",
    helper: "Finding service times, sermons, and Sunday experience online",
  },
  {
    key: "content",
    label: "Teachings & content",
    helper: "Blog, Bible study, Daily Manna, and Christian news",
  },
  {
    key: "community",
    label: "Community connection",
    helper: "Events, ministries, joining, and volunteering",
  },
  {
    key: "prayer_care",
    label: "Prayer & care",
    helper: "Prayer requests, testimonies, and support pathways",
  },
  {
    key: "overall_ease",
    label: "Ease of using the website",
    helper: "Navigation, clarity, speed, and mobile comfort",
  },
];

/** Prefer the site-wide visitor id so survey responses join visitor analytics. */
export function getOrCreateVisitorKey() {
  try {
    const shared = getVisitorId();
    if (shared && shared.length >= 8) {
      localStorage.setItem("ffiemc_visitor_key", shared);
      return shared;
    }
  } catch {
    /* fall through */
  }

  try {
    const existing = localStorage.getItem("ffiemc_visitor_key");
    if (existing && existing.length >= 8) return existing;
    const next =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("ffiemc_visitor_key", next);
    return next;
  } catch {
    return `v-${Date.now()}`;
  }
}

export function readSurveyState() {
  try {
    const raw = localStorage.getItem(EXPERIENCE_SURVEY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeSurveyState(next) {
  try {
    localStorage.setItem(EXPERIENCE_SURVEY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function shouldOfferExperienceSurvey() {
  const state = readSurveyState();
  const now = Date.now();
  if (state.snoozedUntil && new Date(state.snoozedUntil).getTime() > now) return false;
  if (state.lastSubmittedAt && now - new Date(state.lastSubmittedAt).getTime() < EXPERIENCE_SURVEY_RESUBMIT_MS) {
    return false;
  }
  return true;
}

export function markSurveySubmitted() {
  writeSurveyState({
    ...readSurveyState(),
    lastSubmittedAt: new Date().toISOString(),
    snoozedUntil: undefined,
  });
}

export function markSurveySnoozed() {
  writeSurveyState({
    ...readSurveyState(),
    snoozedUntil: new Date(Date.now() + EXPERIENCE_SURVEY_SNOOZE_MS).toISOString(),
  });
}

export function averageComfort(scores = {}) {
  const values = Object.values(scores).map(Number).filter((n) => Number.isFinite(n));
  if (!values.length) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

export function buildSurveyFeedbackText({ comfortScores, overallRating, improvements, wishedFeatures }) {
  const comfortLines = SURVEY_FEATURES.map((feature) => {
    const score = comfortScores?.[feature.key];
    return `- ${feature.label}: ${score ?? "—"}/5`;
  }).join("\n");

  return [
    "Experience survey response",
    "",
    "Comfort with areas:",
    comfortLines,
    "",
    `Overall experience rating: ${overallRating}/5`,
    "",
    "What could improve:",
    (improvements || "").trim() || "(not shared)",
    "",
    "Features they would like:",
    (wishedFeatures || "").trim() || "(not shared)",
  ].join("\n");
}

/**
 * Public site has no member login — everyone is a visitor/guest.
 * Still document visitor, session, and device details for admin follow-up.
 * If an admin token is present in the same browser, stamp that lightly in metadata.
 */
export function buildSubmitterContext({ name = "", email = "", path = "/" } = {}) {
  const demographics = getVisitDemographics();
  let adminHint = null;
  try {
    const token = localStorage.getItem("ffiemc_admin_token") || sessionStorage.getItem("ffiemc_admin_token");
    if (token) adminHint = { hasAdminSession: true };
  } catch {
    adminHint = null;
  }

  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim();
  const audience = trimmedEmail || trimmedName ? "guest" : "visitor";

  return {
    visitor_key: getOrCreateVisitorKey(),
    name: trimmedName,
    email: trimmedEmail,
    audience,
    path: path || "/",
    metadata: {
      source: "homepage_timed_survey",
      accountType: audience,
      sessionId: getSessionId(),
      visitorId: getOrCreateVisitorKey(),
      referrer: typeof document !== "undefined" ? document.referrer || "" : "",
      submittedAt: new Date().toISOString(),
      demographics,
      adminHint,
      submitter: {
        name: trimmedName || null,
        email: trimmedEmail || null,
        providedContact: Boolean(trimmedName || trimmedEmail),
      },
    },
  };
}
