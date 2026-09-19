import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const HEARTBEAT_MS = 20000;

/** Logs admin navigation and keeps an online-presence heartbeat. */
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
      .catch(() => {});

    authApi.presenceHeartbeat(pathname).catch(() => {});
  }, [pathname, user]);

  useEffect(() => {
    if (!user || user === false) return undefined;
    if (!pathname.startsWith("/admin")) return undefined;

    const beat = () => {
      if (document.visibilityState === "hidden") return;
      authApi.presenceHeartbeat(pathname).catch(() => {});
    };

    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname, user]);

  return null;
}

export default AdminActivityTracker;
