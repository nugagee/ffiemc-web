import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { authApi, formatApiError } from "../../lib/api";
import { sendMembershipApprovedEmail } from "../../lib/email";
import { siteOrigin } from "../../lib/meetings";
import { useAuth } from "../../context/AuthContext";
import { useAdminCounts } from "../../context/AdminCountsContext";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import { TablePagination, usePagedRows } from "../../components/admin/TablePagination";
import { RecordViewDialog } from "../../components/admin/RecordViewDialog";
import { PageToolbar } from "../../components/admin/PageToolbar";
import { useConfirmDialog } from "../../components/admin/ConfirmDialog";
import { memberRoleLabel } from "../../components/forms/RoleMultiSelect";

export const APPROVAL_FEATURES = [
  { id: "all", label: "All types" },
  { id: "church_members", label: "Members" },
  { id: "program_registrations", label: "Program sign-ups" },
  { id: "volunteer_applications", label: "Volunteers" },
  { id: "church_branches", label: "Branches" },
  { id: "church_roles", label: "Roles" },
  { id: "church_programs", label: "Programs" },
  { id: "announcements", label: "Banners" },
  { id: "contact_messages", label: "Messages" },
];

const statusTone = {
  pending: "bg-amber-100 text-amber-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const progressLabel = {
  pending: "Awaiting review",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Withdrawn",
};

function featureLabel(key) {
  return APPROVAL_FEATURES.find((f) => f.id === key)?.label || key;
}

export default function ApprovalsPage({ mine = false }) {
  const { user, can, isSuperadmin } = useAuth();
  const { refreshCounts } = useAdminCounts();
  const navigate = useNavigate();
  const { featureKey } = useParams();
  const [params, setParams] = useSearchParams();
  const feature = featureKey && featureKey !== "mine" ? featureKey : "all";
  const status = params.get("status") || (mine ? "all" : "pending");
  const canReview = isSuperadmin || can("approvals", "edit");
  const canInbox = isSuperadmin || can("approvals", "view");

  const [rows, setRows] = useState([]);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const load = async () => {
    const list = await authApi.listChangeRequests(
      feature === "all" ? null : feature,
      status,
      mine ? "mine" : "inbox"
    );
    setRows(list || []);
  };

  useEffect(() => {
    load().catch((e) => toast.error(formatApiError(e.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, status, mine]);

  const paged = usePagedRows(rows);

  const goFeature = (id) => {
    const base = mine ? "/admin/approvals/mine" : "/admin/approvals";
    const path = id === "all" ? base : `${base}/${id}`;
    navigate(`${path}?status=${status}`);
  };

  const review = async (id, decision) => {
    const row = rows.find((r) => r.id === id);
    const isApprove = decision === "approved";
    const ok = await confirm({
      title: isApprove ? "Approve this request?" : "Reject this request?",
      description: isApprove
        ? `This will apply “${row?.title || "the change"}” immediately.${note.trim() ? " Your review note will be saved." : ""}`
        : `This will reject “${row?.title || "the request"}”. The requester can see your decision${note.trim() ? " and note" : ""}.`,
      confirmLabel: isApprove ? "Approve" : "Reject",
      variant: isApprove ? "success" : "danger",
    });
    if (!ok) return;

    try {
      await authApi.reviewChangeRequest(id, decision, note);
      toast.success(isApprove ? "Change applied" : "Request rejected");
      if (
        isApprove
        && row?.feature === "church_members"
        && row?.action === "update"
        && (row.previous?.status === "pending")
        && (row.payload?.status === "approved" || row.payload?.status === "active")
      ) {
        try {
          await sendMembershipApprovedEmail({
            ...(row.previous || {}),
            ...(row.payload || {}),
            fullName: row.payload?.full_name || row.previous?.full_name,
            email: row.payload?.email || row.previous?.email,
            roleName: row.payload?.role_names || memberRoleLabel(row.payload) || row.previous?.role_name || "",
            branchName: row.payload?.branch_name || row.previous?.branch_name || "",
            formData: row.payload?.form_data || row.previous?.form_data || {},
            status: "approved",
            siteUrl: siteOrigin(),
          });
        } catch {
          toast.warning("Membership approved, but congratulations email could not be sent.");
        }
      }
      setNote("");
      setViewRow(null);
      await load();
      refreshCounts();
    } catch (e) {
      toast.error(formatApiError(e.message));
    }
  };

  const sendComment = async (id) => {
    if (!comment.trim()) return;
    try {
      const updated = await authApi.commentChangeRequest(id, comment.trim());
      toast.success("Feedback sent");
      setComment("");
      await load();
      if (updated) setViewRow(updated);
    } catch (e) {
      toast.error(formatApiError(e.message));
    }
  };

  const withdraw = async (id) => {
    const row = rows.find((r) => r.id === id);
    const ok = await confirm({
      title: "Withdraw this request?",
      description: `“${row?.title || "This request"}” will be cancelled and removed from the approval inbox.`,
      confirmLabel: "Withdraw",
      variant: "warning",
    });
    if (!ok) return;
    try {
      await authApi.cancelChangeRequest(id);
      toast.success("Request withdrawn");
      setViewRow(null);
      await load();
      refreshCounts();
    } catch (e) {
      toast.error(formatApiError(e.message));
    }
  };

  const viewFields = useMemo(() => {
    if (!viewRow) return [];
    return [
      { label: "Type", value: featureLabel(viewRow.feature) },
      { label: "Action", value: viewRow.action },
      { label: "Progress", value: progressLabel[viewRow.progress] || viewRow.status },
      { label: "Requested by", value: viewRow.requested_by_name || viewRow.requested_by_email },
      { label: "Submitted", value: viewRow.created_at },
      { label: "Reviewed by", value: viewRow.reviewed_by_name || viewRow.reviewed_by_email },
      { label: "Reviewed", value: viewRow.reviewed_at },
      { label: "Review note", value: viewRow.review_note },
      { label: "Proposed data", value: viewRow.payload },
      { label: "Previous data", value: viewRow.previous },
    ];
  }, [viewRow]);

  if (user?.role === "pastor") return <Navigate to="/admin/prayer" replace />;
  if (!mine && !canInbox) return <Navigate to="/admin/approvals/mine" replace />;

  const comments = Array.isArray(viewRow?.comments) ? viewRow.comments : [];
  const canComment = Boolean(viewRow) && (canReview || (mine && viewRow.status === "pending") || viewRow.requested_by === user?.id);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Approvals</p>
      <h1 className="text-3xl font-bold mt-2">{mine ? "My requests" : "Approval inbox"}</h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        {mine
          ? "Track every change you submitted, read reviewer feedback, add a note, or withdraw a pending request."
          : "Review changes submitted by other admins. Approve to apply them, reject with a note, or reply with feedback."}
      </p>

      <PageToolbar
        left={APPROVAL_FEATURES.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="sm"
            variant={feature === f.id ? "default" : "outline"}
            className={feature === f.id ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => goFeature(f.id)}
          >
            {f.label}
          </Button>
        ))}
        right={(
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected", "cancelled"].map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={status === s ? "default" : "outline"}
                className={status === s ? "bg-gray-900" : ""}
                onClick={() => setParams({ status: s })}
              >
                {s}
              </Button>
            ))}
          </div>
        )}
      />

      {!mine && canReview && status === "pending" ? (
        <div className="mt-4 max-w-xl">
          <p className="text-xs text-gray-500 mb-1">Optional note for approve / reject</p>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Review note…" />
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="text-left text-[11px] uppercase tracking-widest text-gray-400 border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">{mine ? "Submitted" : "By"}</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Feedback</th>
              <th className="px-4 py-3 w-44" />
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => {
              const progress = row.progress || row.status;
              const commentCount = Array.isArray(row.comments) ? row.comments.length : 0;
              return (
                <tr key={row.id} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <span className="capitalize">{row.action}</span> · {row.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{featureLabel(row.feature)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {mine
                      ? (row.created_at ? new Date(row.created_at).toLocaleString("en-GB") : "—")
                      : (row.requested_by_name || row.requested_by_email || "—")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${statusTone[progress] || statusTone.pending} hover:bg-inherit`}>
                      {progressLabel[progress] || row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.review_note
                      ? row.review_note
                      : commentCount
                        ? `${commentCount} note${commentCount === 1 ? "" : "s"}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setViewRow(row); setComment(""); }}>
                        View
                      </Button>
                      {mine && row.status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-gray-600" onClick={() => withdraw(row.id)}>
                          Withdraw
                        </Button>
                      )}
                      {!mine && canReview && row.status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" className="text-green-700" title="Approve" onClick={() => review(row.id, "approved")}>
                            <Check size={16} />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600" title="Reject" onClick={() => review(row.id, "rejected")}>
                            <X size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {paged.total === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  {mine ? "You have no requests in this list." : "No requests in this list."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination {...paged} onPageChange={paged.setPage} />
      </div>

      <RecordViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(o) => { if (!o) setViewRow(null); }}
        title={mine ? "Your request" : "Change request"}
        fields={viewFields}
        footer={(
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">Conversation</p>
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500">No feedback yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <p className="text-[11px] text-gray-400">
                        {c.author_name || "Admin"} · {c.created_at ? new Date(c.created_at).toLocaleString("en-GB") : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canComment && viewRow?.status === "pending" ? (
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={mine ? "Ask a question or add context…" : "Send feedback to the requester…"}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setViewRow(null)}>Close</Button>
                  <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={() => sendComment(viewRow.id)}>
                    Send feedback
                  </Button>
                  {!mine && canReview ? (
                    <>
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => review(viewRow.id, "approved")}
                      >
                        <Check size={14} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => review(viewRow.id, "rejected")}
                      >
                        <X size={14} className="mr-1" />
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {mine ? (
                    <Button type="button" variant="outline" onClick={() => withdraw(viewRow.id)}>
                      Withdraw
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setViewRow(null)}>Close</Button>
                {!mine && canReview && viewRow?.status === "pending" ? (
                  <>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => review(viewRow.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => review(viewRow.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}
      />
      {confirmDialog}
    </div>
  );
}
