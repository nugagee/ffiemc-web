const STORAGE_KEY = "ffiemc_build_version";

/**
 * After a new deploy, hashed JS/CSS filenames change but index.html may be cached.
 * Compare build id from this bundle with localStorage and reload once when it changes.
 * (Same approach as Vip-Hire-Web / VIP-Hire-Admin.)
 */
export function enforceLatestBuild() {
  const current = process.env.REACT_APP_BUILD_VERSION;
  if (process.env.NODE_ENV !== "production" || !current) return;

  try {
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous && previous !== current) {
      localStorage.setItem(STORAGE_KEY, current);
      window.location.reload();
      return;
    }
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    /* ignore private mode / blocked storage */
  }
}
