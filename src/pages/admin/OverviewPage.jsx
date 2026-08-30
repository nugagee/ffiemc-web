import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Eye,
  Mail,
  MonitorSmartphone,
  RefreshCw,
  Users,
  Activity,
} from "lucide-react";
import { authApi } from "../../lib/api";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "day", label: "24h" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "90d", label: "90 days" },
];

const TOP_OPTIONS = [5, 10];

const PIE_COLORS = ["#d64527", "#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#64748b", "#ec4899", "#14b8a6"];

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatDay(day) {
  if (!day) return "";
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function shortId(id) {
  if (!id) return "—";
  return String(id).slice(0, 8);
}

function Delta({ value }) {
  if (value === 0) return <span className="text-xs text-gray-400">vs prior period</span>;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
      <Icon size={14} />
      {Math.abs(value)}% vs prior
    </span>
  );
}

export default function OverviewPage() {
  const [range, setRange] = useState("week");
  const [topN, setTopN] = useState(10);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const data = await authApi.analyticsReport(range, topN);
      setStats(data);
    } catch (err) {
      // Fallback to legacy RPC if migration not applied yet
      try {
        const legacy = await authApi.visitStats();
        setStats({
          ...legacy,
          range,
          sessions: legacy.uniqueVisitors || 0,
          avgDurationSeconds: 0,
          prevTotalVisits: 0,
          prevUniqueVisitors: 0,
          series: (legacy.last14Days || []).map((d) => ({
            day: d.day,
            visits: d.count,
            unique: 0,
          })),
          topVisitors: [],
          devices: [],
          browsers: [],
          languages: [],
          timezones: [],
        });
        setError("Run the analytics migration for full reports (duration, top visitors, demography).");
      } catch (e2) {
        setError(err.message || e2.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, topN]);

  const series = useMemo(
    () =>
      (stats?.series || []).map((d) => ({
        ...d,
        label: formatDay(d.day),
      })),
    [stats]
  );

  const visitDelta = pctChange(stats?.totalVisits || 0, stats?.prevTotalVisits || 0);
  const uniqueDelta = pctChange(stats?.uniqueVisitors || 0, stats?.prevUniqueVisitors || 0);

  const cards = [
    {
      key: "totalVisits",
      label: "Page views",
      value: stats?.totalVisits ?? 0,
      delta: visitDelta,
      icon: Eye,
      tone: "from-red-500/15 to-orange-400/10",
    },
    {
      key: "uniqueVisitors",
      label: "Unique visitors",
      value: stats?.uniqueVisitors ?? 0,
      delta: uniqueDelta,
      icon: Users,
      tone: "from-sky-500/15 to-cyan-400/10",
    },
    {
      key: "sessions",
      label: "Sessions",
      value: stats?.sessions ?? 0,
      icon: Activity,
      tone: "from-violet-500/15 to-fuchsia-400/10",
    },
    {
      key: "avgDuration",
      label: "Avg. time on page",
      value: formatDuration(stats?.avgDurationSeconds),
      icon: Clock,
      tone: "from-amber-500/15 to-yellow-400/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Overview</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">Analytics</h1>
          <p className="text-gray-500 mt-2 max-w-xl text-sm">
            Live traffic, engagement time, and visitor demography for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-white border border-gray-200 p-1 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
                  range === r.id
                    ? "bg-red-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={range}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className={`rounded-2xl border border-white/60 bg-gradient-to-br ${card.tone} p-5 shadow-sm backdrop-blur-sm bg-white`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-9 w-9 rounded-xl bg-white/80 border border-gray-100 flex items-center justify-center text-red-600">
                        <Icon size={18} />
                      </div>
                      {card.delta != null && <Delta value={card.delta} />}
                    </div>
                    <div className="text-3xl font-bold mt-4 tracking-tight">{card.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{card.label}</div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 rounded-2xl bg-white p-5 md:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Traffic trend</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Visits and unique visitors over time</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> Visits
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> Unique
                    </span>
                  </div>
                </div>
                {series.length === 0 ? (
                  <p className="text-sm text-gray-500 py-16 text-center">No visits in this period.</p>
                ) : (
                  <div className="h-64 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d64527" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#d64527" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="uniqueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                            fontSize: 12,
                          }}
                        />
                        <Area type="monotone" dataKey="visits" name="Visits" stroke="#d64527" fill="url(#visitsFill)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="unique" name="Unique" stroke="#0ea5e9" fill="url(#uniqueFill)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 rounded-2xl bg-white p-5 md:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <MonitorSmartphone size={16} className="text-red-600" />
                  <h2 className="text-lg font-semibold">Devices</h2>
                </div>
                {(stats?.devices || []).length === 0 ? (
                  <p className="text-sm text-gray-500 py-12 text-center">No device data yet.</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.devices}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {stats.devices.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="space-y-2 mt-1">
                  {(stats?.devices || []).slice(0, 4).map((d, idx) => (
                    <li key={d.name} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-gray-600">
                        <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        {d.name}
                      </span>
                      <span className="font-medium text-gray-900">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 rounded-2xl bg-white p-5 md:p-6 border border-gray-100 shadow-sm">
                <h2 className="text-lg font-semibold">Top pages</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-4">Most viewed routes with average time spent</p>
                <ul className="space-y-3">
                  {(stats?.topPages || []).length === 0 && (
                    <li className="text-sm text-gray-500">No page data yet.</li>
                  )}
                  {(stats?.topPages || []).map((page, idx) => {
                    const max = Math.max(1, ...(stats.topPages || []).map((p) => Number(p.visits) || 0));
                    const width = Math.max(8, (Number(page.visits) / max) * 100);
                    return (
                      <li key={page.path} className="group">
                        <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                          <span className="font-mono text-gray-800 truncate">
                            <span className="text-gray-400 mr-2">{idx + 1}.</span>
                            {page.path}
                          </span>
                          <span className="shrink-0 text-xs text-gray-500">
                            {page.visits} · {formatDuration(page.avgDuration)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.04 }}
                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="lg:col-span-7 rounded-2xl bg-white p-5 md:p-6 border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Top visitors</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Most active browsers with demography signals</p>
                  </div>
                  <div className="inline-flex rounded-full bg-gray-50 border border-gray-200 p-0.5">
                    {TOP_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTopN(n)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                          topN === n ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        Top {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <tr>
                        <th className="px-2 py-3 font-medium">Visitor</th>
                        <th className="px-2 py-3 font-medium">Visits</th>
                        <th className="px-2 py-3 font-medium">Time</th>
                        <th className="px-2 py-3 font-medium">Device</th>
                        <th className="px-2 py-3 font-medium">Locale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats?.topVisitors || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-10 text-gray-500 text-center">
                            No visitor rankings yet for this period.
                          </td>
                        </tr>
                      )}
                      {(stats?.topVisitors || []).map((v, idx) => (
                        <tr key={v.visitorId} className="border-t border-gray-50 hover:bg-red-50/40 transition-colors">
                          <td className="px-2 py-3">
                            <Link
                              to={`/admin/visitors?visitor=${encodeURIComponent(v.visitorId)}`}
                              className="font-mono text-xs text-red-700 hover:underline"
                            >
                              #{idx + 1} {shortId(v.visitorId)}
                            </Link>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {v.pages} pages · {v.sessions} sessions
                            </div>
                          </td>
                          <td className="px-2 py-3 font-semibold">{v.visits}</td>
                          <td className="px-2 py-3 text-gray-600">{formatDuration(v.totalDuration)}</td>
                          <td className="px-2 py-3 text-gray-600">
                            <div>{v.deviceType || "—"} · {v.browser || "—"}</div>
                            <div className="text-[11px] text-gray-400">{v.os || ""}</div>
                          </td>
                          <td className="px-2 py-3 text-gray-600">
                            <div>{v.language || "—"}</div>
                            <div className="text-[11px] text-gray-400 truncate max-w-[140px]">{v.timezone || ""}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
                  {(stats?.browsers || []).slice(0, 4).map((b) => (
                    <span key={b.name} className="rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1">
                      {b.name}: {b.count}
                    </span>
                  ))}
                  {(stats?.timezones || []).slice(0, 3).map((t) => (
                    <span key={t.name} className="rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-amber-800">
                      {t.name}: {t.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-red-50/40 px-5 py-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail size={16} className="text-red-600" />
                <span>
                  <strong className="text-gray-900">{stats?.contacts ?? 0}</strong> messages ·{" "}
                  <strong className="text-gray-900">{stats?.unreadContacts ?? 0}</strong> unread
                </span>
              </div>
              <Link
                to="/admin/visitors"
                className="text-sm font-semibold text-red-600 hover:text-red-700 transition"
              >
                Open visitor explorer →
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
