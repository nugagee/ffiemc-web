import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  Send,
  Sparkles,
  Copy,
  Plus,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import {
  companionModelName,
  isCompanionConfigured,
  limitReachedMessage,
  runCompanionChat,
} from "../../../lib/companionBot";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";

const STARTERS = [
  "Draft a warm WhatsApp announcement for Sunday service",
  "Write a short Daily Manna devotion (150–200 words)",
  "Help me improve this blog intro: ",
  "Suggest a youth-friendly caption for choir ministration video",
];

export default function CompanionBotPage() {
  const { user, isSuperadmin } = useAuth();
  const [quota, setQuota] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitBanner, setLimitBanner] = useState("");
  const bottomRef = useRef(null);
  const configured = isCompanionConfigured();

  const refreshQuota = useCallback(async () => {
    try {
      const q = await authApi.aiQuota();
      setQuota(q);
      if (q?.limit_reached) setLimitBanner(limitReachedMessage(q));
      else setLimitBanner("");
      return q;
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load AI quota");
      return null;
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await authApi.aiListConversations();
      setConversations(Array.isArray(rows) ? rows : []);
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    refreshQuota();
    loadConversations();
  }, [refreshQuota, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const startNew = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setLimitBanner("");
    refreshQuota();
  };

  const openConversation = async (id) => {
    setConversationId(id);
    try {
      const rows = await authApi.aiListMessages(id);
      setMessages(
        (Array.isArray(rows) ? rows : [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }))
      );
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load chat");
    }
  };

  const send = async (preset) => {
    const text = String(preset ?? input).trim();
    if (!text || sending) return;
    if (!configured) {
      toast.error("Add REACT_APP_OPENAI_API_KEY to enable Fire Buddy");
      return;
    }

    setSending(true);
    setInput("");
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const reserve = await authApi.aiReserveTurn();
      if (!reserve?.ok) {
        const msg = reserve?.message || limitReachedMessage(reserve?.quota);
        setLimitBanner(msg);
        setQuota(reserve?.quota || quota);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: msg, limit: true },
        ]);
        return;
      }
      setQuota(reserve.quota);

      const result = await runCompanionChat({ messages: nextMessages });
      setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);

      const logged = await authApi.aiLogTurn({
        conversationId,
        model: result.model,
        promptTokens: result.prompt_tokens,
        completionTokens: result.completion_tokens,
        userPreview: text,
        userContent: text,
        assistantContent: result.content,
        requestOk: true,
      });
      if (logged?.conversation_id) setConversationId(logged.conversation_id);
      if (logged?.quota) {
        setQuota(logged.quota);
        if (logged.quota.limit_reached) setLimitBanner(limitReachedMessage(logged.quota));
      }
      loadConversations();
    } catch (err) {
      const msg = formatApiError(err.message) || "Fire Buddy could not reply";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry — I couldn’t complete that request.\n\n${msg}` },
      ]);
      try {
        await authApi.aiLogTurn({
          conversationId,
          model: companionModelName(),
          promptTokens: 0,
          completionTokens: 0,
          userPreview: text,
          userContent: text,
          assistantContent: "",
          requestOk: false,
          errorMessage: msg,
        });
      } catch {
        /* ignore */
      }
    } finally {
      setSending(false);
    }
  };

  const copyLast = async () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant" && !m.limit);
    if (!last?.content) return;
    await navigator.clipboard.writeText(last.content);
    toast.success("Copied reply");
  };

  const tokensUsed = quota?.tokens_used ?? 0;
  const tokenLimit = quota?.token_limit ?? 0;
  const tokenPct = tokenLimit ? Math.min(100, Math.round((tokensUsed / tokenLimit) * 100)) : 0;

  return (
    <div className="h-full min-h-[70vh] flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
            <Bot className="h-7 w-7 text-red-600" /> Fire Buddy
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Your on-site writing partner for blogs, announcements, devotionals, and admin tasks — with usage limits per admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={startNew}>
            <Plus className="h-4 w-4 mr-1" /> New chat
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={copyLast} disabled={!messages.some((m) => m.role === "assistant")}>
            <Copy className="h-4 w-4 mr-1" /> Copy last reply
          </Button>
          {isSuperadmin ? (
            <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
              <Link to="/admin/utilities/companion-usage">
                <BarChart3 className="h-4 w-4 mr-1" /> Usage & limits
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {!configured ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">API key required</p>
            <p className="mt-1 text-amber-900/80">
              Set <code className="text-xs bg-white/70 px-1 rounded">REACT_APP_OPENAI_API_KEY</code> in your env
              {process.env.REACT_APP_OPENAI_MODEL ? ` (model: ${companionModelName()})` : " (optional: REACT_APP_OPENAI_MODEL)"} then restart the app.
            </p>
          </div>
        </div>
      ) : null}

      {limitBanner ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-amber-50 px-4 py-4 text-sm" data-testid="ai-limit-banner">
          <p className="font-semibold text-red-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Fire Buddy limit reached
          </p>
          <p className="mt-1 text-red-900/80 leading-relaxed">{limitBanner}</p>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-4 flex-1 min-h-0">
        <aside className="rounded-2xl border border-gray-100 bg-white p-3 hidden lg:flex flex-col min-h-[420px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2 mb-2">Chats</p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-colors ${
                  conversationId === c.id ? "bg-red-50 text-red-800 font-medium" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="line-clamp-2">{c.title || "Chat"}</span>
              </button>
            ))}
            {!conversations.length ? (
              <p className="text-xs text-gray-400 px-2 py-6 text-center">No saved chats yet</p>
            ) : null}
          </div>
          {quota ? (
            <div className="mt-3 border-t pt-3 px-2 space-y-1.5">
              <p className="text-[11px] text-gray-500">This month · {user?.name || user?.email || "You"}</p>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${tokenPct}%` }} />
              </div>
              <p className="text-[11px] text-gray-500">
                {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()} tokens · {quota.requests_used}/{quota.request_limit} requests
              </p>
            </div>
          ) : null}
        </aside>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col min-h-[520px] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[radial-gradient(ellipse_at_top,_rgba(254,226,226,0.35),_transparent_55%)]">
            {!messages.length && !sending ? (
              <div className="max-w-lg mx-auto text-center py-10 space-y-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30">
                  <Bot className="h-7 w-7" />
                </span>
                <h2 className="text-xl font-bold text-gray-900">How can Fire Buddy help today?</h2>
                <p className="text-sm text-gray-500">Ask for drafts, rewrites, outlines, or ideas for church content.</p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-red-600 text-white rounded-br-md"
                      : m.limit
                        ? "bg-amber-50 text-amber-950 border border-amber-200"
                        : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" && !m.limit ? (
                    <Badge className="bg-red-50 text-red-700 hover:bg-red-50 mb-2">Fire Buddy</Badge>
                  ) : null}
                  {m.content}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-red-600" /> Fire Buddy is thinking…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-gray-100 p-3 sm:p-4 bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={quota?.limit_reached ? "Monthly limit reached" : "Ask Fire Buddy…"}
                disabled={sending || Boolean(quota?.limit_reached) || !configured}
                rows={2}
                className="min-h-[56px] resize-none rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 shrink-0 h-11"
                disabled={sending || !input.trim() || Boolean(quota?.limit_reached) || !configured}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Enter to send · Shift+Enter for new line · Model: {companionModelName()}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
