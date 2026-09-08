import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Wifi, WifiOff, SignalLow, SignalMedium, SignalHigh, X } from "lucide-react";

function readConnection() {
  if (typeof navigator === "undefined") return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

function classifyQuality(online, conn) {
  if (!online) {
    return {
      level: "offline",
      label: "You're offline",
      detail: "Check your internet connection. Some actions may not save until you're back online.",
      tone: "danger",
    };
  }
  const type = String(conn?.effectiveType || "").toLowerCase();
  const downlink = Number(conn?.downlink);
  const rtt = Number(conn?.rtt);
  const saveData = Boolean(conn?.saveData);

  if (type === "slow-2g" || type === "2g" || (Number.isFinite(downlink) && downlink > 0 && downlink < 0.5) || (Number.isFinite(rtt) && rtt > 2000)) {
    return {
      level: "poor",
      label: "Very slow connection",
      detail: saveData
        ? "Network is very weak and data saver is on. Pages and uploads may fail or take a long time."
        : "Network quality is poor (2G-level). Expect delays loading pages, videos, and admin tools.",
      tone: "danger",
    };
  }
  if (type === "3g" || (Number.isFinite(downlink) && downlink > 0 && downlink < 1.5) || (Number.isFinite(rtt) && rtt > 800)) {
    return {
      level: "fair",
      label: "Weak connection",
      detail: "Network is usable but slow (about 3G). Large uploads and video previews may struggle.",
      tone: "warn",
    };
  }
  if (type === "4g" || type === "5g" || !type) {
    return {
      level: "good",
      label: "Back online",
      detail: type ? `Connection looks good (${type.toUpperCase()}).` : "Your connection is active again.",
      tone: "ok",
    };
  }
  return {
    level: "good",
    label: "Connection stable",
    detail: "Network looks healthy.",
    tone: "ok",
  };
}

const ICONS = {
  offline: WifiOff,
  poor: SignalLow,
  fair: SignalMedium,
  good: SignalHigh,
};

/**
 * Global network status: toasts offline/online and shows a banner for offline / poor / fair quality.
 */
export function NetworkStatus() {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [quality, setQuality] = useState(() => classifyQuality(typeof navigator !== "undefined" ? navigator.onLine : true, readConnection()));
  const [bannerOpen, setBannerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const prevLevel = useRef(quality.level);
  const toastTimer = useRef(null);

  const refresh = useCallback(() => {
    const on = typeof navigator !== "undefined" ? navigator.onLine : true;
    const next = classifyQuality(on, readConnection());
    setOnline(on);
    setQuality(next);
    return next;
  }, []);

  const showToast = useCallback((payload) => {
    setToast(payload);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      const next = refresh();
      showToast({ ...next, label: "You're back online", tone: "ok" });
      setBannerOpen(false);
    };
    const onOffline = () => {
      const next = refresh();
      showToast(next);
      setBannerOpen(true);
    };
    const onConnChange = () => {
      const next = refresh();
      const prev = prevLevel.current;
      prevLevel.current = next.level;
      if (next.level === "offline") {
        setBannerOpen(true);
        if (prev !== "offline") showToast(next);
        return;
      }
      if (next.level === "poor" || next.level === "fair") {
        setBannerOpen(true);
        if (prev !== next.level) showToast(next);
        return;
      }
      if (prev === "offline" || prev === "poor" || prev === "fair") {
        showToast({ ...next, label: "Connection improved" });
        setBannerOpen(false);
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const conn = readConnection();
    conn?.addEventListener?.("change", onConnChange);

    const initial = refresh();
    prevLevel.current = initial.level;
    if (initial.level === "offline" || initial.level === "poor" || initial.level === "fair") {
      setBannerOpen(true);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      conn?.removeEventListener?.("change", onConnChange);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [refresh, showToast]);

  if (typeof document === "undefined") return null;

  const showBanner = bannerOpen && (quality.level === "offline" || quality.level === "poor" || quality.level === "fair");
  const BannerIcon = ICONS[quality.level] || Wifi;
  const ToastIcon = toast ? ICONS[toast.level] || Wifi : Wifi;

  const bannerTone =
    quality.tone === "danger"
      ? "bg-red-700 text-white"
      : quality.tone === "warn"
        ? "bg-amber-500 text-zinc-950"
        : "bg-emerald-600 text-white";

  const toastTone =
    toast?.tone === "danger"
      ? "bg-red-700 text-white border-red-800"
      : toast?.tone === "warn"
        ? "bg-amber-500 text-zinc-950 border-amber-600"
        : "bg-emerald-600 text-white border-emerald-700";

  return createPortal(
    <>
      {showBanner ? (
        <div
          className={`fixed top-0 inset-x-0 z-[100] ${bannerTone} shadow-lg`}
          role="status"
          aria-live="polite"
          data-testid="network-status-banner"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-start sm:items-center gap-3">
            <BannerIcon className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{quality.label}</p>
              <p className="text-xs opacity-90 leading-snug">{quality.detail}</p>
            </div>
            {online ? (
              <button
                type="button"
                className="rounded-full p-1.5 hover:bg-black/10 transition-colors shrink-0"
                onClick={() => setBannerOpen(false)}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed z-[110] left-4 right-4 sm:left-auto sm:right-4 sm:w-[22rem] bottom-4 rounded-2xl border shadow-2xl px-4 py-3 flex gap-3 ${toastTone}`}
          role="alert"
          data-testid="network-status-toast"
        >
          <ToastIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-sm">{toast.label}</p>
            <p className="text-xs opacity-90 mt-0.5 leading-snug">{toast.detail}</p>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}

export default NetworkStatus;
