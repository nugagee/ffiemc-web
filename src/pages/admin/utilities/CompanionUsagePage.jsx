import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Bot, Loader2, Save } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function CompanionUsagePage() {
  const { isSuperadmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.aiUsageAnalytics();
      setData(res);
      const next = {};
      (res?.by_admin || []).forEach((row) => {
        next[row.admin_id] = {
          monthly_token_limit: row.token_limit ?? 200000,
          monthly_request_limit: row.request_limit ?? 200,
          enabled: row.enabled !== false,
          notes: "",
        };
      });
      setDrafts(next);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load AI analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) load();
  }, [isSuperadmin]);

  if (!isSuperadmin) {
    return <Navigate to="/admin/utilities/companion" replace />;
  }

  const saveLimit = async (adminId) => {
    const d = drafts[adminId];
    if (!d) return;
    setSavingId(adminId);
    try {
      await authApi.aiSetLimit({
        adminId,
        monthlyTokenLimit: Number(d.monthly_token_limit) || 0,
        monthlyRequestLimit: Number(d.monthly_request_limit) || 0,
        enabled: Boolean(d.enabled),
        notes: d.notes || "",
      });
      toast.success("Limit saved");
      load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not save limit");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-16 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading usage…
      </div>
    );
  }

  const totals = data?.totals || {};

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-gray-500">
            <Link to="/admin/utilities/companion">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Fire Buddy
            </Link>
          </Button>
          <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
            <Bot className="h-7 w-7 text-red-600" /> Fire Buddy usage & limits
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Monitor token and request usage per admin this month, and set Fire Buddy allowances.
          </p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-0 shadow-md">
          <p className="text-xs uppercase tracking-wider text-gray-400">Tokens this month</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{fmt(totals.tokens)}</p>
        </Card>
        <Card className="p-5 border-0 shadow-md">
          <p className="text-xs uppercase tracking-wider text-gray-400">Requests</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{fmt(totals.requests)}</p>
        </Card>
        <Card className="p-5 border-0 shadow-md">
          <p className="text-xs uppercase tracking-wider text-gray-400">Active admins</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{fmt(totals.admins)}</p>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Per-admin limits</h2>
      <div className="space-y-4 mb-10">
        {(data?.by_admin || []).map((row) => {
          const d = drafts[row.admin_id] || {};
          const overTokens = row.token_limit > 0 && row.tokens_used >= row.token_limit;
          const overReqs = row.request_limit > 0 && row.requests_used >= row.request_limit;
          return (
            <Card key={row.admin_id} className="p-5 border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-gray-900">{row.admin_name}</p>
                  <p className="text-xs text-gray-500">{row.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Last used: {fmtDate(row.last_used_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!row.enabled ? <Badge className="bg-gray-200 text-gray-700">Paused</Badge> : null}
                  {overTokens || overReqs ? <Badge className="bg-red-100 text-red-700">Limit reached</Badge> : null}
                  <Badge className="bg-red-50 text-red-700">
                    {fmt(row.tokens_used)} / {fmt(row.token_limit)} tokens
                  </Badge>
                  <Badge variant="outline">
                    {fmt(row.requests_used)} / {fmt(row.request_limit)} requests
                  </Badge>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label>Monthly token limit</Label>
                  <Input
                    type="number"
                    min={0}
                    value={d.monthly_token_limit ?? 0}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [row.admin_id]: { ...d, monthly_token_limit: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly request limit</Label>
                  <Input
                    type="number"
                    min={0}
                    value={d.monthly_request_limit ?? 0}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [row.admin_id]: { ...d, monthly_request_limit: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    checked={d.enabled !== false}
                    onCheckedChange={(v) =>
                      setDrafts({
                        ...drafts,
                        [row.admin_id]: { ...d, enabled: Boolean(v) },
                      })
                    }
                  />
                  <Label>Enabled</Label>
                </div>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={savingId === row.admin_id}
                  onClick={() => saveLimit(row.admin_id)}
                >
                  {savingId === row.admin_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Preview</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent || []).map((row) => (
                <tr key={row.id} className="border-t border-gray-50">
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-2.5 font-medium">{row.admin_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{row.model || "—"}</td>
                  <td className="px-4 py-2.5">{fmt(row.total_tokens)}</td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{row.user_message_preview || "—"}</td>
                </tr>
              ))}
              {!data?.recent?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">No usage yet</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
