import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { firstAllowedPath } from "../lib/permissions";
import OverviewPage from "../pages/admin/OverviewPage";

export function RequirePermission({ feature, action = "view", children }) {
  const { user, can } = useAuth();

  if (user === null || user === false) return children;

  if (!can(feature, action)) {
    const fallback = firstAllowedPath(user);
    if (!fallback) {
      return (
        <div className="rounded-2xl bg-white border border-gray-100 p-8">
          <h1 className="text-2xl font-bold">No access</h1>
          <p className="text-sm text-gray-500 mt-2">
            This account has not been granted any dashboard permissions. Ask a superadmin to update your roles and permissions.
          </p>
        </div>
      );
    }
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export function AdminHome() {
  const { user, can } = useAuth();
  if (user === null || user === false) return null;
  if (can("overview", "view")) return <OverviewPage />;
  const fallback = firstAllowedPath(user);
  if (!fallback || fallback === "/admin") {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 p-8">
        <h1 className="text-2xl font-bold">No access</h1>
        <p className="text-sm text-gray-500 mt-2">
          This account has not been granted any dashboard permissions. Ask a superadmin to update your roles and permissions.
        </p>
      </div>
    );
  }
  return <Navigate to={fallback} replace />;
}
