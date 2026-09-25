import { useEffect, useState } from "react";
import { authApi } from "../lib/api";

export function useDailyGrowth(category = null, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await authApi.publicListDailyGrowth(category);
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, enabled]);

  return { items, loading };
}
