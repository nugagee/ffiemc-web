// src/admin/auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../../store/hooks/useAuth";

export default function ProtectedRoute({ children, roles }) {
  const { user, adminData, loading } = useAuth();

  if (loading) return <Spin fullscreen />;

  if (!user || !adminData) {
    return <Navigate to="/admin/login" replace />;
  }

  if (roles && !roles.includes(adminData?.role)) {
    return <Navigate to="/admin/unauthorized" />;
  }

  return children;
}
