import { useEffect } from "react";

const APP_VERSION_KEY = "ffiemc_app_version";

/**
 * Fetches /version.json (written each production build) and reloads when the
 * deployed version changes — so visitors get new features without a manual hard refresh.
 * Same pattern as VIP-Hire-Admin.
 */
export default function useVersionCheck() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return undefined;

    let cancelled = false;

    const run = () => {
      fetch(`${process.env.PUBLIC_URL || ""}/version.json?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`version.json ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          const nextVersion = data?.version;
          if (!nextVersion) return;

          const baked = process.env.REACT_APP_BUILD_VERSION;
          // Stale JS bundle still running while server already has a newer deploy
          if (baked && nextVersion !== baked) {
            try {
              localStorage.setItem(APP_VERSION_KEY, nextVersion);
              localStorage.setItem("ffiemc_build_version", nextVersion);
            } catch {
              /* ignore */
            }
            const url = new URL(window.location.href);
            if (url.searchParams.get("_bv") === nextVersion) return;
            url.searchParams.set("_bv", nextVersion);
            window.location.replace(url.toString());
            return;
          }

          let storedVersion = null;
          try {
            storedVersion = localStorage.getItem(APP_VERSION_KEY);
          } catch {
            return;
          }

          if (!storedVersion) {
            try {
              localStorage.setItem(APP_VERSION_KEY, nextVersion);
            } catch {
              /* ignore */
            }
            return;
          }

          if (nextVersion !== storedVersion) {
            try {
              localStorage.setItem(APP_VERSION_KEY, nextVersion);
            } catch {
              /* ignore */
            }
            window.location.reload();
          }
        })
        .catch(() => {
          /* version.json missing on older deploys — ignore */
        });
    };

    run();
    const id = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
}
