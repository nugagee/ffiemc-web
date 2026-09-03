import { useEffect, useRef } from "react";
import { scrollPercent } from "../../lib/blogAnalytics";
import { trackBlogEvent } from "../../lib/blogTrack";

const PING_MS = 15000;

export function BlogReadTracker({ post, enabled = true }) {
  const startedAt = useRef(0);
  const viewed = useRef(false);

  useEffect(() => {
    if (!enabled || !post) return undefined;
    startedAt.current = Date.now();
    viewed.current = false;

    const duration = () => Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
    const ping = (action) => {
      trackBlogEvent(post, action, {
        duration: duration(),
        scroll: scrollPercent(),
      });
    };

    if (!viewed.current) {
      viewed.current = true;
      trackBlogEvent(post, "view");
      ping("read");
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      ping("read");
    }, PING_MS);

    const onHide = () => ping("read");
    const onLeave = () => ping("leave");

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
      ping("leave");
    };
  }, [enabled, post?.id, post?.slug]);

  return null;
}
