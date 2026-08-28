import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageVisit } from "../lib/api";
import { getSessionId, getVisitorId } from "../lib/tracking";

export function VisitorTracker() {
  const { pathname } = useLocation();
  const lastPath = useRef("");

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname === "/login" || pathname.startsWith("/blog/preview")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    trackPageVisit({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    });
  }, [pathname]);

  return null;
}
