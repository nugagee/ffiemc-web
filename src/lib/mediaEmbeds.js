/** Parse common video / audio share URLs into in-page embed configs. */

export function youtubeEmbedSrc(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    let id = "";
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.replace(/^\//, "").split("/")[0];
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.split("/")[2] || "";
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.split("/")[2] || "";
    } else {
      id = u.searchParams.get("v") || "";
    }
    if (!id) return "";
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;
  } catch {
    return "";
  }
}

export function facebookEmbedSrc(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=560`;
}

export function audiomackEmbedSrc(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    // https://audiomack.com/artist/song/slug → embed
    if (!u.hostname.includes("audiomack.com")) return "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 3 && (parts[1] === "song" || parts[1] === "album" || parts[1] === "playlist")) {
      return `https://audiomack.com/embed/${parts[1]}/${parts[0]}/${parts[2]}`;
    }
    // Already an embed URL
    if (u.pathname.includes("/embed/")) return raw;
    return "";
  } catch {
    return "";
  }
}

export function mediaPlatforms(item = {}) {
  const platforms = [];
  if (item.youtube_url) {
    platforms.push({
      id: "youtube",
      label: "YouTube",
      url: item.youtube_url,
      embed: youtubeEmbedSrc(item.youtube_url),
      kind: "video",
    });
  }
  if (item.facebook_url) {
    platforms.push({
      id: "facebook",
      label: "Facebook",
      url: item.facebook_url,
      embed: facebookEmbedSrc(item.facebook_url),
      kind: "video",
    });
  }
  if (item.audiomack_url) {
    platforms.push({
      id: "audiomack",
      label: "Audiomack",
      url: item.audiomack_url,
      embed: audiomackEmbedSrc(item.audiomack_url),
      kind: "audio",
    });
  }
  return platforms;
}

export function resourceMediaDate(item = {}) {
  return item.service_date || item.study_date || item.week_of || item.created_at || "";
}

export function isMediaResourceKind(kind) {
  return kind === "sunday_sermon" || kind === "choir_ministration";
}
