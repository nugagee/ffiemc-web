// src/admin/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        setUser(null);
        setAdminData(null);
        setLoading(false);
        return;
      }

      const adminRef = doc(db, "admins", firebaseUser.uid);
      const snap = await getDoc(adminRef);

      if (!snap.exists()) {
        // Authenticated but NOT an admin
        setUser(null);
        setAdminData(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setAdminData({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...snap.data(),
      });

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        adminData,
        loading,
        isAuthenticated: !!user,
        hasRole: (role) => adminData?.role === role,
        hasPermission: (perm) => adminData?.permissions?.includes(perm),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
