import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function ProgramTypesPage() {
  const { can } = useAuth();
  const canEdit = can("program_types", "edit");
  const canDelete = can("program_types", "delete");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(null);

  const load = () => authApi.listProgramTypes().then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await authApi.upsertProgramType(editing?.id || null, form);
    toast.success(editing ? "Type updated" : "Type created");
    setForm({ name: "", description: "" });
    setEditing(null);
    load();
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Programs</p>
      <h1 className="text-3xl font-bold mt-2">Program types</h1>
      <p className="text-gray-500 mt-2 text-sm">Categories like Convention, Conference, Outreach.</p>

      {canEdit && (
        <form onSubmit={save} className="mt-6 rounded-2xl border bg-white p-5 space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <Button type="submit" className="bg-red-600 hover:bg-red-700">
            <Plus size={16} className="mr-2" /> {editing ? "Update type" : "Add type"}
          </Button>
        </form>
      )}

      <div className="mt-8 rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b">
            <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Description</th><th className="px-5 py-3 w-24" /></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium">{item.name}</td>
                <td className="px-5 py-3 text-gray-500">{item.description}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setForm({ name: item.name, description: item.description }); }}>
                        <Pencil size={14} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="text-red-600" onClick={async () => { await authApi.deleteProgramType(item.id); load(); }}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
