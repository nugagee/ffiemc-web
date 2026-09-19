import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, Shield, Radio } from "lucide-react";
import { authApi } from "../../lib/api";

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

export function OnlinePresencePanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const next = await authApi.onlinePresence(90);
      setData(next);
      setError("");
    } catch (err) {
      setError(err.message || "Presence unavailable — run analytics presence migration.");
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, []);

  const website = data?.website || [];
  const admins = data?.admins || [];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 md:p-6 shadow-sm min-w-0 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h2 className="text-base sm:text-lg font-semibold">Active now</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Live within the last {data?.withinSeconds || 90}s · website visitors and admin roles
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-1">
            <Globe2 size={12} /> {data?.websiteCount ?? 0} website
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-800 border border-violet-100 px-2.5 py-1">
            <Shield size={12} /> {data?.adminCount ?? 0} admin
          </span>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{error}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
              <Globe2 size={12} /> Website
            </p>
            {website.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center rounded-xl bg-gray-50">No public visitors online</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {website.map((row) => (
                  <li
                    key={`${row.visitor_id}-${row.path}`}
                    className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 text-sm min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/admin/visitors?visitor=${encodeURIComponent(row.visitor_id)}`}
                        className="font-mono text-xs text-red-700 hover:underline truncate"
                      >
                        {shortId(row.visitor_id)}
                      </Link>
                      <span className="shrink-0 text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                        <Radio size={10} /> {formatDuration(row.online_seconds)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate font-mono">{row.path || "/"}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {[row.device_type, row.browser, row.os].filter(Boolean).join(" · ") || "Visitor"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
              <Shield size={12} /> Admin platform
            </p>
            {admins.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center rounded-xl bg-gray-50">No admins online</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {admins.map((row) => (
                  <li
                    key={row.admin_id}
                    className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 text-sm min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{row.name || row.username || "Admin"}</p>
                        <p className="text-[11px] text-violet-700 capitalize mt-0.5">{row.role || "admin"}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-emerald-700">
                        {formatDuration(row.online_seconds)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate font-mono">{row.path || "/admin"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
