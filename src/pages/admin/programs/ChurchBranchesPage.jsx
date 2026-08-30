import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { Plus, Trash2, Pencil } from "lucide-react";
import { CORE_COUNTRIES, DEFAULT_COUNTRY, countrySelectOptions } from "../../../data/countries";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { RecordViewDialog } from "../../../components/admin/RecordViewDialog";
import { requestOrApply } from "../../../lib/changeRequests";

const empty = {
  name: "", slug: "", city: "", state: "", country: DEFAULT_COUNTRY,
  region: "local", is_international: false, description: "",
};

export default function ChurchBranchesPage() {
  const { can, isSuperadmin } = useAuth();
  const canEdit = can("church_branches", "edit");
  const canDelete = can("church_branches", "delete");
  const [items, setItems] = useState([]);
  const [viewRow, setViewRow] = useState(null);
  const paged = usePagedRows(items);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => authApi.listChurchBranches().then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (editing) {
      const result = await requestOrApply({
        isSuperadmin,
        feature: "church_branches",
        action: "update",
        resourceType: "church_branches",
        resourceId: editing.id,
        title: `Update branch ${form.name}`,
        payload: form,
        previous: editing,
        apply: () => authApi.upsertChurchBranch(editing.id, form),
      });
      if (!result.queued) toast.success("Branch updated");
    } else {
      await authApi.upsertChurchBranch(null, form);
      toast.success("Branch created");
    }
    setForm(empty);
    setEditing(null);
    load();
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name, slug: item.slug, city: item.city || "", state: item.state || "",
      country: item.country || "Nigeria", region: item.region || "local",
      is_international: item.is_international, description: item.description || "",
    });
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Programs</p>
      <h1 className="text-3xl font-bold mt-2">Church branches</h1>
      <p className="text-gray-500 mt-2 text-sm">Local and international branches used on all registration forms.</p>

      {canEdit && (
        <form onSubmit={save} className="mt-6 rounded-2xl border bg-white p-5 space-y-4 max-w-2xl">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from name if empty" /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-2"><Label>State / region</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={form.country || DEFAULT_COUNTRY} onValueChange={(v) => setForm({ ...form, country: v })}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countrySelectOptions(form.country).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v, is_international: v === "international" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_international} onCheckedChange={(v) => setForm({ ...form, is_international: Boolean(v), region: v ? "international" : form.region })} />
            International branch
          </label>
          <Button type="submit" className="bg-red-600 hover:bg-red-700"><Plus size={16} className="mr-2" /> {editing ? "Update branch" : "Add branch"}</Button>
        </form>
      )}

      <div className="mt-8 rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b">
            <tr>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Region</th>
              <th className="px-5 py-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((item) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium">{item.name}</td>
                <td className="px-5 py-3 text-gray-500">{[item.city, item.state, item.country].filter(Boolean).join(", ")}</td>
                <td className="px-5 py-3 capitalize">{item.region}</td>
                <td className="px-5 py-3">
                  <TableActions
                    onView={() => setViewRow(item)}
                    onEdit={() => startEdit(item)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onDelete={async () => {
                      if (!window.confirm("Delete this branch?")) return;
                      const result = await requestOrApply({
                        isSuperadmin,
                        feature: "church_branches",
                        action: "delete",
                        resourceType: "church_branches",
                        resourceId: item.id,
                        title: `Delete branch ${item.name}`,
                        previous: item,
                        apply: () => authApi.deleteChurchBranch(item.id),
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
      <RecordViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(o) => { if (!o) setViewRow(null); }}
        title={viewRow?.name || "Branch"}
        fields={viewRow ? [
          { label: "Slug", value: viewRow.slug },
          { label: "City", value: viewRow.city },
          { label: "State", value: viewRow.state },
          { label: "Country", value: viewRow.country },
          { label: "Region", value: viewRow.region },
          { label: "Description", value: viewRow.description },
        ] : []}
      />
    </div>
  );
}
