import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../lib/api";
import { useAuth } from "./AuthContext";

const AdminCountsContext = createContext({
  counts: {
    members_pending: 0,
    members_approved: 0,
    members_all: 0,
    approvals_pending: 0,
    my_requests_pending: 0,
    approvals_by_feature: {},
  },
  refreshCounts: async () => {},
});

export function AdminCountsProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    members_pending: 0,
    members_approved: 0,
    members_all: 0,
    approvals_pending: 0,
    my_requests_pending: 0,
    approvals_by_feature: {},
  });

  const refreshCounts = useCallback(async () => {
    if (!user || user === false) return;
    try {
      const data = await authApi.inboxCounts();
      setCounts({
        members_pending: Number(data?.members_pending) || 0,
        members_approved: Number(data?.members_approved) || 0,
        members_all: Number(data?.members_all) || 0,
        approvals_pending: Number(data?.approvals_pending) || 0,
        my_requests_pending: Number(data?.my_requests_pending) || 0,
        approvals_by_feature: data?.approvals_by_feature || {},
      });
    } catch {
      /* RPC may not be installed yet */
    }
  }, [user]);

  useEffect(() => {
    refreshCounts();
    const t = window.setInterval(refreshCounts, 45000);
    return () => window.clearInterval(t);
  }, [refreshCounts]);

  return (
    <AdminCountsContext.Provider value={{ counts, refreshCounts }}>
      {children}
    </AdminCountsContext.Provider>
  );
}

export function useAdminCounts() {
  return useContext(AdminCountsContext);
}
