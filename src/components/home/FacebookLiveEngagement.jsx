import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { LIVE_REACTIONS } from "../../data/facebookLive";
import {
  commentOnLive,
  fetchLiveEngagement,
  reactToLive,
  subscribeLiveComments,
} from "../../lib/liveEngagement";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

function timeLabel(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function initials(name) {
  const parts = String(name || "G").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "G";
}

export function FacebookLiveEngagement({ broadcastKey, trackAction }) {
  const [counts, setCounts] = useState({});
  const [mine, setMine] = useState("");
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("ffiemc_live_display_name") || "";
    } catch {
      return "";
    }
  });
  const [body, setBody] = useState("");
  const [reactBusy, setReactBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [burst, setBurst] = useState(null);
  const listRef = useRef(null);
  const seenIds = useRef(new Set());
  const lastCommentIdRef = useRef("");

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const applyComments = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    seenIds.current = new Set(list.map((c) => c.id).filter(Boolean));
    lastCommentIdRef.current = list[list.length - 1]?.id || "";
    setComments(list);
    setCommentCount(list.length);
  };

  useEffect(() => {
    if (!broadcastKey) return undefined;
    let active = true;
    fetchLiveEngagement(broadcastKey).then((data) => {
      if (!active) return;
      setCounts(data.counts || {});
      setMine(data.mine || "");
      applyComments(data.comments || []);
      if (data.comment_count) setCommentCount(data.comment_count);
      requestAnimationFrame(scrollToBottom);
    });

    const unsub = subscribeLiveComments(broadcastKey, (comment) => {
      if (!comment?.id || seenIds.current.has(comment.id)) return;
      seenIds.current.add(comment.id);
      lastCommentIdRef.current = comment.id;
      setComments((prev) => [...prev, comment].slice(-120));
      setCommentCount((n) => n + 1);
      requestAnimationFrame(scrollToBottom);
    });

    const poll = window.setInterval(() => {
      fetchLiveEngagement(broadcastKey).then((data) => {
        if (!active) return;
        setCounts(data.counts || {});
        setMine(data.mine || "");
        if (Array.isArray(data.comments) && data.comments.length) {
          const lastId = data.comments[data.comments.length - 1]?.id || "";
          if (lastId && lastId !== lastCommentIdRef.current) {
            applyComments(data.comments);
            requestAnimationFrame(scrollToBottom);
          }
        }
        if (data.comment_count != null) setCommentCount(data.comment_count);
      });
    }, 12000);

    return () => {
      active = false;
      unsub();
      window.clearInterval(poll);
    };
  }, [broadcastKey]);

  useEffect(() => {
    scrollToBottom();
  }, [comments.length]);

  const onReact = async (id) => {
    if (reactBusy || !broadcastKey) return;
    setReactBusy(true);
    const next = mine === id ? "" : id;
    const prevMine = mine;
    const prevCounts = counts;
    setMine(next);
    setCounts((cur) => {
      const copy = { ...cur };
      if (prevMine) copy[prevMine] = Math.max(0, (copy[prevMine] || 1) - 1);
      if (next) copy[next] = (copy[next] || 0) + 1;
      return copy;
    });
    if (next) {
      setBurst({ id: next, key: Date.now() });
      window.setTimeout(() => setBurst(null), 900);
    }
    try {
      const data = await reactToLive(broadcastKey, next);
      setCounts(data?.counts || {});
      setMine(data?.mine || "");
      trackAction?.("react", { reaction: next || "cleared", broadcast_key: broadcastKey });
    } catch (err) {
      setMine(prevMine);
      setCounts(prevCounts);
      toast.error(err?.message || "Could not save reaction");
    } finally {
      setReactBusy(false);
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    if (sendBusy || !broadcastKey) return;
    const text = body.trim();
    if (!text) return;
    setSendBusy(true);
    try {
      const display = name.trim();
      if (display) {
        try {
          localStorage.setItem("ffiemc_live_display_name", display);
        } catch {
          /* ignore */
        }
      }
      const data = await commentOnLive(broadcastKey, {
        body: text,
        authorName: display,
        isAnonymous: !display,
      });
      const comment = data?.comment;
      if (comment?.id && !seenIds.current.has(comment.id)) {
        seenIds.current.add(comment.id);
        setComments((prev) => [...prev, comment].slice(-120));
        setCommentCount((n) => n + 1);
      }
      setBody("");
      trackAction?.("comment", { broadcast_key: broadcastKey });
      requestAnimationFrame(scrollToBottom);
    } catch (err) {
      toast.error(err?.message || "Could not post comment");
    } finally {
      setSendBusy(false);
    }
  };

  if (!broadcastKey) return null;

  return (
    <div
      className="flex flex-col h-full min-h-[320px] sm:min-h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/90 text-white shadow-xl"
      data-testid="facebook-live-engagement"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 text-red-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Live chat</p>
            <p className="text-[11px] text-white/50 truncate">React & comment like on Facebook</p>
          </div>
        </div>
        <span className="text-xs tabular-nums text-white/50 shrink-0">{commentCount} comments</span>
      </div>

      <div className="relative px-3 py-3 border-b border-white/10 bg-gradient-to-r from-red-950/40 to-transparent">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/40 mb-2">Reactions</p>
        <div className="flex flex-wrap gap-1.5">
          {LIVE_REACTIONS.map((item) => {
            const selected = mine === item.id;
            const n = counts[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                disabled={reactBusy}
                onClick={() => onReact(item.id)}
                title={item.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-all ${
                  selected
                    ? "border-red-400 bg-red-500/20 text-white scale-105"
                    : "border-white/15 bg-white/5 text-white/85 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                {n > 0 && <span className="text-[11px] tabular-nums text-white/70">{n}</span>}
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {burst && (
            <motion.span
              key={burst.key}
              initial={{ opacity: 0, y: 8, scale: 0.6 }}
              animate={{ opacity: 1, y: -28, scale: 1.4 }}
              exit={{ opacity: 0, y: -48, scale: 0.8 }}
              transition={{ duration: 0.85 }}
              className="pointer-events-none absolute right-6 top-8 text-2xl"
            >
              {LIVE_REACTIONS.find((r) => r.id === burst.id)?.emoji}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-[180px] max-h-[280px] sm:max-h-none"
      >
        {comments.length === 0 ? (
          <p className="text-sm text-white/45 text-center py-10 px-4">
            Be the first to say amen — comments appear here for everyone watching on the site.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                {initials(c.author_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-white/90 truncate">
                    {c.author_name || "Guest"}
                  </span>
                  <span className="text-[10px] text-white/35 tabular-nums">{timeLabel(c.created_at)}</span>
                </div>
                <p className="text-sm text-white/80 leading-snug break-words whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSend} className="border-t border-white/10 p-3 space-y-2 bg-black/30">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional — leave blank for Guest)"
          maxLength={80}
          className="h-9 bg-white/5 border-white/15 text-white placeholder:text-white/35"
        />
        <div className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Say something…"
            maxLength={500}
            className="h-10 bg-white/5 border-white/15 text-white placeholder:text-white/35"
            required
          />
          <Button
            type="submit"
            disabled={sendBusy || !body.trim()}
            className="shrink-0 h-10 px-3 bg-red-600 hover:bg-red-700 text-white"
            aria-label="Send comment"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default FacebookLiveEngagement;
