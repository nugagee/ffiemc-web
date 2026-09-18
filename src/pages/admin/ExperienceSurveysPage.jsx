import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareHeart, Trash2 } from "lucide-react";
import { authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { useConfirmDialog } from "../../components/admin/ConfirmDialog";

const STATUSES = ["new", "read", "reviewing", "planned", "replied", "closed"];

function formatDate(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelize(value) {
  return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function submitterMeta(item) {
  const meta = item?.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const demographics = meta.demographics && typeof meta.demographics === "object" ? meta.demographics : {};
  const submitter = meta.submitter && typeof meta.submitter === "object" ? meta.submitter : {};
  return { meta, demographics, submitter };
}

export default function ExperienceSurveysPage() {
  const { can } = useAuth();
  const canEdit = can("experience_surveys", "edit");
  const canDelete = can("experience_surveys", "delete");
  const { confirm, dialog } = useConfirmDialog();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authApi.listExperienceSurveys(300);
      const rows = Array.isArray(data) ? data : [];
      setItems(rows);
      setSelected((current) => {
        if (!current) return rows[0] || null;
        return rows.find((row) => row.id === current.id) || rows[0] || null;
      });
    } catch (err) {
      setError(err.message || "Could not load experience surveys.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReply(selected?.admin_response || "");
  }, [selected?.id, selected?.admin_response]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const metrics = useMemo(() => {
    const unreplied = items.filter((item) => !item.admin_response).length;
    const avg =
      items.length > 0
        ? Number(
            (
              items.reduce((sum, item) => sum + Number(item.overall_rating || 0), 0) / items.length
            ).toFixed(1),
          )
        : null;
    return { total: items.length, unreplied, avg };
  }, [items]);

  const selectedMeta = useMemo(() => submitterMeta(selected), [selected]);

  const save = async (payload) => {
    if (!selected || !canEdit) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await authApi.updateExperienceSurvey(selected.id, payload);
      setMessage("Survey updated.");
      await load();
    } catch (err) {
      setError(err.message || "Could not update survey.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected || !canDelete) return;
    const ok = await confirm({
      title: "Delete this survey response?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await authApi.deleteExperienceSurvey(selected.id);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message || "Could not delete survey.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {dialog}
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Feedback</p>
      <h1 className="mt-2 text-3xl font-bold md:text-4xl">Experience surveys</h1>
      <p className="mt-2 max-w-3xl text-sm text-gray-500">
        Timed visitor check-ins about comfort with the website, overall experience, and requested improvements.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total</p>
          <p className="mt-1 text-3xl font-bold text-navy">{metrics.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Awaiting reply</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{metrics.unreplied}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Avg rating</p>
          <p className="mt-1 text-3xl font-bold text-navy">{metrics.avg ?? "—"}</p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {labelize(status)}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-5">
          {loading && (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading surveys…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MessageSquareHeart className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 font-medium">No survey responses yet</p>
            </div>
          )}
          <ul>
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    if (canEdit && item.status === "new") {
                      void authApi.updateExperienceSurvey(item.id, { status: "read" }).then(load);
                    }
                  }}
                  className={`w-full border-b border-gray-50 px-5 py-4 text-left ${
                    selected?.id === item.id ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-navy">{item.name || "Anonymous visitor"}</span>
                    <span className={`text-[10px] uppercase tracking-widest ${item.status === "new" ? "text-red-600" : "text-gray-400"}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {item.email || "No email"} · {labelize(item.audience)}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    Rating {item.overall_rating}/5
                    {item.average_comfort != null ? ` · Comfort ${item.average_comfort}/5` : ""}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(item.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-h-[320px] rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8 lg:col-span-7">
          {!selected ? (
            <p className="text-gray-500">Select a survey to review and reply.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-navy">{selected.name || "Anonymous visitor"}</h2>
                  {selected.email ? (
                    <a href={`mailto:${selected.email}`} className="text-sm text-red-600">
                      {selected.email}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">No email provided</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    {labelize(selected.audience)} · {selected.path} · {formatDate(selected.created_at)}
                  </p>
                  <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <p>
                      <span className="font-semibold text-navy">Visitor ID:</span>{" "}
                      <span className="break-all">{selected.visitor_key || selectedMeta.meta.visitorId || "—"}</span>
                    </p>
                    {selectedMeta.meta.sessionId ? (
                      <p className="mt-1">
                        <span className="font-semibold text-navy">Session:</span>{" "}
                        <span className="break-all">{selectedMeta.meta.sessionId}</span>
                      </p>
                    ) : null}
                    <p className="mt-1">
                      {[
                        selectedMeta.demographics.deviceType,
                        selectedMeta.demographics.browser,
                        selectedMeta.demographics.os,
                        selectedMeta.demographics.language,
                        selectedMeta.demographics.timezone,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Device details unavailable"}
                      {selectedMeta.demographics.screenWidth && selectedMeta.demographics.screenHeight
                        ? ` · ${selectedMeta.demographics.screenWidth}×${selectedMeta.demographics.screenHeight}`
                        : ""}
                    </p>
                    {selectedMeta.meta.referrer ? (
                      <p className="mt-1 truncate">
                        <span className="font-semibold text-navy">Referrer:</span> {selectedMeta.meta.referrer}
                      </p>
                    ) : null}
                    {selectedMeta.meta.adminHint?.hasAdminSession ? (
                      <p className="mt-1 text-amber-700">Submitted while an admin session was present in this browser.</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <select
                      value={selected.status}
                      disabled={busy}
                      onChange={(e) => void save({ status: e.target.value })}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {labelize(status)}
                        </option>
                      ))}
                    </select>
                  )}
                  {canDelete && (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void remove()}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-navy sm:grid-cols-2">
                <p>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Overall</span>
                  <br />
                  {selected.overall_rating}/5
                </p>
                <p>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Avg comfort</span>
                  <br />
                  {selected.average_comfort ?? "—"}/5
                </p>
                {selected.improvements && (
                  <p className="sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Improvements</span>
                    <br />
                    {selected.improvements}
                  </p>
                )}
                {selected.wished_features && (
                  <p className="sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Requested features</span>
                    <br />
                    {selected.wished_features}
                  </p>
                )}
              </div>

              <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                {selected.feedback_text}
              </pre>

              {canEdit && (
                <div className="mt-6 space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="survey-reply">
                    Admin reply
                  </label>
                  <textarea
                    id="survey-reply"
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-300"
                    placeholder="Thank them and share how their feedback will help…"
                  />
                  <Button
                    type="button"
                    disabled={busy || !reply.trim()}
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() =>
                      void save({
                        admin_response: reply,
                        status: selected.status === "new" || selected.status === "read" ? "replied" : selected.status,
                      })
                    }
                  >
                    {busy ? "Saving…" : selected.admin_response ? "Update reply" : "Send reply"}
                  </Button>
                  {selected.admin_responded_at && (
                    <p className="text-xs text-gray-400">
                      Last replied {formatDate(selected.admin_responded_at)}
                      {selected.admin_responded_by_name ? ` by ${selected.admin_responded_by_name}` : ""}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
