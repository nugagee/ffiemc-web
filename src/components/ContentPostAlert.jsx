import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Bell, BookOpen, Church, Mic2, Newspaper, Sun, X } from "lucide-react";
import { useContentAlerts } from "../hooks/useContentAlerts";
import { dismissContentAlert, filterUndismissedAlerts } from "../lib/contentAlerts";
import { Button } from "./ui/button";

const SHOW_DELAY_MS = 3500;
const DISPLAY_MS = 14000;
const BETWEEN_MS = 1000;

const KIND_ICON = {
  blog_post: Newspaper,
  sunday_sermon: Church,
  choir_ministration: Mic2,
  bible_study: BookOpen,
  daily_manna: Sun,
};

function formatWhen(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Timed "New Post Alert" toast for recent blog / Sunday sermon / choir / study posts.
 * X dismisses for that visitor (local). Open navigates to the post.
 */
export function ContentPostAlert() {
  const location = useLocation();
  const { alerts, setAlerts } = useContentAlerts();
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const isAdmin =
    location.pathname.startsWith("/admin") || location.pathname === "/login";
  const queue = useMemo(() => filterUndismissedAlerts(alerts), [alerts]);
  const current = !isAdmin ? queue[index] || null : null;

  useEffect(() => {
    if (isAdmin) {
      setReady(false);
      setVisible(false);
      return undefined;
    }
    setReady(false);
    setVisible(false);
    setIndex(0);
    const t = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [location.pathname, isAdmin]);

  useEffect(() => {
    if (!ready || !current) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const hide = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => {
          if (queue.length <= 1) return i;
          return (i + 1) % queue.length;
        });
      }, BETWEEN_MS);
    }, DISPLAY_MS);
    return () => window.clearTimeout(hide);
  }, [ready, current?.id, queue.length]);

  const dismissCurrent = () => {
    if (!current?.id) return;
    dismissContentAlert(current.id);
    const nextQueue = filterUndismissedAlerts(alerts.filter((a) => a.id !== current.id));
    setAlerts(nextQueue);
    setVisible(false);
    window.setTimeout(() => {
      setIndex(0);
      if (nextQueue.length) setVisible(true);
      else setReady(false);
    }, BETWEEN_MS);
  };

  if (!current) return null;

  const Icon = KIND_ICON[current.kind] || Bell;
  const when = formatWhen(current.published_at);
  const href = current.link_path || "/blog";

  const card = (
    <div
      className={`fixed z-[70] left-3 right-3 sm:left-auto sm:right-5 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:w-[min(100%,24rem)] transition-all duration-300 ${
        visible && ready
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3 pointer-events-none"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl shadow-red-950/15 ring-1 ring-black/5">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />
        <button
          type="button"
          aria-label="Dismiss notification"
          className="absolute top-2.5 right-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          onClick={dismissCurrent}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="p-4 pr-11 pt-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              <Bell className="h-3 w-3" />
              {current.badge || "New Post Alert"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700/80">
              <Icon className="h-3.5 w-3.5" />
              {current.kind_label || "Update"}
            </span>
          </div>

          <p className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">
            {current.title}
          </p>
          {current.description ? (
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed line-clamp-2">
              {current.description}
            </p>
          ) : null}
          {when ? <p className="mt-2 text-[11px] text-gray-400">{when}</p> : null}

          <div className="mt-3 flex items-center gap-2">
            <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-full">
              <Link to={href} onClick={dismissCurrent}>
                Open
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            {queue.length > 1 ? (
              <span className="text-[11px] text-gray-400">
                {Math.min(index + 1, queue.length)} of {queue.length}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return card;
  return createPortal(card, document.body);
}

export default ContentPostAlert;
