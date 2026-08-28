import { useEffect, useState } from "react";
import { authApi } from "../../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorsPage() {
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    authApi.listVisits(200).then(setVisits).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Traffic</p>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">Visitors</h1>
      <p className="text-gray-500 mt-3 max-w-2xl">
        Each public page view is logged with a visitor id (browser) and a session id (tab).
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl bg-white border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <tr>
              <th className="px-5 py-4">When</th>
              <th className="px-5 py-4">Page</th>
              <th className="px-5 py-4">Visitor</th>
              <th className="px-5 py-4">Referrer</th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-gray-500">
                  No visitors recorded yet.
                </td>
              </tr>
            )}
            {visits.map((visit) => (
              <tr key={visit.id} className="border-t border-gray-50">
                <td className="px-5 py-4 whitespace-nowrap">{formatDate(visit.visited_at)}</td>
                <td className="px-5 py-4 font-mono">{visit.path}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-500">{(visit.visitor_id || "").slice(0, 8)}</td>
                <td className="px-5 py-4 text-gray-500 max-w-xs truncate">{visit.referrer || "Direct"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
