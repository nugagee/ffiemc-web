import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, HandHeart, Inbox, Mail, MessageSquareHeart, UserPlus, ClipboardList, CheckCircle2 } from "lucide-react";
import { useAdminCounts } from "../../context/AdminCountsContext";
import { useAuth } from "../../context/AuthContext";

const ACK_KEY = "ffiemc_admin_notif_ack";

function playRingTwice() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const ring = (at) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, at);
      osc.frequency.exponentialRampToValueAtTime(660, at + 0.18);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.3);
    };
    const t0 = ctx.currentTime + 0.02;
    ring(t0);
    ring(t0 + 0.38);
    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* autoplay / unsupported */
  }
}

function fingerprint(counts) {
  return [
    counts.prayer_unseen,
    counts.contacts_new,
    counts.surveys_new,
    counts.volunteer_unseen,
    counts.members_pending,
    counts.approvals_pending,
    counts.program_regs_unseen_total,
  ].join("|");
}

function readAck() {
  try {
    return localStorage.getItem(ACK_KEY) || "";
  } catch {
    return "";
  }
}

function writeAck(value) {
  try {
    localStorage.setItem(ACK_KEY, value);
  } catch {
    /* ignore */
  }
}

export function AdminNotificationBell({ variant = "dark" }) {
  const { counts, refreshCounts } = useAdminCounts();
  const { can, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const prevFpRef = useRef("");
  const primedRef = useRef(false);
  const panelRef = useRef(null);

  const items = useMemo(() => {
    const list = [];
    if (can("prayer.inbox", "view") || user?.role === "pastor") {
      list.push({
        key: "prayer",
        label: "Prayer requests",
        count: Number(counts.prayer_unseen) || 0,
        to: "/admin/prayer",
        icon: HandHeart,
      });
    }
    if (can("contacts", "view")) {
      list.push({
        key: "contacts",
        label: "Contact messages",
        count: Number(counts.contacts_new) || 0,
        to: "/admin/contacts",
        icon: Mail,
      });
    }
    if (can("experience_surveys", "view")) {
      list.push({
        key: "surveys",
        label: "Experience surveys",
        count: Number(counts.surveys_new) || 0,
        to: "/admin/experience-surveys",
        icon: MessageSquareHeart,
      });
    }
    if (can("volunteer_applications", "view")) {
      list.push({
        key: "volunteers",
        label: "Volunteer applications",
        count: Number(counts.volunteer_unseen) || 0,
        to: "/admin/registrations/volunteers",
        icon: UserPlus,
      });
    }
    if (can("church_members", "view")) {
      list.push({
        key: "members",
        label: "Pending memberships",
        count: Number(counts.members_pending) || 0,
        to: "/admin/registrations/members/pending",
        icon: CheckCircle2,
      });
    }
    if (can("program_registrations", "view")) {
      list.push({
        key: "programs",
        label: "Program registrations",
        count: Number(counts.program_regs_unseen_total) || 0,
        to: "/admin/registrations/programs",
        icon: ClipboardList,
      });
    }
    if (can("approvals", "view") || user?.role === "superadmin") {
      list.push({
        key: "approvals",
        label: "Approval inbox",
        count: Number(counts.approvals_pending) || 0,
        to: "/admin/approvals",
        icon: Inbox,
      });
    }
    return list;
  }, [can, counts, user?.role]);

  const total = items.reduce((sum, item) => sum + (item.count || 0), 0);
  const fp = fingerprint(counts);

  useEffect(() => {
    if (!primedRef.current) {
      primedRef.current = true;
      prevFpRef.current = fp;
      const acked = readAck();
      setBuzzing(total > 0 && acked !== fp);
      return;
    }
    if (fp !== prevFpRef.current) {
      const prevParts = String(prevFpRef.current || "").split("|").map((n) => Number(n) || 0);
      const nextParts = String(fp || "").split("|").map((n) => Number(n) || 0);
      const increased = nextParts.some((n, i) => n > (prevParts[i] || 0));
      prevFpRef.current = fp;
      if (increased && total > 0) {
        playRingTwice();
        setBuzzing(true);
      } else if (total === 0) {
        setBuzzing(false);
        writeAck(fp);
      } else if (readAck() === fp) {
        setBuzzing(false);
      }
    }
  }, [fp, total]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const acknowledge = () => {
    writeAck(fp);
    setBuzzing(false);
  };

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        acknowledge();
        refreshCounts();
      }
      return next;
    });
  };

  const light = variant === "light";
  const btnClass = light
    ? "h-10 w-10 inline-flex items-center justify-center rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200"
    : "h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        className={`${btnClass} relative ${buzzing ? "admin-bell-buzz admin-bell-pulse" : ""}`}
        aria-label={total ? `${total} unread notifications` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={18} className={buzzing ? "admin-bell-icon-shake" : ""} />
        {total > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-amber-400 text-gray-950 text-[10px] font-bold flex items-center justify-center leading-none">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-gray-500">{total ? `${total} waiting` : "You're all caught up"}</div>
            </div>
            <button type="button" onClick={acknowledge} className="text-xs text-red-600 hover:underline">
              Mark read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-500 text-center">No notification channels for your role.</li>
            ) : (
              items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="h-8 w-8 rounded-lg bg-red-50 text-red-600 inline-flex items-center justify-center shrink-0">
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{item.label}</span>
                        <span className="block text-xs text-gray-500">
                          {item.count ? `${item.count} new` : "No new items"}
                        </span>
                      </span>
                      {item.count > 0 ? (
                        <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold flex items-center justify-center">
                          {item.count > 99 ? "99+" : item.count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
