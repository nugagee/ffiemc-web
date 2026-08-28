import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

/** Logs admin navigation for the superadmin activity audit trail. */
export function AdminActivityTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const lastPath = useRef("");

  useEffect(() => {
    if (!user || user === false) return;
    if (!pathname.startsWith("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    authApi
      .logAdminActivity(pathname, "navigate", {
        title: typeof document !== "undefined" ? document.title : "",
      })
      .catch(() => {
        /* never block the UI */
      });
  }, [pathname, user]);

  return null;
}

export default AdminActivityTracker;
