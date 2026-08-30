import { DASHBOARD_FEATURES, SITE_PAGES } from "../data/sitePages";

const LEGACY_SECTION = {
  hero: "home.hero",
  blog: "blog.posts",
  events: "events.list",
  sermons: "sermons.list",
  ministries: "ministries.list",
  testimonies: "testimonies.list",
  prayers: "prayer.inbox",
  website: "contact.church",
};

export function featureKey(pageKey, sectionKey) {
  return `${pageKey}.${sectionKey}`;
}

export function emptyPermissions() {
  const next = {
    overview: { view: false },
    visitors: { view: false },
    contacts: { view: false, edit: false, delete: false },
    pages: {},
  };
  DASHBOARD_FEATURES.forEach((feature) => {
    next[feature.key] = Object.fromEntries((feature.actions || ["view"]).map((action) => [action, false]));
  });
  SITE_PAGES.forEach((page) => {
    next.pages[page.key] = { access: false, sections: {} };
    page.sections.forEach((section) => {
      const actions = section.actions || ["edit"];
      next.pages[page.key].sections[section.key] = Object.fromEntries(actions.map((action) => [action, false]));
    });
  });
  return next;
}

export function allPermissions() {
  const next = emptyPermissions();
  DASHBOARD_FEATURES.forEach((feature) => {
    next[feature.key] = Object.fromEntries((feature.actions || ["view"]).map((action) => [action, true]));
  });
  SITE_PAGES.forEach((page) => {
    next.pages[page.key].access = true;
    page.sections.forEach((section) => {
      const actions = section.actions || ["edit"];
      next.pages[page.key].sections[section.key] = Object.fromEntries(actions.map((action) => [action, true]));
    });
  });
  return next;
}

function sectionGranted(sectionPerms = {}) {
  return Boolean(sectionPerms.edit || sectionPerms.delete || sectionPerms.view);
}

export function normalizePermissions(raw) {
  const next = emptyPermissions();
  if (!raw || typeof raw !== "object") return next;

  DASHBOARD_FEATURES.forEach((feature) => {
    const src = raw[feature.key] || {};
    feature.actions.forEach((action) => {
      next[feature.key][action] = Boolean(src[action]);
    });
    if (next[feature.key].edit || next[feature.key].delete) next[feature.key].view = true;
  });

  const pagesIn = raw.pages && typeof raw.pages === "object" ? raw.pages : {};
  SITE_PAGES.forEach((page) => {
    const srcPage = pagesIn[page.key] || {};
    const srcSections = srcPage.sections || {};
    let anySection = false;
    page.sections.forEach((section) => {
      const actions = section.actions || ["edit"];
      const src = srcSections[section.key] || {};
      const mapped = {};
      actions.forEach((action) => {
        mapped[action] = Boolean(src[action] || src === true);
      });
      if (mapped.delete && actions.includes("edit")) mapped.edit = true;
      if (sectionGranted(mapped)) anySection = true;
      next.pages[page.key].sections[section.key] = mapped;
    });
    next.pages[page.key].access = Boolean(srcPage.access) || anySection;
  });

  if (next.form_dropdowns && !raw.form_dropdowns && raw.church_members) {
    next.form_dropdowns.view = Boolean(raw.church_members.view || raw.church_members.edit || raw.church_members.delete);
    next.form_dropdowns.edit = Boolean(raw.church_members.edit);
  }

  const homeAnnouncements = next.pages.home?.sections?.announcements;
  if (homeAnnouncements && !raw.banners) {
    next.banners.view = Boolean(homeAnnouncements.edit || homeAnnouncements.delete || homeAnnouncements.view);
    next.banners.edit = Boolean(homeAnnouncements.edit);
    next.banners.delete = Boolean(homeAnnouncements.delete);
  }

  Object.entries(LEGACY_SECTION).forEach(([legacy, dotted]) => {
    const [pageKey, sectionKey] = dotted.split(".");
    const src = raw[legacy];
    if (!src || typeof src !== "object") return;
    const target = next.pages[pageKey]?.sections?.[sectionKey];
    if (!target) return;
    if (src.view || src.edit || src.delete) next.pages[pageKey].access = true;
    if (src.edit && "edit" in target) target.edit = true;
    if (src.delete && "delete" in target) target.delete = true;
  });

  return next;
}

function legacyHas(user, feature, action) {
  const perms = user.permissions || {};
  const mapped = Object.entries(LEGACY_SECTION).find(([, dotted]) => dotted === feature);
  if (!mapped) {
    const flat = perms[feature];
    if (!flat) return false;
    if (action === "view") return Boolean(flat.view || flat.edit || flat.delete);
    return Boolean(flat[action]);
  }
  const src = perms[mapped[0]];
  if (!src) return false;
  if (action === "view") return Boolean(src.view || src.edit || src.delete);
  return Boolean(src[action]);
}

export function hasPermission(user, feature, action = "view") {
  if (!user || user === false) return false;
  if (user.role === "superadmin") return true;
  if (feature === "admins") return false;

  // Pastors are locked to the prayer inbox (and can change their own password in UI)
  if (user.role === "pastor") {
    if (feature === "prayer.inbox" && (action === "view" || action === "edit")) return true;
    if (feature === "prayer" && action === "view") return true;
    return false;
  }

  const perms = normalizePermissions(user.permissions);
  const dashboard = DASHBOARD_FEATURES.find((item) => item.key === feature);

  if (dashboard) {
    if (action === "view") return Boolean(perms[feature]?.view || perms[feature]?.edit || perms[feature]?.delete);
    return Boolean(perms[feature]?.[action]);
  }

  if (feature.includes(".")) {
    const [pageKey, sectionKey] = feature.split(".");
    const page = perms.pages[pageKey];
    const section = page?.sections?.[sectionKey];
    if (action === "view") {
      return Boolean(page?.access || sectionGranted(section) || legacyHas(user, feature, "view"));
    }
    return Boolean(section?.[action] || legacyHas(user, feature, action));
  }

  const page = perms.pages[feature];
  if (page) {
    if (action === "view") {
      return Boolean(page.access || Object.values(page.sections || {}).some(sectionGranted));
    }
    return Object.values(page.sections || {}).some((section) => section[action]);
  }

  return legacyHas(user, feature, action);
}

export function firstAllowedPath(user) {
  if (user?.role === "pastor") return "/admin/prayer";
  if (hasPermission(user, "overview", "view")) return "/admin";
  if (hasPermission(user, "visitors", "view")) return "/admin/visitors";
  if (hasPermission(user, "contacts", "view")) return "/admin/contacts";
  if (hasPermission(user, "banners", "view")) return "/admin/banners";
  if (hasPermission(user, "programs", "view")) return "/admin/programs";
  if (hasPermission(user, "program_registrations", "view")) return "/admin/registrations/programs";
  if (hasPermission(user, "volunteer_applications", "view")) return "/admin/registrations/volunteers";
  if (hasPermission(user, "church_members", "view")) return "/admin/registrations/members";
  if (hasPermission(user, "church_meetings", "view")) return "/admin/utilities/meetings";
  if (hasPermission(user, "utilities", "view")) return "/admin/utilities/notes";
  if (hasPermission(user, "member_notifications", "view")) return "/admin/programs/notifications";
  if (hasPermission(user, "form_dropdowns", "view")) return "/admin/registrations/form-options";
  if (hasPermission(user, "approvals", "view")) return "/admin/approvals";
  if (hasPermission(user, "prayer.inbox", "view") || hasPermission(user, "prayer.inbox", "edit")) {
    return "/admin/prayer";
  }
  if (hasPermission(user, "blog.posts", "edit") || hasPermission(user, "blog.posts", "delete")) return "/admin/blog";
  const page = SITE_PAGES.find((item) => hasPermission(user, item.key, "view"));
  if (page) return page.path;
  if (user?.role === "superadmin") return "/admin/admins";
  if (user && user !== false) return "/admin/approvals/mine";
  return null;
}

export function setDashboardPermission(permissions, featureKeyName, action, enabled) {
  const next = normalizePermissions(permissions);
  if (!next[featureKeyName]) return next;
  next[featureKeyName] = { ...next[featureKeyName], [action]: enabled };
  if ((action === "edit" || action === "delete") && enabled) next[featureKeyName].view = true;
  if (action === "view" && !enabled) {
    if ("edit" in next[featureKeyName]) next[featureKeyName].edit = false;
    if ("delete" in next[featureKeyName]) next[featureKeyName].delete = false;
  }
  return next;
}

export function setPageAccess(permissions, pageKey, enabled) {
  const next = normalizePermissions(permissions);
  if (!next.pages[pageKey]) return next;
  next.pages[pageKey].access = enabled;
  if (!enabled) {
    Object.keys(next.pages[pageKey].sections).forEach((sectionKey) => {
      const section = next.pages[pageKey].sections[sectionKey];
      Object.keys(section).forEach((action) => {
        section[action] = false;
      });
    });
  } else {
    const page = SITE_PAGES.find((item) => item.key === pageKey);
    page?.sections.forEach((section) => {
      const actions = section.actions || ["edit"];
      if (!actions.some((action) => next.pages[pageKey].sections[section.key][action])) {
        next.pages[pageKey].sections[section.key].edit = true;
      }
    });
  }
  return next;
}

export function setSectionPermission(permissions, pageKey, sectionKey, action, enabled) {
  const next = normalizePermissions(permissions);
  const section = next.pages[pageKey]?.sections?.[sectionKey];
  if (!section) return next;
  section[action] = enabled;
  if (action === "delete" && enabled && "edit" in section) section.edit = true;
  if (action === "edit" && !enabled && "delete" in section) section.delete = false;
  if (enabled) next.pages[pageKey].access = true;
  if (!enabled && !Object.values(next.pages[pageKey].sections).some(sectionGranted)) {
    next.pages[pageKey].access = false;
  }
  return next;
}

export function setAllPageSections(permissions, pageKey, enabled) {
  const next = normalizePermissions(permissions);
  const page = SITE_PAGES.find((item) => item.key === pageKey);
  if (!page || !next.pages[pageKey]) return next;
  next.pages[pageKey].access = enabled;
  page.sections.forEach((section) => {
    const actions = section.actions || ["edit"];
    next.pages[pageKey].sections[section.key] = Object.fromEntries(actions.map((action) => [action, enabled]));
  });
  return next;
}
