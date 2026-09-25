import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Loader2,
  Mail,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import { useConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import RichTextEditor from "../../../components/admin/RichTextEditor";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";

const CATEGORIES = [
  { id: "trait", label: "Trait" },
  { id: "prophecy", label: "Prophecy" },
  { id: "fact", label: "Fact" },
  { id: "riddle", label: "Riddle" },
];

const STATUSES = [
  { id: "draft", label: "Draft" },
  { id: "queued", label: "Queued" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
];

const emptyForm = () => ({
  category: "fact",
  title: "",
  body: "",
  scripture_ref: "",
  answer: "",
  status: "queued",
  sort_order: 0,
});

function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function DailyGrowthAdminPage() {
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const [rows, setRows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spooling, setSpooling] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const load = async () => {
    setLoading(true);
    try {
      const [items, set, runList] = await Promise.all([
        authApi.listDailyGrowth(
          filterCat === "all" ? null : filterCat,
          filterStatus === "all" ? null : filterStatus
        ),
        authApi.getDailyGrowthSettings(),
        authApi.listDailyGrowthRuns(14),
      ]);
      setRows(Array.isArray(items) ? items : []);
      setSettings(set || null);
      setRuns(Array.isArray(runList) ? runList : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load Daily Growth");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, filterStatus]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      category: row.category || "fact",
      title: row.title || "",
      body: row.body || "",
      scripture_ref: row.scripture_ref || "",
      answer: row.answer || "",
      status: row.status || "draft",
      sort_order: row.sort_order || 0,
      published_on: row.published_on || "",
    });
    setOpen(true);
  };

  const saveItem = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertDailyGrowth(editing?.id || null, form);
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
      title: "Delete this item?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await authApi.deleteDailyGrowth(id);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Delete failed");
    }
  };

  const saveSettings = async (patch) => {
    try {
      const next = await authApi.updateDailyGrowthSettings(patch);
      setSettings(next);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not save settings");
    }
  };

  const toggleCategory = (id) => {
    const current = Array.isArray(settings?.categories_enabled)
      ? [...settings.categories_enabled]
      : ["trait", "prophecy", "fact", "riddle"];
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    if (!next.length) {
      toast.error("Keep at least one category enabled");
      return;
    }
    saveSettings({ categories_enabled: next });
  };

  const runSpool = async ({ skipEmail = false, emailOnly = false } = {}) => {
    setSpooling(true);
    try {
      const result = await authApi.triggerDailyGrowthSpool({
        force: true,
        skipEmail,
        emailOnly,
      });
      const count = result?.spool?.count ?? result?.emails_sent ?? 0;
      toast.success(
        emailOnly
          ? `Digest sent (${result.emails_sent || 0} ok, ${result.emails_failed || 0} failed)`
          : skipEmail
            ? `Published ${count} item(s) for today`
            : `Spool done — ${count} published, ${result.emails_sent || 0} emails sent`
      );
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Spool failed");
    } finally {
      setSpooling(false);
    }
  };

  const enabledCats = Array.isArray(settings?.categories_enabled)
    ? settings.categories_enabled
    : ["trait", "prophecy", "fact", "riddle"];

  return (
    <div>
      {confirmDialog}
      <PageToolbar
        className="mb-6"
        align="start"
        left={(
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-red-600" /> Daily Growth
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Queue traits, prophecies, facts, and riddles. Cron publishes one per category daily and can email members.
              Public:{" "}
              <a href="/blog?tab=daily-growth" className="text-red-600 hover:underline" target="_blank" rel="noreferrer">
                /blog?tab=daily-growth
              </a>
            </p>
          </div>
        )}
        right={canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={spooling} onClick={() => runSpool({ skipEmail: true })}>
              {spooling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Run spool now
            </Button>
            <Button variant="outline" disabled={spooling} onClick={() => runSpool({ emailOnly: true })}>
              {spooling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send digest
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add item
            </Button>
          </div>
        ) : null}
      />

      {settings ? (
        <Card className="p-4 mb-6 border-0 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">Spool settings</p>
              <p className="text-xs text-gray-500">
                Last run: {fmtWhen(settings.last_run_at)} · {settings.last_run_status || "—"} ·{" "}
                {settings.last_run_message || ""}
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-sm font-medium">Cron spool enabled</span>
              <Switch
                checked={Boolean(settings.enabled)}
                disabled={!canEdit}
                onCheckedChange={(enabled) => saveSettings({ enabled })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-sm font-medium">Email digest</span>
              <Switch
                checked={Boolean(settings.email_enabled)}
                disabled={!canEdit}
                onCheckedChange={(email_enabled) => saveSettings({ email_enabled })}
              />
            </label>
            <div className="space-y-1">
              <Label className="text-xs">Cron hour (Lagos)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={settings.cron_hour ?? 6}
                disabled={!canEdit}
                onChange={(e) => setSettings({ ...settings, cron_hour: Number(e.target.value) })}
                onBlur={() => canEdit && saveSettings({ cron_hour: settings.cron_hour })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs">Email subject</Label>
              <Input
                value={settings.email_subject_template || ""}
                disabled={!canEdit}
                onChange={(e) => setSettings({ ...settings, email_subject_template: e.target.value })}
                onBlur={() =>
                  canEdit && saveSettings({ email_subject_template: settings.email_subject_template })
                }
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Categories to spool</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = enabledCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleCategory(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      on ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-gray-500 border-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8 text-center">Loading…</p>
      ) : (
        <div className="space-y-3 mb-10">
          {rows.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No items yet. Add queued content for the cron to pick.</p>
          ) : (
            rows.map((row) => (
              <Card key={row.id} className="p-4 border-0 shadow-sm flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <Badge variant="outline">{row.category}</Badge>
                    <Badge className={row.status === "queued" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}>
                      {row.status}
                    </Badge>
                    {row.published_on ? <Badge variant="secondary">{row.published_on}</Badge> : null}
                  </div>
                  <p className="font-semibold text-gray-900">{row.title}</p>
                  {row.scripture_ref ? <p className="text-xs text-gray-500 mt-0.5">{row.scripture_ref}</p> : null}
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    {row.status !== "archived" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => authApi.upsertDailyGrowth(row.id, { ...row, status: "archived" }).then(load)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Recent runs</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Emails</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    No runs yet
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{r.run_date}</td>
                    <td className="px-3 py-2">{Array.isArray(r.items) ? r.items.length : 0}</td>
                    <td className="px-3 py-2">
                      {r.emails_sent || 0} / fail {r.emails_failed || 0}
                    </td>
                    <td className="px-3 py-2">{r.status}{r.error ? ` — ${r.error}` : ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "Add Daily Growth item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Body</Label>
              <RichTextEditor value={form.body} onChange={(body) => setForm({ ...form, body })} />
            </div>
            <div className="space-y-1">
              <Label>Scripture reference</Label>
              <Input
                value={form.scripture_ref}
                onChange={(e) => setForm({ ...form, scripture_ref: e.target.value })}
                placeholder="e.g. John 11:35"
              />
            </div>
            {form.category === "riddle" ? (
              <div className="space-y-1">
                <Label>Answer</Label>
                <Textarea
                  rows={2}
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={saving} onClick={saveItem}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
