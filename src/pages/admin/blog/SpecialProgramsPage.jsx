import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import ImageUrlField from "../../../components/admin/ImageUrlField";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { useConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

const emptyForm = () => ({
  title: "",
  slug: "",
  description: "",
  cover_url: "",
  starts_on: "",
  ends_on: "",
  published: true,
  sort_order: 0,
});

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SpecialProgramsPage() {
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const load = async () => {
    setLoading(true);
    try {
      const data = await authApi.listSpecialPrograms();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      slug: row.slug || "",
      description: row.description || "",
      cover_url: row.cover_url || "",
      starts_on: row.starts_on || "",
      ends_on: row.ends_on || "",
      published: row.published !== false,
      sort_order: row.sort_order || 0,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertSpecialProgram(editing?.id || null, form);
      toast.success(editing ? "Program updated" : "Program created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: "Delete program?",
      description: `This removes “${row.title}” and all of its videos/contents.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await authApi.deleteSpecialProgram(row.id);
      toast.success("Program deleted");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Delete failed");
    }
  };

  return (
    <div>
      {confirmDialog}
      <PageToolbar
        className="mb-6"
        align="start"
        left={(
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Special programs</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Create series such as 21 Days Revival, Youth Convention, or crusades. Then open each
              program to upload YouTube videos and other contents.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Public:{" "}
              <Link to="/sermons?tab=special-programs" className="text-red-600 hover:underline">
                /sermons?tab=special-programs
              </Link>
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" /> New program
          </Button>
        ) : null}
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No special programs yet. Create one for your 21 Days Revival videos.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-4 flex flex-wrap items-start gap-4 justify-between">
              <div className="min-w-0 flex-1 flex gap-4">
                {row.cover_url ? (
                  <img
                    src={row.cover_url}
                    alt=""
                    className="h-16 w-24 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                ) : (
                  <div className="h-16 w-24 rounded-lg bg-gradient-to-br from-red-600 to-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {row.published ? (
                      <Badge className="bg-green-100 text-green-800">Published</Badge>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-700">Draft</Badge>
                    )}
                    <span className="text-xs text-gray-400">{row.item_count || 0} items</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{row.title}</h3>
                  {row.description ? (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{row.description}</p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-2">
                    {fmtDate(row.starts_on)}
                    {row.ends_on ? ` – ${fmtDate(row.ends_on)}` : ""}
                    {row.slug ? ` · ${row.slug}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
                  <Link to={`/admin/blog/special-programs/${row.id}`}>
                    <FolderOpen className="h-4 w-4 mr-1.5" /> Contents
                  </Link>
                </Button>
                {canEdit ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button size="sm" variant="outline" onClick={() => remove(row)}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit program" : "New special program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="sp-title">Title</Label>
              <Input
                id="sp-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. 21 Days Revival 2026"
              />
            </div>
            <div>
              <Label htmlFor="sp-slug">Slug (optional)</Label>
              <Input
                id="sp-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="21-days-revival-2026"
              />
            </div>
            <div>
              <Label htmlFor="sp-desc">Description</Label>
              <Textarea
                id="sp-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short intro shown on the Sermons page"
              />
            </div>
            <ImageUrlField
              label="Cover image"
              value={form.cover_url}
              onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sp-start">Starts on</Label>
                <Input
                  id="sp-start"
                  type="date"
                  value={form.starts_on || ""}
                  onChange={(e) => setForm((f) => ({ ...f, starts_on: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="sp-end">Ends on</Label>
                <Input
                  id="sp-end"
                  type="date"
                  value={form.ends_on || ""}
                  onChange={(e) => setForm((f) => ({ ...f, ends_on: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sp-pub">Published on website</Label>
              <Switch
                id="sp-pub"
                checked={Boolean(form.published)}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
