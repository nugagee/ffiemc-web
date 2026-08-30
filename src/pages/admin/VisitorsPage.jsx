import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Globe2, Monitor, Search, X } from "lucide-react";
import { authApi } from "../../lib/api";

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

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function shortId(id) {
  if (!id) return "—";
  return String(id).slice(0, 8);
}

export default function VisitorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedVisitor = searchParams.get("visitor") || "";

  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    authApi
      .listVisits(300)
      .then(setVisits)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVisitor) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    authApi
      .visitorDetail(selectedVisitor)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedVisitor]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter((v) => {
      const hay = [v.path, v.visitor_id, v.referrer, v.device_type, v.browser, v.os, v.language, v.timezone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [visits, query]);

  const openVisitor = (id) => {
    if (!id) return;
    setSearchParams({ visitor: id });
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  if (error && !visits.length) return <p className="text-red-600">{error}</p>;

  return (
    <div className="relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Traffic</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">Visitors</h1>
          <p className="text-gray-500 mt-3 max-w-2xl text-sm">
            Every public page view with time spent and browser demography. Click a visitor to open their journey.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search path, device, locale…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className="px-5 py-4 font-medium">When</th>
                <th className="px-5 py-4 font-medium">Page</th>
                <th className="px-5 py-4 font-medium">Duration</th>
                <th className="px-5 py-4 font-medium">Visitor</th>
                <th className="px-5 py-4 font-medium">Demography</th>
                <th className="px-5 py-4 font-medium">Referrer</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-gray-500 text-center">
                    Loading visitor feed…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-gray-500 text-center">
                    No visitors recorded yet.
                  </td>
                </tr>
              )}
              {filtered.map((visit, idx) => (
                <motion.tr
                  key={visit.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                  className="border-t border-gray-50 hover:bg-red-50/30 transition-colors"
                >
                  <td className="px-5 py-3.5 whitespace-nowrap text-gray-700">{formatDate(visit.visited_at)}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-900">{visit.path}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-gray-700">
                      <Clock size={13} className="text-amber-500" />
                      {formatDuration(visit.duration_seconds)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => openVisitor(visit.visitor_id)}
                      className="font-mono text-xs text-red-700 hover:underline"
                    >
                      {shortId(visit.visitor_id)}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Monitor size={13} className="text-sky-500 shrink-0" />
                      <span>
                        {[visit.device_type, visit.browser, visit.os].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                      <Globe2 size={12} className="shrink-0" />
                      {[visit.language, visit.timezone].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[180px] truncate">
                    {visit.referrer || "Direct"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedVisitor && (
          <>
            <motion.button
              type="button"
              aria-label="Close visitor detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={closeDetail}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-red-600 font-semibold">Visitor</p>
                  <h2 className="font-mono text-sm mt-1 text-gray-900">{shortId(selectedVisitor)}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {detailLoading && <p className="text-sm text-gray-500">Loading journey…</p>}
                {!detailLoading && detail?.summary && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Visits", value: detail.summary.visits },
                        { label: "Pages", value: detail.summary.pages },
                        { label: "Sessions", value: detail.summary.sessions },
                        { label: "Total time", value: formatDuration(detail.summary.totalDuration) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="text-[11px] uppercase tracking-wider text-gray-400">{item.label}</div>
                          <div className="text-lg font-semibold mt-1">{item.value ?? "—"}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
                      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Demography</p>
                      <p><span className="text-gray-500">Device:</span> {detail.summary.deviceType || "—"}</p>
                      <p><span className="text-gray-500">Browser:</span> {detail.summary.browser || "—"}</p>
                      <p><span className="text-gray-500">OS:</span> {detail.summary.os || "—"}</p>
                      <p><span className="text-gray-500">Language:</span> {detail.summary.language || "—"}</p>
                      <p><span className="text-gray-500">Timezone:</span> {detail.summary.timezone || "—"}</p>
                      <p className="text-xs text-gray-400 pt-1">
                        First {formatDate(detail.summary.firstSeen)} · Last {formatDate(detail.summary.lastSeen)}
                      </p>
                    </div>

                    <h3 className="text-sm font-semibold mt-6 mb-3">Page timeline</h3>
                    <ul className="space-y-2">
                      {(detail.timeline || []).map((row) => (
                        <li
                          key={row.id}
                          className="rounded-xl border border-gray-100 px-3 py-2.5 hover:border-red-100 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-gray-900 truncate">{row.path}</span>
                            <span className="text-xs text-amber-700 shrink-0">{formatDuration(row.durationSeconds)}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">{formatDate(row.visitedAt)}</div>
                        </li>
                      ))}
                      {(detail.timeline || []).length === 0 && (
                        <li className="text-sm text-gray-500">No page events for this visitor.</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
