import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import {
  CONVENTION_BIBLE_STUDIES,
  CONVENTION_DAILY_MANNA,
} from "../data/conventionContent";

async function fetchResources(kind) {
  if (!isSupabaseConfigured || !getSupabase()) {
    if (kind === "bible_study") return CONVENTION_BIBLE_STUDIES;
    if (kind === "daily_manna") return CONVENTION_DAILY_MANNA;
    return [];
  }
  try {
    const { data, error } = await getSupabase().rpc("public_list_church_resources", { p_kind: kind });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.filter(Boolean) : [];
    if (rows.length) return rows;
  } catch {
    /* fallback */
  }
  if (kind === "bible_study") return CONVENTION_BIBLE_STUDIES;
  if (kind === "daily_manna") return CONVENTION_DAILY_MANNA;
  return [];
}

export function useChurchResources(kind) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchResources(kind).then((rows) => {
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return { items, loading, reload: () => fetchResources(kind).then(setItems) };
}
