import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authApi, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

const fmt = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
};

export default function AdminActivityPage() {
  const { isSuperadmin } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterAdmin, setFilterAdmin] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await authApi.listAdminActivity(300, filterAdmin || null);
      setItems(rows || []);
    } catch (err) {
      setError(formatApiError(err.message) || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) load();
  }, [isSuperadmin, filterAdmin]);

  if (!isSuperadmin) return <Navigate to="/admin" replace />;

  const admins = Array.from(
    new Map(
      items.map((row) => [
        row.admin_id,
        { id: row.admin_id, label: row.full_name || row.username || row.email },
      ])
    ).values()
  );

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Security</p>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">Admin activity log</h1>
      <p className="text-sm text-gray-500 mt-2 max-w-3xl">
        Full trail of who signed into the admin platform and which pages they opened, with timestamps.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value)}
        >
          <option value="">All admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-gray-500">No activity recorded yet. Navigate the admin area to generate entries.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-5 py-4">When</th>
                <th className="px-5 py-4">Admin</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Path</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-gray-50 align-top">
                  <td className="px-5 py-3 whitespace-nowrap text-gray-500">{fmt(row.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{row.full_name || row.username}</div>
                    <div className="text-xs text-gray-500">{row.email || "—"}</div>
                    <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
                      {row.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className="bg-red-50 text-red-700 hover:bg-red-50">{row.action}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <code className="text-xs bg-gray-50 px-2 py-1 rounded">{row.path}</code>
                    {row.user_agent ? (
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-1" title={row.user_agent}>
                        {row.user_agent}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
