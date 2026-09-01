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
import { PageToolbar } from "./PageToolbar";
import { MonthWelcomeBannerPanel } from "./MonthWelcomeBannerPanel";

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

function toTimeInput(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const emptyForm = () => ({
  title: "",
  body: "",
  image: "",
  link_url: "",
  link_text: "Learn more",
  starts_at: toLocalInput(new Date().toISOString()),
  ends_at: "",
  is_active: true,
  show_once: false,
  display_scope: "home",
  route_enabled: true,
  placement: "both",
  repeat_interval: "none",
  daily_end_time: "",
  rotate_seconds: 12,
  accent_color: "#b91c1c",
  button_color: "#fbbf24",
  delay_seconds: 3,
  popup_mode: "every_visit",
});

const fmt = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d || "—";
  }
};

const placementLabel = {
  popup: "Popup",
  sticky: "Sticky marquee",
  both: "Popup + sticky",
};

const repeatLabel = {
  none: "One-time window",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function BannerFields({ form, setForm, idPrefix }) {
  const recurring = form.repeat_interval && form.repeat_interval !== "none";
  const usesSticky = form.placement === "sticky" || form.placement === "both";
  const usesPopup = form.placement === "popup" || form.placement === "both";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Message / paragraph</Label>
        <Textarea
          rows={3}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Shown in the popup and scrolling sticky banner"
        />
      </div>
      {usesPopup && (
        <ImageUrlField
          id={`${idPrefix}-image`}
          label="Popup image / flyer"
          value={form.image}
          onChange={(v) => setForm({ ...form, image: v })}
        />
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Banner location</Label>
          <select
            className={selectClass}
            value={form.placement}
            onChange={(e) => setForm({ ...form, placement: e.target.value })}
          >
            <option value="popup">Popup only</option>
            <option value="sticky">Sticky marquee only</option>
            <option value="both">Both popup and sticky</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Show on</Label>
          <select
            className={selectClass}
            value={form.display_scope}
            onChange={(e) => setForm({ ...form, display_scope: e.target.value })}
          >
            <option value="home">Homepage only</option>
            <option value="site">All public pages</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Repeat</Label>
          <select
            className={selectClass}
            value={form.repeat_interval}
            onChange={(e) => setForm({ ...form, repeat_interval: e.target.value })}
          >
            <option value="none">One-time (between start and end)</option>
            <option value="weekly">Weekly (same weekday as start)</option>
            <option value="monthly">Monthly (same date each month)</option>
            <option value="yearly">Yearly (same month and day)</option>
          </select>
        </div>
        {usesSticky && (
          <div className="space-y-2">
            <Label>Sticky rotation (seconds)</Label>
            <Input
              type="number"
              min={4}
              max={180}
              value={form.rotate_seconds}
              onChange={(e) => setForm({ ...form, rotate_seconds: Number(e.target.value) || 12 })}
            />
            <p className="text-xs text-gray-500">How long this banner stays in the marquee before the next one</p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Popup delay (seconds)</Label>
          <Input
            type="number"
            min={0}
            max={30}
            value={form.delay_seconds}
            onChange={(e) => setForm({ ...form, delay_seconds: Number(e.target.value) })}
          />
          <p className="text-xs text-gray-500">
            Wait this long before the first popup on a visit, and again between popups after Close (default 3).
          </p>
        </div>
        <div className="space-y-2">
          <Label>Popup frequency</Label>
          <select
            className={selectClass}
            value={form.popup_mode}
            onChange={(e) => setForm({ ...form, popup_mode: e.target.value, show_once: e.target.value === "once" })}
          >
            <option value="every_visit">Every homepage visit (until Don't show again)</option>
            <option value="once">Once per visitor (Close also hides it)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Sticky background color</Label>
          <Input type="color" value={form.accent_color || "#b91c1c"} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Sticky button color</Label>
          <Input type="color" value={form.button_color || "#fbbf24"} onChange={(e) => setForm({ ...form, button_color: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{recurring ? "First appearance / pattern start" : "Starts at"}</Label>
          <Input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Campaign ends at (optional)</Label>
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          />
        </div>
        {recurring && (
          <div className="space-y-2">
            <Label>Hide after (time of day, optional)</Label>
            <Input
              type="time"
              value={form.daily_end_time}
              onChange={(e) => setForm({ ...form, daily_end_time: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              On matching days, shows from the start time until this time. Leave empty for the rest of the day.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Link URL</Label>
          <Input
            placeholder="https://… or /register/youth-convention-2026"
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            disabled={!form.route_enabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Link button text</Label>
          <Input
            value={form.link_text}
            onChange={(e) => setForm({ ...form, link_text: e.target.value })}
            disabled={!form.route_enabled}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Route to page</p>
            <p className="text-xs text-gray-500">Link the banner to a registration or event page</p>
          </div>
          <Switch
            checked={form.route_enabled}
            onCheckedChange={(v) => setForm({ ...form, route_enabled: Boolean(v) })}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-gray-500">Only active banners can appear</p>
          </div>
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })}
          />
        </div>
        {usesPopup && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Show popup once per visitor</p>
              <p className="text-xs text-gray-500">Sticky marquee stays visible while the banner is live</p>
            </div>
            <Switch
              checked={form.show_once}
              onCheckedChange={(v) => setForm({ ...form, show_once: Boolean(v) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function payloadFromForm(form) {
  const popupMode = form.popup_mode || (form.show_once ? "once" : "every_visit");
  return {
    title: form.title,
    body: form.body,
    image: form.image,
    link_url: form.link_url,
    link_text: form.link_text,
    starts_at: fromLocalInput(form.starts_at) || new Date().toISOString(),
    ends_at: fromLocalInput(form.ends_at) || null,
    is_active: form.is_active,
    display_scope: form.display_scope,
    route_enabled: form.route_enabled,
    placement: form.placement,
    repeat_interval: form.repeat_interval,
    daily_end_time: form.daily_end_time || null,
    rotate_seconds: form.rotate_seconds || 12,
    accent_color: form.accent_color || "#b91c1c",
    button_color: form.button_color || "#fbbf24",
    delay_seconds: Number(form.delay_seconds) || 3,
    popup_mode: popupMode,
    show_once: popupMode === "once",
  };
}

export function AnnouncementsPanel() {
  const { can } = useAuth();
  const canEdit = can("banners", "edit") || can("home.announcements", "edit") || can("home.hero", "edit");
  const canDelete = can("banners", "delete") || can("home.announcements", "delete") || can("home.hero", "edit");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [drafts, setDrafts] = useState([emptyForm()]);
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
      if (item.repeat_interval && item.repeat_interval !== "none") {
        return { label: `Repeats ${item.repeat_interval}`, tone: "bg-emerald-100 text-emerald-800" };
      }
      return { label: "Live", tone: "bg-green-100 text-green-800" };
    },
    []
  );

  const openCreate = () => {
    setEditing(null);
    setDrafts([emptyForm()]);
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setDrafts([
      {
        title: item.title || "",
        body: item.body || "",
        image: item.image || "",
        link_url: item.link_url || "",
        link_text: item.link_text || "Learn more",
        starts_at: toLocalInput(item.starts_at),
        ends_at: toLocalInput(item.ends_at),
        is_active: Boolean(item.is_active),
        show_once: Boolean(item.show_once),
        display_scope: item.display_scope || "home",
        route_enabled: item.route_enabled !== false,
        placement: item.placement || "popup",
        repeat_interval: item.repeat_interval || "none",
        daily_end_time: toTimeInput(item.daily_end_time),
        rotate_seconds: item.rotate_seconds || 12,
        accent_color: item.accent_color || "#b91c1c",
        button_color: item.button_color || "#fbbf24",
        delay_seconds: item.delay_seconds ?? 3,
        popup_mode: item.popup_mode || (item.show_once ? "once" : "every_visit"),
      },
    ]);
    setOpen(true);
  };

  const updateDraft = (idx, next) => {
    setDrafts((rows) => rows.map((row, i) => (i === idx ? next : row)));
  };

  const save = async () => {
    const missing = drafts.find((d) => !d.title.trim());
    if (missing) {
      toast.error("Each banner needs a title");
      return;
    }
    setSaving(true);
    try {
      for (const form of drafts) {
        await authApi.upsertAnnouncement(editing?.id || null, payloadFromForm(form));
      }
      toast.success(
        editing
          ? "Banner updated"
          : drafts.length > 1
            ? `${drafts.length} banners created`
            : "Banner created"
      );
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
      <Card className="p-5 mb-8 border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
        <MonthWelcomeBannerPanel canEdit={canEdit} />
      </Card>

      <PageToolbar
        className="mb-6"
        align="start"
        left={(
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Banners</h2>
            <p className="text-sm text-gray-500 mt-1">
              Popup flyers and a sticky marquee above the navbar. Set location, schedule, and weekly / monthly / yearly repeat. Create several at once with different intervals.
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Add banners
          </Button>
        ) : null}
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No banners yet.</Card>
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
                    <Badge variant="outline">{placementLabel[item.placement] || "Popup"}</Badge>
                    {item.repeat_interval && item.repeat_interval !== "none" && (
                      <Badge variant="secondary">{repeatLabel[item.repeat_interval]}</Badge>
                    )}
                    <Badge variant="outline">
                      {item.display_scope === "site" ? "Site-wide" : "Homepage"}
                    </Badge>
                    {(item.placement === "sticky" || item.placement === "both") && (
                      <Badge variant="secondary">{item.rotate_seconds || 12}s rotate</Badge>
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
            <DialogTitle>{editing ? "Edit banner" : "New event banners"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {drafts.map((form, idx) => (
              <div key={idx} className={drafts.length > 1 ? "rounded-lg border border-gray-100 p-4" : ""}>
                {drafts.length > 1 && (
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Banner {idx + 1}</p>
                    {idx > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => setDrafts((rows) => rows.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
                <BannerFields
                  form={form}
                  setForm={(next) => updateDraft(idx, next)}
                  idPrefix={`banner-${idx}`}
                />
              </div>
            ))}
            {!editing && (
              <Button type="button" variant="outline" onClick={() => setDrafts((rows) => [...rows, emptyForm()])}>
                <Plus className="h-4 w-4 mr-2" />
                Add another banner
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Saving…" : editing ? "Save" : drafts.length > 1 ? `Save ${drafts.length} banners` : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default AnnouncementsPanel;
