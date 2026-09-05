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
  let { data, error } = await getSupabase()
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const bySlug = await getSupabase()
      .from(table)
      .select("*")
      .eq("slug", id)
      .maybeSingle();
    if (bySlug.error) throw new Error(bySlug.error.message);
    data = bySlug.data;
  }
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
          p_branch_id: body.branch_id || null,
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
          p_branch_id: body.branch_id || null,
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
          p_branch_id: body.branch_id || null,
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
  analyticsReport: (range = "week", topN = 10) =>
    rpc("admin_analytics_report", {
      p_token: getAdminToken(),
      p_range: range,
      p_top_n: topN,
    }),
  visitorDetail: (visitorId, limit = 100) =>
    rpc("admin_visitor_detail", {
      p_token: getAdminToken(),
      p_visitor_id: visitorId,
      p_limit: limit,
    }),
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
  listChurchResources: (kind = null) =>
    rpc("admin_list_church_resources", {
      p_token: getAdminToken(),
      p_kind: kind || null,
    }),
  upsertChurchResource: (id, data) =>
    rpc("admin_upsert_church_resource", {
      p_token: getAdminToken(),
      p_id: id || null,
      p_data: data || {},
    }),
  deleteChurchResource: (id) =>
    rpc("admin_delete_church_resource", {
      p_token: getAdminToken(),
      p_id: id,
    }),
  announcementStats: () =>
    rpc("admin_announcement_stats", { p_token: getAdminToken() }),
  listAnnouncementEvents: (announcementId = null, limit = 500) =>
    rpc("admin_list_announcement_events", {
      p_token: getAdminToken(),
      p_announcement_id: announcementId || null,
      p_limit: limit,
    }),
  blogAnalytics: (slug = null, limit = 300) =>
    rpc("admin_blog_analytics", {
      p_token: getAdminToken(),
      p_slug: slug || null,
      p_limit: limit,
    }),
  listBlogComments: (status = null, slug = null, limit = 200) =>
    rpc("admin_list_blog_comments", {
      p_token: getAdminToken(),
      p_status: status || null,
      p_slug: slug || null,
      p_limit: limit,
    }),
  moderateBlogComment: (id, status, note = "") =>
    rpc("admin_moderate_blog_comment", {
      p_token: getAdminToken(),
      p_id: id,
      p_status: status,
      p_note: note || "",
    }),
  deleteBlogComment: (id) =>
    rpc("admin_delete_blog_comment", {
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
  // Programs & registrations
  listProgramTypes: () => rpc("admin_list_program_types", { p_token: getAdminToken() }),
  upsertProgramType: (id, data) => rpc("admin_upsert_program_type", { p_token: getAdminToken(), p_id: id || null, p_data: data }),
  deleteProgramType: (id) => rpc("admin_delete_program_type", { p_token: getAdminToken(), p_id: id }),
  listPrograms: () => rpc("admin_list_programs", { p_token: getAdminToken() }),
  upsertProgram: (id, data) => rpc("admin_upsert_program", { p_token: getAdminToken(), p_id: id || null, p_data: data }),
  deleteProgram: (id) => rpc("admin_delete_program", { p_token: getAdminToken(), p_id: id }),
  listProgramRegistrations: (programId = null, branchId = null) =>
    rpc("admin_list_program_registrations", {
      p_token: getAdminToken(),
      p_program_id: programId || null,
      p_branch_id: branchId || null,
    }),
  updateProgramRegistration: (id, data) =>
    rpc("admin_update_program_registration", { p_token: getAdminToken(), p_id: id, p_data: data }),
  deleteProgramRegistration: (id) => rpc("admin_delete_program_registration", { p_token: getAdminToken(), p_id: id }),
  registerProgramParticipant: (slug, payload) =>
    rpc("submit_program_registration", {
      p_program_slug: slug,
      p_full_name: payload.full_name,
      p_email: payload.email,
      p_phone: payload.phone,
      p_form_data: payload.form_data || {},
      p_branch_id: payload.branch_id || null,
      p_name_title: payload.name_title || "",
      p_first_name: payload.first_name || "",
      p_last_name: payload.last_name || "",
      p_by_admin: true,
      p_admin_token: getAdminToken(),
    }),
  listChurchRoles: () => rpc("admin_list_church_roles", { p_token: getAdminToken() }),
  upsertChurchRole: (id, data) => rpc("admin_upsert_church_role", { p_token: getAdminToken(), p_id: id || null, p_data: data }),
  deleteChurchRole: (id) => rpc("admin_delete_church_role", { p_token: getAdminToken(), p_id: id }),
  listChurchMembers: async (roleId = null, branchId = null, statusGroup = null) => {
    try {
      return await rpc("admin_list_church_members", {
        p_token: getAdminToken(),
        p_role_id: roleId || null,
        p_branch_id: branchId || null,
        p_status_group: statusGroup || null,
      });
    } catch {
      const rows = await rpc("admin_list_church_members", {
        p_token: getAdminToken(),
        p_role_id: roleId || null,
        p_branch_id: branchId || null,
      });
      const list = Array.isArray(rows) ? rows : [];
      if (statusGroup === "pending") return list.filter((r) => r.status === "pending");
      if (statusGroup === "approved") return list.filter((r) => r.status === "approved" || r.status === "active");
      return list;
    }
  },
  updateChurchMember: (id, data) =>
    rpc("admin_update_church_member", { p_token: getAdminToken(), p_id: id, p_data: data }),
  deleteChurchMember: (id) => rpc("admin_delete_church_member", { p_token: getAdminToken(), p_id: id }),
  registerChurchMember: (payload) =>
    rpc("submit_church_membership", {
      ...payload,
      p_by_admin: true,
      p_admin_token: getAdminToken(),
    }),
  markProgramRegistrationEmailed: (id) => rpc("mark_program_registration_emailed", { p_id: id }),
  markProgramRegistrationsSeen: (programId) =>
    rpc("admin_mark_program_registrations_seen", { p_token: getAdminToken(), p_program_id: programId }),
  markVolunteerApplicationsSeen: () =>
    rpc("admin_mark_volunteer_applications_seen", { p_token: getAdminToken() }),
  markChurchMemberEmailed: (id) => rpc("mark_church_member_emailed", { p_id: id }),
  listChurchBranches: () => rpc("admin_list_church_branches", { p_token: getAdminToken() }),
  upsertChurchBranch: (id, data) => rpc("admin_upsert_church_branch", { p_token: getAdminToken(), p_id: id || null, p_data: data }),
  deleteChurchBranch: (id) => rpc("admin_delete_church_branch", { p_token: getAdminToken(), p_id: id }),
  listChurchDistricts: () => rpc("admin_list_church_districts", { p_token: getAdminToken() }),
  upsertChurchDistrict: (id, data) => rpc("admin_upsert_church_district", { p_token: getAdminToken(), p_id: id || null, p_data: data }),
  deleteChurchDistrict: (id) => rpc("admin_delete_church_district", { p_token: getAdminToken(), p_id: id }),
  listVolunteerTeams: () => rpc("admin_list_volunteer_teams", { p_token: getAdminToken() }),
  listVolunteerApplications: (teamId = null) =>
    rpc("admin_list_volunteer_applications", { p_token: getAdminToken(), p_team_id: teamId || null }),
  updateVolunteerApplication: (id, data) =>
    rpc("admin_update_volunteer_application", { p_token: getAdminToken(), p_id: id, p_data: data || {} }),
  deleteVolunteerApplication: (id) =>
    rpc("admin_delete_volunteer_application", { p_token: getAdminToken(), p_id: id }),
  listVolunteerAudit: (applicationId = null) =>
    rpc("admin_list_volunteer_audit", { p_token: getAdminToken(), p_application_id: applicationId || null }),
  saveFormDropdowns: (catalogs) =>
    rpc("admin_save_form_dropdowns", { p_token: getAdminToken(), p_catalogs: catalogs || [] }),
  listNotificationCategories: () =>
    rpc("admin_list_notification_categories", { p_token: getAdminToken() }),
  listMemberNotifications: () =>
    rpc("admin_list_member_notifications", { p_token: getAdminToken() }),
  previewNotificationRecipients: (filters) =>
    rpc("admin_preview_notification_recipients", {
      p_token: getAdminToken(),
      p_filters: filters || {},
    }),
  upsertMemberNotification: (id, data) =>
    rpc("admin_upsert_member_notification", {
      p_token: getAdminToken(),
      p_id: id || null,
      p_data: data || {},
    }),
  deleteMemberNotification: (id) =>
    rpc("admin_delete_member_notification", { p_token: getAdminToken(), p_id: id }),
  startMemberNotification: (id) =>
    rpc("admin_start_member_notification", { p_token: getAdminToken(), p_id: id }),
  inboxCounts: () => rpc("admin_inbox_counts", { p_token: getAdminToken() }),
  submitChangeRequest: ({ feature, action, resource_type, resource_id, title, payload, previous }) =>
    rpc("admin_submit_change_request", {
      p_token: getAdminToken(),
      p_feature: feature,
      p_action: action,
      p_resource_type: resource_type,
      p_resource_id: resource_id || null,
      p_title: title || "",
      p_payload: payload || {},
      p_previous: previous || {},
    }),
  listChangeRequests: (feature = null, status = "pending", scope = "inbox") =>
    rpc("admin_list_change_requests", {
      p_token: getAdminToken(),
      p_feature: feature,
      p_status: status,
      p_scope: scope,
    }),
  reviewChangeRequest: (id, decision, note = "") =>
    rpc("admin_review_change_request", {
      p_token: getAdminToken(),
      p_id: id,
      p_decision: decision,
      p_note: note,
    }),
  commentChangeRequest: (id, body) =>
    rpc("admin_add_change_request_comment", {
      p_token: getAdminToken(),
      p_id: id,
      p_body: body,
    }),
  cancelChangeRequest: (id) =>
    rpc("admin_cancel_change_request", {
      p_token: getAdminToken(),
      p_id: id,
    }),
  completeMemberNotification: (id, results) =>
    rpc("admin_complete_member_notification", {
      p_token: getAdminToken(),
      p_id: id,
      p_results: results || [],
    }),
  listChurchMeetings: (bucket = "upcoming") =>
    rpc("admin_list_church_meetings", { p_token: getAdminToken(), p_bucket: bucket }),
  upsertChurchMeeting: (id, data) =>
    rpc("admin_upsert_church_meeting", {
      p_token: getAdminToken(),
      p_id: id || null,
      p_data: data || {},
    }),
  deleteChurchMeeting: (id) =>
    rpc("admin_delete_church_meeting", { p_token: getAdminToken(), p_id: id }),
  startMeetingInvites: (id) =>
    rpc("admin_start_meeting_invites", { p_token: getAdminToken(), p_id: id }),
  completeMeetingInvites: (id, results) =>
    rpc("admin_complete_meeting_invites", {
      p_token: getAdminToken(),
      p_id: id,
      p_results: results || [],
    }),
  listUtilityNotes: (kind = null) =>
    rpc("admin_list_utility_notes", { p_token: getAdminToken(), p_kind: kind }),
  upsertUtilityNote: (id, data) =>
    rpc("admin_upsert_utility_note", {
      p_token: getAdminToken(),
      p_id: id || null,
      p_data: data || {},
    }),
  deleteUtilityNote: (id) =>
    rpc("admin_delete_utility_note", { p_token: getAdminToken(), p_id: id }),
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

/** @deprecated Prefer startPageVisit + pingPageVisit for duration tracking */
export async function trackPageVisit(payload) {
  return startPageVisit(payload);
}

export async function startPageVisit({
  path,
  referrer,
  userAgent,
  visitorId,
  sessionId,
  deviceType,
  browser,
  os,
  language,
  timezone,
  screenWidth,
  screenHeight,
}) {
  if (!isSupabaseConfigured || !getSupabase()) return null;
  try {
    const { data, error } = await getSupabase().rpc("public_start_visit", {
      p_path: path,
      p_referrer: referrer || null,
      p_user_agent: userAgent || null,
      p_visitor_id: visitorId || null,
      p_session_id: sessionId || null,
      p_device_type: deviceType || null,
      p_browser: browser || null,
      p_os: os || null,
      p_language: language || null,
      p_timezone: timezone || null,
      p_screen_width: screenWidth || null,
      p_screen_height: screenHeight || null,
    });
    if (error) {
      const { data: row, error: insertError } = await getSupabase()
        .from("page_visits")
        .insert({
          path,
          referrer: referrer || null,
          user_agent: userAgent || null,
          visitor_id: visitorId || null,
          session_id: sessionId || null,
        })
        .select("id")
        .maybeSingle();
      if (insertError) {
        console.warn("Visit tracking failed:", error.message || insertError.message);
        return null;
      }
      return row?.id || null;
    }
    return data;
  } catch (e) {
    console.warn("Visit tracking failed:", e?.message || e);
    return null;
  }
}

export async function pingPageVisit({ visitId, visitorId, durationSeconds, finalize = false }) {
  if (!isSupabaseConfigured || !getSupabase() || !visitId || !visitorId) return;
  try {
    const { error } = await getSupabase().rpc("public_ping_visit", {
      p_id: visitId,
      p_visitor_id: visitorId,
      p_duration_seconds: durationSeconds,
      p_finalize: finalize,
    });
    if (error) console.warn("Visit ping failed:", error.message);
  } catch (e) {
    console.warn("Visit ping failed:", e?.message || e);
  }
}

export async function getPublicProgram(slug) {
  assertConfigured();
  return rpc("public_get_program", { p_slug: slug });
}

export async function getPublicMeeting(id) {
  assertConfigured();
  return rpc("public_get_meeting", { p_id: id });
}

export async function listPublicChurchRoles() {
  assertConfigured();
  return rpc("public_list_church_roles");
}

export async function listPublicChurchBranches() {
  assertConfigured();
  return rpc("public_list_church_branches");
}

export async function listPublicChurchDistricts() {
  assertConfigured();
  return rpc("public_list_church_districts");
}

export async function submitProgramRegistration(slug, payload) {
  assertConfigured();
  return rpc("submit_program_registration", {
    p_program_slug: slug,
    p_full_name: payload.full_name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_form_data: payload.form_data || {},
    p_branch_id: payload.branch_id || null,
    p_name_title: payload.name_title || "",
    p_first_name: payload.first_name || "",
    p_last_name: payload.last_name || "",
    p_by_admin: false,
    p_admin_token: null,
  });
}

export async function submitChurchMembership(payload) {
  assertConfigured();
  return rpc("submit_church_membership", {
    p_full_name: payload.full_name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_name_title: payload.name_title || "",
    p_first_name: payload.first_name || "",
    p_last_name: payload.last_name || "",
    p_gender: payload.gender || "",
    p_date_of_birth: payload.date_of_birth || null,
    p_address: payload.address || "",
    p_city: payload.city || "",
    p_state: payload.state || "",
    p_country: payload.country || "Nigeria",
    p_role_id: Array.isArray(payload.role_ids) ? payload.role_ids[0] : payload.role_id,
    p_role_ids: Array.isArray(payload.role_ids)
      ? payload.role_ids
      : (payload.role_id ? [payload.role_id] : []),
    p_ministry: payload.ministry || "",
    p_baptism_status: payload.baptism_status || "",
    p_marital_status: payload.marital_status || "",
    p_occupation: payload.occupation || "",
    p_emergency_contact_name: payload.emergency_contact_name || "",
    p_emergency_contact_phone: payload.emergency_contact_phone || "",
    p_notes: payload.notes || "",
    p_form_data: payload.form_data || {},
    p_branch_id: payload.branch_id || null,
    p_by_admin: false,
    p_admin_token: null,
  });
}

export async function markProgramRegistrationEmailed(id) {
  if (!isSupabaseConfigured || !getSupabase() || !id) return;
  await getSupabase().rpc("mark_program_registration_emailed", { p_id: id });
}

export async function markChurchMemberEmailed(id) {
  if (!isSupabaseConfigured || !getSupabase() || !id) return;
  await getSupabase().rpc("mark_church_member_emailed", { p_id: id });
}

export async function getPublicVolunteerTeam(slug) {
  assertConfigured();
  return rpc("public_get_volunteer_team", { p_slug: slug });
}

export async function submitVolunteerApplication(slug, payload) {
  assertConfigured();
  return rpc("submit_volunteer_application", {
    p_team_slug: slug,
    p_full_name: payload.full_name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_name_title: payload.name_title || "",
    p_first_name: payload.first_name || "",
    p_last_name: payload.last_name || "",
    p_branch_id: payload.branch_id || null,
    p_role_interest: payload.role_interest || "",
    p_skills: payload.skills || "",
    p_experience_level: payload.experience_level || "",
    p_availability: payload.availability || "",
    p_notes: payload.notes || "",
  });
}

export async function markVolunteerApplicationEmailed(id) {
  if (!isSupabaseConfigured || !getSupabase() || !id) return;
  await getSupabase().rpc("mark_volunteer_application_emailed", { p_id: id });
}

export default api;
