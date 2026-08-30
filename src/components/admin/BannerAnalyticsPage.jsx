import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authApi, formatApiError } from "../../lib/api";
import { DataToolbar } from "./DataToolbar";
import { exportToCsv, filterRows } from "../../lib/exportCsv";
import { Card } from "../ui/card";

export default function BannerAnalyticsPage({ view = "all" }) {
  const [stats, setStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [bannerId, setBannerId] = useState("");

  const load = async () => {
    try {
      const [s, e] = await Promise.all([
        authApi.announcementStats(),
        authApi.listAnnouncementEvents(bannerId || null),
      ]);
      setStats(s || []);
      setEvents(e || []);
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId]);

  const filtered = useMemo(
    () => filterRows(events, query, ["banner_title", "action", "visitor_id", "device_type", "browser", "os", "path", "language"]),
    [events, query]
  );

  const exportCsv = () => {
    exportToCsv(`banner-activity-${Date.now()}`, filtered, [
      { key: "banner_title", label: "Banner" },
      { key: "action", label: "Action" },
      { key: "visitor_id", label: "Visitor" },
      { key: "device_type", label: "Device" },
      { key: "browser", label: "Browser" },
      { key: "os", label: "OS" },
      { key: "path", label: "Path" },
      { key: "created_at", label: "Time" },
    ]);
  };

  const showAnalytics = view === "all" || view === "analytics";
  const showActivity = view === "all" || view === "activity";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {showActivity && !showAnalytics ? "Banner activity" : "Banner analytics"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {showActivity && !showAnalytics
            ? "Every view, click, close, hide-forever, and reaction, with visitor device details."
            : "Views, clicks, closes, hide-forever, and reactions per popup / sticky banner."}
        </p>
      </div>
      {showAnalytics && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card
            key={s.id}
            className={`p-4 cursor-pointer ${bannerId === s.id ? "ring-2 ring-red-500" : ""}`}
            onClick={() => setBannerId(bannerId === s.id ? "" : s.id)}
          >
            <p className="font-semibold text-gray-900 line-clamp-2">{s.title}</p>
            <p className="text-xs text-gray-400 mt-1">{s.placement} · {s.unique_visitors || 0} visitors</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
              <span>Views {s.views || 0}</span>
              <span>Clicks {s.clicks || 0}</span>
              <span>Closes {s.closes || 0}</span>
              <span>Hide {s.hide_forever || 0}</span>
              <span>Reactions {s.reactions || 0}</span>
            </div>
          </Card>
        ))}
        {!stats.length && <p className="text-gray-500 text-sm">No banner stats yet.</p>}
      </div>
      )}

      {showActivity && (
      <>
      <DataToolbar query={query} onQueryChange={setQuery} onExport={exportCsv} placeholder="Search activity log…" />
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {["Time", "Banner", "Action", "Visitor", "Device", "Browser", "Path"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString("en-GB") : "—"}</td>
                <td className="px-3 py-2">{e.banner_title}</td>
                <td className="px-3 py-2">{e.action}</td>
                <td className="px-3 py-2 font-mono text-xs">{(e.visitor_id || "").slice(0, 10)}</td>
                <td className="px-3 py-2">{e.device_type}</td>
                <td className="px-3 py-2">{e.browser} / {e.os}</td>
                <td className="px-3 py-2">{e.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="p-6 text-center text-gray-500">No activity yet. Stats appear after visitors see a popup.</p>}
      </div>
      </>
      )}
    </div>
  );
}
