import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Bell, BookOpen, Church, Mic2, Newspaper, Sun, X } from "lucide-react";
import { useContentAlerts } from "../hooks/useContentAlerts";
import { dismissContentAlert, filterUndismissedAlerts } from "../lib/contentAlerts";
import { Button } from "./ui/button";

const SHOW_DELAY_MS = 3500;
const DISPLAY_MS = 10000;
const BETWEEN_MS = 700;
const MAX_ROTATE = 3;

const KIND_ICON = {
  blog_post: Newspaper,
  sunday_sermon: Church,
  choir_ministration: Mic2,
  bible_study: BookOpen,
  daily_manna: Sun,
};

/**
 * Compact timed "New Post Alert" — rotates through the 3 newest, then auto-hides.
 */
export function ContentPostAlert() {
  const location = useLocation();
  const { alerts, setAlerts } = useContentAlerts();
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [finished, setFinished] = useState(false);
  const advancing = useRef(false);

  const isAdmin =
    location.pathname.startsWith("/admin") || location.pathname === "/login";

  const queue = useMemo(
    () => filterUndismissedAlerts(alerts).slice(0, MAX_ROTATE),
    [alerts]
  );
  const current = !isAdmin && !finished ? queue[index] || null : null;

  useEffect(() => {
    if (isAdmin) {
      setReady(false);
      setVisible(false);
      setFinished(false);
      return undefined;
    }
    setReady(false);
    setVisible(false);
    setFinished(false);
    setIndex(0);
    advancing.current = false;
    const t = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [location.pathname, isAdmin]);

  useEffect(() => {
    if (!ready || finished || !current) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    advancing.current = false;
    const hide = window.setTimeout(() => {
      if (advancing.current) return;
      advancing.current = true;
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => {
          if (i + 1 >= queue.length) {
            setFinished(true);
            setReady(false);
            return i;
          }
          return i + 1;
        });
        advancing.current = false;
      }, BETWEEN_MS);
    }, DISPLAY_MS);
    return () => window.clearTimeout(hide);
  }, [ready, finished, current?.id, queue.length]);

  const dismissCurrent = () => {
    if (!current?.id) return;
    dismissContentAlert(current.id);
    const remaining = filterUndismissedAlerts(alerts.filter((a) => a.id !== current.id)).slice(
      0,
      MAX_ROTATE
    );
    setAlerts(remaining);
    setVisible(false);
    window.setTimeout(() => {
      if (!remaining.length || index >= remaining.length - 1) {
        setFinished(true);
        setReady(false);
        setIndex(0);
        return;
      }
      setIndex((i) => Math.min(i, remaining.length - 1));
    }, BETWEEN_MS);
  };

  if (!current) return null;

  const Icon = KIND_ICON[current.kind] || Bell;
  const href = current.link_path || "/blog";

  const card = (
    <div
      className={`fixed z-[70] left-2 right-2 sm:left-auto sm:right-5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:w-[min(100%,22rem)] max-w-[calc(100vw-1rem)] transition-all duration-300 ${
        visible && ready
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3 pointer-events-none"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-red-100 bg-white/95 backdrop-blur-sm shadow-xl shadow-red-950/10 ring-1 ring-black/5">
        <div className="absolute inset-x-0 top-0 h-0.5 sm:h-1 bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />
        <button
          type="button"
          aria-label="Dismiss notification"
          className="absolute top-1.5 right-1.5 z-10 inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          onClick={dismissCurrent}
        >
          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>

        <div className="flex gap-2.5 p-2.5 pr-9 sm:p-3.5 sm:pr-11 sm:pt-3.5">
          <div className="hidden sm:flex shrink-0 h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                <Bell className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                New Post
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-red-700/80 truncate max-w-[9rem] sm:max-w-none">
                {current.kind_label || "Update"}
              </span>
              {queue.length > 1 ? (
                <span className="text-[10px] text-gray-400 ml-auto sm:ml-0">
                  {index + 1}/{queue.length}
                </span>
              ) : null}
            </div>

            <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug line-clamp-1 sm:line-clamp-2">
              {current.title}
            </p>
            {current.description ? (
              <p className="hidden sm:block text-sm text-gray-600 leading-relaxed line-clamp-2">
                {current.description}
              </p>
            ) : null}

            <div className="pt-0.5">
              <Button
                asChild
                size="sm"
                className="h-7 sm:h-8 px-3 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white rounded-full"
              >
                <Link to={href} onClick={dismissCurrent}>
                  Open
                  <ArrowRight className="ml-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return card;
  return createPortal(card, document.body);
}

export default ContentPostAlert;
