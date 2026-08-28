import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Mail,
  Shield,
  LogOut,
  Home,
  BookOpen,
  CalendarDays,
  Mic,
  FileText,
  Quote,
  HandHeart,
  HeartHandshake,
  Church,
  Calendar,
  ChevronDown,
  Plus,
  Newspaper,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { SITE_PAGES } from "../../data/sitePages";
import { useSettings } from "../../context/SettingsContext";
import { AdminActivityTracker } from "../../components/AdminActivityTracker";

const dashboardTop = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, feature: "overview" },
  { to: "/admin/visitors", label: "Visitors", icon: Users, feature: "visitors" },
  { to: "/admin/contacts", label: "Messages", icon: Mail, feature: "contacts" },
];

const dashboardBottom = [
  { to: "/admin/activity", label: "Activity log", icon: ScrollText, superadmin: true },
  { to: "/admin/admins", label: "Admins", icon: Shield, superadmin: true },
];

const blogChildren = [
  { to: "/admin/blog/new", label: "Create new post", icon: Plus, end: true },
  { to: "/admin/blog", label: "All posts", icon: Newspaper, end: true },
];

const prayerChildren = [
  { to: "/admin/prayer", label: "Requests", icon: HandHeart, end: true },
  { to: "/admin/prayer/pastors", label: "Pastors", icon: Users, end: true },
  { to: "/admin/pages/prayer", label: "Page content", icon: FileText, end: true },
];

const pageIcons = {
  home: Home,
  about: BookOpen,
  services: Church,
  leadership: Users,
  ministries: Users,
  events: Calendar,
  sermons: Mic,
  blog: FileText,
  testimonies: Quote,
  contact: Mail,
  prayer: HandHeart,
  donate: HeartHandshake,
};

function ChurchLogo({ className }) {
  const { settings } = useSettings();
  const src = settings.logo;
  return <img src={src} alt="Fire-Fire church logo" className={className} />;
}

function LinkItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
          isActive ? "bg-red-600 text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icon size={16} />
      {item.label}
    </NavLink>
  );
}

function BlogNav({ canEdit }) {
  const location = useLocation();
  const onBlog = location.pathname === "/admin/blog" || location.pathname.startsWith("/admin/blog/");
  const [open, setOpen] = useState(onBlog);

  useEffect(() => {
    if (onBlog) setOpen(true);
  }, [onBlog]);

  const items = canEdit ? blogChildren : blogChildren.filter((item) => item.to === "/admin/blog");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
          onBlog ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <FileText size={16} />
        <span className="flex-1 text-left">Blog</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isEditRoute = /\/admin\/blog\/[^/]+\/edit$/.test(location.pathname);
                const active =
                  item.to === "/admin/blog"
                    ? location.pathname === "/admin/blog" || isEditRoute
                    : location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                      active ? "bg-red-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrayerNav({ isPastor, canManagePastors, canEditPage }) {
  const location = useLocation();
  const onPrayer =
    location.pathname === "/admin/prayer" ||
    location.pathname.startsWith("/admin/prayer/") ||
    location.pathname === "/admin/pages/prayer";
  const [open, setOpen] = useState(onPrayer);

  useEffect(() => {
    if (onPrayer) setOpen(true);
  }, [onPrayer]);

  const items = prayerChildren.filter((item) => {
    if (item.to === "/admin/prayer") return true;
    if (item.to === "/admin/prayer/pastors") return canManagePastors && !isPastor;
    if (item.to === "/admin/pages/prayer") return canEditPage && !isPastor;
    return false;
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
          onPrayer ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <HandHeart size={16} />
        <span className="flex-1 text-left">Prayer</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-2">
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/admin/prayer"
                    ? location.pathname === "/admin/prayer"
                    : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                      active ? "bg-red-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminLayout() {
  const { user, isSuperadmin, can, logout } = useAuth();
  const navigate = useNavigate();
  const showBlog = can("blog.posts", "edit") || can("blog.posts", "delete");
  const isPastor = user?.role === "pastor";
  const showPrayer =
    isPastor ||
    can("prayer.inbox", "view") ||
    can("prayer.inbox", "edit") ||
    can("prayer", "view");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const savePassword = async () => {
    setPwdError("");
    if (pwd.length < 8) {
      setPwdError("Password must be at least 8 characters");
      return;
    }
    if (pwd !== pwd2) {
      setPwdError("Passwords do not match");
      return;
    }
    setPwdSaving(true);
    try {
      const { authApi } = await import("../../lib/api");
      await authApi.changeOwnPassword(user.id, pwd);
      setPwdOpen(false);
      setPwd("");
      setPwd2("");
      const { toast } = await import("sonner");
      toast.success("Password updated");
    } catch (err) {
      setPwdError(err.message || "Could not update password");
    } finally {
      setPwdSaving(false);
    }
  };

  const visibleTop = isPastor ? [] : dashboardTop.filter((item) => can(item.feature, "view"));
  const visibleBottom = isPastor
    ? []
    : dashboardBottom.filter((item) => (item.superadmin ? isSuperadmin : can(item.feature, "view")));
  const visiblePages = isPastor
    ? []
    : SITE_PAGES.filter((page) => page.key !== "prayer" && can(page.key, "view")).map((page) => ({
        to: page.path,
        label: page.label,
        icon: pageIcons[page.key] || CalendarDays,
      }));

  const mobileLinks = [
    ...visibleTop,
    ...(showBlog
      ? [
          { to: "/admin/blog/new", label: "New post", end: true },
          { to: "/admin/blog", label: "Blog posts", end: true },
        ].filter((item) => item.to !== "/admin/blog/new" || can("blog.posts", "edit"))
      : []),
    ...(showPrayer
      ? [
          { to: "/admin/prayer", label: "Prayer requests", end: true },
          ...(!isPastor && (can("prayer.pastors", "edit") || isSuperadmin)
            ? [{ to: "/admin/prayer/pastors", label: "Pastors", end: true }]
            : []),
          ...(!isPastor && can("prayer", "view")
            ? [{ to: "/admin/pages/prayer", label: "Prayer page", end: true }]
            : []),
        ]
      : []),
    ...visibleBottom,
    ...visiblePages,
  ];

  return (
    <div className="h-screen overflow-hidden bg-gray-50 text-gray-900 flex" data-testid="admin-dashboard">
      <aside className="hidden md:flex w-64 shrink-0 h-screen flex-col bg-gray-950 text-white">
        <div className="shrink-0 px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <ChurchLogo className="h-11 w-11 rounded-full object-cover bg-white p-0.5" />
          <div>
            <div className="font-bold leading-none">Fire-Fire</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-red-400 mt-1">Admin</div>
          </div>
        </div>
        <nav className="flex-1 min-h-0 px-3 py-5 overflow-y-auto overscroll-contain space-y-5">
          <div className="space-y-1">
            {visibleTop.map((item) => (
              <LinkItem key={item.to} item={item} />
            ))}
            {showBlog && <BlogNav canEdit={can("blog.posts", "edit")} />}
            {showPrayer && (
              <PrayerNav
                isPastor={isPastor}
                canManagePastors={isSuperadmin || can("prayer.pastors", "edit")}
                canEditPage={can("prayer", "view")}
              />
            )}
            {visibleBottom.map((item) => (
              <LinkItem key={item.to} item={item} />
            ))}
          </div>
          {visiblePages.length > 0 && (
            <div>
              <p className="px-4 mb-2 text-[10px] uppercase tracking-widest text-white/35">Website pages</p>
              <div className="space-y-1">
                {visiblePages.map((item) => (
                  <LinkItem key={item.to} item={item} />
                ))}
              </div>
            </div>
          )}
        </nav>
        <div className="shrink-0 px-6 py-6 border-t border-white/10">
          <div className="text-sm text-white/80 truncate">{user?.username || user?.email}</div>
          <div className="text-[10px] uppercase tracking-widest text-red-400 mt-1">{user?.role}</div>
          <button
            type="button"
            onClick={() => {
              setPwd("");
              setPwd2("");
              setPwdError("");
              setPwdOpen(true);
            }}
            className="mt-4 block text-sm text-white/60 hover:text-white"
          >
            Change password
          </button>
          <button onClick={onLogout} className="mt-3 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-gray-950 text-white">
          <span className="font-bold flex items-center gap-2">
            <ChurchLogo className="h-8 w-8 rounded-full object-cover bg-white p-0.5" /> FFIEMC Admin
          </span>
          <button onClick={onLogout} className="text-sm text-white/70">
            Sign out
          </button>
        </header>
        <nav className="md:hidden sticky top-[60px] z-20 flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-gray-100">
          {mobileLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-4 py-2 rounded-full text-sm transition-colors duration-200 ${
                  isActive ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <main className="p-5 md:p-10">
          <AdminActivityTracker />
          <Outlet />
        </main>
      </div>

      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Change password</h2>
            {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <input
                type="password"
                className="w-full h-10 rounded-md border px-3 text-sm"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm password</label>
              <input
                type="password"
                className="w-full h-10 rounded-md border px-3 text-sm"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-md border"
                onClick={() => setPwdOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white"
                disabled={pwdSaving}
                onClick={savePassword}
              >
                {pwdSaving ? "Saving…" : "Update password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
