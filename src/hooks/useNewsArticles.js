import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

async function fetchNewsArticles(category = null, limit = 40) {
  if (!isSupabaseConfigured || !getSupabase()) return [];
  try {
    const { data, error } = await getSupabase().rpc("public_list_news_articles", {
      p_category: category || null,
      p_limit: limit,
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("News list failed:", e?.message || e);
    return [];
  }
}

export function useNewsArticles(category = null, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchNewsArticles(category, 50).then((rows) => {
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [category, enabled]);

  return {
    items,
    loading,
    reload: () => (enabled ? fetchNewsArticles(category, 50).then(setItems) : Promise.resolve([])),
  };
}
