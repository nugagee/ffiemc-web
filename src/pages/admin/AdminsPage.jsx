import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { allPermissions, emptyPermissions, normalizePermissions } from "../../lib/permissions";
import { PermissionMatrix } from "../../components/admin/PermissionMatrix";
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
import { PageToolbar } from "../../components/admin/PageToolbar";

const emptyForm = () => ({
  username: "",
  email: "",
  password: "",
  role: "admin",
  permissions: emptyPermissions(),
});

export default function AdminsPage() {
  const { isSuperadmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editPerms, setEditPerms] = useState(allPermissions());
  const [editSaving, setEditSaving] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const load = () =>
    authApi.listAdmins().then(setAdmins).catch((err) => setError(err.message));

  useEffect(() => {
    if (isSuperadmin) load();
  }, [isSuperadmin]);

  if (!isSuperadmin) return <Navigate to="/admin" replace />;

  const openCreate = () => {
    setError("");
    setForm(emptyForm());
    setCreateOpen(true);
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await authApi.createAdmin({
        ...form,
        permissions: form.role === "superadmin" ? {} : form.permissions,
      });
      setForm(emptyForm());
      setCreateOpen(false);
      await load();
      toast.success("Admin created");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (admin) => {
    await authApi.setAdminActive(admin.id, !admin.is_active);
    await load();
  };

  const openEdit = (admin) => {
    setEditing(admin);
    setEditPerms(normalizePermissions(admin.permissions));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    setError("");
    try {
      await authApi.updateAdminPermissions(editing.id, editPerms);
      setEditing(null);
      await load();
      toast.success("Permissions updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const openPassword = (admin) => {
    setPasswordTarget(admin);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const savePassword = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    setError("");
    try {
      await authApi.setAdminPassword(passwordTarget.id, newPassword);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
      toast.success(`Password updated for ${passwordTarget.username}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <PageToolbar
        className=""
        align="start"
        left={(
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">
              Access
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">Admins</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-4xl">
              Superadmins have full access. For other admins, tick the website pages
              they may open, then tick which contents on those pages they may edit or
              delete.
            </p>
          </div>
        )}
        right={(
          <Button
            type="button"
            onClick={openCreate}
            className="bg-red-600 hover:bg-red-700 text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create admin
          </Button>
        )}
      />

      {error && !passwordTarget && !editing && !createOpen && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-8 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <tr>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-t border-gray-50">
                <td className="px-5 py-4">
                  <div className="font-medium">{admin.username}</div>
                  <div className="text-xs text-gray-500">
                    {admin.email || "—"}
                  </div>
                </td>
                <td className="px-5 py-4 text-xs uppercase">{admin.role}</td>
                <td className="px-5 py-4">
                  {admin.is_active ? "Active" : "Disabled"}
                </td>
                <td className="px-5 py-4 text-right space-x-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openPassword(admin)}
                    className="text-sm text-gray-700 hover:underline"
                  >
                    Change password
                  </button>
                  {admin.role !== "superadmin" && (
                    <button
                      type="button"
                      onClick={() => openEdit(admin)}
                      className="text-sm text-gray-700 hover:underline"
                    >
                      Permissions
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleActive(admin)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    {admin.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setError("");
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 sm:rounded-lg top-[5vh] translate-y-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-100 pr-12">
            <DialogTitle>Create admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-6">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="admin">admin (limited)</option>
                    <option value="superadmin">superadmin (full access)</option>
                  </select>
                </div>
              </div>

              {form.role === "admin" ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    This account starts with no access. Use Allow all, or tick dashboard, programs, registrations, approvals, and website pages this admin may manage.
                  </p>
                  <PermissionMatrix
                    value={form.permissions}
                    onChange={(permissions) => setForm({ ...form, permissions })}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  Superadmins skip the permission list and can use every page,
                  including creating other admins.
                </p>
              )}
            </div>
            <DialogFooter className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? "Creating…" : "Create admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[92dvh] overflow-hidden flex flex-col gap-0 p-0 sm:rounded-lg top-[4vh] translate-y-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 w-[calc(100%-1rem)]">
          <DialogHeader className="shrink-0 px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100 pr-12">
            <DialogTitle>Permissions for {editing?.username}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-3 sm:py-4">
            <PermissionMatrix value={editPerms} onChange={setEditPerms} />
          </div>
          <DialogFooter className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveEdit}
              disabled={editSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {editSaving ? "Saving…" : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordTarget(null);
            setNewPassword("");
            setConfirmPassword("");
            setError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Change password for {passwordTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={savePassword}
              disabled={passwordSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {passwordSaving ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
