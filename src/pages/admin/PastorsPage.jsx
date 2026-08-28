import { useEffect, useState } from "react";
import { authApi, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { sendPastorCredentialsEmail } from "../../lib/email";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Navigate } from "react-router-dom";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function PastorsPage() {
  const { can, user } = useAuth();
  const { settings } = useSettings();
  const canManage = can("prayer.pastors", "edit") || user?.role === "superadmin";
  const canView = can("prayer.pastors", "view") || can("prayer.inbox", "edit") || user?.role === "superadmin";

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const load = () =>
    authApi
      .listPastors()
      .then(setItems)
      .catch((err) => setError(err.message));

  useEffect(() => {
    if (canView) load();
  }, [canView]);

  if (user?.role === "pastor") return <Navigate to="/admin/prayer" replace />;
  if (!canView) return <Navigate to="/admin" replace />;

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const password = form.password || randomPassword();
      const created = await authApi.createPastor({ ...form, password });
      try {
        await sendPastorCredentialsEmail({
          pastorName: created.full_name || created.username,
          pastorEmail: created.email,
          username: created.username,
          password: created.temp_password || password,
          loginUrl: `${window.location.origin}/login`,
          adminEmail: settings.notificationEmail || "adenugaolajideadewale@gmail.com",
        });
        toast.success("Pastor created — login details emailed");
      } catch (emailErr) {
        console.warn(emailErr);
        toast.success(
          `Pastor created. Email failed — share password manually: ${created.temp_password || password}`
        );
      }
      setOpen(false);
      setForm({ full_name: "", username: "", email: "", phone: "", password: "" });
      await load();
    } catch (err) {
      setError(formatApiError(err.message) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pastor) => {
    await authApi.setAdminActive(pastor.id, !pastor.is_active);
    await load();
  };

  const savePassword = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPasswordSaving(true);
    setError("");
    try {
      await authApi.setAdminPassword(passwordTarget.id, newPassword);
      try {
        await sendPastorCredentialsEmail({
          pastorName: passwordTarget.full_name || passwordTarget.username,
          pastorEmail: passwordTarget.email,
          username: passwordTarget.username,
          password: newPassword,
          loginUrl: `${window.location.origin}/login`,
          adminEmail: settings.notificationEmail || "adenugaolajideadewale@gmail.com",
        });
      } catch {
        /* optional */
      }
      toast.success("Password updated");
      setPasswordTarget(null);
      setNewPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Prayer</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">Pastors</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-3xl">
            Create pastor accounts for the prayer desk. They can sign in and only see requests
            assigned to them.
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              setError("");
              setForm({
                full_name: "",
                username: "",
                email: "",
                phone: "",
                password: randomPassword(),
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add pastor
          </Button>
        )}
      </div>

      {error && !open && !passwordTarget && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-8 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <tr>
              <th className="px-5 py-4">Pastor</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Open requests</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-gray-500 text-center">
                  No pastors yet.
                </td>
              </tr>
            ) : (
              items.map((pastor) => (
                <tr key={pastor.id} className="border-t border-gray-50">
                  <td className="px-5 py-4">
                    <div className="font-medium">{pastor.full_name || pastor.username}</div>
                    <div className="text-xs text-gray-500">@{pastor.username}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div>{pastor.email}</div>
                    <div className="text-xs text-gray-500">{pastor.phone || "—"}</div>
                  </td>
                  <td className="px-5 py-4">{pastor.open_requests ?? 0}</td>
                  <td className="px-5 py-4">{pastor.is_active ? "Active" : "Disabled"}</td>
                  <td className="px-5 py-4 text-right space-x-3 whitespace-nowrap">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="text-sm text-gray-700 hover:underline"
                          onClick={() => {
                            setPasswordTarget(pastor);
                            setNewPassword(randomPassword());
                            setError("");
                          }}
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:underline"
                          onClick={() => toggleActive(pastor)}
                        >
                          {pastor.is_active ? "Disable" : "Enable"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto top-[5vh] translate-y-0">
          <DialogHeader>
            <DialogTitle>Add pastor</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">Login details will be emailed here.</p>
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700">
                {saving ? "Creating…" : "Create & email login"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!passwordTarget} onOpenChange={(o) => !o && setPasswordTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password for {passwordTarget?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="space-y-2">
              <Label>New password</Label>
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={passwordSaving}
              className="bg-red-600 hover:bg-red-700"
              onClick={savePassword}
            >
              {passwordSaving ? "Saving…" : "Update & email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
