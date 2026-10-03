import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Church,
  ImagePlus,
  Loader2,
  Mail,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authApi, formatApiError } from "../../lib/api";
import { useConfirmDialog } from "../../components/admin/ConfirmDialog";
import { PageToolbar } from "../../components/admin/PageToolbar";
import MediaLibraryModal from "../../components/admin/MediaLibraryModal";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const DIGEST_KINDS = [
  { id: "blog_post", label: "Articles" },
  { id: "daily_manna", label: "Daily Manna" },
  { id: "bible_study", label: "Monday Bible Study" },
  { id: "sunday_sermon", label: "Sunday sermons" },
  { id: "choir_ministration", label: "Choir" },
];

function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    });
  } catch {
    return "—";
  }
}

const emptyImageForm = () => ({
  kind: "bible_study",
  url: "",
  title: "",
  active: true,
  sort_order: 0,
});

export default function MemberEmailsAdminPage() {
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const [settings, setSettings] = useState(null);
  const [images, setImages] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState("");
  const [imgOpen, setImgOpen] = useState(false);
  const [editingImg, setEditingImg] = useState(null);
  const [imgForm, setImgForm] = useState(emptyImageForm());
  const [mediaOpen, setMediaOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [set, imgs, runList] = await Promise.all([
        authApi.getContentEmailSettings(),
        authApi.listReminderImages(),
        authApi.listContentEmailRuns(20),
      ]);
      if (set && Array.isArray(set.digest_kinds)) {
        set.digest_kinds = set.digest_kinds.filter((id) => id !== "daily_growth");
      }
      setSettings(set || null);
      setImages(Array.isArray(imgs) ? imgs : []);
      setRuns(Array.isArray(runList) ? runList : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load member emails");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patchSettings = async (patch) => {
    setSaving(true);
    try {
      const next = await authApi.updateContentEmailSettings(patch);
      setSettings(next);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveSettingsForm = async () => {
    if (!settings) return;
    await patchSettings({
      digest_enabled: settings.digest_enabled,
      digest_subject: settings.digest_subject,
      digest_intro: settings.digest_intro,
      digest_kinds: (Array.isArray(settings.digest_kinds) ? settings.digest_kinds : []).filter(
        (id) => id !== "daily_growth"
      ),
      bible_study_enabled: settings.bible_study_enabled,
      bible_study_subject: settings.bible_study_subject,
      bible_study_body: settings.bible_study_body,
      bible_study_cta_label: settings.bible_study_cta_label,
      bible_study_cta_path: settings.bible_study_cta_path,
      sunday_enabled: settings.sunday_enabled,
      sunday_subject: settings.sunday_subject,
      sunday_body: settings.sunday_body,
      sunday_cta_label: settings.sunday_cta_label,
      sunday_cta_path: settings.sunday_cta_path,
    });
  };

  const toggleKind = (id) => {
    const current = Array.isArray(settings?.digest_kinds)
      ? [...settings.digest_kinds]
      : DIGEST_KINDS.map((k) => k.id);
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    if (!next.length) {
      toast.error("Keep at least one content type");
      return;
    }
    setSettings({ ...settings, digest_kinds: next });
  };

  const runJob = async (job, { dryRun = false } = {}) => {
    setRunning(job + (dryRun ? "-dry" : ""));
    try {
      const result = await authApi.triggerMemberContentEmails({ job, force: true, dryRun });
      if (dryRun) {
        toast.success(
          result.skipped
            ? `Dry run: skipped (${result.reason || "n/a"})`
            : `Dry run OK — ${result.item_count ?? 0} items, subject: ${result.subject || "—"}`
        );
      } else if (result.skipped) {
        toast.message(`Skipped: ${result.reason || "nothing to send"}`);
      } else {
        toast.success(
          `Sent ${result.emails_sent || 0} · failed ${result.emails_failed || 0} (${result.recipients || 0} recipients)`
        );
      }
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Job failed");
    } finally {
      setRunning("");
    }
  };

  const openCreateImage = (kind = "bible_study") => {
    setEditingImg(null);
    setImgForm({ ...emptyImageForm(), kind });
    setImgOpen(true);
  };

  const openEditImage = (row) => {
    setEditingImg(row);
    setImgForm({
      kind: row.kind || "bible_study",
      url: row.url || "",
      title: row.title || "",
      active: row.active !== false,
      sort_order: row.sort_order || 0,
    });
    setImgOpen(true);
  };

  const saveImage = async () => {
    if (!imgForm.url.trim()) {
      toast.error("Image URL is required");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertReminderImage(editingImg?.id || null, imgForm);
      toast.success(editingImg ? "Image updated" : "Image added");
      setImgOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not save image");
    } finally {
      setSaving(false);
    }
  };

  const removeImage = async (id) => {
    const ok = await confirm({
      title: "Remove this reminder image?",
      description: "It will no longer appear in the weekly shuffle.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await authApi.deleteReminderImage(id);
      toast.success("Removed");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Delete failed");
    }
  };

  const enabledKinds = Array.isArray(settings?.digest_kinds)
    ? settings.digest_kinds
    : DIGEST_KINDS.map((k) => k.id);

  const bibleImages = images.filter((i) => i.kind === "bible_study");
  const sundayImages = images.filter((i) => i.kind === "sunday_service");

  return (
    <div>
      {confirmDialog}
      <PageToolbar
        className="mb-6"
        align="start"
        left={(
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-red-600" /> Member emails
            </h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              What's new at 4:00 PM UK, Daily Growth at its 6:00 AM UK cron, Monday Bible Study reminders (4:30 PM WAT),
              and Saturday Sunday-service reminders (9:30 PM WAT). The digest does not include Daily Growth. Images rotate weekly from the pools below.
            </p>
          </div>
        )}
        right={canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" size="sm" onClick={saveSettingsForm} disabled={saving || !settings}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save settings
            </Button>
          </div>
        ) : null}
      />

      {loading && !settings ? (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {settings?.last_message ? (
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              Last run: {settings.last_message}
              {settings.last_digest_at ? ` · Digest ${fmtWhen(settings.last_digest_at)}` : ""}
              {settings.last_bible_study_at ? ` · Bible study ${fmtWhen(settings.last_bible_study_at)}` : ""}
              {settings.last_sunday_at ? ` · Sunday ${fmtWhen(settings.last_sunday_at)}` : ""}
            </p>
          ) : null}

          <Card className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-gray-900">Content digest</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Summaries of newly published posts with Read more links. Cron: daily 07:00 Africa/Lagos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={Boolean(settings?.digest_enabled)}
                  onCheckedChange={(v) => setSettings({ ...settings, digest_enabled: v })}
                  disabled={!canEdit}
                />
                <span className="text-sm text-gray-600">Enabled</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Subject (use {"{{date}}"})</Label>
                <Input
                  value={settings?.digest_subject || ""}
                  onChange={(e) => setSettings({ ...settings, digest_subject: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Intro</Label>
                <Textarea
                  rows={3}
                  value={settings?.digest_intro || ""}
                  onChange={(e) => setSettings({ ...settings, digest_intro: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Include content types</Label>
              <div className="flex flex-wrap gap-2">
                {DIGEST_KINDS.map((k) => {
                  const on = enabledKinds.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleKind(k.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        on
                          ? "bg-red-50 border-red-200 text-red-800"
                          : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(running)}
                  onClick={() => runJob("digest", { dryRun: true })}
                >
                  Preview digest
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(running)}
                  onClick={() => runJob("digest")}
                >
                  {running.startsWith("digest") ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Send digest now
                </Button>
              </div>
            ) : null}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  <BookOpen className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Bible Study reminder</h3>
                    <p className="text-sm text-gray-500">Monday 4:30 PM WAT · image shuffle from pool</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(settings?.bible_study_enabled)}
                  onCheckedChange={(v) => setSettings({ ...settings, bible_study_enabled: v })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={settings?.bible_study_subject || ""}
                  onChange={(e) => setSettings({ ...settings, bible_study_subject: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={settings?.bible_study_body || ""}
                  onChange={(e) => setSettings({ ...settings, bible_study_body: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CTA label</Label>
                  <Input
                    value={settings?.bible_study_cta_label || ""}
                    onChange={(e) => setSettings({ ...settings, bible_study_cta_label: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA path</Label>
                  <Input
                    value={settings?.bible_study_cta_path || ""}
                    onChange={(e) => setSettings({ ...settings, bible_study_cta_path: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(running)}
                  onClick={() => runJob("bible_study")}
                >
                  {running.startsWith("bible_study") ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Send Bible Study reminder
                </Button>
              ) : null}
            </Card>

            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  <Church className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Sunday Service reminder</h3>
                    <p className="text-sm text-gray-500">Saturday 9:30 PM WAT · image shuffle from pool</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(settings?.sunday_enabled)}
                  onCheckedChange={(v) => setSettings({ ...settings, sunday_enabled: v })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={settings?.sunday_subject || ""}
                  onChange={(e) => setSettings({ ...settings, sunday_subject: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={settings?.sunday_body || ""}
                  onChange={(e) => setSettings({ ...settings, sunday_body: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CTA label</Label>
                  <Input
                    value={settings?.sunday_cta_label || ""}
                    onChange={(e) => setSettings({ ...settings, sunday_cta_label: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA path</Label>
                  <Input
                    value={settings?.sunday_cta_path || ""}
                    onChange={(e) => setSettings({ ...settings, sunday_cta_path: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(running)}
                  onClick={() => runJob("sunday_service")}
                >
                  {running.startsWith("sunday_service") ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Send Sunday reminder
                </Button>
              ) : null}
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-gray-900">Reminder image pools</h3>
                <p className="text-sm text-gray-500">
                  Least-recently-used active image is picked each week (Bible Study vs Sunday).
                </p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openCreateImage("bible_study")}>
                    <Plus className="h-4 w-4 mr-1" /> Bible Study image
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => openCreateImage("sunday_service")}>
                    <Plus className="h-4 w-4 mr-1" /> Sunday image
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                { title: "Bible Study", rows: bibleImages },
                { title: "Sunday Service", rows: sundayImages },
              ].map((col) => (
                <div key={col.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{col.title}</p>
                  {!col.rows.length ? (
                    <p className="text-sm text-gray-400">No images yet — reminders still send without a hero image.</p>
                  ) : (
                    <ul className="space-y-2">
                      {col.rows.map((row) => (
                        <li
                          key={row.id}
                          className="flex gap-3 items-center border border-gray-100 rounded-lg p-2"
                        >
                          <img
                            src={row.url}
                            alt={row.title || ""}
                            className="h-14 w-20 object-cover rounded bg-gray-100"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{row.title || "Untitled"}</p>
                            <p className="text-xs text-gray-500">
                              {row.active ? "Active" : "Inactive"} · last used {fmtWhen(row.last_used_at)}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {canEdit ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => openEditImage(row)}>
                                Edit
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => removeImage(row.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Recent runs</h3>
            {!runs.length ? (
              <p className="text-sm text-gray-400">No runs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3 font-medium">When</th>
                      <th className="py-2 pr-3 font-medium">Job</th>
                      <th className="py-2 pr-3 font-medium">Sent</th>
                      <th className="py-2 pr-3 font-medium">Failed</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-2 pr-3 whitespace-nowrap">{fmtWhen(r.run_at)}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="secondary">{r.job}</Badge>
                        </td>
                        <td className="py-2 pr-3">{r.emails_sent}</td>
                        <td className="py-2 pr-3">{r.emails_failed}</td>
                        <td className="py-2">
                          <span className="text-gray-700">{r.status}</span>
                          {r.error ? (
                            <span className="block text-xs text-red-600 max-w-xs truncate" title={r.error}>
                              {r.error}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingImg ? "Edit reminder image" : "Add reminder image"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={imgForm.kind}
                onValueChange={(v) => setImgForm({ ...imgForm, kind: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bible_study">Bible Study</SelectItem>
                  <SelectItem value="sunday_service">Sunday Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={imgForm.title}
                onChange={(e) => setImgForm({ ...imgForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <div className="flex gap-2">
                <Input
                  value={imgForm.url}
                  onChange={(e) => setImgForm({ ...imgForm, url: e.target.value })}
                  placeholder="https://…"
                />
                <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}>
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              {imgForm.url ? (
                <img src={imgForm.url} alt="" className="mt-2 max-h-32 rounded border object-cover" />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={imgForm.active}
                onCheckedChange={(v) => setImgForm({ ...imgForm, active: v })}
              />
              <Label>Active in shuffle</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImgOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveImage} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaLibraryModal
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        selectedUrl={imgForm.url}
        title="Reminder image"
        description="Pick or upload an image for the weekly reminder shuffle."
        confirmLabel="Use image"
        onSelect={(url) => {
          setImgForm((f) => ({ ...f, url: url || "" }));
          setMediaOpen(false);
        }}
      />
    </div>
  );
}
