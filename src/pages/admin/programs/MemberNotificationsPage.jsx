import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authApi, formatApiError } from "../../../lib/api";
import { deliverMemberNotifications } from "../../../lib/email";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Megaphone, Pencil, Plus, Send, Trash2, Users } from "lucide-react";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { RoleMultiSelect } from "../../../components/forms/RoleMultiSelect";

const emptyForm = (categoryId = "") => ({
  title: "",
  subject: "",
  body: "",
  category_id: categoryId,
  program_id: "",
  role_ids: [],
  branch_id: "",
  ministry: "",
  send_email: true,
  send_sms: false,
});

const statusTone = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-800",
  sending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function MemberNotificationsPage() {
  const { can } = useAuth();
  const canEdit = can("member_notifications", "edit");
  const canDelete = can("member_notifications", "delete");

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);

  const defaultCategoryId = useMemo(
    () =>
      categories.find((c) => c.slug === "all-members")?.id
      || categories.find((c) => c.slug === "all-active-members")?.id
      || categories[0]?.id
      || "",
    [categories]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.category_id),
    [categories, form.category_id]
  );
  const needsProgram = selectedCategory?.slug === "program-registrants";

  const audienceFilters = useMemo(() => {
    const filters = {};
    if (form.role_ids?.length) filters.role_ids = form.role_ids;
    if (form.branch_id) filters.branch_ids = [form.branch_id];
    if (form.ministry.trim()) filters.ministry = form.ministry.trim();
    if (form.program_id) {
      filters.program_id = form.program_id;
      filters.source = "program_registrants";
    }
    return filters;
  }, [form.role_ids, form.branch_id, form.ministry, form.program_id]);

  const load = async () => {
    setLoading(true);
    try {
      const [notifications, cats, progs, roleRows, branchRows] = await Promise.all([
        authApi.listMemberNotifications(),
        authApi.listNotificationCategories(),
        authApi.listPrograms(),
        authApi.listChurchRoles(),
        authApi.listChurchBranches(),
      ]);
      setRows(notifications || []);
      setCategories(cats || []);
      setPrograms(progs || []);
      setRoles(roleRows || []);
      setBranches(branchRows || []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(defaultCategoryId));
    setPreviewCount(null);
    setOpen(true);
  };

  const openEdit = (row) => {
    if (row.status === "sending") {
      toast.info("Wait until sending finishes");
      return;
    }
    const filters = row.audience_filters || {};
    setEditing(row);
    setForm({
      title: row.title || "",
      subject: row.subject || "",
      body: row.body || "",
      category_id: row.category_id || "",
      program_id: row.program_id || filters.program_id || "",
      role_ids: filters.role_ids || [],
      branch_id: (filters.branch_ids && filters.branch_ids[0]) || "",
      ministry: filters.ministry || "",
      send_email: row.send_email !== false,
      send_sms: Boolean(row.send_sms),
    });
    setPreviewCount(null);
    setOpen(true);
  };

  const previewRecipients = async () => {
    if (!form.category_id && !form.program_id && !form.role_ids?.length && !form.branch_id) {
      toast.error("Select an audience category or filters");
      return;
    }
    setPreviewing(true);
    try {
      const merged = { ...audienceFilters };
      if (form.category_id) {
        const cat = categories.find((c) => c.id === form.category_id);
        if (cat?.filters) Object.assign(merged, cat.filters, audienceFilters);
      }
      const list = await authApi.previewNotificationRecipients(merged);
      setPreviewCount((list || []).length);
      if (!list?.length) toast.warning("No recipients match this audience");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const save = async (publish = false) => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (!form.send_email && !form.send_sms) {
      toast.error("Select at least one channel (email or SMS)");
      return;
    }
    if (needsProgram && !form.program_id) {
      toast.error("Select a program for program registrants");
      return;
    }

    setSaving(true);
    try {
      const saved = await authApi.upsertMemberNotification(editing?.id || null, {
        title: form.title,
        subject: form.subject || form.title,
        body: form.body,
        category_id: form.category_id || null,
        program_id: form.program_id || null,
        audience_filters: audienceFilters,
        send_email: form.send_email,
        send_sms: form.send_sms,
        status: "draft",
      });

      if (publish) {
        setOpen(false);
        await publishNotification(saved);
      } else {
        toast.success(editing ? "Notification saved" : "Draft created");
        setOpen(false);
        await load();
      }
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publishNotification = async (row) => {
    if (!window.confirm(`Send "${row.title}" to matching members now?${row.status === "sent" ? " Recipients will receive the updated message." : ""}`)) return;

    const programTitle =
      row.program_title || programs.find((p) => p.id === row.program_id)?.title || "";

    setSending(true);
    setSendProgress({ current: 0, total: 0 });
    try {
      const start = await authApi.startMemberNotification(row.id);
      const deliveries = start?.deliveries || [];
      const total = deliveries.length;
      setSendProgress({ current: 0, total });

      const results = await deliverMemberNotifications({
        notification: { ...row, program_title: programTitle },
        deliveries,
        onProgress: (current, t) => setSendProgress({ current, total: t }),
      });

      await authApi.completeMemberNotification(row.id, results);
      const sent = results.filter((r) => r.status === "sent").length;
      const failed = results.length - sent;
      if (failed > 0) {
        toast.warning(`Sent to ${sent} recipients. ${failed} failed.`);
      } else {
        toast.success(`Announcement sent to ${sent} recipients`);
      }
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Send failed");
    } finally {
      setSending(false);
      setSendProgress(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await authApi.deleteMemberNotification(id);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Delete failed");
    }
  };

  const smsConfigured = Boolean(process.env.REACT_APP_SMS_API_URL && process.env.REACT_APP_SMS_API_KEY);

  return (
    <div className="max-w-6xl">
      <PageToolbar
        className="mb-4 sm:mb-6"
        align="start"
        left={(
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 shrink-0" />
              Member announcements
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Create and publish church program announcements to registered members by category — via email or SMS.
              Public sign-ups start as <span className="font-medium text-gray-700">pending</span>; choose
              {" "}<span className="font-medium text-gray-700">All registered members</span> or
              {" "}<span className="font-medium text-gray-700">Pending members</span> to include them
              (or approve the member under Registrations).
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            New announcement
          </Button>
        ) : null}
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No member announcements yet. Create one to notify members about upcoming programs.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-4 flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{row.title}</p>
                  <Badge className={`${statusTone[row.status] || statusTone.draft} hover:bg-inherit`}>
                    {row.status}
                  </Badge>
                  {row.send_email && <Badge variant="outline">Email</Badge>}
                  {row.send_sms && <Badge variant="outline">SMS</Badge>}
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{row.body}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {row.category_name ? `Category: ${row.category_name}` : "Custom audience"}
                  {row.program_title ? ` · Program: ${row.program_title}` : ""}
                  {row.status === "sent"
                    ? ` · Sent ${row.email_sent || 0} emails, ${row.sms_sent || 0} SMS`
                    : row.recipient_count
                      ? ` · ${row.recipient_count} recipients`
                      : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {canEdit && (
                  <>
                    <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={sending}
                      onClick={() => publishNotification(row)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {row.status === "sent" ? "Resend" : "Publish"}
                    </Button>
                  </>
                )}
                {canDelete && row.status !== "sending" && (
                  <Button size="icon" variant="outline" className="text-red-600" onClick={() => remove(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {sending && sendProgress ? (
        <div className="fixed bottom-6 right-6 bg-white border shadow-lg rounded-xl px-4 py-3 text-sm z-50">
          Sending… {sendProgress.current} / {sendProgress.total}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? (editing.status === "sent" ? "Edit sent announcement" : "Edit announcement") : "New member announcement"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email subject</Label>
              <Input
                placeholder="Defaults to title"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Announcement details for members…"
              />
            </div>

            <div className="rounded-lg border border-gray-100 p-4 space-y-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Audience category
              </p>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id || "none"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Custom filters only</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory?.description ? (
                  <p className="text-xs text-gray-500">{selectedCategory.description}</p>
                ) : null}
                {selectedCategory?.slug === "all-active-members" ? (
                  <p className="text-xs text-amber-700">
                    This list skips pending applications. Switch to “All registered members” to include new sign-ups.
                  </p>
                ) : null}
              </div>

              {(needsProgram || form.category_id) && (
                <div className="space-y-2">
                  <Label>{needsProgram ? "Program *" : "Link to program (optional)"}</Label>
                  <Select
                    value={form.program_id || "none"}
                    onValueChange={(v) => setForm({ ...form, program_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4">
                <RoleMultiSelect
                  roles={roles}
                  value={form.role_ids}
                  onChange={(role_ids) => setForm({ ...form, role_ids })}
                  label="Filter by roles (optional)"
                  hint="Leave empty for any role. Members matching any selected role are included."
                  required={false}
                />
                <div className="space-y-2">
                  <Label>Filter by branch (optional)</Label>
                  <Select
                    value={form.branch_id || "none"}
                    onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any branch</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by ministry (optional)</Label>
                <Input
                  placeholder="e.g. Youth, Choir"
                  value={form.ministry}
                  onChange={(e) => setForm({ ...form, ministry: e.target.value })}
                />
              </div>

              <Button type="button" variant="outline" size="sm" onClick={previewRecipients} disabled={previewing}>
                {previewing ? "Checking…" : "Preview recipient count"}
              </Button>
              {previewCount !== null ? (
                <p className="text-sm text-gray-600">{previewCount} recipient(s) match</p>
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-100 p-4 space-y-3">
              <p className="text-sm font-medium">Delivery channels</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">Email</p>
                  <p className="text-xs text-gray-500">Send to members with email addresses</p>
                </div>
                <Switch
                  checked={form.send_email}
                  onCheckedChange={(v) => setForm({ ...form, send_email: Boolean(v) })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">SMS / text message</p>
                  <p className="text-xs text-gray-500">
                    {smsConfigured
                      ? "Send to members with phone numbers"
                      : "Configure REACT_APP_SMS_API_URL and REACT_APP_SMS_API_KEY to enable"}
                  </p>
                </div>
                <Switch
                  checked={form.send_sms}
                  disabled={!smsConfigured}
                  onCheckedChange={(v) => setForm({ ...form, send_sms: Boolean(v) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => save(false)} disabled={saving || sending}>
                  Save
                </Button>
                <Button
                  onClick={() => save(true)}
                  disabled={saving || sending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? "Saving…" : editing?.status === "sent" ? "Save & resend" : "Save & publish"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
