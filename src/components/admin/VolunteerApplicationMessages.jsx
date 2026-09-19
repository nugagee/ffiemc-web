import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare, Send } from "lucide-react";
import { authApi, formatApiError } from "../../lib/api";
import { sendVolunteerFollowUpEmail } from "../../lib/email";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";

const defaultBody = (applicantName, teamName) => {
  const first = (applicantName || "").split(" ")[0] || "Friend";
  const team = teamName || "Media Department";
  return (
    `I hope this message finds you well.\n\n` +
    `Thank you again for applying to serve with the ${team} at Fire-Fire International Evangelical Church.\n\n` +
    `We are currently reviewing volunteer applications and wanted to follow up with you regarding your interest` +
    (first ? ` (${first})` : "") +
    `.\n\n` +
    `Please reply to this email if you are still available to serve, or if you have any questions. ` +
    `We look forward to hearing from you.\n\n` +
    `God bless you.`
  );
};

export function VolunteerApplicationMessages({ application, canEdit }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState("outbound"); // outbound | inbound | note
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const teamName = application?.team_name || "Media Department";

  const load = async () => {
    if (!application?.id) return;
    setLoading(true);
    try {
      const rows = await authApi.listVolunteerApplicationMessages(application.id);
      setMessages(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSubject(`Follow-up on your ${teamName} volunteer application`);
    setBody(defaultBody(application?.full_name, teamName));
    setMode("outbound");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!body.trim()) {
      toast.error("Message body is required");
      return;
    }
    setSending(true);
    try {
      if (mode === "outbound") {
        await sendVolunteerFollowUpEmail({
          toEmail: application.email,
          applicantName: application.full_name,
          teamName,
          subject: subject.trim() || `Follow-up — ${teamName}`,
          body: body.trim(),
          adminName: user?.full_name || user?.email || "Volunteer Team",
          replyToEmail: settings?.notificationEmail || "adenugaolajideadewale@gmail.com",
        });
      }

      await authApi.addVolunteerApplicationMessage(application.id, {
        direction: mode,
        subject: subject.trim(),
        body: body.trim(),
        sent_to: mode === "outbound" ? application.email : "",
      });

      toast.success(
        mode === "outbound"
          ? "Follow-up email sent and saved"
          : mode === "inbound"
            ? "Applicant reply logged"
            : "Internal note saved"
      );
      setBody(mode === "outbound" ? defaultBody(application.full_name, teamName) : "");
      if (mode === "inbound" || mode === "note") setSubject("");
      await load();
    } catch (err) {
      toast.error(
        formatApiError(err.message) ||
          "Could not send / save message. Check your connection and that Resend / Supabase email is configured."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-red-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Application follow-up</h3>
      </div>
      <p className="text-xs text-gray-500">
        Send a follow-up email to the applicant, or log a reply you received in your inbox so the conversation stays in the portal.
      </p>

      <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border bg-gray-50/80 p-3">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-4">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm border ${
                m.direction === "outbound"
                  ? "bg-white border-red-100"
                  : m.direction === "inbound"
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-amber-50 border-amber-100"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {m.direction === "outbound" ? "Sent email" : m.direction === "inbound" ? "Applicant reply" : "Note"}
                </Badge>
                <span className="text-[10px] text-gray-400">
                  {m.created_at ? new Date(m.created_at).toLocaleString("en-GB") : ""}
                  {m.sent_by_name ? ` · ${m.sent_by_name}` : ""}
                </span>
              </div>
              {m.subject ? <p className="font-medium text-gray-800 text-xs mb-1">{m.subject}</p> : null}
              <p className="text-gray-700 whitespace-pre-wrap text-xs leading-relaxed">{m.body}</p>
            </div>
          ))
        )}
      </div>

      {canEdit ? (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "outbound", label: "Send email" },
              { id: "inbound", label: "Log reply" },
              { id: "note", label: "Internal note" },
            ].map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={mode === opt.id ? "default" : "outline"}
                className={mode === opt.id ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => {
                  setMode(opt.id);
                  if (opt.id === "outbound") {
                    setSubject(`Follow-up on your ${teamName} volunteer application`);
                    setBody(defaultBody(application?.full_name, teamName));
                  } else {
                    setSubject(opt.id === "inbound" ? "Reply from applicant" : "Internal note");
                    setBody("");
                  }
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          </div>
          <div className="space-y-2">
            <Label>{mode === "outbound" ? "Email message" : mode === "inbound" ? "Paste applicant reply" : "Note"}</Label>
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                mode === "outbound"
                  ? "Write your follow-up…"
                  : mode === "inbound"
                    ? "Paste the reply you received by email…"
                    : "Private note for admins…"
              }
            />
          </div>
          <Button type="submit" disabled={sending} className="bg-red-600 hover:bg-red-700">
            {mode === "outbound" ? (
              <>
                <Mail className="h-4 w-4 mr-2" />
                {sending ? "Sending…" : `Email ${application?.email || "applicant"}`}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Saving…" : "Save to thread"}
              </>
            )}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-gray-400">You need edit permission to send follow-ups.</p>
      )}
    </div>
  );
}
