/**
 * Hierarchical admin sidebar. Add new features here so they nest as:
 * Feature → kind/type → section (manage, analytics, audit, …).
 */
export const ADMIN_NAV = [
  {
    id: "overview",
    to: "/admin",
    label: "Overview",
    icon: "LayoutDashboard",
    end: true,
    feature: "overview",
  },
  {
    id: "visitors",
    to: "/admin/visitors",
    label: "Visitors",
    icon: "Users",
    feature: "visitors",
  },
  {
    id: "contacts",
    to: "/admin/contacts",
    label: "Messages",
    icon: "Mail",
    feature: "contacts",
  },
  {
    id: "blog",
    label: "Blog",
    icon: "FileText",
    matchPrefix: "/admin/blog",
    anyOf: [{ feature: "blog.posts", action: "edit" }, { feature: "blog.posts", action: "delete" }],
    children: [
      { id: "blog-new", to: "/admin/blog/new", label: "Create article", icon: "Plus", end: true, feature: "blog.posts", action: "edit" },
      { id: "blog-analytics", to: "/admin/blog/analytics", label: "Analytics", icon: "BarChart3", end: true, feature: "blog.posts", action: "edit" },
      { id: "blog-bible", to: "/admin/blog/bible-study", label: "Monday Bible Study", icon: "BookOpen", end: true, feature: "blog.posts", action: "edit" },
      { id: "blog-manna", to: "/admin/blog/daily-manna", label: "Daily Manna", icon: "Sun", end: true, feature: "blog.posts", action: "edit" },
      {
        id: "blog-all",
        to: "/admin/blog",
        label: "All articles",
        icon: "Newspaper",
        end: true,
        anyOf: [{ feature: "blog.posts", action: "edit" }, { feature: "blog.posts", action: "delete" }],
      },
    ],
  },
  {
    id: "prayer",
    label: "Prayer",
    icon: "HandHeart",
    matchPrefix: ["/admin/prayer", "/admin/pages/prayer"],
    anyOf: [{ feature: "prayer.inbox" }, { feature: "prayer" }],
    pastor: true,
    children: [
      { id: "prayer-inbox", to: "/admin/prayer", label: "Requests", icon: "HandHeart", end: true, feature: "prayer.inbox" },
      { id: "prayer-pastors", to: "/admin/prayer/pastors", label: "Pastors", icon: "Users", end: true, feature: "prayer.pastors", action: "edit", hideForPastor: true },
      { id: "prayer-page", to: "/admin/pages/prayer", label: "Page content", icon: "FileText", end: true, feature: "prayer", hideForPastor: true },
    ],
  },
  {
    id: "banners",
    label: "Banners",
    icon: "Flag",
    matchPrefix: "/admin/banners",
    anyOf: [{ feature: "banners" }, { feature: "home.announcements" }],
    children: [
      { id: "banners-manage", to: "/admin/banners", label: "Manage", icon: "Plus", end: true, feature: "banners" },
      { id: "banners-analytics", to: "/admin/banners/analytics", label: "Analytics", icon: "BarChart3", end: true, feature: "banners" },
      { id: "banners-activity", to: "/admin/banners/activity", label: "Activity log", icon: "ScrollText", end: true, feature: "banners" },
    ],
  },
  {
    id: "registrations",
    label: "Registrations",
    icon: "ClipboardList",
    matchPrefix: "/admin/registrations",
    anyOf: [
      { feature: "program_registrations" },
      { feature: "volunteer_applications" },
      { feature: "church_members" },
      { feature: "form_dropdowns" },
    ],
    children: [
      {
        id: "reg-programs",
        label: "Programs",
        icon: "CalendarDays",
        matchPrefix: "/admin/registrations/programs",
        feature: "program_registrations",
        children: [
          { id: "reg-programs-all", to: "/admin/registrations/programs", label: "All programs", icon: "ClipboardList", end: true, feature: "program_registrations" },
        ],
      },
      {
        id: "reg-volunteers",
        label: "Volunteers",
        icon: "Video",
        matchPrefix: "/admin/registrations/volunteers",
        feature: "volunteer_applications",
        children: [
          { id: "reg-volunteers-apps", to: "/admin/registrations/volunteers", label: "Applications", icon: "UserPlus", end: true, feature: "volunteer_applications", badgeKey: "volunteer_unseen" },
          { id: "reg-volunteers-audit", to: "/admin/registrations/volunteers/audit", label: "Audit log", icon: "ScrollText", end: true, feature: "volunteer_applications" },
        ],
      },
      {
        id: "reg-members",
        label: "Church membership",
        icon: "Church",
        anyOf: [{ feature: "church_members" }, { feature: "form_dropdowns" }],
        children: [
          { id: "reg-members-pending", to: "/admin/registrations/members/pending", label: "Pending", icon: "Clock", end: true, feature: "church_members", badgeKey: "members_pending" },
          { id: "reg-members-approved", to: "/admin/registrations/members/approved", label: "Approved", icon: "CheckCircle2", end: true, feature: "church_members", badgeKey: "members_approved" },
          { id: "reg-members-list", to: "/admin/registrations/members", label: "All members", icon: "Users", end: true, feature: "church_members" },
          { id: "reg-form-options", to: "/admin/registrations/form-options", label: "Form dropdowns", icon: "List", end: true, anyOf: [{ feature: "form_dropdowns" }, { feature: "church_members" }] },
        ],
      },
    ],
  },
  {
    id: "programs",
    label: "Programs",
    icon: "CalendarDays",
    matchPrefix: "/admin/programs",
    anyOf: [
      { feature: "programs" },
      { feature: "program_types" },
      { feature: "church_branches" },
      { feature: "church_roles" },
      { feature: "member_notifications" },
    ],
    children: [
      { id: "programs-new", to: "/admin/programs/new", label: "New event page", icon: "Plus", end: true, feature: "programs", action: "edit" },
      { id: "programs-all", to: "/admin/programs", label: "All programs", icon: "CalendarDays", end: true, feature: "programs" },
      { id: "programs-types", to: "/admin/programs/types", label: "Program types", icon: "Layers", end: true, feature: "program_types" },
      { id: "programs-branches", to: "/admin/programs/branches", label: "Branches & districts", icon: "Church", end: true, feature: "church_branches" },
      { id: "programs-roles", to: "/admin/programs/roles", label: "Church roles", icon: "Shield", end: true, feature: "church_roles" },
      { id: "programs-notify", to: "/admin/programs/notifications", label: "Member announcements", icon: "Megaphone", end: true, feature: "member_notifications" },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    icon: "Wrench",
    matchPrefix: "/admin/utilities",
    anyOf: [{ feature: "utilities" }, { feature: "church_meetings" }],
    children: [
      { id: "util-meetings", to: "/admin/utilities/meetings", label: "Meetings", icon: "Video", end: true, feature: "church_meetings" },
      { id: "util-speech", to: "/admin/utilities/speech", label: "Speech to text", icon: "Mic", end: true, feature: "utilities" },
      { id: "util-notes", to: "/admin/utilities/notes", label: "Notes & diary", icon: "StickyNote", end: true, feature: "utilities" },
      { id: "util-translate", to: "/admin/utilities/translate", label: "Translate", icon: "Languages", end: true, feature: "utilities" },
      { id: "util-text", to: "/admin/utilities/text", label: "Text tools", icon: "Type", end: true, feature: "utilities" },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: "Inbox",
    matchPrefix: "/admin/approvals",
    allAdmins: true,
    children: [
      { id: "approvals-mine", to: "/admin/approvals/mine", label: "My requests", icon: "Send", end: false, allAdmins: true, badgeKey: "my_requests_pending" },
      { id: "approvals-all", to: "/admin/approvals", label: "Inbox", icon: "Inbox", end: true, feature: "approvals", badgeKey: "approvals_pending" },
      { id: "approvals-members", to: "/admin/approvals/church_members", label: "Members", icon: "Users", end: true, feature: "approvals" },
      { id: "approvals-programs-reg", to: "/admin/approvals/program_registrations", label: "Program sign-ups", icon: "ClipboardList", end: true, feature: "approvals" },
      { id: "approvals-volunteers", to: "/admin/approvals/volunteer_applications", label: "Volunteers", icon: "UserPlus", end: true, feature: "approvals" },
      { id: "approvals-branches", to: "/admin/approvals/church_branches", label: "Branches", icon: "Church", end: true, feature: "approvals" },
      { id: "approvals-roles", to: "/admin/approvals/church_roles", label: "Roles", icon: "Shield", end: true, feature: "approvals" },
      { id: "approvals-programs", to: "/admin/approvals/church_programs", label: "Programs", icon: "CalendarDays", end: true, feature: "approvals" },
      { id: "approvals-banners", to: "/admin/approvals/announcements", label: "Banners", icon: "Flag", end: true, feature: "approvals" },
    ],
  },
  {
    id: "activity",
    to: "/admin/activity",
    label: "Activity log",
    icon: "ScrollText",
    superadmin: true,
  },
  {
    id: "admins",
    to: "/admin/admins",
    label: "Admins",
    icon: "Shield",
    superadmin: true,
  },
];

export function pathMatches(pathname, matchPrefix) {
  if (!matchPrefix) return false;
  const prefixes = Array.isArray(matchPrefix) ? matchPrefix : [matchPrefix];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Attach live program registration items (FFIEYC, future events) under Registrations → Programs. */
export function withProgramRegistrationNav(nav, programNav = []) {
  const items = Array.isArray(programNav) ? programNav : [];
  return (nav || []).map((node) => {
    if (node.id !== "registrations") return node;
    return {
      ...node,
      children: (node.children || []).map((child) => {
        if (child.id !== "reg-programs") return child;
        return {
          ...child,
          children: [
            ...(child.children || []),
            ...items.map((p) => ({
              id: `reg-program-${p.id}`,
              to: `/admin/registrations/programs/${p.id}`,
              label: p.short_code || p.title,
              icon: "CalendarDays",
              end: true,
              feature: "program_registrations",
              badgeKey: `program_reg_${p.id}`,
            })),
          ],
        };
      }),
    };
  });
}

export function flattenNavLeaves(nodes, acc = []) {
  (nodes || []).forEach((node) => {
    if (node.children?.length) flattenNavLeaves(node.children, acc);
    else if (node.to) acc.push(node);
  });
  return acc;
}
