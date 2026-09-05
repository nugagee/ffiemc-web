import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSessionId, getVisitDemographics, getVisitorId } from "./tracking";
import { postAnalyticsId, postAnalyticsKey } from "./blogAnalytics";

function demoPayload() {
  const demo = typeof window !== "undefined" ? getVisitDemographics() : {};
  return {
    p_user_agent: demo.userAgent || "",
    p_device_type: demo.deviceType || "",
    p_browser: demo.browser || "",
    p_os: demo.os || "",
    p_language: demo.language || "",
    p_timezone: demo.timezone || "",
  };
}

export function trackBlogEvent(post, action, extra = {}) {
  if (!post || !isSupabaseConfigured || !getSupabase()) return Promise.resolve(null);
  const slug = extra.slug || postAnalyticsKey(post);
  if (!slug) return Promise.resolve(null);
  return getSupabase()
    .rpc("public_track_blog_event", {
      p_slug: slug,
      p_action: action,
      p_post_id: postAnalyticsId(post),
      p_title: post.title || "",
      p_visitor_id: getVisitorId(),
      p_session_id: getSessionId(),
      p_reaction: extra.reaction || "",
      p_share_channel: extra.shareChannel || "",
      p_duration: extra.duration || 0,
      p_scroll: extra.scroll || 0,
      p_path: typeof window !== "undefined" ? window.location.pathname : "/",
      ...demoPayload(),
    })
    .then(({ data, error }) => {
      if (error) console.warn("Blog track failed:", error.message);
      return data || null;
    });
}

export function fetchBlogEngagement(slug) {
  if (!slug || !isSupabaseConfigured || !getSupabase()) {
    return Promise.resolve({ counts: {}, mine: "", total: 0 });
  }
  return getSupabase()
    .rpc("public_blog_engagement", {
      p_slug: slug,
      p_visitor_id: getVisitorId(),
    })
    .then(({ data, error }) => {
      if (error) {
        console.warn("Blog engagement failed:", error.message);
        return { counts: {}, mine: "", total: 0 };
      }
      return {
        counts: data?.counts || {},
        mine: data?.mine || "",
        total: data?.total || 0,
      };
    });
}

export function fetchBlogComments(slug) {
  if (!slug || !isSupabaseConfigured || !getSupabase()) {
    return Promise.resolve([]);
  }
  return getSupabase()
    .rpc("public_list_blog_comments", { p_slug: slug, p_limit: 100 })
    .then(({ data, error }) => {
      if (error) {
        console.warn("Blog comments failed:", error.message);
        return [];
      }
      return Array.isArray(data) ? data : [];
    });
}

export function submitBlogComment(post, payload = {}) {
  if (!post || !isSupabaseConfigured || !getSupabase()) {
    return Promise.reject(new Error("Comments are unavailable right now"));
  }
  const slug = postAnalyticsKey(post);
  if (!slug) return Promise.reject(new Error("Missing article"));
  return getSupabase()
    .rpc("public_submit_blog_comment", {
      p_slug: slug,
      p_body: payload.body || "",
      p_post_id: postAnalyticsId(post),
      p_title: post.title || "",
      p_author_name: payload.authorName || "",
      p_author_email: payload.authorEmail || "",
      p_is_anonymous: Boolean(payload.isAnonymous),
      p_visitor_id: getVisitorId(),
      p_session_id: getSessionId(),
      p_path: typeof window !== "undefined" ? window.location.pathname : "/",
      ...demoPayload(),
    })
    .then(({ data, error }) => {
      if (error) throw new Error(error.message || "Could not submit comment");
      return data;
    });
}
