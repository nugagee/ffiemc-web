import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { formatApiError, markChurchMemberEmailed } from "../lib/api";
import { completeEmailOtp } from "../lib/emailOtp";
import { sendChurchMembershipEmails, sendMembershipApprovedEmail } from "../lib/email";
import { useSettings } from "../context/SettingsContext";
import { EmailOtpStep } from "../components/forms/EmailOtpStep";
import { Card, CardContent } from "../components/ui/card";
import { StepIndicator } from "../components/forms/StepIndicator";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const challengeId = params.get("c") || "";
  const { settings } = useSettings();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const submit = async () => {
    if (!challengeId) {
      setError("This verification link is missing a code id. Open the link from the email again.");
      return;
    }
    if (String(code).trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await completeEmailOtp(challengeId, code);
      if (result?.ok === false) throw new Error(result.message || "That code is incorrect.");
      if (result?.recovered) {
        setDone("This email is already registered. No second record was created.");
        return;
      }
      try {
        if (result?.byAdmin || result?.status === "approved") {
          await sendMembershipApprovedEmail({
            fullName: result.fullName,
            firstName: result.firstName,
            email: result.email,
            roleName: result.roleName,
            branchName: result.branchName,
          });
        } else if (result?.email) {
          await sendChurchMembershipEmails({
            fullName: result.fullName,
            firstName: result.firstName,
            email: result.email,
            roleName: result.roleName,
            branchName: result.branchName,
            status: result.status || "pending",
            adminEmail: settings.notificationEmail,
            secondaryEmails: settings.secondaryNotificationEmails,
            emailSubjects: settings.emailSubjects,
          });
        }
        if (result?.id) await markChurchMemberEmailed(result.id);
      } catch (emailErr) {
        toast.warning("Verified, but the follow-up email failed: " + emailErr.message);
      }
      setDone(result?.beneficiary
        ? "Household link confirmed."
        : "Email confirmed. Thank you.");
    } catch (err) {
      setError(formatApiError(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-red-50 via-white to-orange-50 px-4 py-16">
      <Card className="mx-auto max-w-lg border-0 shadow-lg">
        <CardContent className="p-5 sm:p-8">
          <StepIndicator step={done ? "done" : "otp"} />
          {done ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">You're confirmed</h1>
              <p className="mt-3 text-gray-600">{done}</p>
            </div>
          ) : (
            <EmailOtpStep
              email="the address on this registration"
              code={code}
              onCodeChange={setCode}
              onSubmit={submit}
              onResend={() => toast.message("Use the registration form to request a new code.")}
              onBack={() => window.history.back()}
              submitting={busy}
              error={error}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
