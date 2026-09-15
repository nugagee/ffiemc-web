import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSessionId, getVisitDemographics, getVisitorId } from "./tracking";

function assertClient() {
  if (!isSupabaseConfigured || !getSupabase()) {
    throw new Error("Live engagement is unavailable right now");
  }
  return getSupabase();
}

export async function fetchLiveEngagement(broadcastKey, { commentLimit = 80 } = {}) {
  if (!broadcastKey) return { counts: {}, mine: "", comments: [], comment_count: 0, total_reactions: 0 };
  try {
    const client = assertClient();
    const { data, error } = await client.rpc("public_facebook_live_engagement", {
      p_broadcast_key: broadcastKey,
      p_visitor_id: getVisitorId(),
      p_comment_limit: commentLimit,
    });
    if (error) throw new Error(error.message);
    return {
      counts: data?.counts || {},
      mine: data?.mine || "",
      comments: Array.isArray(data?.comments) ? data.comments : [],
      comment_count: Number(data?.comment_count) || 0,
      total_reactions: Number(data?.total_reactions) || 0,
    };
  } catch (e) {
    console.warn("Live engagement fetch failed:", e?.message || e);
    return { counts: {}, mine: "", comments: [], comment_count: 0, total_reactions: 0 };
  }
}

export async function reactToLive(broadcastKey, reaction = "") {
  const client = assertClient();
  const { data, error } = await client.rpc("public_react_facebook_live", {
    p_broadcast_key: broadcastKey,
    p_visitor_id: getVisitorId(),
    p_reaction: reaction || "",
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function commentOnLive(broadcastKey, { body, authorName = "", isAnonymous = false } = {}) {
  const client = assertClient();
  const demo = getVisitDemographics();
  const { data, error } = await client.rpc("public_comment_facebook_live", {
    p_broadcast_key: broadcastKey,
    p_body: body || "",
    p_author_name: authorName || "",
    p_is_anonymous: Boolean(isAnonymous),
    p_visitor_id: getVisitorId(),
    p_session_id: getSessionId(),
    p_path: typeof window !== "undefined" ? window.location.pathname : "/",
    p_user_agent: demo.userAgent || "",
    p_device_type: demo.deviceType || "",
    p_browser: demo.browser || "",
    p_os: demo.os || "",
    p_language: demo.language || "",
    p_timezone: demo.timezone || "",
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Subscribe to new visible comments for a broadcast. Returns unsubscribe fn. */
export function subscribeLiveComments(broadcastKey, onInsert) {
  if (!broadcastKey || !isSupabaseConfigured || !getSupabase()) return () => {};
  const client = getSupabase();
  const key = String(broadcastKey);
  const channel = client
    .channel(`ffiemc-live-comments:${key.slice(0, 40)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "facebook_live_comments",
      },
      (payload) => {
        const row = payload?.new;
        if (!row || row.status !== "visible") return;
        if (String(row.broadcast_key || "") !== key) return;
        onInsert?.({
          id: row.id,
          author_name: row.is_anonymous || !row.author_name ? "Guest" : row.author_name,
          is_anonymous: Boolean(row.is_anonymous),
          body: row.body,
          created_at: row.created_at,
        });
      }
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
