import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../../store/hooks/useAuth";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Spin fullscreen />;
  if (!user) return <Navigate to="/admin/login" replace />;

  return children;
}
