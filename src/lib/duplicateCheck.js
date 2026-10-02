import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";

export const RELATIONSHIPS = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "ward", label: "Ward/Dependant" },
  { value: "grandparent", label: "Grandparent" },
  { value: "relative", label: "Relative" },
  { value: "other", label: "Other" },
];

export function isDuplicateError(message) {
  return /already used by|already registered/i.test(String(message || ""));
}

export async function lookupRegistrationDuplicate({ email = "", phone = "", excludeId = null } = {}) {
  const client = getSupabase();
  if (!client) return { matches: [] };
  const { data, error } = await client.rpc("lookup_registration_duplicate", {
    p_email: email || "",
    p_phone: phone || "",
    p_exclude_id: excludeId || null,
  });
  if (error) throw new Error(error.message);
  return { matches: Array.isArray(data?.matches) ? data.matches : [] };
}

export async function submitPendingBeneficiary(primaryId, payload) {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.rpc("submit_pending_beneficiary", {
    p_primary: primaryId,
    p_payload: payload || {},
  });
  if (error) throw new Error(error.message);
  if (data?.ok === false) throw new Error(data.message || "Could not save the household link");
  return data;
}

/** Debounced duplicate lookup. Call schedule() from email/phone blur. */
export function useDuplicateWatch({ email, phone, excludeId, enabled = true }) {
  const [matches, setMatches] = useState([]);
  const [checking, setChecking] = useState(false);
  const timer = useRef(null);

  const check = useCallback(async () => {
    if (!enabled) {
      setMatches([]);
      return [];
    }
    const emailOk = String(email || "").includes("@");
    const phoneOk = String(phone || "").replace(/\D/g, "").length >= 10;
    if (!emailOk && !phoneOk) {
      setMatches([]);
      return [];
    }
    setChecking(true);
    try {
      const result = await lookupRegistrationDuplicate({ email, phone, excludeId });
      setMatches(result.matches);
      return result.matches;
    } catch {
      return [];
    } finally {
      setChecking(false);
    }
  }, [email, phone, excludeId, enabled]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      check();
    }, 350);
  }, [check]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { matches, setMatches, checking, check, schedule };
}
