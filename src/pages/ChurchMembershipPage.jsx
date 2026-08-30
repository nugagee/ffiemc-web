import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatApiError, listPublicChurchRoles, submitChurchMembership, markChurchMemberEmailed } from "../lib/api";
import { sendChurchMembershipEmails } from "../lib/email";
import { useSettings } from "../context/SettingsContext";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { BranchSelect } from "../components/programs/BranchSelect";
import { PhoneField } from "../components/forms/PhoneField";
import { ManagedSelect } from "../components/forms/ManagedSelect";
import { RoleMultiSelect } from "../components/forms/RoleMultiSelect";
import { mergeFormDropdowns, MEMBER_FIELD_KEYS } from "../data/formDropdowns";
import { DEFAULT_COUNTRY } from "../data/countries";
import { PersonNameFields } from "../components/forms/PersonNameFields";
import { withPersonPayload } from "../lib/personName";
import { pageSection } from "../data/sitePages";
import { Church, Send } from "lucide-react";

export function ChurchMembershipPage() {
  const { settings } = useSettings();
  const hero = pageSection(settings, "join", "hero");
  const catalogs = useMemo(() => mergeFormDropdowns(settings.formDropdowns), [settings.formDropdowns]);
  const customCatalogs = catalogs.filter((c) => !MEMBER_FIELD_KEYS.includes(c.fieldKey));
  const [roles, setRoles] = useState([]);
  const [extras, setExtras] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name_title: "", first_name: "", last_name: "", email: "", phone: "", gender: "", date_of_birth: "",
    address: "", city: "", state: "", country: DEFAULT_COUNTRY,
    role_ids: [], branch_id: "", ministry: "", baptism_status: "", marital_status: "",
    occupation: "", emergency_contact_name: "", emergency_contact_phone: "", notes: "",
  });

  useEffect(() => {
    listPublicChurchRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.role_ids.length) {
      toast.error("Select at least one church role");
      return;
    }
    setSubmitting(true);
    try {
      const person = withPersonPayload(form);
      const result = await submitChurchMembership({
        ...person,
        email: form.email,
        phone: form.phone,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        role_ids: form.role_ids,
        branch_id: form.branch_id,
        ministry: form.ministry,
        baptism_status: form.baptism_status,
        marital_status: form.marital_status,
        occupation: form.occupation,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        notes: form.notes,
        form_data: extras,
      });
      try {
        await sendChurchMembershipEmails({
          fullName: person.full_name,
          email: form.email,
          phone: form.phone,
          roleName: result.roleName,
          branchName: result.branchName,
          adminEmail: settings.notificationEmail,
        });
        await markChurchMemberEmailed(result.id);
      } catch (emailErr) {
        console.warn(emailErr);
      }
      setDone(true);
      toast.success("Registration received! Check your email for confirmation.");
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <Church className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Welcome to the family!</h1>
          <p className="text-gray-600 mt-3">Your membership registration has been received. Our leadership team will review your application.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <Badge className="bg-red-100 text-red-700 mb-3">{hero.badge || "Membership"}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{hero.headline || "Join Fire-Fire International"}</h1>
          <p className="text-gray-600 mt-4 max-w-xl mx-auto">
            {hero.intro || "Register as a bonafide member of the church. Pastors, workers, and members can complete this form with full details."}
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <PersonNameFields value={form} onChange={(next) => setForm({ ...form, ...next })} />
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input name="email" type="email" value={form.email} onChange={change} required className="focus:border-red-500" />
                </div>
                <PhoneField
                  id="member-phone"
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  required
                />
                <ManagedSelect catalogs={catalogs} fieldKey="gender" label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input name="date_of_birth" type="date" value={form.date_of_birth} onChange={change} className="focus:border-red-500" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <RoleMultiSelect
                    roles={roles}
                    value={form.role_ids}
                    onChange={(role_ids) => setForm({ ...form, role_ids })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input name="address" value={form.address} onChange={change} className="focus:border-red-500" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input name="city" value={form.city} onChange={change} className="focus:border-red-500" />
                </div>
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
                    value={extras[c.fieldKey] || ""}
                    onChange={(v) => setExtras({ ...extras, [c.fieldKey]: v })}
                  />
                ))}
                <div className="space-y-2">
                  <Label>Emergency contact name</Label>
                  <Input name="emergency_contact_name" value={form.emergency_contact_name} onChange={change} className="focus:border-red-500" />
                </div>
                <PhoneField
                  id="member-emergency-phone"
                  label="Emergency contact phone"
                  value={form.emergency_contact_phone}
                  onChange={(v) => setForm({ ...form, emergency_contact_phone: v })}
                />
                <div className="space-y-2 md:col-span-2">
                  <Label>Additional notes</Label>
                  <Textarea name="notes" value={form.notes} onChange={change} rows={3} className="focus:border-red-500" />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700">
                {submitting ? "Submitting…" : (<><Send className="h-4 w-4 mr-2" />Submit membership registration</>)}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
