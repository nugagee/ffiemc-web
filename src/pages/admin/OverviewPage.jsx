import { useEffect, useState } from "react";
import { Eye, Mail, Users, MessageSquare } from "lucide-react";
import { authApi } from "../../lib/api";

const cards = [
  { key: "totalVisits", label: "Page views", icon: Eye },
  { key: "uniqueVisitors", label: "Unique visitors", icon: Users },
  { key: "contacts", label: "Messages", icon: Mail },
  { key: "unreadContacts", label: "Unread", icon: MessageSquare },
];

export default function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authApi.visitStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-gray-500">Loading analytics…</p>;

  const days = stats.last14Days || [];
  const maxCount = Math.max(1, ...days.map((d) => Number(d.count) || 0));

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Overview</p>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">Analytics</h1>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <Icon size={18} className="text-red-600" />
              <div className="text-3xl font-bold mt-4">{stats[card.key] ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-8 rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold">Visits · last 14 days</h2>
          {days.length === 0 ? (
            <p className="text-sm text-gray-500 mt-8">No visits in the last 14 days.</p>
          ) : (
            <div className="mt-8 flex items-end gap-2 h-56">
              {days.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full rounded-t-md bg-red-600/80 min-h-[4px]"
                    style={{ height: `${Math.max(6, (Number(d.count) / maxCount) * 100)}%` }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="text-[10px] text-gray-400 rotate-[-40deg] origin-top-left whitespace-nowrap">
                    {String(d.day).slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-4 rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold">Top pages</h2>
          <ul className="mt-4 space-y-3">
            {(stats.topPages || []).length === 0 && <li className="text-sm text-gray-500">No visits yet.</li>}
            {(stats.topPages || []).map((page) => (
              <li key={page.path} className="flex items-center justify-between text-sm">
                <span className="font-mono text-gray-800">{page.path}</span>
                <span className="text-red-600 font-medium">{page.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
