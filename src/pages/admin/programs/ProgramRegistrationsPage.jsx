import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useSettings } from "../../../context/SettingsContext";
import { useAdminCounts } from "../../../context/AdminCountsContext";
import { sendProgramRegistrationEmails } from "../../../lib/email";
import { DataToolbar } from "../../../components/admin/DataToolbar";
import { exportToCsv, filterRows } from "../../../lib/exportCsv";
import { DynamicFormFields, buildFormData } from "../../../components/programs/DynamicFormFields";
import { BranchSelect } from "../../../components/programs/BranchSelect";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { RecordViewDialog } from "../../../components/admin/RecordViewDialog";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { PersonNameFields } from "../../../components/forms/PersonNameFields";
import { PhoneField } from "../../../components/forms/PhoneField";
import { personFromRow, withPersonPayload } from "../../../lib/personName";
import { requestOrApply } from "../../../lib/changeRequests";
import { Plus } from "lucide-react";

function formatDate(v) {
  return v ? new Date(v).toLocaleString("en-GB") : "—";
}

export default function ProgramRegistrationsPage() {
  const { can, isSuperadmin } = useAuth();
  const { settings } = useSettings();
  const { refreshCounts } = useAdminCounts();
  const navigate = useNavigate();
  const { programId } = useParams();
  const [searchParams] = useSearchParams();
  const programFilter = programId || searchParams.get("program") || "";

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
  const [form, setForm] = useState({ name_title: "", first_name: "", last_name: "", email: "", phone: "", branch_id: "", status: "registered", extras: {} });

  const activeProgram = programs.find((p) => p.id === selectedProgram);

  const load = async () => {
    const [p, r] = await Promise.all([
      authApi.listPrograms(),
      authApi.listProgramRegistrations(selectedProgram || null, selectedBranch || null),
    ]);
    setPrograms(p);
    setRows(r);
    if (selectedProgram) {
      try {
        await authApi.markProgramRegistrationsSeen(selectedProgram);
        refreshCounts();
      } catch {
        /* migration may not be applied yet */
      }
    }
  };

  useEffect(() => {
    setSelectedProgram(programFilter);
  }, [programFilter]);

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, selectedBranch]);

  const filtered = useMemo(
    () => filterRows(rows, query, ["full_name", "first_name", "last_name", "email", "phone", "program_title", "branch_name", "status", "form_data"]),
    [rows, query]
  );
  const paged = usePagedRows(filtered);

  const exportCsv = () => {
    exportToCsv(`program-registrations-${Date.now()}`, filtered, [
      { key: "program_title", label: "Program" },
      { key: "full_name", label: "Full name" },
      { key: "name_title", label: "Title" },
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "branch_name", label: "Branch" },
      { label: "Extra", value: (r) => JSON.stringify(r.form_data || {}) },
      { key: "created_at", label: "Registered" },
    ]);
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    if (!activeProgram) return toast.error("Select a program first");
    const person = withPersonPayload(form);
    const form_data = buildFormData(activeProgram.form_fields, form.extras);
    const result = await authApi.registerProgramParticipant(activeProgram.slug, {
      ...person,
      email: form.email,
      phone: form.phone,
      branch_id: form.branch_id,
      form_data,
    });
    try {
      await sendProgramRegistrationEmails({
        programTitle: result.programTitle,
        shortCode: result.shortCode,
        adminEmail: result.adminEmail,
        fullName: person.full_name,
        firstName: person.first_name,
        lastName: person.last_name,
        nameTitle: person.name_title,
        email: form.email,
        phone: form.phone,
        formData: form_data,
        branchName: result.branchName,
        venue: result.venue,
        startsAt: result.startsAt,
        endsAt: result.endsAt,
        confirmationId: result.id,
        fallbackAdminEmail: settings.notificationEmail,
      });
      await authApi.markProgramRegistrationEmailed(result.id);
    } catch (err) {
      toast.warning("Saved but email failed: " + err.message);
    }
    toast.success("Participant registered");
    setRegisterOpen(false);
    setForm({ name_title: "", first_name: "", last_name: "", email: "", phone: "", branch_id: "", status: "registered", extras: {} });
    load();
  };

  const saveEdit = async () => {
    const person = withPersonPayload(form);
    const payload = {
      ...person,
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
      title: `Update registration ${person.full_name}`,
      payload,
      previous: editRow,
      apply: () => authApi.updateProgramRegistration(editRow.id, payload),
    });
    if (!result.queued) toast.success("Registration updated");
    setEditRow(null);
    load();
  };

  const heading = activeProgram
    ? (activeProgram.short_code || activeProgram.title)
    : "All program registrations";

  return (
    <div>
      <PageToolbar
        align="start"
        left={(
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Registrations</p>
            <h1 className="text-3xl font-bold mt-2">{heading}</h1>
            <p className="text-sm text-gray-500 mt-2">
              {activeProgram
                ? `Register participants for ${activeProgram.title}. Public page: /register/${activeProgram.slug}`
                : "Choose a program in the sidebar (for example FFIEYC) or filter below. New registrations show a count until you open them."}
            </p>
          </div>
        )}
        right={canEdit && activeProgram ? (
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditRow(null); setRegisterOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Register participant
          </Button>
        ) : null}
      />

      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Filter by program</Label>
          <Select
            value={selectedProgram || "all"}
            onValueChange={(v) => {
              const id = v === "all" ? "" : v;
              setSelectedProgram(id);
              navigate(id ? `/admin/registrations/programs/${id}` : "/admin/registrations/programs");
            }}
          >
            <SelectTrigger className="w-64"><SelectValue placeholder="All programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.short_code ? `${p.short_code} — ${p.title}` : p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-64">
          <Label className="text-xs">Filter by branch</Label>
          <BranchSelect value={selectedBranch} onChange={setSelectedBranch} required={false} label="" />
        </div>
      </div>

      <div className="mt-6">
        <DataToolbar query={query} onQueryChange={setQuery} onExport={exportCsv} />
      </div>

      {(registerOpen || editRow) && canEdit && (
        <form
          className="mb-6 rounded-2xl border bg-white p-5 space-y-4"
          onSubmit={(e) => { e.preventDefault(); editRow ? saveEdit() : submitRegister(e); }}
        >
          <h3 className="font-semibold">{editRow ? "Edit registration" : `Register for ${activeProgram?.title}`}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <PersonNameFields value={form} onChange={(next) => setForm({ ...form, ...next })} />
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <PhoneField
              id="admin-program-phone"
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              required
            />
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
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              {editRow ? "Save" : "Register & email"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setRegisterOpen(false); setEditRow(null); }}>Cancel</Button>
          </div>
        </form>
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
                    onEdit={() => { setEditRow(row); setForm({ ...personFromRow(row), email: row.email, phone: row.phone, branch_id: row.branch_id || "", status: row.status, extras: row.form_data || {} }); }}
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
          { label: "Title", value: viewRow.name_title },
          { label: "First name", value: viewRow.first_name },
          { label: "Last name", value: viewRow.last_name },
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
