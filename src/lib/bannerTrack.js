import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSessionId, getVisitDemographics, getVisitorId } from "./tracking";

export function trackBannerEvent(announcementId, action, extra = {}) {
  if (!announcementId || !isSupabaseConfigured || !getSupabase()) return;
  const demo = typeof window !== "undefined" ? getVisitDemographics() : {};
  getSupabase()
    .rpc("public_track_announcement_event", {
      p_announcement_id: announcementId,
      p_action: action,
      p_visitor_id: getVisitorId(),
      p_session_id: getSessionId(),
      p_path: typeof window !== "undefined" ? window.location.pathname : "/",
      p_user_agent: demo.userAgent || "",
      p_device_type: demo.deviceType || "",
      p_browser: demo.browser || "",
      p_os: demo.os || "",
      p_language: demo.language || "",
      p_timezone: demo.timezone || "",
      p_meta: extra,
    })
    .then(({ error }) => {
      if (error) console.warn("Banner track failed:", error.message);
    });
}
