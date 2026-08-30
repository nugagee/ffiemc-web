import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Plus, Send, Trash2, Pencil, Video, Download } from "lucide-react";
import { authApi, formatApiError } from "../../../lib/api";
import { deliverMeetingInvites } from "../../../lib/email";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { RoleMultiSelect } from "../../../components/forms/RoleMultiSelect";
import {
  buildIcs,
  defaultMeetUrl,
  downloadIcs,
  formatMeetingWhen,
  generateMeetCode,
  googleCalendarUrl,
  siteOrigin,
} from "../../../lib/meetings";

const emptyForm = (categoryId = "") => {
  const code = generateMeetCode();
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const toLocal = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return {
    title: "",
    description: "",
    starts_at: toLocal(start),
    ends_at: toLocal(end),
    timezone: "Africa/Lagos",
    meet_code: code,
    meet_url: defaultMeetUrl(code),
    location: "",
    category_id: categoryId,
    role_ids: [],
    branch_id: "",
    ministry: "",
  };
};

function toIso(local) {
  if (!local) return "";
  try {
    return new Date(local).toISOString();
  } catch {
    return "";
  }
}

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const bucketTone = {
  upcoming: "bg-blue-100 text-blue-800",
  live: "bg-green-100 text-green-800",
  past: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};

export default function MeetingsPage() {
  const { can } = useAuth();
  const canEdit = can("church_meetings", "edit");
  const canDelete = can("church_meetings", "delete");

  const [bucket, setBucket] = useState("upcoming");
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);

  const defaultCategoryId = useMemo(
    () => categories.find((c) => c.slug === "all-members")?.id || categories[0]?.id || "",
    [categories]
  );
  const paged = usePagedRows(rows);

  const audienceFilters = useMemo(() => {
    const filters = {};
    if (form.role_ids?.length) filters.role_ids = form.role_ids;
    if (form.branch_id) filters.branch_ids = [form.branch_id];
    if (form.ministry.trim()) filters.ministry = form.ministry.trim();
    return filters;
  }, [form.role_ids, form.branch_id, form.ministry]);

  const load = async () => {
    const [meetings, cats, roleRows, branchRows] = await Promise.all([
      authApi.listChurchMeetings(bucket),
      authApi.listNotificationCategories(),
      authApi.listChurchRoles(),
      authApi.listChurchBranches(),
    ]);
    setRows(meetings || []);
    setCategories(cats || []);
    setRoles(roleRows || []);
    setBranches(branchRows || []);
  };

  useEffect(() => {
    load().catch((e) => toast.error(formatApiError(e.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(defaultCategoryId));
    setPreviewCount(null);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
      starts_at: toLocalInput(row.starts_at),
      ends_at: toLocalInput(row.ends_at),
      timezone: row.timezone || "Africa/Lagos",
      meet_code: row.meet_code || generateMeetCode(),
      meet_url: row.meet_url || "",
      location: row.location || "",
      category_id: row.category_id || "",
      role_ids: row.audience_filters?.role_ids || [],
      branch_id: (row.audience_filters?.branch_ids && row.audience_filters.branch_ids[0]) || "",
      ministry: row.audience_filters?.ministry || "",
    });
    setPreviewCount(null);
    setOpen(true);
  };

  const payload = () => ({
    title: form.title,
    description: form.description,
    starts_at: toIso(form.starts_at),
    ends_at: toIso(form.ends_at),
    timezone: form.timezone,
    meet_code: form.meet_code,
    meet_url: form.meet_url || defaultMeetUrl(form.meet_code),
    location: form.location,
    category_id: form.category_id || null,
    audience_filters: audienceFilters,
    status: "scheduled",
  });

  const previewRecipients = async () => {
    const merged = { ...audienceFilters };
    const cat = categories.find((c) => c.id === form.category_id);
    if (cat?.filters) Object.assign(merged, cat.filters, audienceFilters);
    const list = await authApi.previewNotificationRecipients(merged);
    setPreviewCount((list || []).length);
    if (!list?.length) toast.warning("No recipients match this audience");
  };

  const save = async (sendInvites = false) => {
    if (!form.title.trim() || !form.starts_at) {
      toast.error("Title and start time are required");
      return;
    }
    setSaving(true);
    try {
      const saved = await authApi.upsertChurchMeeting(editing?.id || null, payload());
      toast.success(editing ? "Meeting saved" : "Meeting created");
      setOpen(false);
      if (sendInvites) await sendInvitesFor(saved);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setSaving(false);
    }
  };

  const sendInvitesFor = async (row) => {
    setSending(true);
    try {
      const start = await authApi.startMeetingInvites(row.id);
      const invites = start?.invites || [];
      const origin = siteOrigin();
      const pageUrl = `${origin}/meeting/${row.id}`;
      const calendarUrl = googleCalendarUrl({
        title: row.title,
        description: row.description,
        location: row.location,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        meetUrl: row.meet_url,
      });
      const results = await deliverMeetingInvites({
        meeting: {
          ...row,
          whenLabel: formatMeetingWhen(row.starts_at, row.ends_at, row.timezone),
        },
        invites,
        calendarUrl,
        pageUrl,
      });
      await authApi.completeMeetingInvites(row.id, results);
      const sent = results.filter((r) => r.status === "sent").length;
      toast.success(`Invites sent to ${sent} member(s)`);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setSending(false);
    }
  };

  const regenLink = () => {
    const code = generateMeetCode();
    setForm({ ...form, meet_code: code, meet_url: defaultMeetUrl(code) });
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
        <Video className="h-7 w-7 text-red-600" />
        Church meetings
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        Schedule meetings for member categories, send a join link, and let members add it to Google Calendar or download an .ics file.
      </p>

      <PageToolbar
        left={[
          { id: "upcoming", label: "Upcoming" },
          { id: "live", label: "Happening now" },
          { id: "past", label: "Past" },
        ].map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={bucket === tab.id ? "default" : "outline"}
            className={bucket === tab.id ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => setBucket(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
        right={canEdit ? (
          <Button className="bg-red-600 hover:bg-red-700" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New meeting
          </Button>
        ) : null}
      />

      <div className="mt-6 rounded-2xl border bg-white overflow-hidden">
        {paged.total === 0 ? (
          <p className="p-10 text-center text-gray-500">No meetings in this list.</p>
        ) : (
          <div className="divide-y">
            {paged.rows.map((row) => (
              <div key={row.id} className="p-4 flex flex-wrap gap-4 items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{row.title}</p>
                    <Badge className={`${bucketTone[row.time_bucket] || bucketTone.upcoming} hover:bg-inherit`}>
                      {row.time_bucket}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatMeetingWhen(row.starts_at, row.ends_at, row.timezone)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {row.category_name || "Custom audience"}
                    {row.invites_sent_at ? ` · Invites sent (${row.invites_sent || row.recipient_count || 0})` : " · Invites not sent"}
                  </p>
                  {row.meet_url ? (
                    <a href={row.meet_url} target="_blank" rel="noreferrer" className="text-sm text-red-600 mt-1 inline-block">
                      Join meeting
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadIcs(
                        `${row.title || "meeting"}.ics`,
                        buildIcs({
                          id: row.id,
                          title: row.title,
                          description: row.description,
                          location: row.location,
                          startsAt: row.starts_at,
                          endsAt: row.ends_at,
                          meetUrl: row.meet_url,
                        })
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-1" /> .ics
                  </Button>
                  {canEdit && (
                    <>
                      <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {row.time_bucket !== "past" && (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          disabled={sending}
                          onClick={() => sendInvitesFor(row)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {row.invites_sent_at ? "Resend" : "Send invites"}
                        </Button>
                      )}
                    </>
                  )}
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600"
                      onClick={async () => {
                        if (!window.confirm("Delete this meeting?")) return;
                        await authApi.deleteChurchMeeting(row.id);
                        load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <TablePagination {...paged} onPageChange={paged.setPage} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit meeting" : "New church meeting"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Message / agenda</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starts *</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ends</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Video meeting link</Label>
              <Input value={form.meet_url} onChange={(e) => setForm({ ...form, meet_url: e.target.value })} />
              <p className="text-xs text-gray-500">
                Auto-generated join room. Paste a Google Meet link if you already created one.
              </p>
              <Button type="button" size="sm" variant="outline" onClick={regenLink}>
                Generate new link
              </Button>
            </div>
            <div className="space-y-2">
              <Label>In-person location (optional)</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Audience category
              </p>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom filters only</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-3">
                <RoleMultiSelect
                  roles={roles}
                  value={form.role_ids}
                  onChange={(role_ids) => setForm({ ...form, role_ids })}
                  label="Filter by roles (optional)"
                  hint="Leave empty for any role. Members matching any selected role are included."
                  required={false}
                />
                <Select value={form.branch_id || "none"} onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Any branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any branch</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Filter by ministry (optional)" value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })} />
              <Button type="button" variant="outline" size="sm" onClick={previewRecipients}>Preview recipient count</Button>
              {previewCount !== null ? <p className="text-sm text-gray-600">{previewCount} recipient(s)</p> : null}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {canEdit && (
              <>
                <Button variant="outline" disabled={saving || sending} onClick={() => save(false)}>Save</Button>
                <Button className="bg-red-600 hover:bg-red-700" disabled={saving || sending} onClick={() => save(true)}>
                  {saving ? "Saving…" : "Save & send invites"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
