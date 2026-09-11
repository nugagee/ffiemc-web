export const DEFAULT_FACEBOOK_LIVE = {
  enabled: true,
  isLive: false,
  videoUrl: "",
  title: "Watch Live",
  idleHeading: "No live broadcast right now",
  idleBody:
    "When Fire-Fire goes live on Facebook, the stream appears here automatically. Join us for Sunday service, midweek meetings, and special programmes.",
  ctaLabel: "Open Facebook page",
};

export function getFacebookLiveConfig(settings) {
  const current = settings?.pages?.home?.facebookLive;
  const merged = { ...DEFAULT_FACEBOOK_LIVE, ...(current || {}) };
  merged.enabled = current && Object.prototype.hasOwnProperty.call(current, "enabled")
    ? current.enabled === true
    : merged.enabled === true;
  merged.isLive = current && Object.prototype.hasOwnProperty.call(current, "isLive")
    ? current.isLive === true
    : false;
  merged.videoUrl = String(merged.videoUrl || "").trim();
  merged.title = String(merged.title || DEFAULT_FACEBOOK_LIVE.title).trim() || DEFAULT_FACEBOOK_LIVE.title;
  merged.idleHeading =
    String(merged.idleHeading || DEFAULT_FACEBOOK_LIVE.idleHeading).trim() ||
    DEFAULT_FACEBOOK_LIVE.idleHeading;
  merged.idleBody =
    String(merged.idleBody || DEFAULT_FACEBOOK_LIVE.idleBody).trim() || DEFAULT_FACEBOOK_LIVE.idleBody;
  merged.ctaLabel =
    String(merged.ctaLabel || DEFAULT_FACEBOOK_LIVE.ctaLabel).trim() || DEFAULT_FACEBOOK_LIVE.ctaLabel;
  return merged;
}

export function facebookPagePluginSrc(pageUrl = "", { height = 520 } = {}) {
  const href = String(pageUrl || "").trim() || "https://www.facebook.com/firefireministry";
  const params = new URLSearchParams({
    href,
    tabs: "timeline",
    width: "500",
    height: String(height),
    small_header: "false",
    adapt_container_width: "true",
    hide_cover: "false",
    show_facepile: "true",
  });
  return `https://www.facebook.com/plugins/page.php?${params.toString()}`;
}

export function facebookLiveVideoEmbedSrc(videoUrl = "") {
  const raw = String(videoUrl || "").trim();
  if (!raw) return "";
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=800&autoplay=true&mute=0`;
}

/** Prefer a concrete video URL; when live without one, try the page /live path. */
export function resolveLiveEmbedSrc(config, pageUrl) {
  if (!config?.isLive) return "";
  if (config.videoUrl) return facebookLiveVideoEmbedSrc(config.videoUrl);
  const page = String(pageUrl || "").trim().replace(/\/$/, "");
  if (!page) return "";
  return facebookLiveVideoEmbedSrc(`${page}/live`);
}
