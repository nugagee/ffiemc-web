import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  formatApiError,
  getPublicVolunteerTeam,
  submitVolunteerApplication,
  markVolunteerApplicationEmailed,
} from "../lib/api";
import { sendVolunteerApplicationEmails } from "../lib/email";
import { useSettings } from "../context/SettingsContext";
import { BranchSelect } from "../components/programs/BranchSelect";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Send } from "lucide-react";
import { PhoneField } from "../components/forms/PhoneField";
import { PersonNameFields } from "../components/forms/PersonNameFields";
import { withPersonPayload } from "../lib/personName";

export function VolunteerRegisterPage() {
  const { slug } = useParams();
  const { settings } = useSettings();
  const [team, setTeam] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name_title: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    branch_id: "",
    role_interest: "",
    skills: "",
    experience_level: "",
    availability: "",
    notes: "",
  });

  useEffect(() => {
    setDone(false);
    getPublicVolunteerTeam(slug)
      .then(setTeam)
      .catch((e) => setError(e.message || "Team not found"));
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.branch_id) {
      toast.error("Please select your church branch");
      return;
    }
    setSubmitting(true);
    try {
      const person = withPersonPayload(form);
      const result = await submitVolunteerApplication(slug, { ...form, ...person });
      try {
        await sendVolunteerApplicationEmails({
          fullName: person.full_name,
          email: form.email,
          phone: form.phone,
          teamName: result.teamName || team.name,
          roleInterest: form.role_interest,
          branchName: result.branchName,
          skills: form.skills,
          adminEmail: result.adminEmail || settings.notificationEmail,
          fallbackAdminEmail: settings.notificationEmail,
        });
        await markVolunteerApplicationEmailed(result.id);
      } catch (emailErr) {
        console.warn(emailErr);
      }
      setDone(true);
      toast.success("Application received. Check your email for confirmation.");
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return <div className="min-h-[60vh] flex items-center justify-center text-red-600 px-4 text-center">{error}</div>;
  }
  if (!team) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading…</div>;
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 bg-gradient-to-br from-violet-50 via-white to-amber-50">
        <Card className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900">Thank you!</h1>
          <p className="text-gray-600 mt-3">
            Your interest in the {team.name} has been submitted. You'll receive an email confirmation. An assigned admin will review and approve your application.
          </p>
        </Card>
      </div>
    );
  }

  const roles = Array.isArray(team.roles) ? team.roles : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 py-12">
      <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-5">
          <Badge className="bg-violet-700 text-white hover:bg-violet-700">Volunteers needed</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{team.heading || team.name}</h1>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{team.intro}</p>
          {team.image ? (
            <img src={team.image} alt="" className="w-full rounded-2xl shadow-lg object-contain max-h-[36rem] bg-violet-950" />
          ) : null}
          {team.whatsappUrl ? (
            <a
              href={team.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-semibold text-green-700 hover:underline"
            >
              Or join the WhatsApp group
            </a>
          ) : null}
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Register your interest</h2>
            <p className="text-sm text-gray-500 mb-5">Share this page with church groups. Applications stay pending until an assigned admin approves them.</p>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <PersonNameFields value={form} onChange={(next) => setForm({ ...form, ...next })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <PhoneField
                  id="volunteer-phone"
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  required
                />
              </div>
              <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} />
              <div className="space-y-2">
                <Label>Role of interest *</Label>
                {roles.length ? (
                  <Select value={form.role_interest || undefined} onValueChange={(v) => setForm({ ...form, role_interest: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input required value={form.role_interest} onChange={(e) => setForm({ ...form, role_interest: e.target.value })} />
                )}
              </div>
              <div className="space-y-2">
                <Label>Skills</Label>
                <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Editing, writing, camera, design…" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Experience</Label>
                  <Select value={form.experience_level || undefined} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["No experience", "Some experience", "Experienced"].map((x) => (
                        <SelectItem key={x} value={x}>{x}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Sundays, weekdays…" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-violet-700 hover:bg-violet-800">
                {submitting ? "Submitting…" : (<><Send className="h-4 w-4 mr-2" />Submit application</>)}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
