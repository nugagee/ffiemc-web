import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BookOpen, Film, FolderInput, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import { readTextFile } from "../../../lib/resourceDocument";
import { churchResourceFormat, isMediaResourceKind } from "../../../lib/mediaEmbeds";
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
    hint: "Choose Videos for sermon recordings, or Written for the study notes document. Both publish under Monday Bible Study — not Sunday sermons.",
    supportsFormat: true,
    publicPath: "/sermons?tab=bible-study",
    tabHint: "Monday Bible Study",
  },
  daily_manna: {
    title: "Daily Manna",
    dateField: "study_date",
    dateLabel: "Date",
    hint: "Publish a daily devotional. Upload .txt/.md to auto-fill the editor.",
    supportsFormat: false,
    media: false,
    publicPath: "/blog?tab=daily-manna",
    tabHint: "Daily Manna",
  },
  sunday_sermon: {
    title: "Sunday service sermons",
    dateField: "service_date",
    dateLabel: "Service date",
    hint: "Sunday service videos only. For Monday Bible Study videos, use Blog → Monday Bible Study → Videos.",
    supportsFormat: false,
    media: true,
    publicPath: "/sermons?tab=sunday-sermon",
    tabHint: "Sunday Sermons",
  },
  choir_ministration: {
    title: "Choir ministrations",
    dateField: "service_date",
    dateLabel: "Service date",
    hint: "Publish choir / worship videos with platform links for in-site preview and download/open.",
    supportsFormat: false,
    media: true,
    publicPath: "/sermons?tab=choir",
    tabHint: "Choir",
  },
};

const BIBLE_FORMATS = [
  { id: "video", label: "Videos / sermons", icon: Film },
  { id: "written", label: "Written version", icon: BookOpen },
];

const emptyForm = (kind, contentFormat = "written") => ({
  kind,
  content_format: kind === "bible_study" ? contentFormat : isMediaResourceKind(kind) ? "video" : "written",
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

function publicPathFor(meta, format) {
  if (!meta?.publicPath) return "/blog";
  if (meta.supportsFormat && (format === "video" || format === "written")) {
    return `${meta.publicPath}&cat=${format}`;
  }
  return meta.publicPath;
}

export default function ChurchResourcesPage({ kind = "bible_study" }) {
  const meta = KIND_META[kind] || KIND_META.bible_study;
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listFormat, setListFormat] = useState(meta.supportsFormat ? "video" : "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => emptyForm(kind, "video"));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const formIsMedia =
    meta.supportsFormat
      ? form.content_format === "video"
      : Boolean(meta.media || isMediaResourceKind(kind));

  const visibleRows = useMemo(() => {
    if (!meta.supportsFormat || listFormat === "all") return rows;
    return rows.filter((row) => churchResourceFormat(row) === listFormat);
  }, [rows, listFormat, meta.supportsFormat]);

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
    setForm(emptyForm(kind, meta.supportsFormat ? "video" : "written"));
    setListFormat(meta.supportsFormat ? "video" : "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const openCreate = () => {
    setEditing(null);
    const format = meta.supportsFormat ? (listFormat === "written" ? "written" : "video") : undefined;
    setForm(emptyForm(kind, format || "written"));
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      kind: row.kind || kind,
      content_format: churchResourceFormat(row),
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
        content: text.includes("<")
          ? text
          : `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`,
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
    if (
      formIsMedia &&
      !form.youtube_url &&
      !form.facebook_url &&
      !form.audiomack_url &&
      !form.attachment_url
    ) {
      toast.error("Add at least one video/audio link or attachment");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertChurchResource(editing?.id || null, form);
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      if (meta.supportsFormat) setListFormat(form.content_format === "written" ? "written" : "video");
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

  const moveToMondayBibleStudy = async (row) => {
    const ok = await confirm({
      title: "Move to Monday Bible Study?",
      description:
        "This video will leave Sunday sermons and appear under Monday Bible Study → Videos on the public site.",
      confirmLabel: "Move",
    });
    if (!ok) return;
    try {
      await authApi.upsertChurchResource(row.id, {
        ...row,
        kind: "bible_study",
        content_format: "video",
        week_of: row.week_of || row.service_date || "",
        service_date: "",
      });
      toast.success("Moved to Monday Bible Study → Videos");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not move entry");
    }
  };

  const dateValue = form[meta.dateField] || "";
  const previewPath = publicPathFor(
    meta,
    meta.supportsFormat ? form.content_format || listFormat : null
  );

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
              Public page:{" "}
              <Link to={previewPath} className="text-red-600 hover:underline">
                {previewPath}
              </Link>
              {meta.tabHint ? ` → ${meta.tabHint}` : ""}
              {meta.supportsFormat ? (
                <span>
                  {" "}
                  → {listFormat === "written" ? "Written version" : "Videos / sermons"}
                </span>
              ) : null}
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" /> Add entry
          </Button>
        ) : null}
      />

      {meta.supportsFormat ? (
        <div className="flex flex-wrap gap-2 mb-5">
          {BIBLE_FORMATS.map((f) => {
            const Icon = f.icon;
            const active = listFormat === f.id;
            const count = rows.filter((r) => churchResourceFormat(r) === f.id).length;
            return (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={active ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setListFormat(f.id)}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
              </Button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : visibleRows.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          {meta.supportsFormat
            ? `No ${listFormat === "written" ? "written studies" : "bible study videos"} yet. Add one here — it will appear under Monday Bible Study on the public sermons page.`
            : "No entries yet."}
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((row) => {
            const rowFormat = churchResourceFormat(row);
            const rowIsMedia = rowFormat === "video";
            return (
              <Card key={row.id} className="p-4 flex flex-wrap items-start gap-4 justify-between">
                <div className="min-w-0 flex-1 flex gap-3">
                  {rowIsMedia && row.thumbnail_url ? (
                    <img
                      src={row.thumbnail_url}
                      alt=""
                      className="h-16 w-24 rounded-lg object-cover shrink-0 bg-gray-100"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{row.title}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{row.excerpt}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {meta.supportsFormat ? (
                        <>
                          {rowFormat === "video" ? "Video / sermon" : "Written"} ·{" "}
                        </>
                      ) : null}
                      {meta.dateLabel}: {row[meta.dateField] || "—"} ·{" "}
                      {row.published ? "Published" : "Draft"}
                      {rowIsMedia ? (
                        <>
                          {" · "}
                          {[
                            row.youtube_url && "YouTube",
                            row.facebook_url && "Facebook",
                            row.audiomack_url && "Audiomack",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No links"}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canEdit && kind === "sunday_sermon" ? (
                    <Button
                      size="icon"
                      variant="outline"
                      title="Move to Monday Bible Study"
                      onClick={() => moveToMondayBibleStudy(row)}
                    >
                      <FolderInput className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canEdit && (
                    <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => remove(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${meta.title}` : `New ${meta.title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {meta.supportsFormat ? (
              <div className="space-y-2">
                <Label>Category *</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {BIBLE_FORMATS.map((f) => {
                    const Icon = f.icon;
                    const active = form.content_format === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, content_format: f.id }))}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          active
                            ? "border-red-500 bg-red-50 text-red-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-red-200"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>
                          <span className="block font-semibold text-sm">{f.label}</span>
                          <span className="block text-xs opacity-70 mt-0.5">
                            {f.id === "video"
                              ? "YouTube / Facebook / Audiomack under Monday Bible Study"
                              : "Notes & documents under Monday Bible Study"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!formIsMedia && (
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,.html,.htm"
                  className="hidden"
                  onChange={onImportFile}
                />
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
              <Textarea
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>

            {formIsMedia ? (
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
                    placeholder="Scripture reference, teacher, study theme…"
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
              <Switch
                checked={Boolean(form.published)}
                onCheckedChange={(published) => setForm({ ...form, published })}
              />
              <Label>Published</Label>
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
