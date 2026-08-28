import { getSupabase, isSupabaseConfigured } from "./supabase";
import { isPublicBlogPost } from "./blog";

const TOKEN_KEY = "ffiemc_admin_token";

const TABLE_MAP = {
  blog: "blog_posts",
  events: "events",
  sermons: "sermons",
  testimonies: "testimonies",
  ministries: "ministries",
  "hero-slides": "hero_slides",
  "prayer-requests": "prayer_requests",
  contact: "contact_messages",
};

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  if (detail?.message) return detail.message;
  return String(detail);
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function assertConfigured() {
  if (!isSupabaseConfigured || !getSupabase()) {
    throw new Error(
      "Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env"
    );
  }
}

async function rpc(fn, args = {}) {
  assertConfigured();
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

function normalizePath(path = "") {
  return String(path).split("?")[0].replace(/^\//, "");
}

function collectionFromPath(path) {
  const base = normalizePath(path);
  if (base.startsWith("blog")) return "blog";
  if (base.startsWith("events")) return "events";
  if (base.startsWith("sermons")) return "sermons";
  if (base.startsWith("testimonies")) return "testimonies";
  if (base.startsWith("ministries")) return "ministries";
  if (base.startsWith("hero-slides")) return "hero-slides";
  if (base.startsWith("prayer-requests")) return "prayer-requests";
  if (base.startsWith("contact")) return "contact";
  if (base.startsWith("settings")) return "settings";
  return base;
}

function parseId(path) {
  const parts = normalizePath(path).split("/").filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return null;
}

function withId(row) {
  if (!row) return row;
  return { ...row, id: row.id };
}

async function publicList(collection, includeAll = false) {
  assertConfigured();
  const table = TABLE_MAP[collection];
  if (!table) return [];

  if (collection === "blog" && !includeAll) {
    const now = new Date().toISOString();
    const liveQuery = getSupabase()
      .from(table)
      .select("*")
      .or(`published.eq.true,and(status.eq.scheduled,scheduled_at.lte.${now})`)
      .order("created_at", { ascending: false });
    let { data, error } = await liveQuery;
    if (error) {
      const fallback = await getSupabase()
        .from(table)
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw new Error(error.message);
    return (data || []).filter(isPublicBlogPost).map(withId);
  }

  let query = getSupabase().from(table).select("*");
  if (collection === "hero-slides") {
    query = query.order("order", { ascending: true });
  } else if (["ministries", "events", "sermons", "testimonies"].includes(collection)) {
    query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(withId);
}

async function publicGet(collection, id) {
  assertConfigured();
  const table = TABLE_MAP[collection];
  if (!table) throw new Error("Not found");
  const { data, error } = await getSupabase()
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Not found");
  if (collection === "blog" && !isPublicBlogPost(data)) throw new Error("Not found");
  return withId(data);
}

/** Axios-compatible facade used by existing pages/admin components */
const api = {
  async get(path) {
    const collection = collectionFromPath(path);
    const id = parseId(path);
    const includeAll = String(path).includes("all=1");

    if (collection === "settings") {
      assertConfigured();
      const { data, error } = await getSupabase()
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();
      if (error) throw { response: { data: { detail: error.message } } };
      return { data: data?.value || {} };
    }

    try {
      if (collection === "prayer-requests") {
        const token = getAdminToken();
        const rows = await rpc("admin_list_prayer_requests", { p_token: token });
        return { data: (rows || []).map(withId) };
      }

      if (collection === "contact") {
        const token = getAdminToken();
        const rows = await rpc("admin_list_collection", {
          p_token: token,
          p_collection: collection,
        });
        return { data: (rows || []).map(withId) };
      }

      if (id) {
        if (includeAll && getAdminToken()) {
          const rows = await rpc("admin_list_collection", {
            p_token: getAdminToken(),
            p_collection: collection,
          });
          const row = (rows || []).find((item) => String(item.id) === String(id));
          if (!row) throw new Error("Not found");
          return { data: withId(row) };
        }
        return { data: await publicGet(collection, id) };
      }

      // Admin list with drafts
      if (includeAll && getAdminToken()) {
        const rows = await rpc("admin_list_collection", {
          p_token: getAdminToken(),
          p_collection: collection,
        });
        return { data: (rows || []).map(withId) };
      }

      return { data: await publicList(collection, includeAll) };
    } catch (e) {
      throw { response: { data: { detail: e.message || String(e) } } };
    }
  },

  async post(path, body = {}) {
    const collection = collectionFromPath(path);
    try {
      if (collection === "contact" || normalizePath(path) === "contact") {
        const id = await rpc("submit_contact", {
          p_name: body.name,
          p_email: body.email,
          p_phone: body.phone || "",
          p_subject: body.subject || "",
          p_message: body.message || "",
        });
        return { data: { id } };
      }

      if (
        collection === "testimonies" &&
        (normalizePath(path) === "testimonies/submit" ||
          normalizePath(path) === "testimony-submit")
      ) {
        const id = await rpc("submit_testimony", {
          p_name: body.name,
          p_email: body.email,
          p_phone: body.phone || "",
          p_role: body.role || "",
          p_date_joined: body.dateJoined || body.date_joined || "",
          p_title: body.title || "",
          p_testimony: body.testimony || body.message || "",
          p_consent_public: body.consent_public !== false && body.consentPublic !== false,
        });
        return { data: { id } };
      }

      if (collection === "prayer-requests") {
        const id = await rpc("submit_prayer", {
          p_name: body.name,
          p_email: body.email || "",
          p_phone: body.phone || "",
          p_category: body.category || "Personal Prayer Request",
          p_request: body.request || body.message || "",
          p_is_public: Boolean(body.is_public),
        });
        return { data: { id } };
      }

      if (normalizePath(path) === "donations/initialize" || collection === "donations") {
        const id = await rpc("submit_donation_intent", {
          p_name: body.name,
          p_email: body.email,
          p_amount: Number(body.amount),
          p_purpose: body.purpose || "offering",
        });
        return { data: { id, enabled: false } };
      }

      const token = getAdminToken();
      const row = await rpc("admin_upsert_item", {
        p_token: token,
        p_collection: collection,
        p_id: null,
        p_data: body,
      });
      return { data: withId(row) };
    } catch (e) {
      throw { response: { data: { detail: e.message || String(e) } } };
    }
  },

  async put(path, body = {}) {
    const collection = collectionFromPath(path);
    const id = parseId(path);
    try {
      if (collection === "settings") {
        const token = getAdminToken();
        const data = await rpc("admin_update_settings", {
          p_token: token,
          p_value: body,
        });
        return { data };
      }

      if (collection === "prayer-requests" && String(path).includes("/status")) {
        const token = getAdminToken();
        await rpc("admin_update_prayer_status", {
          p_token: token,
          p_id: id,
          p_status: body.status || "prayed",
        });
        return { data: { ok: true } };
      }

      if (collection === "testimonies" && String(path).includes("/review")) {
        const token = getAdminToken();
        const row = await rpc("admin_review_testimony", {
          p_token: token,
          p_id: id,
          p_action: body.action || "save",
          p_data: body.data || body,
          p_notify_user: Boolean(body.notify_user ?? body.notifyUser),
        });
        return { data: withId(row) };
      }

      const token = getAdminToken();
      const row = await rpc("admin_upsert_item", {
        p_token: token,
        p_collection: collection,
        p_id: id,
        p_data: body,
      });
      return { data: withId(row) };
    } catch (e) {
      throw { response: { data: { detail: e.message || String(e) } } };
    }
  },

  async delete(path) {
    const collection = collectionFromPath(path);
    const id = parseId(path);
    try {
      const token = getAdminToken();
      await rpc("admin_delete_item", {
        p_token: token,
        p_collection: collection,
        p_id: id,
      });
      return { data: { ok: true } };
    } catch (e) {
      throw { response: { data: { detail: e.message || String(e) } } };
    }
  },

  async reorder(collection, ids = []) {
    try {
      const token = getAdminToken();
      const data = await rpc("admin_reorder_collection", {
        p_token: token,
        p_collection: collection,
        p_ids: ids,
      });
      return { data };
    } catch (e) {
      throw { response: { data: { detail: e.message || String(e) } } };
    }
  },
};

export const authApi = {
  login: async (email, password) => {
    const data = await rpc("admin_login", {
      p_email: email,
      p_password: password,
    });
    setAdminToken(data.token);
    return data.admin;
  },
  me: async () => {
    const token = getAdminToken();
    if (!token) throw new Error("Not authenticated");
    return rpc("admin_me", { p_token: token });
  },
  logout: async () => {
    const token = getAdminToken();
    if (token) {
      try {
        await rpc("admin_logout", { p_token: token });
      } catch (e) {
        /* ignore */
      }
    }
    setAdminToken(null);
  },
  visitStats: () => rpc("admin_visit_stats", { p_token: getAdminToken() }),
  listVisits: (limit = 200) => rpc("admin_list_visits", { p_token: getAdminToken(), p_limit: limit }),
  updateContact: (id, status, emailSent) =>
    rpc("admin_update_contact", {
      p_token: getAdminToken(),
      p_id: id,
      p_status: status,
      p_email_sent: emailSent ?? null,
    }),
  listAdmins: () => rpc("admin_list", { p_token: getAdminToken() }),
  createAdmin: (payload) =>
    rpc("admin_create", {
      p_token: getAdminToken(),
      p_username: payload.username,
      p_password: payload.password,
      p_email: payload.email || "",
      p_role: payload.role || "admin",
      p_permissions: payload.permissions || {},
    }),
  updateAdminPermissions: (id, permissions) =>
    rpc("admin_update_permissions", {
      p_token: getAdminToken(),
      p_admin_id: id,
      p_permissions: permissions || {},
    }),
  updatePageSection: (page, section, data) =>
    rpc("admin_update_page_section", {
      p_token: getAdminToken(),
      p_page: page,
      p_section: section,
      p_data: data || {},
    }),
  setAdminActive: (id, isActive) =>
    rpc("admin_set_active", {
      p_token: getAdminToken(),
      p_admin_id: id,
      p_is_active: isActive,
    }),
  setAdminPassword: (id, password) =>
    rpc("admin_set_password", {
      p_token: getAdminToken(),
      p_admin_id: id,
      p_password: password,
    }),
  reviewTestimony: (id, action, data = {}, notifyUser = false) =>
    rpc("admin_review_testimony", {
      p_token: getAdminToken(),
      p_id: id,
      p_action: action,
      p_data: data,
      p_notify_user: Boolean(notifyUser),
    }),
  markTestimonyConfirmationSent: (id) =>
    rpc("mark_testimony_confirmation_sent", { p_id: id }),
  listPrayerMessages: (id) =>
    rpc("admin_list_prayer_messages", { p_token: getAdminToken(), p_id: id }),
  assignPrayer: (id, pastorId) =>
    rpc("admin_assign_prayer", {
      p_token: getAdminToken(),
      p_id: id,
      p_pastor_id: pastorId,
    }),
  replyPrayer: (id, body) =>
    rpc("admin_reply_prayer", {
      p_token: getAdminToken(),
      p_id: id,
      p_body: body,
    }),
  markPrayerMessageEmailed: (id) =>
    rpc("mark_prayer_message_emailed", { p_id: id }),
  listPastors: () => rpc("admin_list_pastors", { p_token: getAdminToken() }),
  createPastor: (payload) =>
    rpc("admin_create_pastor", {
      p_token: getAdminToken(),
      p_username: payload.username,
      p_password: payload.password,
      p_email: payload.email,
      p_full_name: payload.full_name || payload.fullName || "",
      p_phone: payload.phone || "",
    }),
  changeOwnPassword: (adminId, password) =>
    rpc("admin_set_password", {
      p_token: getAdminToken(),
      p_admin_id: adminId,
      p_password: password,
    }),
  listAnnouncements: () =>
    rpc("admin_list_announcements", { p_token: getAdminToken() }),
  upsertAnnouncement: (id, data) =>
    rpc("admin_upsert_announcement", {
      p_token: getAdminToken(),
      p_id: id || null,
      p_data: data || {},
    }),
  deleteAnnouncement: (id) =>
    rpc("admin_delete_announcement", {
      p_token: getAdminToken(),
      p_id: id,
    }),
  logAdminActivity: (path, action = "navigate", meta = {}) =>
    rpc("admin_log_activity", {
      p_token: getAdminToken(),
      p_path: path,
      p_action: action,
      p_meta: meta,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    }),
  listAdminActivity: (limit = 200, adminId = null) =>
    rpc("admin_list_activity", {
      p_token: getAdminToken(),
      p_limit: limit,
      p_admin_id: adminId || null,
    }),
  listMedia: async () => {
    try {
      const rows = await rpc("admin_list_media", { p_token: getAdminToken() });
      return (rows || []).map((row) => ({
        id: row.id || row.url,
        url: row.url,
        name: row.name || "",
        created_at: row.created_at,
      }));
    } catch {
      const posts = await rpc("admin_list_collection", {
        p_token: getAdminToken(),
        p_collection: "blog",
      });
      const seen = new Set();
      return (posts || [])
        .flatMap((post) => {
          const urls = [post.image, ...extractContentImages(post.content)].filter(Boolean);
          return urls.map((url) => ({ id: url, url, name: post.title || "Image", created_at: post.created_at }));
        })
        .filter((item) => {
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        });
    }
  },
  addMedia: async (url, name = "") => {
    try {
      return await rpc("admin_add_media", {
        p_token: getAdminToken(),
        p_url: url,
        p_name: name || "",
      });
    } catch {
      return { url, name };
    }
  },
  uploadMedia: async (file) => {
    assertConfigured();
    const ext = String(file.name || "image").split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"].includes(ext) ? ext : "jpg";
    const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const { error } = await getSupabase().storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${safeExt}`,
    });
    if (error) throw new Error(error.message);
    const { data } = getSupabase().storage.from("media").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Could not get image URL");
    return { url: data.publicUrl, path };
  },
};

function extractContentImages(html) {
  return Array.from(String(html || "").matchAll(/<img[^>]+src=["']([^"']+)["']/gi), (match) => match[1]);
}

export async function trackPageVisit({ path, referrer, userAgent, visitorId, sessionId }) {
  if (!isSupabaseConfigured || !getSupabase()) return;
  const { error } = await getSupabase().from("page_visits").insert({
    path,
    referrer: referrer || null,
    user_agent: userAgent || null,
    visitor_id: visitorId || null,
    session_id: sessionId || null,
  });
  if (error) console.warn("Visit tracking failed:", error.message);
}

export default api;
