import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Plus, Trash2, Pencil } from "lucide-react";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { requestOrApply } from "../../../lib/changeRequests";

export default function ChurchRolesPage() {
  const { can, isSuperadmin } = useAuth();
  const canEdit = can("church_roles", "edit");
  const canDelete = can("church_roles", "delete");
  const [items, setItems] = useState([]);
  const paged = usePagedRows(items);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(null);

  const load = () => authApi.listChurchRoles().then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (editing) {
      const result = await requestOrApply({
        isSuperadmin,
        feature: "church_roles",
        action: "update",
        resourceType: "church_roles",
        resourceId: editing.id,
        title: `Update role ${form.name}`,
        payload: form,
        previous: editing,
        apply: () => authApi.upsertChurchRole(editing.id, form),
      });
      if (!result.queued) toast.success("Role updated");
    } else {
      await authApi.upsertChurchRole(null, form);
      toast.success("Role created");
    }
    setForm({ name: "", description: "" });
    setEditing(null);
    load();
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Members</p>
      <h1 className="text-3xl font-bold mt-2">Church roles</h1>
      <p className="text-gray-500 mt-2 text-sm">Roles members can hold during registration. A person may belong to more than one role (for example Pastor and Youth leader).</p>

      {canEdit && (
        <form onSubmit={save} className="mt-6 rounded-2xl border bg-white p-5 space-y-4 max-w-xl">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <Button type="submit" className="bg-red-600 hover:bg-red-700"><Plus size={16} className="mr-2" /> {editing ? "Update role" : "Add role"}</Button>
        </form>
      )}

      <div className="mt-8 rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b">
            <tr><th className="px-5 py-3">Role</th><th className="px-5 py-3">Description</th><th className="px-5 py-3 w-24" /></tr>
          </thead>
          <tbody>
            {paged.rows.map((item) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium">{item.name}</td>
                <td className="px-5 py-3 text-gray-500">{item.description}</td>
                <td className="px-5 py-3">
                  <TableActions
                    onView={() => toast.message(item.description || item.name)}
                    onEdit={() => { setEditing(item); setForm({ name: item.name, description: item.description }); }}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onDelete={async () => {
                      if (!window.confirm("Delete this role?")) return;
                      const result = await requestOrApply({
                        isSuperadmin,
                        feature: "church_roles",
                        action: "delete",
                        resourceType: "church_roles",
                        resourceId: item.id,
                        title: `Delete role ${item.name}`,
                        previous: item,
                        apply: () => authApi.deleteChurchRole(item.id),
                      });
                      if (!result.queued) toast.success("Deleted");
                      load();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination {...paged} onPageChange={paged.setPage} />
      </div>
    </div>
  );
}
