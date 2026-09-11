import { useCallback, useEffect, useRef } from "react";
import {
  pingFacebookLiveView,
  startFacebookLiveView,
  trackFacebookLiveEvent,
} from "../lib/api";
import { getSessionId, getVisitDemographics, getVisitorId } from "../lib/tracking";

const PING_MS = 10000;
const VISIBLE_RATIO = 0.25;

/**
 * Tracks homepage Facebook Live section impressions and on-screen time
 * via IntersectionObserver (only counts time while the section is visible).
 */
export function useFacebookLiveAnalytics({ enabled, wasLive, sectionRef }) {
  const viewIdRef = useRef(null);
  const visitorIdRef = useRef("");
  const visibleStartedAtRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const isVisibleRef = useRef(false);
  const wasLiveRef = useRef(Boolean(wasLive));
  const startedRef = useRef(false);

  useEffect(() => {
    wasLiveRef.current = Boolean(wasLive);
  }, [wasLive]);

  const visibleSeconds = useCallback(() => {
    let ms = accumulatedMsRef.current;
    if (isVisibleRef.current && visibleStartedAtRef.current) {
      ms += Date.now() - visibleStartedAtRef.current;
    }
    return Math.max(0, Math.round(ms / 1000));
  }, []);

  const sendPing = useCallback((finalize = false) => {
    const id = viewIdRef.current;
    const visitorId = visitorIdRef.current;
    if (!id || !visitorId) return;
    pingFacebookLiveView({
      viewId: id,
      visitorId,
      durationSeconds: visibleSeconds(),
      wasLive: wasLiveRef.current,
      finalize,
    });
  }, [visibleSeconds]);

  const trackAction = useCallback((action, meta = {}) => {
    const visitorId = visitorIdRef.current || getVisitorId();
    visitorIdRef.current = visitorId;
    const demo = getVisitDemographics();
    trackFacebookLiveEvent({
      action,
      visitorId,
      sessionId: getSessionId(),
      viewId: viewIdRef.current,
      wasLive: wasLiveRef.current,
      path: typeof window !== "undefined" ? window.location.pathname : "/",
      ...demo,
      meta,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = sectionRef?.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;

    let cancelled = false;
    let pingTimer = null;

    const ensureSession = async () => {
      if (startedRef.current || viewIdRef.current) return;
      startedRef.current = true;
      const visitorId = getVisitorId();
      visitorIdRef.current = visitorId;
      const demo = getVisitDemographics();
      const id = await startFacebookLiveView({
        visitorId,
        sessionId: getSessionId(),
        wasLive: wasLiveRef.current,
        path: window.location.pathname || "/",
        ...demo,
      });
      if (cancelled || !id) {
        startedRef.current = false;
        return;
      }
      viewIdRef.current = id;
    };

    const enterVisible = async () => {
      if (isVisibleRef.current) return;
      isVisibleRef.current = true;
      visibleStartedAtRef.current = Date.now();
      await ensureSession();
      if (!pingTimer) {
        pingTimer = window.setInterval(() => {
          if (document.visibilityState === "hidden") return;
          if (!isVisibleRef.current) return;
          sendPing(false);
        }, PING_MS);
      }
    };

    const leaveVisible = (finalize = false) => {
      if (!isVisibleRef.current) {
        if (finalize) sendPing(true);
        return;
      }
      accumulatedMsRef.current += Date.now() - (visibleStartedAtRef.current || Date.now());
      visibleStartedAtRef.current = 0;
      isVisibleRef.current = false;
      sendPing(finalize);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
          enterVisible();
        } else {
          leaveVisible(false);
        }
      },
      { threshold: [0, VISIBLE_RATIO, 0.5, 0.75, 1] }
    );

    observer.observe(el);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        leaveVisible(false);
      } else if (isVisibleRef.current === false) {
        // Re-check on focus is handled by IntersectionObserver callbacks
      }
    };
    const onPageHide = () => leaveVisible(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (pingTimer) window.clearInterval(pingTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      leaveVisible(true);
      viewIdRef.current = null;
      startedRef.current = false;
      accumulatedMsRef.current = 0;
    };
  }, [enabled, sectionRef, sendPing]);

  // If live status flips while viewing, keep the session flagged as live.
  useEffect(() => {
    if (!viewIdRef.current || !visitorIdRef.current) return;
    if (!wasLive) return;
    sendPing(false);
  }, [wasLive, sendPing]);

  return { trackAction };
}
