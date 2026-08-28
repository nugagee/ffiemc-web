import { useEffect, useRef, useState } from "react";
import api, { authApi, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import {
  sendPastorAssignmentEmail,
  sendPrayerReplyEmail,
} from "../../lib/email";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, Send, Check, Trash2 } from "lucide-react";

const fmt = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
};

const statusTone = {
  new: "bg-blue-100 text-blue-800",
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-purple-100 text-purple-800",
  prayed: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
  archived: "bg-gray-100 text-gray-500",
};

export default function PrayerInboxPage() {
  const { can, user } = useAuth();
  const { settings } = useSettings();
  const isPastor = user?.role === "pastor";
  const canEdit = can("prayer.inbox", "edit");
  const canDelete = can("prayer.inbox", "delete") && !isPastor;
  const canAssign = canEdit && !isPastor;

  const [items, setItems] = useState([]);
  const [pastors, setPastors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [pastorId, setPastorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const selected = items.find((p) => p.id === selectedId) || null;
  const notifyEmail = settings.notificationEmail || "adenugaolajideadewale@gmail.com";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/prayer-requests");
      setItems(data || []);
      if (!isPastor) {
        try {
          const list = await authApi.listPastors();
          setPastors((list || []).filter((p) => p.is_active));
        } catch {
          setPastors([]);
        }
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (id) => {
    if (!id) {
      setMessages([]);
      return;
    }
    try {
      const rows = await authApi.listPrayerMessages(id);
      setMessages(rows || []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load conversation");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadMessages(selectedId);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const result = await authApi.replyPrayer(selected.id, reply.trim());
      try {
        await sendPrayerReplyEmail({
          visitorName: result.visitor_name || selected.name,
          visitorEmail: result.visitor_email || selected.email,
          replyBody: reply.trim(),
          senderName: result.sender_name || user?.username,
          category: result.category || selected.category,
          adminEmail: notifyEmail,
        });
        if (result.id) await authApi.markPrayerMessageEmailed(result.id).catch(() => {});
      } catch (emailErr) {
        console.warn(emailErr);
        toast.warning("Reply saved, but the email to the visitor could not be sent.");
      }
      setReply("");
      toast.success("Reply sent");
      await load();
      await loadMessages(selected.id);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not send reply");
    } finally {
      setSending(false);
    }
  };

  const assign = async () => {
    if (!selected || !pastorId) return;
    try {
      const row = await authApi.assignPrayer(selected.id, pastorId);
      try {
        await sendPastorAssignmentEmail({
          pastorName: row.pastor_name,
          pastorEmail: row.pastor_email,
          visitorName: selected.name,
          category: selected.category,
          requestPreview: selected.request,
          adminEmail: notifyEmail,
        });
      } catch (emailErr) {
        console.warn(emailErr);
        toast.warning("Assigned, but pastor email notification failed.");
      }
      toast.success(`Assigned to ${row.pastor_name || "pastor"}`);
      setPastorId("");
      await load();
      await loadMessages(selected.id);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not assign");
    }
  };

  const markPrayed = async () => {
    if (!selected) return;
    await api.put(`/prayer-requests/${selected.id}/status`, { status: "prayed" });
    toast.success("Marked as prayed");
    await load();
    await loadMessages(selected.id);
  };

  const remove = async () => {
    if (!selected || !canDelete) return;
    if (!window.confirm("Delete this prayer request and its conversation?")) return;
    await api.delete(`/prayer-requests/${selected.id}`);
    toast.success("Deleted");
    setSelectedId(null);
    await load();
  };

  return (
    <div data-testid="prayer-inbox-page">
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Prayer</p>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">
        {isPastor ? "My prayer requests" : "Prayer requests"}
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-3xl">
        Review requests in a chat, reply to the visitor by email, and
        {isPastor ? " mark them as prayed when complete." : " assign them to a pastor."}
      </p>

      <div className="grid lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="p-6 text-gray-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-gray-500">No prayer requests yet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left px-5 py-4 border-b border-gray-50 ${
                      selectedId === item.id ? "bg-red-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <Badge className={`${statusTone[item.status] || statusTone.new} hover:bg-inherit shrink-0`}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">{item.category}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.request}</p>
                    {item.pastor_name && (
                      <p className="text-xs text-red-600 mt-1">Pastor: {item.pastor_name}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-8 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col min-h-[70vh] max-h-[70vh]">
          {!selected ? (
            <p className="p-8 text-gray-500 m-auto">Select a request to open the conversation.</p>
          ) : (
            <>
              <div className="shrink-0 px-5 py-4 border-b border-gray-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                      <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1 text-red-600">
                        <Mail className="h-3.5 w-3.5" />
                        {selected.email}
                      </a>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selected.phone}
                      </span>
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{selected.category}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && selected.status !== "prayed" && (
                      <Button size="sm" variant="outline" className="text-green-700" onClick={markPrayed}>
                        <Check className="h-4 w-4 mr-1" />
                        Mark prayed
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="outline" className="text-red-600" onClick={remove}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {canAssign && (
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <div className="space-y-1 flex-1 min-w-[180px]">
                      <Label className="text-xs">Assign to pastor</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                        value={pastorId}
                        onChange={(e) => setPastorId(e.target.value)}
                      >
                        <option value="">Select pastor…</option>
                        {pastors.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.username} ({p.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={!pastorId}
                      onClick={assign}
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/60">
                {messages.map((m) => {
                  const mine = m.sender_type === "admin" || m.sender_type === "pastor";
                  const system = m.sender_type === "system";
                  if (system) {
                    return (
                      <p key={m.id} className="text-center text-xs text-gray-400 py-1">
                        {m.body} · {fmt(m.created_at)}
                      </p>
                    );
                  }
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          mine
                            ? "bg-red-600 text-white rounded-br-md"
                            : "bg-white border border-gray-100 text-gray-900 rounded-bl-md"
                        }`}
                      >
                        <p className={`text-[11px] mb-1 ${mine ? "text-red-100" : "text-gray-400"}`}>
                          {m.sender_name || m.sender_type} · {fmt(m.created_at)}
                          {m.emailed ? " · emailed" : ""}
                        </p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {canEdit && (
                <form onSubmit={sendReply} className="shrink-0 border-t border-gray-100 p-4 bg-white">
                  <Textarea
                    rows={3}
                    placeholder="Type a reply… (sent to the visitor by email)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="mb-3"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? "Sending…" : "Send reply"}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
