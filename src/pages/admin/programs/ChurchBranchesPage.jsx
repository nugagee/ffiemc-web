import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Plus, Trash2, Pencil } from "lucide-react";
import { DEFAULT_COUNTRY, countrySelectOptions } from "../../../data/countries";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { RecordViewDialog } from "../../../components/admin/RecordViewDialog";
import { requestOrApply } from "../../../lib/changeRequests";
import { BRANCH_TYPE_LABELS } from "../../../data/churchBranches";

const emptyBranch = {
  name: "", slug: "", city: "", state: "", country: DEFAULT_COUNTRY,
  region: "local", is_international: false, description: "",
  branch_type: "assembly", district_id: "", sort_order: 0,
};

const emptyDistrict = {
  name: "", slug: "", description: "", sort_order: 0,
};

const BRANCH_TYPES = ["headquarters", "assembly", "campus"];

export default function ChurchBranchesPage() {
  const { can, isSuperadmin } = useAuth();
  const canEdit = can("church_branches", "edit");
  const canDelete = can("church_branches", "delete");
  const [items, setItems] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [viewRow, setViewRow] = useState(null);
  const paged = usePagedRows(items);
  const pagedDistricts = usePagedRows(districts);
  const [form, setForm] = useState(emptyBranch);
  const [districtForm, setDistrictForm] = useState(emptyDistrict);
  const [editing, setEditing] = useState(null);
  const [editingDistrict, setEditingDistrict] = useState(null);

  const districtOptions = useMemo(
    () => districts.filter((d) => d.is_active !== false),
    [districts]
  );

  const load = () => {
    Promise.all([
      authApi.listChurchBranches(),
      authApi.listChurchDistricts(),
    ])
      .then(([branches, dists]) => {
        setItems(branches);
        setDistricts(dists);
      })
      .catch((e) => toast.error(e.message));
  };

  useEffect(() => { load(); }, []);

  const saveBranch = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      district_id: form.district_id || null,
      is_international: form.region === "international" || form.is_international,
    };
    if (editing) {
      const result = await requestOrApply({
        isSuperadmin,
        feature: "church_branches",
        action: "update",
        resourceType: "church_branches",
        resourceId: editing.id,
        title: `Update branch ${form.name}`,
        payload,
        previous: editing,
        apply: () => authApi.upsertChurchBranch(editing.id, payload),
      });
      if (!result.queued) toast.success("Branch updated");
    } else {
      await authApi.upsertChurchBranch(null, payload);
      toast.success("Branch created");
    }
    setForm(emptyBranch);
    setEditing(null);
    load();
  };

  const saveDistrict = async (e) => {
    e.preventDefault();
    if (editingDistrict) {
      await authApi.upsertChurchDistrict(editingDistrict.id, districtForm);
      toast.success("District updated");
    } else {
      await authApi.upsertChurchDistrict(null, districtForm);
      toast.success("District created");
    }
    setDistrictForm(emptyDistrict);
    setEditingDistrict(null);
    load();
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      slug: item.slug,
      city: item.city || "",
      state: item.state || "",
      country: item.country || "Nigeria",
      region: item.region || "local",
      is_international: item.is_international,
      description: item.description || "",
      branch_type: item.branch_type || "assembly",
      district_id: item.district_id || "",
      sort_order: item.sort_order || 0,
    });
  };

  const startEditDistrict = (item) => {
    setEditingDistrict(item);
    setDistrictForm({
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      sort_order: item.sort_order || 0,
    });
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Programs</p>
      <h1 className="text-3xl font-bold mt-2">Branches & districts</h1>
      <p className="text-gray-500 mt-2 text-sm">
        Manage headquarters, assemblies, campus fellowships, and district groupings used on the Ministries page and all registration forms.
      </p>

      <Tabs defaultValue="branches" className="mt-8">
        <TabsList>
          <TabsTrigger value="branches">Branches & campuses</TabsTrigger>
          <TabsTrigger value="districts">Districts</TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="space-y-6 mt-6">
          {canEdit && (
            <form onSubmit={saveBranch} className="rounded-2xl border bg-white p-5 space-y-4 max-w-3xl">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from name if empty" /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.branch_type} onValueChange={(v) => setForm({ ...form, branch_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BRANCH_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{BRANCH_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>District (optional)</Label>
                  <Select value={form.district_id || "none"} onValueChange={(v) => setForm({ ...form, district_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="No district" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No district</SelectItem>
                      {districtOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_international} onCheckedChange={(v) => setForm({ ...form, is_international: Boolean(v), region: v ? "international" : form.region })} />
                International branch
              </label>
              <Button type="submit" className="bg-red-600 hover:bg-red-700"><Plus size={16} className="mr-2" /> {editing ? "Update branch" : "Add branch"}</Button>
            </form>
          )}

          <div className="rounded-2xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b">
                <tr>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((item) => (
                  <tr key={item.id} className="border-t border-gray-50">
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="px-5 py-3 capitalize text-gray-500">{BRANCH_TYPE_LABELS[item.branch_type] || item.branch_type}</td>
                    <td className="px-5 py-3 text-gray-500">{item.district_name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{[item.city, item.state, item.country].filter(Boolean).join(", ")}</td>
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
        </TabsContent>

        <TabsContent value="districts" className="space-y-6 mt-6">
          {canEdit && (
            <form onSubmit={saveDistrict} className="rounded-2xl border bg-white p-5 space-y-4 max-w-2xl">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={districtForm.name} onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Slug</Label><Input value={districtForm.slug} onChange={(e) => setDistrictForm({ ...districtForm, slug: e.target.value })} placeholder="auto from name if empty" /></div>
                <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={districtForm.sort_order} onChange={(e) => setDistrictForm({ ...districtForm, sort_order: Number(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={districtForm.description} onChange={(e) => setDistrictForm({ ...districtForm, description: e.target.value })} rows={2} /></div>
              <Button type="submit" className="bg-red-600 hover:bg-red-700"><Plus size={16} className="mr-2" /> {editingDistrict ? "Update district" : "Add district"}</Button>
            </form>
          )}

          <div className="rounded-2xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b">
                <tr>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {pagedDistricts.rows.map((item) => (
                  <tr key={item.id} className="border-t border-gray-50">
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="px-5 py-3 text-gray-500">{item.description || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {canEdit && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => startEditDistrict(item)}>
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={async () => {
                              if (!window.confirm(`Delete district "${item.name}"? Branches will be unassigned.`)) return;
                              await authApi.deleteChurchDistrict(item.id);
                              toast.success("District deleted");
                              load();
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination {...pagedDistricts} onPageChange={pagedDistricts.setPage} />
          </div>
        </TabsContent>
      </Tabs>

      <RecordViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(o) => { if (!o) setViewRow(null); }}
        title={viewRow?.name || "Branch"}
        fields={viewRow ? [
          { label: "Slug", value: viewRow.slug },
          { label: "Type", value: BRANCH_TYPE_LABELS[viewRow.branch_type] || viewRow.branch_type },
          { label: "District", value: viewRow.district_name },
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
