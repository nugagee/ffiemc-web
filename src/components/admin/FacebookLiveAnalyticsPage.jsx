import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Eye,
  Facebook,
  Monitor,
  Radio,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authApi, formatApiError } from "../../lib/api";
import { formatReadTime } from "../../lib/blogAnalytics";
import { exportToCsv, filterRows } from "../../lib/exportCsv";
import { DataToolbar } from "./DataToolbar";
import { PageToolbar } from "./PageToolbar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
  { id: "all", label: "All time" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id) {
  if (!id) return "—";
  return String(id).slice(0, 8);
}

function actionLabel(action) {
  const map = {
    impression: "Saw section",
    open_facebook: "Opened Facebook",
    watch_cta: "Watch live CTA",
    embed_focus: "Embed focus",
    page_plugin_click: "Page plugin",
  };
  return map[action] || action;
}

export default function FacebookLiveAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const selectedVisitor = params.get("visitor") || "";
  const range = params.get("range") || "week";

  const [data, setData] = useState({
    summary: {},
    visitors: [],
    recent_sessions: [],
    recent_events: [],
  });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = async (r) => {
    setLoading(true);
    try {
      const report = await authApi.facebookLiveAnalytics(r || range, 150);
      setData({
        summary: report?.summary || {},
        visitors: report?.visitors || [],
        recent_sessions: report?.recent_sessions || [],
        recent_events: report?.recent_events || [],
      });
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load live analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    if (!selectedVisitor) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    authApi
      .facebookLiveVisitorDetail(selectedVisitor)
      .then(setDetail)
      .catch((err) => toast.error(formatApiError(err.message)))
      .finally(() => setDetailLoading(false));
  }, [selectedVisitor]);

  const summary = data.summary || {};
  const filteredVisitors = useMemo(
    () =>
      filterRows(data.visitors, query, [
        "visitor_id",
        "device_type",
        "browser",
        "os",
        "language",
        "timezone",
      ]),
    [data.visitors, query]
  );

  const setRange = (next) => {
    const p = new URLSearchParams(params);
    p.set("range", next);
    setParams(p);
  };

  const openVisitor = (id) => {
    if (!id) return;
    const p = new URLSearchParams(params);
    p.set("visitor", id);
    setParams(p);
  };

  const closeDetail = () => {
    const p = new URLSearchParams(params);
    p.delete("visitor");
    setParams(p);
  };

  const exportCsv = () => {
    exportToCsv(`facebook-live-visitors-${range}-${Date.now()}`, filteredVisitors, [
      { key: "visitor_id", label: "Visitor" },
      { key: "sessions", label: "Sessions" },
      { key: "live_sessions", label: "Live sessions" },
      { key: "total_onscreen_seconds", label: "On-screen seconds" },
      { key: "avg_onscreen_seconds", label: "Avg seconds" },
      { key: "open_facebook_clicks", label: "Facebook opens" },
      { key: "device_type", label: "Device" },
      { key: "browser", label: "Browser" },
      { key: "os", label: "OS" },
      { key: "first_seen", label: "First seen" },
      { key: "last_seen", label: "Last seen" },
    ]);
  };

  const cards = [
    { label: "Unique visitors", value: summary.unique_visitors || 0, icon: Users },
    { label: "Section views", value: summary.sessions || summary.impressions || 0, icon: Eye },
    {
      label: "Total on-screen time",
      value: formatReadTime(summary.total_onscreen_seconds || 0),
      icon: Clock,
    },
    {
      label: "Avg time / view",
      value: formatReadTime(summary.avg_onscreen_seconds || 0),
      icon: BarChart3,
    },
    { label: "While LIVE", value: summary.live_sessions || 0, icon: Radio },
    { label: "Opened Facebook", value: summary.open_facebook || 0, icon: Facebook },
  ];

  return (
    <div className="relative space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Banners</p>
        <h1 className="text-3xl font-bold mt-2">Facebook Live analytics</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">
          How visitors use the homepage Watch Live section — impressions, on-screen time while the
          block is visible, live vs offline views, and Facebook opens. Identifiers are anonymous.
        </p>
      </div>

      <PageToolbar
        left={(
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.id}
                size="sm"
                variant={range === r.id ? "default" : "outline"}
                className={range === r.id ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        )}
        right={(
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/banners">Live controls</Link>
          </Button>
        )}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
              <c.icon className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{loading ? "…" : c.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Per visitor</h2>
            <p className="text-sm text-gray-500">Click a row for session history and on-screen time.</p>
          </div>
        </div>
        <DataToolbar
          query={query}
          onQueryChange={setQuery}
          onExport={exportCsv}
          placeholder="Search visitor, device, browser…"
        />
        <div className="overflow-x-auto rounded-2xl border bg-white mt-3">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                {["Visitor", "Sessions", "On-screen", "Avg", "Live", "FB opens", "Device", "Last seen"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map((v) => (
                <tr
                  key={v.visitor_id}
                  className="border-t hover:bg-red-50/40 cursor-pointer"
                  onClick={() => openVisitor(v.visitor_id)}
                >
                  <td className="px-3 py-2 font-mono text-xs">{shortId(v.visitor_id)}</td>
                  <td className="px-3 py-2">{v.sessions || 0}</td>
                  <td className="px-3 py-2 font-medium">{formatReadTime(v.total_onscreen_seconds)}</td>
                  <td className="px-3 py-2">{formatReadTime(v.avg_onscreen_seconds)}</td>
                  <td className="px-3 py-2">{v.live_sessions || 0}</td>
                  <td className="px-3 py-2">{v.open_facebook_clicks || 0}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {[v.device_type, v.browser, v.os].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{formatDate(v.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filteredVisitors.length && (
            <p className="p-6 text-center text-gray-500">
              No Facebook Live section activity yet. Stats appear after visitors scroll the homepage section into view.
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 overflow-hidden">
          <h3 className="font-semibold text-gray-900 mb-3">Recent sessions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(data.recent_sessions || []).slice(0, 40).map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left rounded-lg border px-3 py-2 hover:bg-gray-50"
                onClick={() => openVisitor(s.visitor_id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{shortId(s.visitor_id)}</span>
                  {s.was_live ? (
                    <Badge className="bg-red-600 text-white border-0 text-[10px]">LIVE</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Offline</Badge>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">{formatReadTime(s.duration_seconds)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{formatDate(s.started_at)}</p>
              </button>
            ))}
            {!data.recent_sessions?.length && (
              <p className="text-sm text-gray-500">No sessions in this range.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 overflow-hidden">
          <h3 className="font-semibold text-gray-900 mb-3">Recent actions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(data.recent_events || []).slice(0, 40).map((e) => (
              <button
                key={e.id}
                type="button"
                className="w-full text-left rounded-lg border px-3 py-2 hover:bg-gray-50"
                onClick={() => openVisitor(e.visitor_id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{actionLabel(e.action)}</span>
                  <span className="font-mono text-xs text-gray-400">{shortId(e.visitor_id)}</span>
                  <span className="text-xs text-gray-500 ml-auto">{formatDate(e.created_at)}</span>
                </div>
              </button>
            ))}
            {!data.recent_events?.length && (
              <p className="text-sm text-gray-500">No actions in this range.</p>
            )}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {selectedVisitor ? (
          <>
            <motion.button
              type="button"
              aria-label="Close visitor detail"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
            />
            <motion.aside
              className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Visitor</p>
                  <p className="font-mono text-sm font-semibold">{shortId(selectedVisitor)}</p>
                </div>
                <Button size="icon" variant="outline" onClick={closeDetail}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {detailLoading || !detail ? (
                <p className="p-6 text-gray-500">Loading…</p>
              ) : (
                <div className="p-4 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total on-screen", value: formatReadTime(detail.summary?.total_onscreen_seconds) },
                      { label: "Avg / session", value: formatReadTime(detail.summary?.avg_onscreen_seconds) },
                      { label: "Sessions", value: detail.summary?.sessions || 0 },
                      { label: "Live sessions", value: detail.summary?.live_sessions || 0 },
                      { label: "Facebook opens", value: detail.summary?.open_facebook_clicks || 0 },
                      {
                        label: "Device",
                        value: [detail.summary?.device_type, detail.summary?.browser].filter(Boolean).join(" / ") || "—",
                      },
                    ].map((item) => (
                      <Card key={item.label} className="p-3">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</p>
                        <p className="font-semibold text-gray-900 mt-1">{item.value}</p>
                      </Card>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Monitor className="h-4 w-4" />
                    {[detail.summary?.os, detail.summary?.language, detail.summary?.timezone]
                      .filter(Boolean)
                      .join(" · ") || "No demography"}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Sessions</h3>
                    <ul className="space-y-2">
                      {(detail.sessions || []).map((s) => (
                        <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.was_live ? (
                              <Badge className="bg-red-600 text-white border-0">LIVE</Badge>
                            ) : (
                              <Badge variant="outline">Offline</Badge>
                            )}
                            <span className="font-medium">{formatReadTime(s.duration_seconds)} on screen</span>
                            <span className="text-xs text-gray-400 ml-auto">{formatDate(s.started_at)}</span>
                          </div>
                          {s.open_facebook_clicks ? (
                            <p className="text-xs text-gray-500 mt-1">{s.open_facebook_clicks} Facebook open(s)</p>
                          ) : null}
                        </li>
                      ))}
                      {!detail.sessions?.length && (
                        <li className="text-sm text-gray-500">No sessions.</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Actions</h3>
                    <ul className="space-y-2">
                      {(detail.events || []).map((e) => (
                        <li key={e.id} className="rounded-lg border px-3 py-2 text-sm flex justify-between gap-2">
                          <span>{actionLabel(e.action)}</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(e.created_at)}</span>
                        </li>
                      ))}
                      {!detail.events?.length && (
                        <li className="text-sm text-gray-500">No actions.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
