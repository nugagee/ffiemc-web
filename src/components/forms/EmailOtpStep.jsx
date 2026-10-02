import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { FieldMessage } from "./FieldMessage";

export function EmailOtpStep({
  email,
  code,
  onCodeChange,
  onSubmit,
  onResend,
  onBack,
  submitting = false,
  resendAvailableAt,
  error = "",
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const wait = resendAvailableAt
    ? Math.max(0, Math.ceil((new Date(resendAvailableAt).getTime() - now) / 1000))
    : 0;

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">Enter your email code</h2>
        <p className="text-sm text-gray-600 mt-2">
          We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>.
          It expires in about 10 minutes. Registration is saved only after the code is confirmed.
        </p>
      </div>
      <div data-field="otp" className="space-y-2">
        <InputOTP maxLength={6} value={code} onChange={onCodeChange} inputMode="numeric" autoFocus>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} className="h-12 w-11 text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FieldMessage message={error} />
      </div>
      <Button type="submit" disabled={submitting || String(code || "").length < 6} className="w-full bg-red-600 hover:bg-red-700">
        {submitting ? "Checking…" : "Verify and finish registration"}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" className="text-gray-600 underline" onClick={onBack} disabled={submitting}>
          Change email
        </button>
        <button
          type="button"
          className="text-red-700 font-medium disabled:text-gray-400"
          onClick={onResend}
          disabled={submitting || wait > 0}
        >
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
