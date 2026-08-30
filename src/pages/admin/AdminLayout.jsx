import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { SITE_PAGES } from "../../data/sitePages";
import { ADMIN_NAV, withProgramRegistrationNav } from "../../data/adminNav";
import { NestedNav, flattenVisibleLeaves } from "../../components/admin/NestedNav";
import { AdminCountsProvider, useAdminCounts } from "../../context/AdminCountsContext";
import { AdminActivityTracker } from "../../components/AdminActivityTracker";
import {
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
  Users,
  Mail,
} from "lucide-react";

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
  join: Users,
};

function ChurchLogo({ src, className }) {
  return <img src={src} alt="Fire-Fire church logo" className={className} />;
}

function WebsitePagesNav({ pages }) {
  const items = [
    {
      id: "website",
      label: "Website pages",
      icon: "Globe",
      children: pages.map((page) => ({
        id: `page-${page.key}`,
        to: page.to,
        label: page.label,
        icon: page.iconName || "FileText",
        end: true,
      })),
    },
  ];
  return <NestedNav items={items} can={() => true} isSuperadmin={false} isPastor={false} />;
}

const PAGE_ICON_NAMES = {
  home: "Home",
  about: "BookOpen",
  services: "Church",
  leadership: "Users",
  ministries: "Users",
  events: "Calendar",
  sermons: "Mic",
  blog: "FileText",
  testimonies: "Quote",
  contact: "Mail",
  prayer: "HandHeart",
  donate: "HeartHandshake",
  join: "Users",
};

export default function AdminLayout() {
  return (
    <AdminCountsProvider>
      <AdminLayoutInner />
    </AdminCountsProvider>
  );
}

function AdminLayoutInner() {
  const { user, isSuperadmin, can, logout } = useAuth();
  const { settings } = useSettings();
  const { counts } = useAdminCounts();
  const navigate = useNavigate();
  const isPastor = user?.role === "pastor";
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

  const navItems = withProgramRegistrationNav(ADMIN_NAV, counts.program_nav);
  const navCtx = { can, isSuperadmin, isPastor };
  const visiblePages = isPastor
    ? []
    : SITE_PAGES.filter((page) => page.key !== "prayer" && can(page.key, "view")).map((page) => ({
        to: page.path,
        label: page.label,
        icon: pageIcons[page.key] || CalendarDays,
        iconName: PAGE_ICON_NAMES[page.key] || "FileText",
        key: page.key,
      }));

  const mobileLinks = [
    ...flattenVisibleLeaves(navItems, navCtx),
    ...visiblePages.map((page) => ({ to: page.to, label: page.label, end: true })),
  ];

  return (
    <div className="h-screen overflow-hidden bg-gray-50 text-gray-900 flex" data-testid="admin-dashboard">
      <aside className="hidden md:flex w-64 shrink-0 h-screen flex-col bg-gray-950 text-white">
        <div className="shrink-0 px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <ChurchLogo src={settings.logo} className="h-11 w-11 rounded-full object-cover bg-white p-0.5" />
          <div>
            <div className="font-bold leading-none">Fire-Fire</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-red-400 mt-1">Admin</div>
          </div>
        </div>
        <nav className="flex-1 min-h-0 px-3 py-5 overflow-y-auto overscroll-contain space-y-5">
          <NestedNav items={navItems} can={can} isSuperadmin={isSuperadmin} isPastor={isPastor} badges={counts} />
          {visiblePages.length > 0 && <WebsitePagesNav pages={visiblePages} />}
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
            <ChurchLogo src={settings.logo} className="h-8 w-8 rounded-full object-cover bg-white p-0.5" /> FFIEMC Admin
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
              <button type="button" className="px-4 py-2 text-sm rounded-md border" onClick={() => setPwdOpen(false)}>
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
