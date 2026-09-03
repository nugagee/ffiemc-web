import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useSettings } from "../../../context/SettingsContext";
import { useAdminCounts } from "../../../context/AdminCountsContext";
import { sendChurchMembershipEmails, sendMembershipApprovedEmail } from "../../../lib/email";
import { siteOrigin } from "../../../lib/meetings";
import { requestOrApply } from "../../../lib/changeRequests";
import { DataToolbar } from "../../../components/admin/DataToolbar";
import { exportToCsv, filterRows } from "../../../lib/exportCsv";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { BranchSelect } from "../../../components/programs/BranchSelect";
import { PhoneField } from "../../../components/forms/PhoneField";
import { ManagedSelect } from "../../../components/forms/ManagedSelect";
import { mergeFormDropdowns, MEMBER_FIELD_KEYS } from "../../../data/formDropdowns";
import { DEFAULT_COUNTRY } from "../../../data/countries";
import { TableActions } from "../../../components/admin/TableActions";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { RoleMultiSelect, memberRoleIds, memberRoleLabel } from "../../../components/forms/RoleMultiSelect";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { RecordViewDialog } from "../../../components/admin/RecordViewDialog";
import { PersonNameFields } from "../../../components/forms/PersonNameFields";
import { personFromRow, withPersonPayload } from "../../../lib/personName";
import { Plus } from "lucide-react";

const emptyForm = {
  name_title: "", first_name: "", last_name: "", email: "", phone: "", gender: "", date_of_birth: "",
  address: "", city: "", state: "", country: DEFAULT_COUNTRY,
  role_ids: [], branch_id: "", ministry: "", baptism_status: "", marital_status: "",
  occupation: "", emergency_contact_name: "", emergency_contact_phone: "", notes: "", status: "pending", form_data: {},
};

function formatDate(v) {
  return v ? new Date(v).toLocaleString("en-GB") : "—";
}

function memberEmailData(row, roles, extra = {}) {
  const person = personFromRow(row);
  return {
    ...person,
    fullName: extra.fullName || row.full_name || person.full_name,
    email: extra.email || row.email,
    phone: extra.phone || row.phone,
    gender: extra.gender || row.gender,
    dateOfBirth: extra.dateOfBirth || row.date_of_birth,
    address: extra.address || row.address,
    city: extra.city || row.city,
    state: extra.state || row.state,
    country: extra.country || row.country,
    ministry: extra.ministry || row.ministry,
    occupation: extra.occupation || row.occupation,
    baptismStatus: extra.baptismStatus || row.baptism_status,
    maritalStatus: extra.maritalStatus || row.marital_status,
    emergencyContactName: extra.emergencyContactName || row.emergency_contact_name,
    emergencyContactPhone: extra.emergencyContactPhone || row.emergency_contact_phone,
    notes: extra.notes || row.notes,
    formData: extra.formData || row.form_data || {},
    roleName: extra.roleName || memberRoleLabel(row, roles),
    branchName: extra.branchName || row.branch_name || "",
    status: extra.status || row.status,
    siteUrl: siteOrigin(),
  };
}

function consentLabel(row) {
  const data = row?.form_data || {};
  if (data.consent === true || data.consent === "true") {
    return data.consent_at ? `Yes (${formatDate(data.consent_at)})` : "Yes";
  }
  return "—";
}

export default function ChurchMembersPage() {
  const { can, isSuperadmin } = useAuth();
  const { settings } = useSettings();
  const { counts, refreshCounts } = useAdminCounts();
  const location = useLocation();
  const navigate = useNavigate();
  const statusGroup = location.pathname.endsWith("/pending")
    ? "pending"
    : location.pathname.endsWith("/approved")
      ? "approved"
      : "all";
  const catalogs = useMemo(() => mergeFormDropdowns(settings.formDropdowns), [settings.formDropdowns]);
  const customCatalogs = catalogs.filter((c) => !MEMBER_FIELD_KEYS.includes(c.fieldKey));
  const canEdit = can("church_members", "edit");
  const canDelete = can("church_members", "delete");

  const [roles, setRoles] = useState([]);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [r, m] = await Promise.all([
      authApi.listChurchRoles(),
      authApi.listChurchMembers(roleFilter || null, branchFilter || null, statusGroup),
    ]);
    setRoles(r);
    setRows(Array.isArray(m) ? m : []);
    refreshCounts();
  };

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, branchFilter, statusGroup]);

  const filtered = useMemo(
    () => filterRows(rows, query, ["full_name", "email", "phone", "role_name", "role_names", "branch_name", "city", "state", "status", "ministry"]),
    [rows, query]
  );
  const paged = usePagedRows(filtered);

  const exportCsv = () => {
    exportToCsv(`church-members-${Date.now()}`, filtered, [
      { key: "name_title", label: "Title" },
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "full_name", label: "Full name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "branch_name", label: "Branch" },
      { key: "role_name", label: "Roles" },
      { key: "gender", label: "Gender" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "ministry", label: "Ministry" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Registered" },
    ]);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.role_ids.length) {
      toast.error("Select at least one church role");
      return;
    }
    const person = withPersonPayload(form);
    const payload = {
      ...form,
      ...person,
      role_id: form.role_ids[0],
      role_names: memberRoleLabel({ role_ids: form.role_ids }, roles),
    };
    if (editRow) {
      const result = await requestOrApply({
        isSuperadmin,
        feature: "church_members",
        action: "update",
        resourceType: "church_members",
        resourceId: editRow.id,
        title: `Update member ${person.full_name}`,
        payload,
        previous: editRow,
        apply: () => authApi.updateChurchMember(editRow.id, payload),
      });
      if (!result.queued) {
        toast.success("Member updated");
        const becameApproved =
          (editRow.status === "pending" || editRow.status === "")
          && (form.status === "approved" || form.status === "active");
        if (becameApproved && form.email) {
          try {
            await sendMembershipApprovedEmail(memberEmailData(
              { ...editRow, ...form, form_data: form.form_data },
              roles,
              {
                fullName: person.full_name,
                roleName: memberRoleLabel({ role_ids: form.role_ids }, roles) || editRow.role_name || "",
                branchName: editRow.branch_name || "",
                status: "approved",
              }
            ));
          } catch (err) {
            toast.warning("Approved, but congratulations email failed: " + err.message);
          }
        }
      }
    } else {
      const result = await authApi.registerChurchMember({
        p_full_name: person.full_name,
        p_name_title: person.name_title,
        p_first_name: person.first_name,
        p_last_name: person.last_name,
        p_email: form.email,
        p_phone: form.phone,
        p_gender: form.gender,
        p_date_of_birth: form.date_of_birth || null,
        p_address: form.address,
        p_city: form.city,
        p_state: form.state,
        p_country: form.country,
        p_role_id: form.role_ids[0],
        p_role_ids: form.role_ids,
        p_branch_id: form.branch_id,
        p_ministry: form.ministry,
        p_baptism_status: form.baptism_status,
        p_marital_status: form.marital_status,
        p_occupation: form.occupation,
        p_emergency_contact_name: form.emergency_contact_name,
        p_emergency_contact_phone: form.emergency_contact_phone,
        p_notes: form.notes,
        p_form_data: form.form_data || {},
      });
      try {
        await sendChurchMembershipEmails({
          ...person,
          ...form,
          formData: form.form_data || {},
          roleName: result.roleName || memberRoleLabel({ role_ids: form.role_ids }, roles),
          branchName: result.branchName,
          status: "pending",
          adminEmail: settings.notificationEmail,
        });
        await authApi.markChurchMemberEmailed(result.id);
      } catch (err) {
        toast.warning("Saved but email failed: " + err.message);
      }
      toast.success("Member registered");
    }
    setFormOpen(false);
    setEditRow(null);
    setForm(emptyForm);
    load();
  };

  const startEdit = (row) => {
    setEditRow(row);
    setForm({
      full_name: row.full_name, ...personFromRow(row), email: row.email, phone: row.phone,
      gender: row.gender || "", date_of_birth: row.date_of_birth || "",
      address: row.address || "", city: row.city || "", state: row.state || "",
      country: row.country || "Nigeria", role_ids: memberRoleIds(row), branch_id: row.branch_id || "",
      ministry: row.ministry || "", baptism_status: row.baptism_status || "",
      marital_status: row.marital_status || "", occupation: row.occupation || "",
      emergency_contact_name: row.emergency_contact_name || "",
      emergency_contact_phone: row.emergency_contact_phone || "",
      notes: row.notes || "", status: row.status || "pending",
      form_data: row.form_data || {},
    });
    setFormOpen(true);
  };

  const approveMember = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Approve membership for ${row.full_name} and send a confirmation email?`)) return;
    const payload = { status: "approved", role_ids: memberRoleIds(row) };
    try {
      const result = await requestOrApply({
        isSuperadmin,
        feature: "church_members",
        action: "update",
        resourceType: "church_members",
        resourceId: row.id,
        title: `Approve member ${row.full_name}`,
        payload: { ...row, ...payload, role_names: memberRoleLabel(row, roles) },
        previous: row,
        apply: () => authApi.updateChurchMember(row.id, payload),
      });
      if (!result.queued) {
        try {
          await sendMembershipApprovedEmail(memberEmailData(row, roles, { status: "approved" }));
          toast.success("Member approved. Confirmation email sent.");
        } catch (err) {
          toast.warning("Member approved, but confirmation email failed: " + err.message);
        }
      }
      setViewRow(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Members</p>
      <h1 className="text-3xl font-bold mt-2">
        {statusGroup === "pending" ? "Pending applications" : statusGroup === "approved" ? "Approved members" : "Church members"}
      </h1>
      <p className="text-gray-500 mt-2 text-sm">
        {statusGroup === "pending"
          ? "New /join-church applications wait here. Use Approve to confirm a member and send their confirmation email."
          : "Bonafide member registry — searchable, exportable, ready for notifications."}
      </p>

      <PageToolbar
        left={[
          { id: "pending", label: "Pending", count: counts.members_pending, to: "/admin/registrations/members/pending" },
          { id: "approved", label: "Approved", count: counts.members_approved, to: "/admin/registrations/members/approved" },
          { id: "all", label: "All", count: counts.members_all, to: "/admin/registrations/members" },
        ].map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={statusGroup === tab.id ? "default" : "outline"}
            className={statusGroup === tab.id ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => navigate(tab.to)}
          >
            {tab.label}
            <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${statusGroup === tab.id ? "bg-white/20" : "bg-gray-100 text-gray-700"}`}>
              {tab.count}
            </span>
          </Button>
        ))}
        right={canEdit ? (
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditRow(null); setForm(emptyForm); setFormOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Register member
          </Button>
        ) : null}
      />

      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Filter by role</Label>
          <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-64">
          <BranchSelect value={branchFilter} onChange={setBranchFilter} required={false} label="Filter by branch" />
        </div>
      </div>

      <div className="mt-6">
        <DataToolbar query={query} onQueryChange={setQuery} onExport={exportCsv} />
      </div>

      {formOpen && canEdit && (
        <form onSubmit={save} className="mb-6 rounded-2xl border bg-white p-5 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 font-semibold">{editRow ? "Edit member" : "Register member (admin)"}</div>
          <div className="md:col-span-2 grid md:grid-cols-3 gap-4">
            <PersonNameFields value={form} onChange={(next) => setForm({ ...form, ...next })} />
          </div>
          {[
            ["email", "Email"],
            ["date_of_birth", "Date of birth", "date"],
            ["address", "Address"], ["city", "City"],
            ["emergency_contact_name", "Emergency contact name"],
          ].map(([key, label, type]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input type={type || "text"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={["email"].includes(key)} />
            </div>
          ))}
          <PhoneField id="admin-member-phone" label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
          <ManagedSelect catalogs={catalogs} fieldKey="gender" label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
          <ManagedSelect catalogs={catalogs} fieldKey="state" label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <ManagedSelect catalogs={catalogs} fieldKey="country" label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <ManagedSelect catalogs={catalogs} fieldKey="ministry" label="Ministry / department" value={form.ministry} onChange={(v) => setForm({ ...form, ministry: v })} />
          <ManagedSelect catalogs={catalogs} fieldKey="occupation" label="Occupation" value={form.occupation} onChange={(v) => setForm({ ...form, occupation: v })} />
          <ManagedSelect catalogs={catalogs} fieldKey="baptism_status" label="Baptism status" value={form.baptism_status} onChange={(v) => setForm({ ...form, baptism_status: v })} />
          <ManagedSelect catalogs={catalogs} fieldKey="marital_status" label="Marital status" value={form.marital_status} onChange={(v) => setForm({ ...form, marital_status: v })} />
          {customCatalogs.map((c) => (
            <ManagedSelect
              key={c.id}
              catalogs={catalogs}
              fieldKey={c.fieldKey}
              label={c.label}
              value={(form.form_data || {})[c.fieldKey] || ""}
              onChange={(v) => setForm({ ...form, form_data: { ...(form.form_data || {}), [c.fieldKey]: v } })}
            />
          ))}
          <PhoneField id="admin-member-emergency-phone" label="Emergency contact phone" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
          <div className="md:col-span-2">
            <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <RoleMultiSelect
              roles={roles}
              value={form.role_ids}
              onChange={(role_ids) => setForm({ ...form, role_ids })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pending", "approved", "active", "inactive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" className="bg-red-600 hover:bg-red-700">{editRow ? "Save" : "Register & email"}</Button>
            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditRow(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-50 hover:bg-red-50/30">
                <td className="px-4 py-3 font-medium">{row.full_name}</td>
                <td className="px-4 py-3">{memberRoleLabel(row, roles) || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{row.branch_name || "—"}</td>
                <td className="px-4 py-3"><div>{row.email}</div><div className="text-xs text-gray-500">{row.phone}</div></td>
                <td className="px-4 py-3 text-gray-600">{[row.city, row.state].filter(Boolean).join(", ")}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(row.created_at)}</td>
                <td className="px-4 py-3">
                  <TableActions
                    onView={() => setViewRow(row)}
                    onEdit={() => startEdit(row)}
                    onApprove={row.status === "pending" ? () => approveMember(row) : undefined}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onDelete={async () => {
                      if (!window.confirm(`Delete ${row.full_name}?`)) return;
                      const result = await requestOrApply({
                        isSuperadmin,
                        feature: "church_members",
                        action: "delete",
                        resourceType: "church_members",
                        resourceId: row.id,
                        title: `Delete member ${row.full_name}`,
                        payload: {},
                        previous: row,
                        apply: () => authApi.deleteChurchMember(row.id),
                      });
                      if (!result.queued) toast.success("Member deleted");
                      load();
                    }}
                  />
                </td>
              </tr>
            ))}
            {paged.total === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">No members found.</td></tr>}
          </tbody>
        </table>
        <TablePagination {...paged} onPageChange={paged.setPage} />
      </div>

      <RecordViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(o) => { if (!o) setViewRow(null); }}
        title={viewRow?.full_name || "Member"}
        fields={viewRow ? [
          { label: "Email", value: viewRow.email },
          { label: "Phone", value: viewRow.phone },
          { label: "Gender", value: viewRow.gender },
          { label: "Date of birth", value: viewRow.date_of_birth },
          { label: "Address", value: viewRow.address },
          { label: "City", value: viewRow.city },
          { label: "State", value: viewRow.state },
          { label: "Country", value: viewRow.country },
          { label: "Roles", value: memberRoleLabel(viewRow, roles) },
          { label: "Branch", value: viewRow.branch_name },
          { label: "Ministry", value: viewRow.ministry },
          { label: "Occupation", value: viewRow.occupation },
          { label: "Baptism", value: viewRow.baptism_status },
          { label: "Marital status", value: viewRow.marital_status },
          { label: "Emergency contact", value: `${viewRow.emergency_contact_name || ""} ${viewRow.emergency_contact_phone || ""}`.trim() },
          { label: "Status", value: viewRow.status },
          { label: "Consent", value: consentLabel(viewRow) },
          { label: "Notes", value: viewRow.notes },
          { label: "Extra form data", value: viewRow.form_data },
          { label: "Registered", value: formatDate(viewRow.created_at) },
        ] : []}
        footer={viewRow && canEdit ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setViewRow(null)}>Close</Button>
            {viewRow.status === "pending" ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveMember(viewRow)}>
                Approve & email
              </Button>
            ) : null}
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { startEdit(viewRow); setViewRow(null); }}>Edit</Button>
          </div>
        ) : undefined}
      />
    </div>
  );
}
