import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Wallet, X } from "lucide-react";
import { authApi, formatApiError } from "../lib/api";
import { sendMediaContributionSubmissionEmail } from "../lib/email";
import { useSettings } from "../context/SettingsContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

const money = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export default function MediaContributionSubmitPage() {
  const { slug } = useParams();
  const { settings } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(null);
  const [memberId, setMemberId] = useState("");
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [useCustom, setUseCustom] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptName, setReceiptName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const row = await authApi.getPublicMediaContributionMonth(slug);
      setData(row);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load this month");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const members = data?.members || [];
  const unpaid = useMemo(() => members.filter((m) => !m.paid), [members]);
  const paid = useMemo(() => members.filter((m) => m.paid), [members]);

  const onReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await authApi.uploadContributionReceipt(file);
      setReceiptUrl(uploaded.url);
      setReceiptName(file.name);
      toast.success("Receipt uploaded");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Receipt upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!data?.month?.is_open) {
      toast.error("This month is closed for new contributions.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await authApi.submitMediaContribution({
        slug,
        teamMemberId: useCustom ? null : memberId || null,
        fullName: useCustom ? customName : "",
        amount: Number(amount),
        note,
        receiptUrl,
        paymentDate: paymentDate || null,
      });
      setDone(result);
      try {
        await sendMediaContributionSubmissionEmail({
          fullName: result.full_name,
          amount: result.amount,
          monthLabel: result.month_label || data.month.label,
          note,
          receiptUrl: result.receipt_url || receiptUrl,
          paymentDate: result.payment_date || paymentDate,
          monthSlug: result.month_slug || slug,
          adminEmail: settings.notificationEmail || "adenugaolajideadewale@gmail.com",
          secondaryEmails: settings.secondaryNotificationEmails,
          emailSubjects: settings.emailSubjects,
        });
      } catch (emailErr) {
        console.warn("Contribution notify email failed:", emailErr.message);
      }
      toast.success("Thank you — your contribution was recorded.");
      await load();
      setMemberId("");
      setCustomName("");
      setAmount("");
      setNote("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setReceiptUrl("");
      setReceiptName("");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Loading contribution form…
      </div>
    );
  }

  if (!data?.month) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-gray-600">This contribution link was not found.</p>
        <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const month = data.month;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50" data-testid="media-contribute-page">
      <section className="py-12 md:py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-3">Social media team</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <Wallet className="h-8 w-8 text-red-600" /> {month.label}
            </h1>
            <p className="text-gray-600 mt-3 leading-relaxed">
              {month.intro || "Confirm your contribution for this month after sending your payment."}
            </p>
            {!month.is_open && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 inline-block px-3 py-1.5 rounded-full">
                This month is closed for new entries.
              </p>
            )}
          </div>

          {done && (
            <Card className="mb-6 border-0 shadow-md bg-green-50">
              <CardContent className="p-5 flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Recorded — thank you, {done.full_name}!</p>
                  <p className="text-sm text-green-800 mt-1">{money(done.amount)} for {done.month_label}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={submit} className="space-y-5">
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    className={`flex-1 rounded-full px-3 py-2 font-semibold ${!useCustom ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
                    onClick={() => setUseCustom(false)}
                  >
                    Select my name
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-full px-3 py-2 font-semibold ${useCustom ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
                    onClick={() => setUseCustom(true)}
                  >
                    Type my name
                  </button>
                </div>

                {!useCustom ? (
                  <div className="space-y-2">
                    <Label htmlFor="member">Your name *</Label>
                    <select
                      id="member"
                      required={!useCustom}
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!month.is_open}
                    >
                      <option value="">Select your name…</option>
                      {unpaid.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                      {paid.map((m) => (
                        <option key={m.id} value={m.id} disabled>
                          {m.full_name} (Paid)
                        </option>
                      ))}
                    </select>
                    {paid.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Members already marked paid appear greyed out and cannot submit again.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="customName">Your name *</Label>
                    <Input
                      id="customName"
                      required={useCustom}
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      disabled={!month.is_open}
                      placeholder="Full name"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount sent (₦) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!month.is_open}
                    placeholder="e.g. 2000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    disabled={!month.is_open}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  <p className="text-xs text-gray-500">The date you actually sent the money.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea
                    id="note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!month.is_open}
                    placeholder="Payment reference or note"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt">Receipt (optional)</Label>
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                    {receiptUrl ? (
                      <div className="flex items-center justify-between gap-3">
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-red-600 hover:underline truncate"
                        >
                          {receiptName || "View receipt"}
                        </a>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!month.is_open}
                          onClick={() => {
                            setReceiptUrl("");
                            setReceiptName("");
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer text-center">
                        <FileUp className="h-6 w-6 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {uploading ? "Uploading…" : "Upload payment receipt"}
                        </span>
                        <span className="text-xs text-gray-500">JPG, PNG, WEBP or PDF · max 8MB</span>
                        <input
                          id="receipt"
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          className="hidden"
                          disabled={!month.is_open || uploading}
                          onChange={onReceiptChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || uploading || !month.is_open}
                  className="w-full bg-red-600 hover:bg-red-700 h-11"
                >
                  {submitting ? "Submitting…" : "Confirm contribution"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {month.report_public && (
            <p className="text-center text-sm text-gray-500 mt-6">
              <Link to={`/contribute/media/${month.slug}/report`} className="text-red-600 hover:underline">
                View this month’s team report
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
