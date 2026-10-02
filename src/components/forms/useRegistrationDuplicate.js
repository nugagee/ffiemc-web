import { useState } from "react";
import { toast } from "sonner";
import { completeEmailOtp, requestEmailOtp } from "../../lib/emailOtp";
import { formatApiError } from "../../lib/api";
import { useDuplicateWatch } from "../../lib/duplicateCheck";
import { DuplicateMatchCard } from "./DuplicateMatchCard";
import { EmailOtpStep } from "./EmailOtpStep";

/**
 * Duplicate card plus OTP for programme and volunteer forms.
 * Membership uses its own flow because that OTP creates the member.
 */
export function useRegistrationDuplicate({ email, phone, context = "registration", onClearContact }) {
  const duplicates = useDuplicateWatch({ email, phone });
  const [mode, setMode] = useState("");
  const [relationship, setRelationship] = useState("");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [usePrimaryEmail, setUsePrimaryEmail] = useState(true);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [busy, setBusy] = useState(false);

  const prepare = async () => {
    const found = await duplicates.check();
    if (!found.length) return { blocked: false, formData: {} };
    if (mode !== "self" && mode !== "beneficiary") {
      setError("Choose how to continue with this existing account.");
      return { blocked: true };
    }
    if (mode === "beneficiary" && (!relationship || (relationship === "other" && !relationshipOther.trim()))) {
      setError("Choose how this person is related.");
      return { blocked: true };
    }
    if (!confirmedId) {
      if (!found[0].has_email) {
        setError("This account has no email on file. Ask an admin to approve the household link.");
        return { blocked: true };
      }
      setBusy(true);
      try {
        const issued = await requestEmailOtp({
          email: "recovery@ffiem.org",
          purpose: mode === "self" ? "account_recovery" : "beneficiary_link",
          payload: {
            primary_member_id: found[0].id,
            relationship,
            relationship_other: relationshipOther,
            context,
          },
        });
        setChallenge(issued);
        setCode("");
        setOtpOpen(true);
        toast.success("We sent a code to the registered email.");
      } catch (err) {
        toast.error(formatApiError(err.message));
      } finally {
        setBusy(false);
      }
      return { blocked: true, waiting: true };
    }
    return {
      blocked: false,
      formData: {
        duplicate_resolution: mode === "self" ? "self" : "beneficiary",
        otp_challenge_id: confirmedId,
        household_primary_id: found[0].id,
        relationship,
        relationship_other: relationshipOther,
        use_primary_email: usePrimaryEmail,
      },
    };
  };

  const confirmCode = async () => {
    if (String(code || "").trim().length < 6) return;
    setBusy(true);
    try {
      const result = await completeEmailOtp(challenge.challengeId, code);
      if (result?.ok === false) throw new Error(result.message || "That code is incorrect.");
      setConfirmedId(challenge.challengeId);
      setOtpOpen(false);
      toast.success(result.recovered ? "Email confirmed. You can finish the form." : "Household link confirmed. You can finish the form.");
    } catch (err) {
      setError(formatApiError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const panel = (
    <>
      {duplicates.matches.length && !otpOpen ? (
        <DuplicateMatchCard
          matches={duplicates.matches}
          mode={mode}
          relationship={relationship}
          relationshipOther={relationshipOther}
          usePrimaryEmail={usePrimaryEmail}
          onRelationship={setRelationship}
          onRelationshipOther={setRelationshipOther}
          onUsePrimaryEmail={setUsePrimaryEmail}
          busy={busy}
          error={error}
          onThatsMe={() => { setMode("self"); setConfirmedId(""); setError(""); }}
          onBeneficiary={() => { setMode("beneficiary"); setConfirmedId(""); setError(""); }}
          onUseDifferent={() => {
            duplicates.setMatches([]);
            setMode("");
            setError("");
            onClearContact?.();
          }}
        />
      ) : null}
      {otpOpen ? (
        <EmailOtpStep
          email={duplicates.matches[0]?.masked_email || "the registered email"}
          code={code}
          onCodeChange={setCode}
          onSubmit={confirmCode}
          onResend={prepare}
          onBack={() => setOtpOpen(false)}
          submitting={busy}
          resendAvailableAt={challenge?.resendAvailableAt}
          error={error}
        />
      ) : null}
    </>
  );

  return { panel, prepare, schedule: duplicates.schedule, otpOpen };
}
