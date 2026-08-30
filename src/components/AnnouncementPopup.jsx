import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useActiveAnnouncements } from "../hooks/useActiveAnnouncements";
import { trackBannerEvent } from "../lib/bannerTrack";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const hideKey = (id) => `ffiemc_announcement_hide_${id}`;
const DEFAULT_POPUP_DELAY_SEC = 3;

function popupDelayMs(item) {
  const sec = Number(item?.delay_seconds);
  return Math.max(0, (Number.isFinite(sec) ? sec : DEFAULT_POPUP_DELAY_SEC) * 1000);
}

function isHiddenForever(item) {
  try {
    return Boolean(localStorage.getItem(hideKey(item.id)));
  } catch {
    return false;
  }
}

function hideForever(item) {
  try {
    localStorage.setItem(hideKey(item.id), new Date().toISOString());
  } catch {
    /* ignore */
  }
}

function orientationOf(width, height) {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (ratio < 0.9) return "portrait";
  if (ratio > 1.2) return "landscape";
  return "square";
}

export function AnnouncementPopup() {
  const location = useLocation();
  const list = useActiveAnnouncements("popup");
  const eligible = list.filter((row) => row && !isHiddenForever(row));
  const [ready, setReady] = useState(false);
  const [closedVisit, setClosedVisit] = useState({});
  const [orientation, setOrientation] = useState("unknown");
  const [dialogOpen, setDialogOpen] = useState(false);
  /** null = first popup this visit (short open); number = ms to wait before the next after Close. */
  const [betweenPopupsMs, setBetweenPopupsMs] = useState(null);

  const item = eligible.find((row) => !closedVisit[row.id]) || null;

  // Fresh homepage visit: reset visit dismissals and wait for delay before first popup.
  useEffect(() => {
    setClosedVisit({});
    setReady(false);
    setDialogOpen(false);
    setBetweenPopupsMs(null);
    const delayMs = popupDelayMs(eligible[0]);
    const t = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, eligible.map((r) => r.id).join(",")]);

  // Open current item once ready; after Close / Don't show again, wait ~3s (or that banner's delay) before the next.
  useEffect(() => {
    if (!ready || !item) {
      setDialogOpen(false);
      return undefined;
    }
    const gapMs = betweenPopupsMs == null ? 80 : betweenPopupsMs;
    const t = window.setTimeout(() => setDialogOpen(true), gapMs);
    return () => window.clearTimeout(t);
  }, [ready, item?.id, betweenPopupsMs]);

  useEffect(() => {
    setOrientation("unknown");
  }, [item?.id, item?.image]);

  useEffect(() => {
    if (dialogOpen && item) trackBannerEvent(item.id, "view");
  }, [dialogOpen, item?.id]);

  const dismissForVisit = () => {
    if (!item) return;
    setDialogOpen(false);
    // Next popup in this visit waits the configured delay (default 3s).
    setBetweenPopupsMs(popupDelayMs(item) || DEFAULT_POPUP_DELAY_SEC * 1000);
    setClosedVisit((m) => ({ ...m, [item.id]: true }));
  };

  const onClose = () => {
    if (item) trackBannerEvent(item.id, "close");
    // Close only hides for this visit — refresh shows all active banners again.
    dismissForVisit();
  };

  const onHideForever = () => {
    if (!item) return;
    hideForever(item);
    trackBannerEvent(item.id, "hide_forever");
    dismissForVisit();
  };

  const onClickCta = () => {
    if (item) trackBannerEvent(item.id, "click");
    dismissForVisit();
  };

  const onReact = (kind) => {
    if (!item) return;
    trackBannerEvent(item.id, kind === "like" ? "react_like" : "react_interested");
  };

  if (!item && !dialogOpen) return null;
  if (!item) return null;

  const link = (item.link_url || "").trim();
  const isInternal = link.startsWith("/");
  const showRoute = item.route_enabled !== false && Boolean(link);
  const dialogWidth =
    orientation === "landscape"
      ? "max-w-3xl"
      : orientation === "portrait"
        ? "max-w-md sm:max-w-lg"
        : item.image
          ? "max-w-xl"
          : "max-w-lg";

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={`p-0 overflow-hidden gap-0 sm:rounded-2xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-10 max-h-[92vh] flex flex-col ${dialogWidth}`}
      >
        {item.image ? (
          <div className="w-full bg-neutral-950 shrink-0 flex items-center justify-center">
            <img
              src={item.image}
              alt=""
              onLoad={(e) => {
                const img = e.currentTarget;
                setOrientation(orientationOf(img.naturalWidth, img.naturalHeight));
              }}
              className={`block mx-auto w-auto h-auto max-w-full object-contain ${
                orientation === "landscape"
                  ? "max-h-[min(52vh,28rem)]"
                  : orientation === "portrait"
                    ? "max-h-[min(68vh,42rem)]"
                    : "max-h-[min(60vh,34rem)]"
              }`}
            />
          </div>
        ) : null}

        <div className="p-6 space-y-4 overflow-y-auto min-h-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 pr-8">
              {item.title}
            </DialogTitle>
          </DialogHeader>
          {item.body ? (
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{item.body}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onReact("interested")}>
              I'm interested
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onReact("like")}>
              Like
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {showRoute ? (
              isInternal ? (
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <Link to={link} onClick={onClickCta}>
                    {item.link_text || "Learn more"}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <a href={link} target="_blank" rel="noreferrer" onClick={onClickCta}>
                    {item.link_text || "Learn more"}
                  </a>
                </Button>
              )
            ) : null}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost" className="text-gray-500" onClick={onHideForever}>
              Don't show again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnnouncementPopup;
