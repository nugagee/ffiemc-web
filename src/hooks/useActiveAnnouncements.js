import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function useActiveAnnouncements(placement) {
  const location = useLocation();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !getSupabase()) return;
    let cancelled = false;

    (async () => {
      try {
        const path = location.pathname || "/";
        let { data, error } = await getSupabase().rpc("public_list_active_announcements", {
          p_path: path,
          p_placement: placement || null,
        });

        if (error) {
          const retry = await getSupabase().rpc("public_list_active_announcements", {
            p_path: path,
          });
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        let list = Array.isArray(data) ? data.filter(Boolean) : [];
        if (placement) {
          list = list.filter((row) => {
            const place = row.placement || "popup";
            return place === "both" || place === placement;
          });
        }
        if (!cancelled) setItems(list);
      } catch (err) {
        console.warn("Announcements load failed:", err.message);
        if (!cancelled) setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, placement]);

  return items;
}
