import { useCallback, useEffect, useState } from "react";
import { listContentAlerts } from "../lib/api";
import { filterUndismissedAlerts } from "../lib/contentAlerts";

export function useContentAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await listContentAlerts();
      setAlerts(filterUndismissedAlerts(rows || []));
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { alerts, loading, refresh, setAlerts };
}
