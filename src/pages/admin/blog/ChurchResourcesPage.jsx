import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import { readTextFile } from "../../../lib/resourceDocument";
import { isMediaResourceKind } from "../../../lib/mediaEmbeds";
import RichTextEditor from "../../../components/admin/RichTextEditor";
import ImageUrlField from "../../../components/admin/ImageUrlField";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { useConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Card } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

const KIND_META = {
  bible_study: {
    title: "Monday Bible Study",
    dateField: "week_of",
    dateLabel: "Week of (Monday)",
    hint: "Upload a .txt or .md file to import content, or write directly in the editor.",
    media: false,
  },
  daily_manna: {
    title: "Daily Manna",
    dateField: "study_date",
    dateLabel: "Date",
    hint: "Publish a daily devotional. Upload .txt/.md to auto-fill the editor.",
    media: false,
  },
  sunday_sermon: {
    title: "Sunday service sermons",
    dateField: "service_date",
    dateLabel: "Service date",
    hint: "Add YouTube, Facebook, and/or Audiomack links. Visitors can watch on the website without leaving the page.",
    media: true,
    tabHint: "Sunday Sermons",
  },
  choir_ministration: {
    title: "Choir ministrations",
    dateField: "service_date",
    dateLabel: "Service date",
    hint: "Publish choir / worship videos with platform links for in-site preview and download/open.",
    media: true,
    tabHint: "Choir",
  },
};

const emptyForm = (kind) => ({
  kind,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  week_of: "",
  study_date: "",
  service_date: "",
  attachment_url: "",
  youtube_url: "",
  facebook_url: "",
  audiomack_url: "",
  thumbnail_url: "",
  published: true,
});

export default function ChurchResourcesPage({ kind = "bible_study" }) {
  const meta = KIND_META[kind] || KIND_META.bible_study;
  const isMedia = meta.media || isMediaResourceKind(kind);
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm(kind));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await authApi.listChurchResources(kind);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setForm(emptyForm(kind));
  }, [kind]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(kind));
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      kind: row.kind || kind,
      title: row.title || "",
      slug: row.slug || "",
      excerpt: row.excerpt || "",
      content: row.content || "",
      week_of: row.week_of || "",
      study_date: row.study_date || "",
      service_date: row.service_date || "",
      attachment_url: row.attachment_url || "",
      youtube_url: row.youtube_url || "",
      facebook_url: row.facebook_url || "",
      audiomack_url: row.audiomack_url || "",
      thumbnail_url: row.thumbnail_url || "",
      published: row.published !== false,
    });
    setOpen(true);
  };

  const onImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await readTextFile(file);
      const plain = text.replace(/<[^>]+>/g, " ").trim();
      setForm((prev) => ({
        ...prev,
        content: text.includes("<") ? text : `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`,
        excerpt: prev.excerpt || plain.slice(0, 180),
        title: prev.title || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      }));
      toast.success("Document imported into the editor");
    } catch (err) {
      toast.error(err.message || "Import failed");
    } finally {
      event.target.value = "";
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (isMedia && !form.youtube_url && !form.facebook_url && !form.audiomack_url && !form.attachment_url) {
      toast.error("Add at least one video/audio link or attachment");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertChurchResource(editing?.id || null, form);
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: "Delete this entry?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await authApi.deleteChurchResource(id);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Delete failed");
    }
  };

  const dateValue = form[meta.dateField] || "";

  return (
    <div>
      {confirmDialog}
      <PageToolbar
        className="mb-6"
        align="start"
        left={(
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{meta.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{meta.hint}</p>
            <p className="text-sm text-gray-500 mt-1">
              Public page: <Link to="/blog" className="text-red-600 hover:underline">/blog</Link>
              {meta.tabHint ? ` → ${meta.tabHint} tab` : ` → ${meta.title} tab`}
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" /> Add entry
          </Button>
        ) : null}
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No entries yet.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-4 flex flex-wrap items-start gap-4 justify-between">
              <div className="min-w-0 flex-1 flex gap-3">
                {isMedia && row.thumbnail_url ? (
                  <img src={row.thumbnail_url} alt="" className="h-16 w-24 rounded-lg object-cover shrink-0 bg-gray-100" />
                ) : null}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{row.title}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{row.excerpt}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {meta.dateLabel}: {row[meta.dateField] || "—"} · {row.published ? "Published" : "Draft"}
                    {isMedia ? (
                      <>
                        {" · "}
                        {[row.youtube_url && "YouTube", row.facebook_url && "Facebook", row.audiomack_url && "Audiomack"]
                          .filter(Boolean)
                          .join(" · ") || "No links"}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button size="icon" variant="outline" className="text-red-600" onClick={() => remove(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${meta.title}` : `New ${meta.title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!isMedia && (
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept=".txt,.md,.html,.htm" className="hidden" onChange={onImportFile} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Import .txt / .md
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{meta.dateLabel}</Label>
              <Input
                type="date"
                value={dateValue}
                onChange={(e) => setForm({ ...form, [meta.dateField]: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>

            {isMedia ? (
              <>
                <div className="grid sm:grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                  <p className="text-sm font-medium text-gray-800">Media links</p>
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <Input
                      value={form.youtube_url}
                      onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook video URL</Label>
                    <Input
                      value={form.facebook_url}
                      onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                      placeholder="https://www.facebook.com/…/videos/…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Audiomack URL</Label>
                    <Input
                      value={form.audiomack_url}
                      onChange={(e) => setForm({ ...form, audiomack_url: e.target.value })}
                      placeholder="https://audiomack.com/…"
                    />
                  </div>
                </div>
                <ImageUrlField
                  id="media-thumb"
                  label="Cover / thumbnail image (optional)"
                  value={form.thumbnail_url}
                  onChange={(thumbnail_url) => setForm({ ...form, thumbnail_url })}
                />
                <ImageUrlField
                  id="resource-attachment"
                  label="Downloadable file URL (optional PDF/audio file)"
                  value={form.attachment_url}
                  onChange={(attachment_url) => setForm({ ...form, attachment_url })}
                />
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Scripture reference, preacher, choir set list…"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <RichTextEditor value={form.content} onChange={(content) => setForm({ ...form, content })} />
                </div>
                <ImageUrlField
                  id="resource-attachment"
                  label="Attachment file URL (optional PDF/Word for download)"
                  value={form.attachment_url}
                  onChange={(attachment_url) => setForm({ ...form, attachment_url })}
                />
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={Boolean(form.published)} onCheckedChange={(published) => setForm({ ...form, published })} />
              <Label>Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
