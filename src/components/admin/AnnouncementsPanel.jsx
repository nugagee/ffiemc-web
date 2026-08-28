import { useEffect, useMemo, useState } from "react";
import { authApi, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import ImageUrlField from "./ImageUrlField";

function toLocalInput(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromLocalInput(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString();
  } catch {
    return "";
  }
}

const emptyForm = () => ({
  title: "",
  body: "",
  image: "",
  link_url: "",
  link_text: "Learn more",
  starts_at: toLocalInput(new Date().toISOString()),
  ends_at: "",
  is_active: true,
  show_once: true,
});

const fmt = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d || "—";
  }
};

export function AnnouncementsPanel() {
  const { can } = useAuth();
  const canEdit = can("home.announcements", "edit") || can("home.hero", "edit");
  const canDelete = can("home.announcements", "delete") || can("home.hero", "edit");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await authApi.listAnnouncements();
      setItems(rows || []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusOf = useMemo(
    () => (item) => {
      const now = Date.now();
      const start = item.starts_at ? new Date(item.starts_at).getTime() : 0;
      const end = item.ends_at ? new Date(item.ends_at).getTime() : null;
      if (!item.is_active) return { label: "Inactive", tone: "bg-gray-100 text-gray-600" };
      if (start > now) return { label: "Scheduled", tone: "bg-blue-100 text-blue-800" };
      if (end && end < now) return { label: "Expired", tone: "bg-amber-100 text-amber-800" };
      return { label: "Live", tone: "bg-green-100 text-green-800" };
    },
    []
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      body: item.body || "",
      image: item.image || "",
      link_url: item.link_url || "",
      link_text: item.link_text || "Learn more",
      starts_at: toLocalInput(item.starts_at),
      ends_at: toLocalInput(item.ends_at),
      is_active: Boolean(item.is_active),
      show_once: item.show_once !== false,
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
      await authApi.upsertAnnouncement(editing?.id || null, {
        title: form.title,
        body: form.body,
        image: form.image,
        link_url: form.link_url,
        link_text: form.link_text,
        starts_at: fromLocalInput(form.starts_at) || new Date().toISOString(),
        ends_at: fromLocalInput(form.ends_at) || null,
        is_active: form.is_active,
        show_once: form.show_once,
      });
      toast.success(editing ? "Announcement updated" : "Announcement created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await authApi.deleteAnnouncement(id);
    toast.success("Deleted");
    await load();
  };

  return (
    <div data-testid="manager-announcements">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcement popups</h2>
          <p className="text-sm text-gray-500 mt-1">
            Shown to visitors while active within the validity window. Set start/end times, image, and link.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Add announcement
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No announcements yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const status = statusOf(item);
            return (
              <Card key={item.id} className="p-4 flex flex-wrap items-start gap-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <Badge className={`${status.tone} hover:bg-inherit`}>{status.label}</Badge>
                    {item.show_once && (
                      <Badge variant="secondary">Show once</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {fmt(item.starts_at)} → {item.ends_at ? fmt(item.ends_at) : "No end"}
                    {item.link_url ? ` · Link: ${item.link_url}` : ""}
                  </p>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-2 shrink-0">
                    {canEdit && (
                      <Button size="icon" variant="outline" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto top-[5vh] translate-y-0">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <ImageUrlField
              id="announcement-image"
              label="Image"
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  placeholder="https://… or /events"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Link button text</Label>
                <Input
                  value={form.link_text}
                  onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Starts at</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ends at (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-gray-500">Only active announcements can appear</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Show once per visitor</p>
                  <p className="text-xs text-gray-500">
                    After dismiss, hide until this announcement changes
                  </p>
                </div>
                <Switch
                  checked={form.show_once}
                  onCheckedChange={(v) => setForm({ ...form, show_once: Boolean(v) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AnnouncementsPanel;
