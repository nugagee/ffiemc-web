import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { usePopupPriority } from "../context/PopupPriorityContext";
import {
  getMonthWelcomeConfig,
  isMonthWelcomeActive,
  monthWelcomeImage,
  monthWelcomeStorageKey,
} from "../data/monthBanner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function isHiddenForever(storageKey) {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function hideForever(storageKey) {
  try {
    localStorage.setItem(storageKey, "1");
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

export function MonthWelcomePopup() {
  const location = useLocation();
  const { settings } = useSettings();
  const { setMonthWelcomeBlocking } = usePopupPriority();
  const config = getMonthWelcomeConfig(settings);
  const storageKey = monthWelcomeStorageKey(config);
  const onHome = location.pathname === "/";
  const active = onHome && isMonthWelcomeActive(config) && !isHiddenForever(storageKey);

  const [closedVisit, setClosedVisit] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [orientation, setOrientation] = useState("unknown");

  const image = monthWelcomeImage(config);
  const title = (config.title || "").trim() || "Happy New Month";
  const body = (config.body || "").trim();
  const alt =
    (config.alt || "").trim() ||
    "Happy new month greeting from Fire-Fire International Evangelical Church";

  useEffect(() => {
    setClosedVisit(false);
    setReady(false);
    setOpen(false);
    if (!active) return undefined;
    const t = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(t);
  }, [location.pathname, active, storageKey]);

  useEffect(() => {
    const blocking = active && !closedVisit;
    setMonthWelcomeBlocking(blocking);
    return () => setMonthWelcomeBlocking(false);
  }, [active, closedVisit, setMonthWelcomeBlocking]);

  useEffect(() => {
    if (!ready || closedVisit) {
      setOpen(false);
      return undefined;
    }
    const t = window.setTimeout(() => setOpen(true), 80);
    return () => window.clearTimeout(t);
  }, [ready, closedVisit]);

  useEffect(() => {
    setOrientation("unknown");
  }, [image]);

  if (!active || closedVisit) return null;

  const dialogWidth =
    body
      ? "max-w-2xl"
      : orientation === "landscape"
        ? "max-w-3xl"
        : orientation === "portrait"
          ? "max-w-md sm:max-w-lg"
          : "max-w-xl";

  const dismiss = () => {
    setOpen(false);
    setClosedVisit(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        className={`p-0 overflow-hidden gap-0 sm:rounded-2xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-10 max-h-[92vh] flex flex-col ${dialogWidth}`}
      >
        <div className="w-full bg-neutral-950 shrink-0 flex items-center justify-center">
          <img
            src={image}
            alt={alt}
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

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 pr-8">
              {title}
            </DialogTitle>
          </DialogHeader>

          {body ? (
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
              {body}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={dismiss}>
              Close
            </Button>
            <Button
              variant="ghost"
              className="text-gray-500"
              onClick={() => {
                hideForever(storageKey);
                dismiss();
              }}
            >
              Don&apos;t show again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MonthWelcomePopup;
