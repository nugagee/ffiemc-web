const VISITOR_KEY = "ffiemc_visitor_id";
const SESSION_KEY = "ffiemc_session_id";

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ff-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function parseUa(ua = "") {
  const s = ua || "";
  let deviceType = "desktop";
  if (/iPad|Tablet/i.test(s)) deviceType = "tablet";
  else if (/Mobi|Android|iPhone|iPod/i.test(s)) deviceType = "mobile";

  let browser = "Other";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) browser = "Safari";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/MSIE|Trident/i.test(s)) browser = "IE";

  let os = "Other";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return { deviceType, browser, os };
}

/** Browser-side demography (no IP / no personal identity). */
export function getVisitDemographics() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      userAgent: "",
      deviceType: null,
      browser: null,
      os: null,
      language: null,
      timezone: null,
      screenWidth: null,
      screenHeight: null,
    };
  }

  const ua = navigator.userAgent || "";
  const { deviceType, browser, os } = parseUa(ua);
  let timezone = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }

  return {
    userAgent: ua,
    deviceType,
    browser,
    os,
    language: navigator.language || (navigator.languages && navigator.languages[0]) || null,
    timezone,
    screenWidth: window.screen?.width || null,
    screenHeight: window.screen?.height || null,
  };
}
