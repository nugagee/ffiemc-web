import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { pingPageVisit, startPageVisit } from "../lib/api";
import { getSessionId, getVisitDemographics, getVisitorId } from "../lib/tracking";

const PING_MS = 15000;

function shouldSkip(pathname) {
  return (
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname.startsWith("/blog/preview")
  );
}

export function VisitorTracker() {
  const { pathname } = useLocation();
  const visitIdRef = useRef(null);
  const startedAtRef = useRef(0);
  const lastPathRef = useRef("");
  const visitorIdRef = useRef("");

  useEffect(() => {
    if (shouldSkip(pathname)) return;

    let cancelled = false;
    let pingTimer = null;

    const sendPing = (isFinal = true) => {
      const id = visitIdRef.current;
      const visitorId = visitorIdRef.current;
      if (!id || !visitorId || !startedAtRef.current) return;
      const seconds = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
      pingPageVisit({
        visitId: id,
        visitorId,
        durationSeconds: seconds,
        finalize: isFinal,
      });
    };

    const start = async () => {
      if (visitIdRef.current && lastPathRef.current && lastPathRef.current !== pathname) {
        sendPing(true);
        visitIdRef.current = null;
      }
      if (lastPathRef.current === pathname && visitIdRef.current) return;
      lastPathRef.current = pathname;

      const visitorId = getVisitorId();
      visitorIdRef.current = visitorId;
      const demo = getVisitDemographics();
      startedAtRef.current = Date.now();

      const id = await startPageVisit({
        path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        visitorId,
        sessionId: getSessionId(),
        ...demo,
      });
      if (cancelled || !id) return;
      visitIdRef.current = id;

      pingTimer = window.setInterval(() => {
        if (document.visibilityState === "hidden") return;
        sendPing(false);
      }, PING_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendPing(false);
    };
    const onPageHide = () => sendPing(true);

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      if (pingTimer) window.clearInterval(pingTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      sendPing(true);
      visitIdRef.current = null;
    };
  }, [pathname]);

  return null;
}
