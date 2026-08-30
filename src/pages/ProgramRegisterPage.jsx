import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { formatApiError, getPublicProgram, submitProgramRegistration, markProgramRegistrationEmailed } from "../lib/api";
import { sendProgramRegistrationEmails } from "../lib/email";
import { useSettings } from "../context/SettingsContext";
import { BranchSelect } from "../components/programs/BranchSelect";
import { DynamicFormFields, buildFormData } from "../components/programs/DynamicFormFields";
import { mergeProgramPage, THEME_CLASSES } from "../components/programs/pageContent";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Calendar, MapPin, Send } from "lucide-react";

function fieldLabel(fields, name, fallback) {
  const found = (fields || []).find((f) => f.name === name);
  return found?.label || fallback;
}

function fieldRequired(fields, name) {
  const found = (fields || []).find((f) => f.name === name);
  return found ? Boolean(found.required) : true;
}

export function ProgramRegisterPage() {
  const { slug } = useParams();
  const { settings } = useSettings();
  const [program, setProgram] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", branch_id: "", extras: {} });

  useEffect(() => {
    setDone(false);
    setError("");
    getPublicProgram(slug)
      .then(setProgram)
      .catch((e) => setError(e.message || "Program not found"));
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    const page = mergeProgramPage(program.pageContent || program.page_content, program);
    if (page.requireBranch && !form.branch_id) {
      toast.error("Please select your church branch");
      return;
    }
    setSubmitting(true);
    try {
      const form_data = buildFormData(program.formFields, form.extras);
      const result = await submitProgramRegistration(slug, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        branch_id: form.branch_id,
        form_data,
      });
      try {
        await sendProgramRegistrationEmails({
          programTitle: result.programTitle || program.title,
          adminEmail: result.adminEmail,
          fullName: form.full_name,
          email: form.email,
          phone: form.phone,
          formData: form_data,
          branchName: result.branchName,
          fallbackAdminEmail: settings.notificationEmail,
        });
        await markProgramRegistrationEmailed(result.id);
      } catch (emailErr) {
        console.warn(emailErr);
      }
      setDone(true);
      toast.success("Registration successful! Check your email for confirmation.");
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (!program) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading…</div>;
  }

  const page = mergeProgramPage(program.pageContent || program.page_content, program);
  const status = program.registrationStatus || "open";
  const formOpen = status === "open";
  const isDark = page.theme === "dark";
  const muted = isDark ? "text-white/70" : "text-gray-600";
  const titleCls = isDark ? "text-white" : "text-gray-900";
  const dateFmt = { day: "numeric", month: "long", year: "numeric" };

  const defaultClosed =
    status === "closed"
      ? `Registration closed${program.registrationClosesAt ? ` on ${new Date(program.registrationClosesAt).toLocaleString("en-GB")}` : ""}.`
      : status === "not_open"
        ? `Registration opens ${program.registrationOpensAt ? new Date(program.registrationOpensAt).toLocaleString("en-GB") : "soon"}.`
        : status === "disabled"
          ? "Public registration is not available for this program."
          : "";

  const closedBody = page.closedBody || defaultClosed;
  const heading = page.heading || program.title;
  const intro = page.intro || program.description;

  if (done) {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center px-4 ${THEME_CLASSES[page.theme]}`}>
        <Card className={`max-w-md w-full text-center p-8 ${isDark ? "bg-white/10 border-white/10 text-white" : ""}`}>
          <h1 className="text-2xl font-bold">{page.successHeading}</h1>
          <p className={`mt-3 ${muted}`}>{page.successBody.replace("{title}", program.title)}</p>
        </Card>
      </div>
    );
  }

  const meta = (
    <div className={`flex flex-wrap gap-4 mt-4 text-sm ${muted}`}>
      {page.showVenue && program.venue && (
        <span className="inline-flex items-center gap-1"><MapPin size={14} /> {program.venue}</span>
      )}
      {page.showDates && program.startsAt && (
        <span className="inline-flex items-center gap-1">
          <Calendar size={14} />
          {new Date(program.startsAt).toLocaleDateString("en-GB", dateFmt)}
          {program.endsAt ? ` – ${new Date(program.endsAt).toLocaleDateString("en-GB", dateFmt)}` : ""}
        </span>
      )}
    </div>
  );

  const copyBlock = (
    <div className={page.layout === "split" ? "text-left" : "text-center"}>
      {page.showTypeBadge && (page.badge || program.typeName) ? (
        <Badge className="bg-red-600 text-white hover:bg-red-600 mb-3">{page.badge || program.typeName}</Badge>
      ) : null}
      <h1 className={`text-3xl md:text-4xl font-bold ${titleCls}`}>{heading}</h1>
      {page.subheading ? (
        <p className="text-xl md:text-2xl font-semibold text-red-600 mt-2 tracking-wide">{page.subheading}</p>
      ) : null}
      {intro ? <p className={`${muted} mt-4 whitespace-pre-wrap leading-relaxed`}>{intro}</p> : null}
      {page.highlights ? <p className={`mt-3 text-sm font-medium ${isDark ? "text-amber-200" : "text-red-800"}`}>{page.highlights}</p> : null}
      {meta}
    </div>
  );

  const flyer = page.heroImage ? (
    <div className={`overflow-hidden rounded-2xl shadow-lg ${page.layout === "banner" ? "max-h-[28rem]" : ""}`}>
      <img
        src={page.heroImage}
        alt=""
        className={`w-full object-cover ${page.layout === "banner" ? "h-64 md:h-[28rem]" : "max-h-[36rem]"}`}
      />
    </div>
  ) : null;

  const formCard = (
    <Card className={`shadow-lg border-0 ${isDark ? "bg-white text-gray-900" : ""}`}>
      <CardContent className="p-8">
        {!formOpen ? (
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-gray-900">{page.closedHeading}</p>
            {closedBody ? <p className="text-gray-600 whitespace-pre-wrap">{closedBody}</p> : null}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {page.formHeading ? <h2 className="text-xl font-bold text-gray-900">{page.formHeading}</h2> : null}
            {page.formIntro ? <p className="text-sm text-gray-600 whitespace-pre-wrap">{page.formIntro}</p> : null}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>{fieldLabel(program.formFields, "full_name", "Full Name")}{fieldRequired(program.formFields, "full_name") ? " *" : ""}</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required={fieldRequired(program.formFields, "full_name")} className="focus:border-red-500" />
              </div>
              <div className="space-y-2">
                <Label>{fieldLabel(program.formFields, "email", "Email")}{fieldRequired(program.formFields, "email") ? " *" : ""}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={fieldRequired(program.formFields, "email")} className="focus:border-red-500" />
              </div>
              <div className="space-y-2">
                <Label>{fieldLabel(program.formFields, "phone", "Phone")}{fieldRequired(program.formFields, "phone") ? " *" : ""}</Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required={fieldRequired(program.formFields, "phone")} className="focus:border-red-500" />
              </div>
            </div>
            {page.requireBranch ? (
              <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} required />
            ) : (
              <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} />
            )}
            <DynamicFormFields
              fields={program.formFields}
              values={form.extras}
              onChange={(name, val) => setForm({ ...form, extras: { ...form.extras, [name]: val } })}
            />
            <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700">
              {submitting ? "Submitting…" : (<><Send className="h-4 w-4 mr-2" />{page.submitLabel}</>)}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );

  if (page.layout === "banner") {
    return (
      <div className={`min-h-screen ${THEME_CLASSES[page.theme]}`}>
        {flyer}
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
          {copyBlock}
          {formCard}
        </div>
      </div>
    );
  }

  if (page.layout === "split") {
    return (
      <div className={`min-h-screen ${THEME_CLASSES[page.theme]} py-12 md:py-16`}>
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-6">
            {copyBlock}
            {flyer}
          </div>
          {formCard}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${THEME_CLASSES[page.theme]} py-16`}>
      <div className="max-w-2xl mx-auto px-4 space-y-8">
        {flyer}
        {copyBlock}
        {formCard}
      </div>
    </div>
  );
}
