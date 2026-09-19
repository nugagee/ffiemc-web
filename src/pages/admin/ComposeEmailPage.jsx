import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minimize2, Paperclip, Send, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { sendAdminComposedEmail } from "../../lib/email";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";

const empty = () => ({
  to: "",
  cc: "",
  subject: "",
  body: "",
});

export default function ComposeEmailPage() {
  const { can, user } = useAuth();
  const { settings } = useSettings();
  const canEdit = can("utilities");
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showCc, setShowCc] = useState(false);

  useEffect(() => {
    if (!canEdit) toast.error("You need Utilities access to compose email");
  }, [canEdit]);

  const fromLabel = useMemo(
    () => user?.full_name || user?.email || "FFIEMC Admin",
    [user]
  );

  const send = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.to.trim()) {
      toast.error("Add at least one recipient");
      return;
    }
    if (!form.subject.trim()) {
      toast.error("Add a subject");
      return;
    }
    if (!form.body.trim()) {
      toast.error("Write a message");
      return;
    }
    setSending(true);
    try {
      await sendAdminComposedEmail({
        to: form.to,
        cc: form.cc,
        subject: form.subject.trim(),
        body: form.body.trim(),
        fromName: fromLabel,
        replyToEmail: settings.notificationEmail || "adenugaolajideadewale@gmail.com",
      });
      toast.success("Email sent");
      setForm(empty());
      setShowCc(false);
    } catch (err) {
      toast.error(err.message || "Could not send email");
    } finally {
      setSending(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="max-w-xl">
        <p className="text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm">
          Compose email requires edit permission on Messages.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[70vh]" data-testid="compose-email-page">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Messages & email</p>
        <h1 className="text-3xl font-bold mt-2">Compose</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">
          Send a new email from the admin platform. Recipients get the message via your configured email delivery
          Emails are sent through Supabase Edge + Resend using your verified domain.
        </p>
      </div>

      {/* Gmail-style compose card */}
      <div
        className={`fixed z-40 shadow-2xl border border-gray-200 bg-white overflow-hidden transition-all ${
          minimized
            ? "bottom-0 right-4 w-72 rounded-t-xl"
            : "bottom-0 right-4 sm:right-8 w-[min(100vw-1rem,36rem)] rounded-t-2xl"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-900 text-white">
          <p className="text-sm font-medium truncate">New Message</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10"
              onClick={() => setMinimized((v) => !v)}
              aria-label={minimized ? "Expand" : "Minimize"}
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10"
              onClick={() => {
                setForm(empty());
                setMinimized(false);
              }}
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!minimized && (
          <form onSubmit={send} className="flex flex-col max-h-[min(70vh,32rem)]">
            <div className="border-b px-3 py-2 flex items-center gap-2">
              <span className="text-xs text-gray-400 w-10 shrink-0">From</span>
              <p className="text-sm text-gray-700 truncate">{fromLabel}</p>
            </div>
            <div className="border-b px-3 py-2 flex items-center gap-2">
              <Label className="text-xs text-gray-400 w-10 shrink-0">To</Label>
              <Input
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                placeholder="recipient@email.com"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                autoFocus
              />
              {!showCc && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-800 shrink-0"
                  onClick={() => setShowCc(true)}
                >
                  Cc
                </button>
              )}
            </div>
            {showCc && (
              <div className="border-b px-3 py-2 flex items-center gap-2">
                <Label className="text-xs text-gray-400 w-10 shrink-0">Cc</Label>
                <Input
                  className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                  placeholder="cc@email.com"
                  value={form.cc}
                  onChange={(e) => setForm({ ...form, cc: e.target.value })}
                />
              </div>
            )}
            <div className="border-b px-3 py-2 flex items-center gap-2">
              <Label className="text-xs text-gray-400 w-10 shrink-0">Subj</Label>
              <Input
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <Textarea
              className="border-0 shadow-none focus-visible:ring-0 rounded-none min-h-[12rem] resize-none flex-1"
              placeholder="Write your message…"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t bg-gray-50">
              <Button type="submit" disabled={sending} className="bg-red-600 hover:bg-red-700 rounded-full px-5">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending…" : "Send"}
              </Button>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                Attachments are not supported in compose yet
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
