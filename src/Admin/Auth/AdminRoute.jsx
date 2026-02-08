import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../services/firebase";

export default function AdminRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;

  return children;
}
