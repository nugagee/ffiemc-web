import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authApi, formatApiError } from "../../../lib/api";
import { requestOrApply } from "../../../lib/changeRequests";
import { useAuth } from "../../../context/AuthContext";
import { useAdminCounts } from "../../../context/AdminCountsContext";
import { DataToolbar } from "../../../components/admin/DataToolbar";
import { exportToCsv, filterRows } from "../../../lib/exportCsv";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { RecordViewDialog } from "../../../components/admin/RecordViewDialog";
import { PersonNameFields } from "../../../components/forms/PersonNameFields";
import { personFromRow, withPersonPayload } from "../../../lib/personName";

export default function VolunteersPage({ view = "applications" }) {
  const { can, isSuperadmin } = useAuth();
  const { refreshCounts } = useAdminCounts();
  const canEdit = can("volunteer_applications", "edit");
  const canDelete = can("volunteer_applications", "delete");
  const [rows, setRows] = useState([]);
  const [audit, setAudit] = useState([]);
  const [query, setQuery] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const [status, setStatus] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    const [apps, logs] = await Promise.all([
      authApi.listVolunteerApplications(),
      authApi.listVolunteerAudit(),
    ]);
    setRows(apps || []);
    setAudit(logs || []);
    try {
      await authApi.markVolunteerApplicationsSeen();
      refreshCounts();
    } catch {
      /* optional */
    }
  };

  useEffect(() => {
    load().catch((e) => toast.error(formatApiError(e.message)));
  }, []);

  const filtered = useMemo(() => {
    const byStatus = status ? rows.filter((r) => r.status === status) : rows;
    return filterRows(byStatus, query, [
      "full_name", "email", "phone", "role_interest", "team_name", "branch_name", "status", "skills", "notes",
    ]);
  }, [rows, query, status]);

  const filteredAudit = useMemo(
    () => filterRows(audit, auditQuery, ["action", "applicant_name", "admin_name", "admin_email"]),
    [audit, auditQuery]
  );
  const paged = usePagedRows(filtered);
  const pagedAudit = usePagedRows(filteredAudit);

  const exportCsv = () => {
    exportToCsv(`volunteer-applications-${Date.now()}`, filtered, [
      { key: "name_title", label: "Title" },
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "full_name", label: "Full name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "team_name", label: "Team" },
      { key: "role_interest", label: "Role" },
      { key: "branch_name", label: "Branch" },
      { key: "status", label: "Status" },
      { key: "skills", label: "Skills" },
      { key: "experience_level", label: "Experience" },
      { key: "availability", label: "Availability" },
      { key: "assigned_admin_name", label: "Assigned admin" },
      { key: "created_at", label: "Submitted" },
    ]);
  };

  const save = async (e) => {
    e.preventDefault();
    const person = withPersonPayload(form);
    const result = await requestOrApply({
      isSuperadmin,
      feature: "volunteer_applications",
      action: "update",
      resourceType: "volunteer_applications",
      resourceId: editRow.id,
      title: `Update volunteer ${person.full_name}`,
      payload: { ...form, ...person },
      previous: editRow,
      apply: () => authApi.updateVolunteerApplication(editRow.id, { ...form, ...person }),
    });
    if (!result.queued) toast.success("Application updated");
    setEditRow(null);
    load();
  };

  const showApps = view !== "audit";
  const showAudit = view === "audit" || view === "all";

  return (
    <div>
      <h1 className="text-3xl font-bold">{showAudit && !showApps ? "Volunteer audit log" : "Volunteer applications"}</h1>
      <p className="text-sm text-gray-500 mt-2">
        {showAudit && !showApps
          ? "Every create, update, approval, and delete on volunteer applications."
          : "Media / social media team sign-ups. Search, export, approve, assign, and audit every change."}{" "}
        Public link: <code className="text-xs bg-gray-100 px-1 rounded">/volunteer/media-department</code>
      </p>

      {showApps && (
      <>
      <div className="mt-6">
        <DataToolbar query={query} onQueryChange={setQuery} onExport={exportCsv} placeholder="Search applicants…" />
        <div className="mb-4 max-w-xs">
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["pending", "approved", "rejected", "waitlist"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {editRow && (
        <form onSubmit={save} className="mb-6 rounded-2xl border bg-white p-5 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 grid md:grid-cols-3 gap-4">
            <PersonNameFields value={form} onChange={(next) => setForm({ ...form, ...next })} />
          </div>
          <div className="space-y-2"><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Role</Label><Input value={form.role_interest || ""} onChange={(e) => setForm({ ...form, role_interest: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pending", "approved", "rejected", "waitlist"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2"><Label>Review notes</Label><Textarea rows={2} value={form.review_notes || ""} onChange={(e) => setForm({ ...form, review_notes: e.target.value })} /></div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={!canEdit}>Save</Button>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {["Name", "Contact", "Role", "Branch", "Status", "Submitted", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-medium">{r.full_name}</td>
                <td className="px-3 py-2 text-gray-600">{r.email}<br />{r.phone}</td>
                <td className="px-3 py-2">{r.role_interest}</td>
                <td className="px-3 py-2">{r.branch_name || "—"}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2 text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString("en-GB") : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <TableActions
                    onView={() => setViewRow(r)}
                    onEdit={() => { setEditRow(r); setForm({ ...r, ...personFromRow(r) }); }}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onDelete={async () => {
                      if (!window.confirm("Delete this application?")) return;
                      const result = await requestOrApply({
                        isSuperadmin,
                        feature: "volunteer_applications",
                        action: "delete",
                        resourceType: "volunteer_applications",
                        resourceId: r.id,
                        title: `Delete volunteer ${r.full_name}`,
                        previous: r,
                        apply: () => authApi.deleteVolunteerApplication(r.id),
                      });
                      if (!result.queued) toast.success("Deleted");
                      load();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination {...paged} onPageChange={paged.setPage} />
        {!paged.total && <p className="p-6 text-center text-gray-500">No applications yet.</p>}
      </div>
      <RecordViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(o) => { if (!o) setViewRow(null); }}
        title={viewRow?.full_name || "Application"}
        fields={viewRow ? [
          { label: "Email", value: viewRow.email },
          { label: "Phone", value: viewRow.phone },
          { label: "Team", value: viewRow.team_name },
          { label: "Role", value: viewRow.role_interest },
          { label: "Branch", value: viewRow.branch_name },
          { label: "Skills", value: viewRow.skills },
          { label: "Experience", value: viewRow.experience_level },
          { label: "Availability", value: viewRow.availability },
          { label: "Status", value: viewRow.status },
          { label: "Notes", value: viewRow.notes },
          { label: "Review notes", value: viewRow.review_notes },
        ] : []}
      />
      </>
      )}

      {showAudit && (
      <>
      {showApps && <h2 className="text-lg font-semibold mt-10 mb-3">Audit log</h2>}
      <div className={showApps ? "mb-3" : "mt-6 mb-3"}>
        <DataToolbar
          query={auditQuery}
          onQueryChange={setAuditQuery}
          onExport={() => exportToCsv(`volunteer-audit-${Date.now()}`, filteredAudit, [
            { key: "action", label: "Action" },
            { key: "applicant_name", label: "Applicant" },
            { key: "admin_name", label: "Admin" },
            { key: "admin_email", label: "Admin email" },
            { key: "created_at", label: "Time" },
          ])}
          placeholder="Search audit log…"
        />
      </div>
      <div className="rounded-2xl border bg-white divide-y max-h-[70vh] overflow-y-auto">
        {pagedAudit.rows.map((a) => (
          <div key={a.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{a.action} · {a.applicant_name || "Applicant"}</p>
            <p className="text-xs text-gray-500">
              {a.admin_name || a.admin_email || "Admin"} · {a.created_at ? new Date(a.created_at).toLocaleString("en-GB") : ""}
            </p>
          </div>
        ))}
        {!filteredAudit.length && <p className="p-4 text-gray-500 text-sm">No audit entries yet.</p>}
      </div>
      <TablePagination {...pagedAudit} onPageChange={pagedAudit.setPage} />
      </>
      )}
    </div>
  );
}
