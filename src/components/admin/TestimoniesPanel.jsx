import React, { useEffect, useMemo, useState } from "react";
import api, { authApi, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { sendTestimonyPublishedEmail } from "../../lib/email";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { Check, X, Save, Trash2, Mail, Phone } from "lucide-react";
import ImageUrlField from "./ImageUrlField";
import { PageToolbar } from "./PageToolbar";

const fmt = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
};

const statusTone = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-600",
};

export const TestimoniesPanel = () => {
  const { can } = useAuth();
  const { settings } = useSettings();
  const canEdit = can("testimonies.list", "edit");
  const canDelete = can("testimonies.list", "delete");
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [notifyUser, setNotifyUser] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/testimonies?all=1");
      setItems(data || []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to load testimonies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((t) => (t.status || "published") === filter);
  }, [items, filter]);

  const selected = items.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    const current = items.find((t) => t.id === selectedId);
    if (!current) {
      setForm(null);
      return;
    }
    setForm({
      name: current.name || "",
      email: current.email || "",
      phone: current.phone || "",
      role: current.role || "",
      dateJoined: current.dateJoined || "",
      title: current.title || "",
      testimony: current.testimony || "",
      image: current.image || "",
      featured: Boolean(current.featured),
      admin_notes: current.admin_notes || "",
    });
    setNotifyUser(Boolean(current.email) && !current.publish_notify_sent);
  }, [selectedId, items]);

  const counts = useMemo(
    () => ({
      pending: items.filter((t) => t.status === "pending").length,
      published: items.filter((t) => t.status === "published").length,
      rejected: items.filter((t) => t.status === "rejected").length,
      all: items.length,
    }),
    [items]
  );

  const runAction = async (action) => {
    if (!selected || !form) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        dateJoined: form.dateJoined,
        title: form.title,
        testimony: form.testimony,
        image: form.image,
        featured: form.featured,
        admin_notes: form.admin_notes,
      };
      const row = await authApi.reviewTestimony(
        selected.id,
        action,
        payload,
        action === "publish" ? notifyUser : false
      );

      if (action === "publish" && notifyUser && form.email) {
        try {
          await sendTestimonyPublishedEmail({
            name: form.name,
            email: form.email,
            adminEmail: settings.notificationEmail || "adenugaolajideadewale@gmail.com",
          });
        } catch (emailErr) {
          console.warn("Publish notify email failed:", emailErr.message);
          toast.warning("Published, but the notification email could not be sent.");
        }
      }

      toast.success(
        action === "publish"
          ? "Testimony published"
          : action === "reject"
            ? "Testimony rejected"
            : action === "unpublish"
              ? "Testimony unpublished"
              : "Changes saved"
      );
      await load();
      if (row?.id) setSelectedId(row.id);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || !canDelete) return;
    if (!window.confirm("Delete this testimony permanently?")) return;
    await api.delete(`/testimonies/${selected.id}`);
    toast.success("Deleted");
    setSelectedId(null);
    await load();
  };

  return (
    <div data-testid="manager-testimonies">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Testimonies</h2>
      <p className="text-sm text-gray-500 mb-6">
        Review public submissions, edit for formality, then publish to the website.
      </p>

      <PageToolbar
        className="mb-6"
        left={[
          { key: "pending", label: `Pending (${counts.pending})` },
          { key: "published", label: `Published (${counts.published})` },
          { key: "rejected", label: `Rejected (${counts.rejected})` },
          { key: "all", label: `All (${counts.all})` },
        ].map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={filter === tab.key ? "default" : "outline"}
            className={filter === tab.key ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
        right={canEdit ? (
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={async () => {
              try {
                const { data } = await api.post("/testimonies", {
                  name: "New testimony",
                  role: "Church Member",
                  testimony: "Edit this testimony before publishing.",
                  status: "pending",
                  source: "admin",
                  featured: false,
                });
                toast.success("Draft created — edit and publish when ready");
                await load();
                if (data?.id) {
                  setFilter("pending");
                  setSelectedId(data.id);
                }
              } catch (err) {
                toast.error(formatApiError(err.response?.data?.detail) || "Could not create");
              }
            }}
          >
            Add testimony
          </Button>
        ) : null}
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">No testimonies in this view.</Card>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-xl border p-4 transition ${
                  selectedId === t.id
                    ? "border-red-300 bg-red-50 shadow-sm"
                    : "border-gray-100 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                      {t.title || t.testimony}
                    </p>
                  </div>
                  <Badge className={`${statusTone[t.status] || statusTone.published} hover:bg-inherit`}>
                    {t.status || "published"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {t.source === "form" ? "Form submission" : "Admin"} · {fmt(t.created_at)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-7">
          {!form || !selected ? (
            <Card className="p-10 text-center text-gray-500">
              Select a testimony to review or edit.
            </Card>
          ) : (
            <Card className="p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge className={`${statusTone[selected.status] || ""} hover:bg-inherit`}>
                    {selected.status}
                  </Badge>
                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}`}
                      className="ml-3 text-sm text-red-600 inline-flex items-center gap-1"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {selected.email}
                    </a>
                  )}
                  {selected.phone && (
                    <span className="ml-3 text-sm text-gray-500 inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {selected.phone}
                    </span>
                  )}
                </div>
                {canDelete && (
                  <Button size="icon" variant="outline" className="text-red-600" onClick={remove}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={form.role}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Member since</Label>
                  <Input
                    value={form.dateJoined}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, dateJoined: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Testimony (edit for formality)</Label>
                <Textarea
                  rows={6}
                  value={form.testimony}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, testimony: e.target.value })}
                />
              </div>

              <ImageUrlField
                id="testimony-image"
                label="Photo"
                value={form.image}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, image: v })}
              />

              <div className="space-y-2">
                <Label>Admin notes (internal)</Label>
                <Textarea
                  rows={2}
                  value={form.admin_notes}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Featured on homepage</p>
                  <p className="text-xs text-gray-500">Highlight in the homepage carousel</p>
                </div>
                <Switch
                  checked={form.featured}
                  disabled={!canEdit}
                  onCheckedChange={(v) => setForm({ ...form, featured: Boolean(v) })}
                />
              </div>

              {canEdit && selected.status !== "published" && (
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-100 p-4">
                  <Checkbox
                    id="notify-user"
                    checked={notifyUser}
                    onCheckedChange={(v) => setNotifyUser(Boolean(v))}
                    disabled={!form.email}
                  />
                  <Label htmlFor="notify-user" className="font-normal text-sm text-gray-700 leading-relaxed">
                    Email the submitter when this testimony is published
                    {!form.email && " (add an email above to enable)"}
                  </Label>
                </div>
              )}

              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => runAction("save")}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save edits
                  </Button>
                  {selected.status !== "published" && (
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      disabled={saving}
                      onClick={() => runAction("publish")}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                  )}
                  {selected.status === "published" && (
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => runAction("unpublish")}
                    >
                      Unpublish
                    </Button>
                  )}
                  {selected.status !== "rejected" && (
                    <Button
                      variant="outline"
                      className="text-gray-700"
                      disabled={saving}
                      onClick={() => runAction("reject")}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimoniesPanel;
