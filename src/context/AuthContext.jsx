import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, formatApiError, getAdminToken } from "../lib/api";
import { isSupabaseConfigured } from "../lib/supabase";
import { hasPermission } from "../lib/permissions";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = anon, obj = user
  const isSuperadmin = user && user !== false && user.role === "superadmin";

  useEffect(() => {
    if (!isSupabaseConfigured || !getAdminToken()) {
      setUser(false);
      return;
    }
    authApi
      .me()
      .then((admin) => setUser(admin))
      .catch(() => {
        setUser(false);
      });
  }, []);

  const login = async (email, password) => {
    try {
      const admin = await authApi.login(email, password);
      setUser(admin);
      authApi.logAdminActivity("/admin", "login", { method: "password" }).catch(() => {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e.message || e) };
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(false);
  };

  const can = (feature, action = "view") => hasPermission(user, feature, action);

  return (
    <AuthContext.Provider value={{ user, login, logout, isSuperadmin, can }}>
      {children}
    </AuthContext.Provider>
  );
};
