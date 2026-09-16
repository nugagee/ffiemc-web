import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

async function fetchPrograms() {
  if (!isSupabaseConfigured || !getSupabase()) return [];
  try {
    const { data, error } = await getSupabase().rpc("public_list_special_programs");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Special programs list failed:", e?.message || e);
    return [];
  }
}

async function fetchProgramItems(programId = null, slug = null) {
  if (!isSupabaseConfigured || !getSupabase()) return [];
  if (!programId && !slug) return [];
  try {
    const { data, error } = await getSupabase().rpc("public_list_special_program_items", {
      p_program_id: programId || null,
      p_slug: slug || null,
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Special program items failed:", e?.message || e);
    return [];
  }
}

/** Map DB items so MediaResourceCards can show dates (service_date). */
export function mapSpecialProgramItems(items = []) {
  return (items || []).map((item) => ({
    ...item,
    service_date: item.item_date || item.service_date || null,
  }));
}

export function useSpecialPrograms(enabled = true) {
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
    fetchPrograms().then((rows) => {
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { items, loading };
}

export function useSpecialProgramItems(programId = null, slug = null, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && (programId || slug)));

  useEffect(() => {
    if (!enabled || (!programId && !slug)) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchProgramItems(programId, slug).then((rows) => {
      if (!cancelled) {
        setItems(mapSpecialProgramItems(rows));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [programId, slug, enabled]);

  return { items, loading };
}
