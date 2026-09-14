import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Wallet,
  Share2,
  FileUp,
  X,
} from "lucide-react";
import { authApi, formatApiError } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { useConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { ContributionProofDetails } from "../../../components/media/ContributionProofDetails";
import MediaContributionAnalytics from "../../../components/media/MediaContributionAnalytics";
import { formatContributionShareLine } from "../../../lib/mediaContributions";

const money = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function originBase() {
  if (typeof window === "undefined") return "https://ffiem.org";
  return window.location.origin;
}

function buildShareText(detail) {
  if (!detail?.month) return "";
  const s = detail.summary || {};
  const lines = [
    `📊 *Social Media Team — ${detail.month.label}*`,
    "",
    `Total raised: *${money(s.total_raised)}*`,
    `Contributions: ${s.contribution_count || 0}`,
    `Paid members: ${s.paid_roster_count || 0}/${s.active_roster_count || 0}`,
    `Commitments: ${money(s.commitments_total)}`,
    `Balance: ${money(s.balance)}`,
    "",
    "*Contributions*",
  ];
  (detail.contributions || []).forEach((c) => {
    lines.push(formatContributionShareLine(c, { money }));
  });
  if ((detail.commitments || []).length) {
    lines.push("", "*Equipment / commitments*");
    detail.commitments.forEach((c) => {
      lines.push(`• ${c.title} — ${money(c.amount)} (${c.status})`);
    });
  }
  const unpaid = (detail.roster || []).filter((m) => !m.paid);
  if (unpaid.length) {
    lines.push("", "*Still outstanding*");
    unpaid.forEach((m) => lines.push(`• ${m.full_name}`));
  }
  lines.push("", `Full report: ${originBase()}/contribute/media/${detail.month.slug}/report`);
  return lines.join("\n");
}

export default function MediaContributionsPage() {
  const { can } = useAuth();
  const canEdit = can("social_media_contributions", "edit");
  const canDelete = can("social_media_contributions", "delete");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const [tab, setTab] = useState("months");
  const [months, setMonths] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRefreshing, setAnalyticsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const autoSynced = useRef(false);
  const analyticsDirty = useRef(true);

  const [memberDialog, setMemberDialog] = useState(false);
  const [memberForm, setMemberForm] = useState({ full_name: "", email: "", phone: "", role_label: "Team member", is_active: true });
  const [editingMember, setEditingMember] = useState(null);

  const [monthDialog, setMonthDialog] = useState(false);
  const [monthForm, setMonthForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    label: "",
    intro: "",
    target_amount: "",
    is_open: true,
    report_public: true,
  });
  const [editingMonth, setEditingMonth] = useState(null);

  const [contribDialog, setContribDialog] = useState(false);
  const [contribForm, setContribForm] = useState({
    team_member_id: "",
    full_name: "",
    amount: "",
    note: "",
    receipt_url: "",
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptName, setReceiptName] = useState("");

  const [commitDialog, setCommitDialog] = useState(false);
  const [commitForm, setCommitForm] = useState({ title: "", description: "", amount: "", status: "planned" });
  const [editingCommit, setEditingCommit] = useState(null);

  const loadMonths = useCallback(async () => {
    const rows = await authApi.listMediaContributionMonths();
    setMonths(Array.isArray(rows) ? rows : []);
  }, []);

  const loadMembers = useCallback(async () => {
    const rows = await authApi.listMediaTeamMembers();
    setMembers(Array.isArray(rows) ? rows : []);
    return Array.isArray(rows) ? rows : [];
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    const data = await authApi.getMediaContributionMonth(id);
    setDetail(data || null);
  }, []);

  const loadAnalytics = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setAnalyticsLoading(true);
    else setAnalyticsRefreshing(true);
    try {
      const data = await authApi.getMediaContributionAnalytics();
      setAnalytics(data || null);
      analyticsDirty.current = false;
    } catch (err) {
      toast.error(formatApiError(err.message) || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
      setAnalyticsRefreshing(false);
    }
  }, []);

  const invalidateAnalytics = useCallback(async () => {
    analyticsDirty.current = true;
    if (tab === "analytics") {
      await loadAnalytics({ silent: true });
    }
  }, [tab, loadAnalytics]);

  const syncFromRegistry = useCallback(async ({ quiet = false } = {}) => {
    if (!canEdit) return null;
    setSyncing(true);
    try {
      const result = await authApi.syncMediaTeamMembers();
      const list = Array.isArray(result?.members) ? result.members : [];
      setMembers(list);
      if (!quiet) {
        toast.success(
          `Imported ${result?.inserted || 0} member(s)` +
            (result?.skipped ? ` · ${result.skipped} already on roster` : "") +
            (result?.candidates === 0 ? " · no Media/Social Media tagged members found" : "")
        );
      } else if (result?.inserted > 0) {
        toast.success(`Loaded ${result.inserted} Media / Social Media member(s) from the registry`);
      }
      if (selectedMonthId) await loadDetail(selectedMonthId);
      return result;
    } catch (err) {
      if (!quiet) toast.error(formatApiError(err.message) || "Import failed");
      if (!quiet) throw err;
      return null;
    } finally {
      setSyncing(false);
    }
  }, [canEdit, selectedMonthId, loadDetail]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [, roster] = await Promise.all([loadMonths(), loadMembers()]);
      if (selectedMonthId) await loadDetail(selectedMonthId);
      if (canEdit && !autoSynced.current && Array.isArray(roster) && roster.length === 0) {
        autoSynced.current = true;
        await syncFromRegistry({ quiet: true });
      }
    } catch (err) {
      toast.error(formatApiError(err.message) || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [loadMonths, loadMembers, loadDetail, selectedMonthId, canEdit, syncFromRegistry]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (tab !== "analytics") return;
    if (!analytics || analyticsDirty.current) {
      loadAnalytics({ silent: Boolean(analytics) });
    }
  }, [tab, analytics, loadAnalytics]);

  const unpaidRoster = useMemo(
    () => (detail?.roster || []).filter((m) => !m.paid),
    [detail]
  );

  const openMonthWorkspace = async (id) => {
    setSelectedMonthId(id);
    setTab("workspace");
    try {
      await loadDetail(id);
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  const saveMember = async () => {
    try {
      await authApi.upsertMediaTeamMember(editingMember?.id || null, memberForm);
      toast.success(editingMember ? "Member updated" : "Member added");
      setMemberDialog(false);
      setEditingMember(null);
      await loadMembers();
      if (selectedMonthId) await loadDetail(selectedMonthId);
      await invalidateAnalytics();
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  const saveMonth = async () => {
    try {
      const row = await authApi.upsertMediaContributionMonth(editingMonth?.id || null, {
        ...monthForm,
        label:
          monthForm.label ||
          `${MONTH_NAMES[Number(monthForm.month) - 1]} ${monthForm.year}`,
        target_amount: monthForm.target_amount === "" ? null : monthForm.target_amount,
      });
      toast.success(editingMonth ? "Month updated" : "Month created");
      setMonthDialog(false);
      setEditingMonth(null);
      await invalidateAnalytics();
      await loadMonths();
      if (row?.id) await openMonthWorkspace(row.id);
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  const saveContribution = async () => {
    if (!selectedMonthId) return;
    try {
      await authApi.upsertMediaContribution(null, {
        month_id: selectedMonthId,
        team_member_id: contribForm.team_member_id || null,
        full_name: contribForm.full_name,
        amount: contribForm.amount,
        note: contribForm.note,
        receipt_url: contribForm.receipt_url || "",
        payment_date: contribForm.payment_date || null,
      });
      toast.success("Contribution recorded");
      setContribDialog(false);
      setContribForm({
        team_member_id: "",
        full_name: "",
        amount: "",
        note: "",
        receipt_url: "",
        payment_date: new Date().toISOString().slice(0, 10),
      });
      setReceiptName("");
      await invalidateAnalytics();
      await Promise.all([loadDetail(selectedMonthId), loadMonths()]);
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  const onAdminReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReceiptUploading(true);
    try {
      const uploaded = await authApi.uploadContributionReceipt(file);
      setContribForm((prev) => ({ ...prev, receipt_url: uploaded.url }));
      setReceiptName(file.name);
      toast.success("Receipt uploaded");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Receipt upload failed");
    } finally {
      setReceiptUploading(false);
    }
  };

  const saveCommitment = async () => {
    if (!selectedMonthId) return;
    try {
      await authApi.upsertMediaCommitment(editingCommit?.id || null, {
        month_id: selectedMonthId,
        ...commitForm,
      });
      toast.success(editingCommit ? "Commitment updated" : "Commitment added");
      setCommitDialog(false);
      setEditingCommit(null);
      await invalidateAnalytics();
      await Promise.all([loadDetail(selectedMonthId), loadMonths()]);
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  const copyText = async (text, ok = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(ok);
    } catch {
      toast.error("Could not copy");
    }
  };

  const summary = detail?.summary || {};
  const month = detail?.month;

  return (
    <div data-testid="media-contributions-page">
      {confirmDialog}
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
        <Wallet className="h-7 w-7 text-red-600" /> Social media contributions
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-3xl">
        Track monthly team dues, analyze payments with live charts, log equipment commitments, and share a clean audit report with the team.
      </p>

      <PageToolbar
        className="mt-6 mb-6"
        left={[
          { id: "analytics", label: "Analytics" },
          { id: "months", label: "Months" },
          { id: "team", label: `Team (${members.filter((m) => m.is_active).length})` },
          { id: "workspace", label: "Month audit", disabled: !selectedMonthId },
        ].map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            className={tab === t.id ? "bg-red-600 hover:bg-red-700" : ""}
            disabled={t.disabled}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
        right={
          canEdit ? (
            tab === "team" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={syncing}
                  onClick={() => syncFromRegistry()}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Importing…" : "Import Media members"}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setEditingMember(null);
                    setMemberForm({ full_name: "", email: "", phone: "", role_label: "Team member", is_active: true });
                    setMemberDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add member
                </Button>
              </div>
            ) : tab === "months" ? (
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  const now = new Date();
                  setEditingMonth(null);
                  setMonthForm({
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    label: "",
                    intro: "Thank you for supporting our social media tools and equipment this month.",
                    target_amount: "",
                    is_open: true,
                    report_public: true,
                  });
                  setMonthDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> New month
              </Button>
            ) : tab === "analytics" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAnalytics({ silent: true })}
                disabled={analyticsRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${analyticsRefreshing ? "animate-spin" : ""}`} />
                Refresh charts
              </Button>
            ) : null
          ) : tab === "analytics" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAnalytics({ silent: true })}
              disabled={analyticsRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${analyticsRefreshing ? "animate-spin" : ""}`} />
              Refresh charts
            </Button>
          ) : null
        }
      />

      {loading && !detail && tab !== "team" && tab !== "analytics" ? (
        <p className="text-gray-500">Loading…</p>
      ) : null}

      {tab === "analytics" && (
        <MediaContributionAnalytics
          data={analytics}
          loading={analyticsLoading}
          refreshing={analyticsRefreshing}
          onRefresh={() => loadAnalytics({ silent: true })}
        />
      )}

      {tab === "months" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {months.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 md:col-span-2 xl:col-span-3">
              No contribution months yet. Create one to generate a shareable payment link.
            </Card>
          ) : (
            months.map((m) => (
              <Card key={m.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{m.label}</h3>
                    <p className="text-xs text-gray-400 mt-1">/contribute/media/{m.slug}</p>
                  </div>
                  <Badge className={m.is_open ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                    {m.is_open ? "Open" : "Closed"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-red-50 px-3 py-2">
                    <p className="text-xs text-red-700/70">Raised</p>
                    <p className="font-semibold text-red-800">{money(m.summary?.total_raised)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-semibold text-slate-800">
                      {m.summary?.paid_roster_count || 0}/{m.summary?.active_roster_count || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => openMonthWorkspace(m.id)}>
                    Open audit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(`${originBase()}/contribute/media/${m.slug}`, "Payment link copied")}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Link
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMonth(m);
                        setMonthForm({
                          year: m.year,
                          month: m.month,
                          label: m.label,
                          intro: m.intro || "",
                          target_amount: m.target_amount ?? "",
                          is_open: m.is_open !== false,
                          report_public: m.report_public !== false,
                        });
                        setMonthDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "team" && (
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No team members yet. Click{" "}
                      <span className="font-medium text-gray-700">Import Media members</span> to pull
                      registered members tagged Media / Social Media (and media volunteer applications),
                      or add someone manually.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className={`border-t ${m.is_active ? "" : "opacity-50 bg-gray-50"}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.role_label}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {[m.email, m.phone].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={m.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {m.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMember(m);
                              setMemberForm({
                                full_name: m.full_name,
                                email: m.email || "",
                                phone: m.phone || "",
                                role_label: m.role_label || "Team member",
                                is_active: m.is_active !== false,
                              });
                              setMemberDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Remove team member?",
                                description: `${m.full_name} will no longer appear in payment lists.`,
                                confirmLabel: "Remove",
                                variant: "danger",
                              });
                              if (!ok) return;
                              await authApi.deleteMediaTeamMember(m.id);
                              toast.success("Removed");
                              await loadMembers();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "workspace" && month && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{month.label}</h2>
                <Badge className={month.is_open ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                  {month.is_open ? "Accepting payments" : "Closed"}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                Share payment link with members as they send money. Paid names are greyed out automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => copyText(`${originBase()}/contribute/media/${month.slug}`, "Payment link copied")}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy payment link
              </Button>
              <Button
                variant="outline"
                onClick={() => copyText(buildShareText(detail), "Audit report copied")}
              >
                <Share2 className="h-4 w-4 mr-2" /> Copy WhatsApp report
              </Button>
              <Button asChild variant="outline">
                <a href={`/contribute/media/${month.slug}/report`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Open report
                </a>
              </Button>
              {canEdit && (
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setContribForm({
                      team_member_id: "",
                      full_name: "",
                      amount: "",
                      note: "",
                      receipt_url: "",
                      payment_date: new Date().toISOString().slice(0, 10),
                    });
                    setReceiptName("");
                    setContribDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add contribution
                </Button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total raised", value: money(summary.total_raised), tone: "from-red-600 to-red-700 text-white" },
              { label: "Paid / roster", value: `${summary.paid_roster_count || 0}/${summary.active_roster_count || 0}`, tone: "bg-white border" },
              { label: "Commitments", value: money(summary.commitments_total), tone: "bg-white border" },
              { label: "Balance", value: money(summary.balance), tone: "bg-white border" },
            ].map((card) => (
              <Card key={card.label} className={`p-4 ${card.tone.includes("from-") ? `bg-gradient-to-br ${card.tone} border-0` : card.tone}`}>
                <p className={`text-xs ${card.tone.includes("text-white") ? "text-white/80" : "text-gray-500"}`}>{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.tone.includes("text-white") ? "" : "text-gray-900"}`}>{card.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 border-0 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-600" /> Team payment status
                </h3>
              </div>
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
                {(detail.roster || []).map((m) => (
                  <li
                    key={m.id}
                    className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 border ${
                      m.paid ? "bg-gray-50 border-gray-100" : "bg-white border-gray-100"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${m.paid ? "text-gray-700" : "text-gray-900"}`}>
                        {m.full_name}
                      </p>
                      <p className="text-xs text-gray-400">{m.role_label}</p>
                      {m.paid ? (
                        <ContributionProofDetails
                          paymentDate={m.payment_date}
                          receiptUrl={m.receipt_url}
                          note={m.note}
                          compact
                          className="mt-2"
                        />
                      ) : null}
                    </div>
                    {m.paid ? (
                      <Badge className="bg-green-100 text-green-800 shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {money(m.amount)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-200 shrink-0 mt-0.5">
                        Outstanding
                      </Badge>
                    )}
                  </li>
                ))}
                {(detail.roster || []).length === 0 && (
                  <p className="text-sm text-gray-500 py-6 text-center">Add team members first.</p>
                )}
              </ul>
              {unpaidRoster.length > 0 && (
                <p className="text-xs text-amber-700 mt-3">{unpaidRoster.length} member(s) still outstanding.</p>
              )}
            </Card>

            <Card className="p-5 border-0 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">All contributions</h3>
              </div>
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
                {(detail.contributions || []).length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No contributions yet.</p>
                ) : (
                  (detail.contributions || []).map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{c.full_name}</p>
                        <p className="text-xs text-gray-400">
                          {c.source === "admin" ? "Added by admin" : "Via payment link"}
                          {c.created_at ? ` · ${new Date(c.created_at).toLocaleString()}` : ""}
                        </p>
                        <ContributionProofDetails
                          paymentDate={c.payment_date}
                          receiptUrl={c.receipt_url}
                          note={c.note}
                          compact
                          className="mt-2"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-red-700">{money(c.amount)}</p>
                        {canDelete && (
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:underline mt-1"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Delete contribution?",
                                description: `Remove ${c.full_name}'s ${money(c.amount)} entry.`,
                                confirmLabel: "Delete",
                                variant: "danger",
                              });
                              if (!ok) return;
                              await authApi.deleteMediaContribution(c.id);
                              toast.success("Deleted");
                              await invalidateAnalytics();
                              await Promise.all([loadDetail(selectedMonthId), loadMonths()]);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>

          <Card className="p-5 border-0 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Equipment & commitments</h3>
                <p className="text-xs text-gray-500">What this month’s contributions are being used for.</p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setEditingCommit(null);
                    setCommitForm({ title: "", description: "", amount: "", status: "planned" });
                    setCommitDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add commitment
                </Button>
              )}
            </div>
            {(detail.commitments || []).length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No commitments logged for this month yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {(detail.commitments || []).map((c) => (
                  <div key={c.id} className="rounded-xl border border-gray-100 p-4 flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{c.title}</p>
                      {c.description ? <p className="text-sm text-gray-500 mt-1">{c.description}</p> : null}
                      <Badge className="mt-2 bg-slate-100 text-slate-700 capitalize">{c.status}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{money(c.amount)}</p>
                      {canEdit && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline mt-2 block"
                          onClick={() => {
                            setEditingCommit(c);
                            setCommitForm({
                              title: c.title,
                              description: c.description || "",
                              amount: c.amount ?? "",
                              status: c.status || "planned",
                            });
                            setCommitDialog(true);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="text-xs text-gray-400 hover:text-red-600 mt-1 block"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Delete commitment?",
                              description: c.title,
                              confirmLabel: "Delete",
                              variant: "danger",
                            });
                            if (!ok) return;
                            await authApi.deleteMediaCommitment(c.id);
                            toast.success("Deleted");
                            await invalidateAnalytics();
                            await loadDetail(selectedMonthId);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="text-xs text-gray-400">
            Public payment form:{" "}
            <Link className="text-red-600 hover:underline" to={`/contribute/media/${month.slug}`}>
              /contribute/media/{month.slug}
            </Link>
          </p>
        </div>
      )}

      {/* Member dialog */}
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit team member" : "Add team member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={memberForm.full_name} onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role label</Label>
              <Input value={memberForm.role_label} onChange={(e) => setMemberForm({ ...memberForm, role_label: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Active on roster</span>
              <Switch checked={memberForm.is_active} onCheckedChange={(v) => setMemberForm({ ...memberForm, is_active: Boolean(v) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveMember}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Month dialog */}
      <Dialog open={monthDialog} onOpenChange={setMonthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMonth ? "Edit month" : "Create contribution month"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={monthForm.year} onChange={(e) => setMonthForm({ ...monthForm, year: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Month</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={monthForm.month}
                  onChange={(e) => setMonthForm({ ...monthForm, month: Number(e.target.value) })}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input
                placeholder={`${MONTH_NAMES[Number(monthForm.month) - 1]} ${monthForm.year}`}
                value={monthForm.label}
                onChange={(e) => setMonthForm({ ...monthForm, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target amount (₦)</Label>
              <Input type="number" value={monthForm.target_amount} onChange={(e) => setMonthForm({ ...monthForm, target_amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Intro on payment form</Label>
              <Textarea rows={3} value={monthForm.intro} onChange={(e) => setMonthForm({ ...monthForm, intro: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Accept public payments</span>
              <Switch checked={monthForm.is_open} onCheckedChange={(v) => setMonthForm({ ...monthForm, is_open: Boolean(v) })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Public shareable report</span>
              <Switch checked={monthForm.report_public} onCheckedChange={(v) => setMonthForm({ ...monthForm, report_public: Boolean(v) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMonthDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveMonth}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribution dialog */}
      <Dialog open={contribDialog} onOpenChange={setContribDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add contribution manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Team member</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={contribForm.team_member_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const member = (detail?.roster || []).find((m) => m.id === id);
                  setContribForm({
                    ...contribForm,
                    team_member_id: id,
                    full_name: member?.full_name || contribForm.full_name,
                  });
                }}
              >
                <option value="">— Select or type name below —</option>
                {(detail?.roster || []).map((m) => (
                  <option key={m.id} value={m.id} disabled={m.paid} className={m.paid ? "text-gray-400" : ""}>
                    {m.full_name}{m.paid ? " (Paid)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {!contribForm.team_member_id && (
              <div className="space-y-1.5">
                <Label>Or enter name</Label>
                <Input
                  value={contribForm.full_name}
                  onChange={(e) => setContribForm({ ...contribForm, full_name: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Amount (₦)</Label>
              <Input type="number" value={contribForm.amount} onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input
                type="date"
                value={contribForm.payment_date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setContribForm({ ...contribForm, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={contribForm.note} onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt (optional)</Label>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
                {contribForm.receipt_url ? (
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={contribForm.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-red-600 hover:underline truncate"
                    >
                      {receiptName || "View receipt"}
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setContribForm({ ...contribForm, receipt_url: "" });
                        setReceiptName("");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                    <FileUp className="h-4 w-4 text-red-600" />
                    {receiptUploading ? "Uploading…" : "Upload JPG, PNG, WEBP or PDF"}
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      className="hidden"
                      disabled={receiptUploading}
                      onChange={onAdminReceiptChange}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContribDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={receiptUploading} onClick={saveContribution}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commitment dialog */}
      <Dialog open={commitDialog} onOpenChange={setCommitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCommit ? "Edit commitment" : "Add equipment / commitment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={commitForm.title} onChange={(e) => setCommitForm({ ...commitForm, title: e.target.value })} placeholder="e.g. Ring light" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={commitForm.description} onChange={(e) => setCommitForm({ ...commitForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₦)</Label>
                <Input type="number" value={commitForm.amount} onChange={(e) => setCommitForm({ ...commitForm, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={commitForm.status}
                  onChange={(e) => setCommitForm({ ...commitForm, status: e.target.value })}
                >
                  <option value="planned">Planned</option>
                  <option value="purchased">Purchased</option>
                  <option value="achieved">Achieved</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommitDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveCommitment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
