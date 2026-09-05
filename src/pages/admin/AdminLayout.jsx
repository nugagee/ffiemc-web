import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { SITE_PAGES } from "../../data/sitePages";
import { ADMIN_NAV, withProgramRegistrationNav } from "../../data/adminNav";
import { NestedNav } from "../../components/admin/NestedNav";
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
  Shield,
  ScrollText,
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
  privacy: Shield,
  terms: ScrollText,
};

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
  privacy: "Shield",
  terms: "ScrollText",
};

function ChurchLogo({ src, className }) {
  return <img src={src} alt="Fire-Fire church logo" className={className} />;
}

function WebsitePagesNav({ pages, onNavigate }) {
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
  return (
    <NestedNav
      items={items}
      can={() => true}
      isSuperadmin={false}
      isPastor={false}
      onNavigate={onNavigate}
    />
  );
}

function SidebarBody({
  settings,
  navItems,
  visiblePages,
  can,
  isSuperadmin,
  isPastor,
  counts,
  user,
  onLogout,
  onChangePassword,
  onNavigate,
  showClose,
  onClose,
}) {
  return (
    <>
      <div className="shrink-0 px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <ChurchLogo src={settings.logo} className="h-10 w-10 rounded-full object-cover bg-white p-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-none truncate">Fire-Fire</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-red-400 mt-1">Admin</div>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 min-h-0 px-3 py-4 overflow-y-auto overscroll-contain space-y-5">
        <NestedNav
          items={navItems}
          can={can}
          isSuperadmin={isSuperadmin}
          isPastor={isPastor}
          badges={counts}
          onNavigate={onNavigate}
        />
        {visiblePages.length > 0 && <WebsitePagesNav pages={visiblePages} onNavigate={onNavigate} />}
      </nav>
      <div className="shrink-0 px-5 py-5 border-t border-white/10 space-y-3">
        <div>
          <div className="text-sm text-white/80 truncate">{user?.username || user?.email}</div>
          <div className="text-[10px] uppercase tracking-widest text-red-400 mt-1">{user?.role}</div>
        </div>
        <button
          type="button"
          onClick={onChangePassword}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <KeyRound size={14} /> Change password
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const onLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const openPassword = () => {
    setPwd("");
    setPwd2("");
    setPwdError("");
    setMenuOpen(false);
    setPwdOpen(true);
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
  const visiblePages = isPastor
    ? []
    : SITE_PAGES.filter((page) => page.key !== "prayer" && can(page.key, "view")).map((page) => ({
        to: page.path,
        label: page.label,
        icon: pageIcons[page.key] || CalendarDays,
        iconName: PAGE_ICON_NAMES[page.key] || "FileText",
        key: page.key,
      }));

  const sidebarProps = {
    settings,
    navItems,
    visiblePages,
    can,
    isSuperadmin,
    isPastor,
    counts,
    user,
    onLogout,
    onChangePassword: openPassword,
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 text-gray-900 flex" data-testid="admin-dashboard">
      <aside className="hidden md:flex w-64 shrink-0 h-[100dvh] flex-col bg-gray-950 text-white">
        <SidebarBody {...sidebarProps} />
      </aside>

      <div className="flex-1 min-w-0 h-[100dvh] overflow-y-auto">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-3 py-2.5 bg-gray-950 text-white border-b border-white/10">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <ChurchLogo src={settings.logo} className="h-8 w-8 rounded-full object-cover bg-white p-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">FFIEMC Admin</div>
              <div className="text-[10px] uppercase tracking-wider text-white/50 truncate">{user?.role}</div>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {menuOpen ? (
            <div className="md:hidden fixed inset-0 z-40">
              <motion.button
                type="button"
                aria-label="Close menu backdrop"
                className="absolute inset-0 bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] bg-gray-950 text-white shadow-2xl flex flex-col"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <SidebarBody
                  {...sidebarProps}
                  showClose
                  onClose={() => setMenuOpen(false)}
                  onNavigate={() => setMenuOpen(false)}
                />
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>

        <main className="admin-main px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8 min-w-0 overflow-x-hidden">
          <AdminActivityTracker />
          <Outlet />
        </main>
      </div>

      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl space-y-4 mb-[env(safe-area-inset-bottom)]">
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
