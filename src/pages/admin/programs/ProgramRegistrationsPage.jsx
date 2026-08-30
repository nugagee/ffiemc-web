import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useSettings } from "../../../context/SettingsContext";
import { sendProgramRegistrationEmails } from "../../../lib/email";
import { DataToolbar } from "../../../components/admin/DataToolbar";
import { exportToCsv, filterRows } from "../../../lib/exportCsv";
import { DynamicFormFields, buildFormData } from "../../../components/programs/DynamicFormFields";
import { BranchSelect } from "../../../components/programs/BranchSelect";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { RecordViewDialog } from "../../../components/admin/RecordViewDialog";
import { requestOrApply } from "../../../lib/changeRequests";

function formatDate(v) {
  return v ? new Date(v).toLocaleString("en-GB") : "—";
}

export default function ProgramRegistrationsPage() {
  const { can, isSuperadmin } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const programFilter = searchParams.get("program") || "";

  const canEdit = can("program_registrations", "edit");
  const canDelete = can("program_registrations", "delete");

  const [programs, setPrograms] = useState([]);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(programFilter);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", branch_id: "", status: "registered", extras: {} });

  const activeProgram = programs.find((p) => p.id === selectedProgram);

  const load = async () => {
    const [p, r] = await Promise.all([
      authApi.listPrograms(),
      authApi.listProgramRegistrations(selectedProgram || null, selectedBranch || null),
    ]);
    setPrograms(p);
    setRows(r);
  };

  useEffect(() => {
    setSelectedProgram(programFilter);
  }, [programFilter]);

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, selectedBranch]);

  const filtered = useMemo(
    () => filterRows(rows, query, ["full_name", "email", "phone", "program_title", "branch_name", "status", "form_data"]),
    [rows, query]
  );
  const paged = usePagedRows(filtered);

  const exportCsv = () => {
    exportToCsv(`program-registrations-${Date.now()}`, filtered, [
      { key: "program_title", label: "Program" },
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "branch_name", label: "Branch" },
      { label: "Extra", value: (r) => JSON.stringify(r.form_data || {}) },
      { key: "created_at", label: "Registered" },
    ]);
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    if (!activeProgram) return toast.error("Select a program first");
    const form_data = buildFormData(activeProgram.form_fields, form.extras);
    const result = await authApi.registerProgramParticipant(activeProgram.slug, {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      branch_id: form.branch_id,
      form_data,
    });
    try {
      await sendProgramRegistrationEmails({
        programTitle: result.programTitle,
        adminEmail: result.adminEmail,
        fullName: form.full_name,
        email: form.email,
        phone: form.phone,
        formData: form_data,
        branchName: result.branchName,
        fallbackAdminEmail: settings.notificationEmail,
      });
      await authApi.markProgramRegistrationEmailed(result.id);
    } catch (err) {
      toast.warning("Saved but email failed: " + err.message);
    }
    toast.success("Participant registered");
    setRegisterOpen(false);
    setForm({ full_name: "", email: "", phone: "", branch_id: "", status: "registered", extras: {} });
    load();
  };

  const saveEdit = async () => {
    const payload = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      branch_id: form.branch_id,
      status: form.status,
      form_data: form.extras,
    };
    const result = await requestOrApply({
      isSuperadmin,
      feature: "program_registrations",
      action: "update",
      resourceType: "program_registrations",
      resourceId: editRow.id,
      title: `Update registration ${form.full_name}`,
      payload,
      previous: editRow,
      apply: () => authApi.updateProgramRegistration(editRow.id, payload),
    });
    if (!result.queued) toast.success("Registration updated");
    setEditRow(null);
    load();
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Programs</p>
      <h1 className="text-3xl font-bold mt-2">Registrations</h1>

      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Filter by program</Label>
          <Select value={selectedProgram || "all"} onValueChange={(v) => setSelectedProgram(v === "all" ? "" : v)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-64">
          <Label className="text-xs">Filter by branch</Label>
          <BranchSelect value={selectedBranch} onChange={setSelectedBranch} required={false} label="" />
        </div>
        {canEdit && activeProgram && (
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setRegisterOpen(true)}>
            Register participant
          </Button>
        )}
      </div>

      <div className="mt-6">
        <DataToolbar query={query} onQueryChange={setQuery} onExport={exportCsv} />
      </div>

      {(registerOpen || editRow) && canEdit && (
        <div className="mb-6 rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold">{editRow ? "Edit registration" : `Register for ${activeProgram?.title}`}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} />
          {!editRow && activeProgram && (
            <DynamicFormFields
              fields={activeProgram.form_fields}
              values={form.extras}
              onChange={(name, val) => setForm({ ...form, extras: { ...form.extras, [name]: val } })}
            />
          )}
          {editRow && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["registered", "confirmed", "cancelled", "attended"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button className="bg-red-600 hover:bg-red-700" onClick={editRow ? saveEdit : submitRegister}>
              {editRow ? "Save" : "Register & email"}
            </Button>
            <Button variant="outline" onClick={() => { setRegisterOpen(false); setEditRow(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-50 hover:bg-red-50/30">
                <td className="px-4 py-3 font-medium">{row.full_name}</td>
                <td className="px-4 py-3">{row.program_title}</td>
                <td className="px-4 py-3 text-gray-600"><div>{row.email}</div><div className="text-xs">{row.phone}</div></td>
                <td className="px-4 py-3 text-gray-600">{row.branch_name || "—"}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(row.created_at)}</td>
                <td className="px-4 py-3">
                  <TableActions
                    onView={() => setViewRow(row)}
                    onEdit={() => { setEditRow(row); setForm({ full_name: row.full_name, email: row.email, phone: row.phone, branch_id: row.branch_id || "", status: row.status, extras: row.form_data || {} }); }}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onDelete={async () => {
                      if (!window.confirm("Delete this registration?")) return;
                      const result = await requestOrApply({
                        isSuperadmin,
                        feature: "program_registrations",
                        action: "delete",
                        resourceType: "program_registrations",
                        resourceId: row.id,
                        title: `Delete registration ${row.full_name}`,
                        previous: row,
                        apply: () => authApi.deleteProgramRegistration(row.id),
                      });
                      if (!result.queued) toast.success("Deleted");
                      load();
                    }}
                  />
                </td>
              </tr>
            ))}
            {paged.total === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No registrations found.</td></tr>
            )}
          </tbody>
        </table>
        <TablePagination {...paged} onPageChange={paged.setPage} />
      </div>
      <RecordViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(o) => { if (!o) setViewRow(null); }}
        title={viewRow?.full_name || "Registration"}
        fields={viewRow ? [
          { label: "Program", value: viewRow.program_title },
          { label: "Email", value: viewRow.email },
          { label: "Phone", value: viewRow.phone },
          { label: "Branch", value: viewRow.branch_name },
          { label: "Status", value: viewRow.status },
          { label: "Form data", value: viewRow.form_data },
          { label: "Registered", value: formatDate(viewRow.created_at) },
        ] : []}
      />
    </div>
  );
}
