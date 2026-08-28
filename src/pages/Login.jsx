import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Flame } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const REMEMBER_KEY = "ffiemc_admin_remember";

function loadRemembered() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveRemembered(email, password) {
  localStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({ email, password, remembered: true })
  );
}

function clearRemembered() {
  localStorage.removeItem(REMEMBER_KEY);
}

export const Login = () => {
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const remembered = loadRemembered();
  const [form, setForm] = useState({
    email: remembered?.email || "",
    password: remembered?.password || "",
  });
  const [rememberMe, setRememberMe] = useState(Boolean(remembered?.remembered));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user !== null) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(form.email, form.password);
    setLoading(false);
    if (res.ok) {
      if (rememberMe) {
        saveRemembered(form.email, form.password);
      } else {
        clearRemembered();
      }
      navigate("/admin", { replace: true });
    } else {
      setError(res.error);
    }
  };

  return (
    <div
      className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-4"
      data-testid="login-page"
    >
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-3">
          <img
            src={settings.logo}
            alt="logo"
            className="h-16 w-16 rounded-full mx-auto"
          />
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Flame className="h-6 w-6 text-red-600" />
            Admin Login
          </CardTitle>
          <CardDescription>
            Sign in to manage the church website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submit}
            className="space-y-5"
            data-testid="login-form"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Username or email</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                data-testid="login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                data-testid="login-password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => {
                  const on = Boolean(checked);
                  setRememberMe(on);
                  if (!on) clearRemembered();
                }}
                data-testid="login-remember"
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-normal text-gray-600 cursor-pointer"
              >
                Remember me on this device
              </Label>
            </div>
            {error && (
              <p className="text-sm text-red-600" data-testid="login-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold"
              data-testid="login-submit"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
