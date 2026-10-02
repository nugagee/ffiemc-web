import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatApiError, listPublicChurchRoles, markChurchMemberEmailed } from "../lib/api";
import { sendChurchMembershipEmails } from "../lib/email";
import { registrationFieldErrors } from "../lib/emailValidation";
import { focusFirstInvalid, hasFieldErrors } from "../lib/formErrors";
import { completeEmailOtp, requestEmailOtp } from "../lib/emailOtp";
import { useSettings } from "../context/SettingsContext";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { BranchSelect } from "../components/programs/BranchSelect";
import { PhoneField } from "../components/forms/PhoneField";
import { ManagedSelect } from "../components/forms/ManagedSelect";
import { RoleMultiSelect } from "../components/forms/RoleMultiSelect";
import { mergeFormDropdowns, MEMBER_FIELD_KEYS } from "../data/formDropdowns";
import { DEFAULT_COUNTRY } from "../data/countries";
import { PersonNameFields } from "../components/forms/PersonNameFields";
import { EmailField } from "../components/forms/EmailField";
import { EmailOtpStep } from "../components/forms/EmailOtpStep";
import { DuplicateMatchCard } from "../components/forms/DuplicateMatchCard";
import { StepIndicator } from "../components/forms/StepIndicator";
import { FieldMessage } from "../components/forms/FieldMessage";
import { submitPendingBeneficiary, useDuplicateWatch } from "../lib/duplicateCheck";
import { withPersonPayload } from "../lib/personName";
import { pageSection } from "../data/sitePages";
import { Church, Send } from "lucide-react";
import { Link } from "react-router-dom";

export function ChurchMembershipPage() {
  const { settings } = useSettings();
  const hero = pageSection(settings, "join", "hero");
  const catalogs = useMemo(() => mergeFormDropdowns(settings.formDropdowns), [settings.formDropdowns]);
  const customCatalogs = catalogs.filter((c) => !MEMBER_FIELD_KEYS.includes(c.fieldKey));
  const [roles, setRoles] = useState([]);
  const [extras, setExtras] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [suggestion, setSuggestion] = useState("");
  const [step, setStep] = useState("form");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpPurpose, setOtpPurpose] = useState("membership");
  const [doneKind, setDoneKind] = useState("member");
  const [duplicateMode, setDuplicateMode] = useState("");
  const [relationship, setRelationship] = useState("");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [usePrimaryEmail, setUsePrimaryEmail] = useState(true);
  const [duplicateError, setDuplicateError] = useState("");
  const [form, setForm] = useState({
    name_title: "", first_name: "", last_name: "", email: "", phone: "", gender: "", age_bracket: "", date_of_birth: "",
    address: "", city: "", state: "", country: DEFAULT_COUNTRY,
    role_ids: [], branch_id: "", ministry: "", baptism_status: "", marital_status: "",
    occupation: "", emergency_contact_name: "", emergency_contact_phone: "", notes: "",
    consent: false,
  });
  const duplicates = useDuplicateWatch({ email: form.email, phone: form.phone });

  useEffect(() => {
    listPublicChurchRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const membershipPayload = () => {
    const person = withPersonPayload(form);
    return {
      ...person,
      phone: form.phone,
      gender: form.gender,
      date_of_birth: form.date_of_birth || "",
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
      form_data: {
        ...extras,
        age_bracket: form.age_bracket || "",
        consent: true,
        consent_at: new Date().toISOString(),
      },
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    const { errors: next, suggestion: nextSuggestion } = registrationFieldErrors(form, {
      requireTitle: true,
      requireEmail: true,
      requirePhone: true,
      requireBranch: true,
      requireRoles: true,
    });
    if (!form.consent) next.consent = "Tick the consent box to continue";
    setSuggestion(nextSuggestion);
    setErrors(next);
    if (hasFieldErrors(next)) {
      focusFirstInvalid(next);
      return;
    }
    const found = await duplicates.check();
    if (found.length && duplicateMode !== "beneficiary" && duplicateMode !== "self") {
      setDuplicateError("Choose how to continue with this existing account.");
      focusFirstInvalid({ duplicate: "Choose an option" });
      return;
    }
    setSubmitting(true);
    try {
      if (found.length && duplicateMode === "self") {
        if (!found[0].has_email) {
          toast.error("This account has no email address. Ask the church office to update it.");
          return;
        }
        const issued = await requestEmailOtp({
          email: "recovery@ffiem.org",
          purpose: "account_recovery",
          payload: { primary_member_id: found[0].id },
        });
        setOtpPurpose("account_recovery");
        setChallenge(issued);
        setCode("");
        setOtpError("");
        setStep("otp");
        toast.success("We sent a code to the registered email.");
        return;
      }
      if (found.length && duplicateMode === "beneficiary") {
        if (!relationship || (relationship === "other" && !relationshipOther.trim())) {
          setDuplicateError("Choose how this person is related.");
          focusFirstInvalid({ relationship: "Choose a relationship" });
          return;
        }
        if (!found[0].has_email) {
          await submitPendingBeneficiary(found[0].id, {
            ...membershipPayload(),
            relationship,
            relationship_other: relationshipOther,
            email: form.email,
            phone: form.phone,
          });
          setDoneKind("pending-link");
          setDone(true);
          return;
        }
        const issued = await requestEmailOtp({
          email: "recovery@ffiem.org",
          purpose: "beneficiary_link",
          payload: {
            ...membershipPayload(),
            context: "membership",
            primary_member_id: found[0].id,
            relationship,
            relationship_other: relationshipOther,
            use_primary_email: usePrimaryEmail,
            applicant_email: usePrimaryEmail ? "" : form.email,
          },
        });
        setOtpPurpose("beneficiary_link");
        setChallenge(issued);
        setCode("");
        setOtpError("");
        setStep("otp");
        toast.success("We sent a code to the account holder.");
        return;
      }
      const issued = await requestEmailOtp({
        email: form.email,
        purpose: "membership",
        payload: membershipPayload(),
      });
      setOtpPurpose("membership");
      setChallenge(issued);
      setCode("");
      setOtpError("");
      setStep("otp");
      toast.success("Verification code sent. Enter it to finish registration.");
    } catch (err) {
      if (err.suggestion) {
        setSuggestion(err.suggestion);
        setErrors({ email: err.message });
        focusFirstInvalid({ email: err.message });
      } else {
        toast.error(formatApiError(err.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (String(code || "").trim().length < 6) {
      setOtpError("Enter the 6-digit code from your email.");
      focusFirstInvalid({ otp: "code" });
      return;
    }
    setSubmitting(true);
    setOtpError("");
    try {
      const result = await completeEmailOtp(challenge.challengeId, code);
      if (result?.ok === false) throw new Error(result.message || "That code is incorrect.");
      if (result.recovered) {
        setDoneKind("recovered");
        setStep("done");
        setDone(true);
        return;
      }
      const person = withPersonPayload(form);
      const roleName = roles.filter((r) => form.role_ids.includes(r.id)).map((r) => r.name).join(", ");
      try {
        await sendChurchMembershipEmails({
          ...person,
          ...form,
          formData: membershipPayload().form_data,
          email: result.email || form.email,
          roleName: roleName || result.roleName,
          branchName: result.branchName,
          status: result.beneficiary ? (result.status || "pending") : "pending",
          adminEmail: settings.notificationEmail,
          secondaryEmails: settings.secondaryNotificationEmails,
          emailSubjects: settings.emailSubjects,
        });
        await markChurchMemberEmailed(result.id);
      } catch (emailErr) {
        console.warn(emailErr);
      }
      setDoneKind(result.beneficiary ? "beneficiary" : "member");
      setStep("done");
      setDone(true);
      toast.success(result.beneficiary
        ? "Household link confirmed. The application is pending church approval."
        : "Application received. Check your email for acknowledgement — confirmation follows after approval.");
    } catch (err) {
      setOtpError(formatApiError(err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setSubmitting(true);
    setOtpError("");
    try {
      const issued = await requestEmailOtp({
        email: form.email,
        purpose: "membership",
        payload: membershipPayload(),
        challengeId: challenge?.challengeId,
      });
      setChallenge(issued);
      toast.success("A new code is on its way.");
    } catch (err) {
      setOtpError(formatApiError(err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <Church className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">
            {doneKind === "recovered" ? "This email is already registered" : doneKind === "pending-link" ? "Household link sent for review" : "Application received"}
          </h1>
          <p className="text-gray-600 mt-3">
            {doneKind === "recovered"
              ? "We confirmed this email belongs to an existing member. No second record was created. Contact the church office if you need to update your details."
              : doneKind === "pending-link"
                ? "The account holder has no email on file, so an admin will approve this household link."
                : doneKind === "beneficiary"
                  ? "The account holder approved the household link. Your membership application is pending church review."
                  : "Thank you. Your membership application is pending review. We have emailed you an acknowledgement. You will receive a confirmation email once church leadership approves your request."}
          </p>
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
          <CardContent className="p-4 sm:p-8">
            <StepIndicator step={done ? "done" : step} />
            {step === "otp" ? (
              <EmailOtpStep
                email={otpPurpose === "membership" ? form.email : (duplicates.matches[0]?.masked_email || "the registered email")}
                code={code}
                onCodeChange={setCode}
                onSubmit={verifyCode}
                onResend={resendCode}
                onBack={() => setStep("form")}
                submitting={submitting}
                resendAvailableAt={challenge?.resendAvailableAt}
                error={otpError}
              />
            ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <PersonNameFields value={form} onChange={(next) => setForm({ ...form, ...next })} errors={errors} />
                <EmailField
                  value={form.email}
                  onChange={(email) => { setForm({ ...form, email }); setDuplicateMode(""); }}
                  onBlur={duplicates.schedule}
                  error={errors.email}
                  suggestion={suggestion}
                  onUseSuggestion={(next) => {
                    setForm({ ...form, email: next });
                    setSuggestion("");
                    setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                />
                <PhoneField
                  id="member-phone"
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => { setForm({ ...form, phone: v }); setDuplicateMode(""); }}
                  onBlur={duplicates.schedule}
                  required
                  error={errors.phone}
                />
                {duplicates.matches.length ? (
                  <div className="md:col-span-2">
                    <DuplicateMatchCard
                      matches={duplicates.matches}
                      mode={duplicateMode}
                      relationship={relationship}
                      relationshipOther={relationshipOther}
                      usePrimaryEmail={usePrimaryEmail}
                      onRelationship={setRelationship}
                      onRelationshipOther={setRelationshipOther}
                      onUsePrimaryEmail={setUsePrimaryEmail}
                      busy={submitting}
                      error={duplicateError}
                      onThatsMe={() => { setDuplicateMode("self"); setDuplicateError(""); }}
                      onBeneficiary={() => { setDuplicateMode("beneficiary"); setDuplicateError(""); }}
                      onUseDifferent={() => {
                        const matchOn = duplicates.matches[0]?.match_on;
                        setForm({
                          ...form,
                          email: matchOn === "phone" ? form.email : "",
                          phone: matchOn === "email" ? form.phone : "",
                        });
                        setDuplicateMode("");
                        duplicates.setMatches([]);
                        window.requestAnimationFrame(() => {
                          document.querySelector('[data-field="email"] input, [data-field="phone"] input')?.focus();
                        });
                      }}
                    />
                  </div>
                ) : null}
                <ManagedSelect catalogs={catalogs} fieldKey="gender" label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
                <ManagedSelect catalogs={catalogs} fieldKey="age" label="Age bracket" value={form.age_bracket} onChange={(v) => setForm({ ...form, age_bracket: v })} />
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
                    error={errors.role_ids}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} error={errors.branch_id} />
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
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 space-y-3" data-field="consent">
                <p className="text-sm font-semibold text-gray-900">{hero.consentTitle || "Consent"}</p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="membership-consent"
                    checked={form.consent}
                    onCheckedChange={(v) => setForm({ ...form, consent: Boolean(v) })}
                    className="mt-0.5 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <Label htmlFor="membership-consent" className="font-normal text-sm text-gray-700 leading-relaxed">
                    {hero.consentText ||
                      "I confirm that the information I have provided is true, and I consent to Fire-Fire International Evangelical Church collecting and using my details to process this membership application, contact me about church life, and keep a membership record. I understand my application will remain pending until it is approved by church leadership."}
                    {" "}*
                    <span className="block mt-2 text-xs text-gray-500">
                      See our <Link to="/privacy" className="text-red-700 underline underline-offset-2">privacy policy</Link>.
                    </span>
                  </Label>
                </div>
                <FieldMessage message={errors.consent} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700">
                {submitting ? "Sending code…" : (<><Send className="h-4 w-4 mr-2" />Send verification code</>)}
              </Button>
            </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
