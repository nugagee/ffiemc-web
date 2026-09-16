import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
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

const emptyForm = (programId) => ({
  program_id: programId,
  title: "",
  excerpt: "",
  content_format: "video",
  item_date: "",
  youtube_url: "",
  facebook_url: "",
  audiomack_url: "",
  thumbnail_url: "",
  attachment_url: "",
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

export default function SpecialProgramItemsPage() {
  const { programId } = useParams();
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [program, setProgram] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => emptyForm(programId));

  const load = async () => {
    setLoading(true);
    try {
      const [programs, items] = await Promise.all([
        authApi.listSpecialPrograms(),
        authApi.listSpecialProgramItems(programId),
      ]);
      const list = Array.isArray(programs) ? programs : [];
      setProgram(list.find((p) => p.id === programId) || null);
      setRows(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load contents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (programId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(programId));
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      program_id: programId,
      title: row.title || "",
      excerpt: row.excerpt || "",
      content_format: row.content_format || "video",
      item_date: row.item_date || "",
      youtube_url: row.youtube_url || "",
      facebook_url: row.facebook_url || "",
      audiomack_url: row.audiomack_url || "",
      thumbnail_url: row.thumbnail_url || "",
      attachment_url: row.attachment_url || "",
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
    if (
      form.content_format === "video" &&
      !form.youtube_url.trim() &&
      !form.facebook_url.trim() &&
      !form.audiomack_url.trim()
    ) {
      toast.error("Add at least one media link (YouTube recommended)");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertSpecialProgramItem(editing?.id || null, {
        ...form,
        program_id: programId,
      });
      toast.success(editing ? "Updated" : "Added");
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
      title: "Delete this item?",
      description: `Remove “${row.title}” from this program.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await authApi.deleteSpecialProgramItem(row.id);
      toast.success("Deleted");
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
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link to="/admin/blog/special-programs">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> All programs
              </Link>
            </Button>
            <h2 className="text-2xl font-bold text-gray-900">
              {program?.title || "Program contents"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Paste YouTube links for each day or session. They appear under Sermons → Special
              programs.
            </p>
            {program?.slug ? (
              <p className="text-sm text-gray-500 mt-1">
                Public:{" "}
                <Link
                  to={`/sermons?tab=special-programs&program=${encodeURIComponent(program.slug)}`}
                  className="text-red-600 hover:underline"
                >
                  /sermons?tab=special-programs&program={program.slug}
                </Link>
              </p>
            ) : null}
          </div>
        )}
        right={canEdit ? (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" /> Add video / content
          </Button>
        ) : null}
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : !program ? (
        <Card className="p-10 text-center text-gray-500">Program not found.</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No contents yet. Add Day 1, Day 2… with their YouTube links.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-4 flex flex-wrap items-start gap-4 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline">{row.content_format || "video"}</Badge>
                  {row.published ? null : (
                    <Badge className="bg-gray-200 text-gray-700">Draft</Badge>
                  )}
                  <span className="text-xs text-gray-400">{fmtDate(row.item_date)}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{row.title}</h3>
                {row.excerpt ? (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{row.excerpt}</p>
                ) : null}
                {row.youtube_url ? (
                  <a
                    href={row.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-red-600 hover:underline mt-2 inline-block truncate max-w-full"
                  >
                    {row.youtube_url}
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
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
            <DialogTitle>{editing ? "Edit content" : "Add video / content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="spi-title">Title</Label>
              <Input
                id="spi-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Day 1 — Opening night"
              />
            </div>
            <div>
              <Label htmlFor="spi-date">Date</Label>
              <Input
                id="spi-date"
                type="date"
                value={form.item_date || ""}
                onChange={(e) => setForm((f) => ({ ...f, item_date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="spi-excerpt">Short summary</Label>
              <Textarea
                id="spi-excerpt"
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </div>
            <div className="space-y-3 rounded-xl border p-3">
              <p className="text-sm font-medium text-gray-800">Media links</p>
              <div>
                <Label htmlFor="spi-yt">YouTube URL</Label>
                <Input
                  id="spi-yt"
                  value={form.youtube_url}
                  onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </div>
              <div>
                <Label htmlFor="spi-fb">Facebook URL (optional)</Label>
                <Input
                  id="spi-fb"
                  value={form.facebook_url}
                  onChange={(e) => setForm((f) => ({ ...f, facebook_url: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="spi-am">Audiomack URL (optional)</Label>
                <Input
                  id="spi-am"
                  value={form.audiomack_url}
                  onChange={(e) => setForm((f) => ({ ...f, audiomack_url: e.target.value }))}
                />
              </div>
            </div>
            <ImageUrlField
              label="Thumbnail (optional)"
              value={form.thumbnail_url}
              onChange={(url) => setForm((f) => ({ ...f, thumbnail_url: url }))}
            />
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="spi-pub">Published</Label>
              <Switch
                id="spi-pub"
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
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
