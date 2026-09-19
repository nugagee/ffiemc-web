import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Public pages: scroll to top on route change.
 * Hash links (e.g. /about#history, /leadership#youth-escos) keep the section in view.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname === "/login") return undefined;

    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      if (!id) return undefined;

      let cancelled = false;
      let attempts = 0;
      let timerId = 0;

      const tryScroll = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return true;
        }
        attempts += 1;
        if (attempts < 40) {
          timerId = window.setTimeout(tryScroll, 50);
        }
        return false;
      };

      // Let the new page paint first, then seek the section (shared church-group links).
      timerId = window.setTimeout(tryScroll, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timerId);
      };
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [pathname, hash]);

  return null;
}
