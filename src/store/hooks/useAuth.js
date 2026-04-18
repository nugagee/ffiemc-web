import { useSelector } from "react-redux";
import { useMemo } from "react";

/**
 * Hook for accessing auth state from Redux.
 * Mirrors the previous useAuth() from AuthContext for easier migration.
 */
export function useAuth() {
  const { user, adminData, loading, isAuthenticated } = useSelector((state) => ({
    user: state.auth.user,
    adminData: state.auth.adminData,
    loading: state.auth.isLoading,
    isAuthenticated: state.auth.isAuthenticated,
  }));

  return useMemo(
    () => ({
      user,
      adminData,
      loading,
      isAuthenticated,
      hasRole: (role) => adminData?.role === role,
      hasPermission: (perm) => adminData?.permissions?.includes(perm),
    }),
    [user, adminData, loading, isAuthenticated]
  );
}
