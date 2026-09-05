import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import { authApi, formatApiError } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { useConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { TablePagination, usePagedRows } from "../../../components/admin/TablePagination";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const statusTone = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function BlogCommentsPage() {
  const { can, isSuperadmin } = useAuth();
  const canDelete = isSuperadmin || can("blog.posts", "delete");
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "pending";
  const slugFilter = params.get("slug") || "";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const paged = usePagedRows(rows);

  const load = async () => {
    setLoading(true);
    try {
      const list = await authApi.listBlogComments(
        status === "all" ? null : status,
        slugFilter || null
      );
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, slugFilter]);

  const counts = useMemo(() => ({
    current: rows.length,
  }), [rows]);

  const setStatus = (id) => {
    const next = new URLSearchParams(params);
    if (id === "pending") next.delete("status");
    else next.set("status", id);
    setParams(next);
  };

  const moderate = async (row, nextStatus) => {
    const isApprove = nextStatus === "approved";
    const ok = await confirm({
      title: isApprove ? "Approve this comment?" : "Reject this comment?",
      description: isApprove
        ? "It will appear publicly under the article."
        : "It will stay hidden from the public site.",
      confirmLabel: isApprove ? "Approve" : "Reject",
      variant: isApprove ? "success" : "danger",
    });
    if (!ok) return;
    try {
      await authApi.moderateBlogComment(row.id, nextStatus);
      toast.success(isApprove ? "Comment approved" : "Comment rejected");
      load();
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: "Delete this comment?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await authApi.deleteBlogComment(row.id);
      toast.success("Comment deleted");
      load();
    } catch (err) {
      toast.error(formatApiError(err.message));
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Blog</p>
        <h1 className="text-3xl font-bold mt-2">Comments</h1>
        <p className="text-sm text-gray-500 mt-2">
          Review reader comments before they go live. Anonymous posts hide the author’s name.
        </p>
      </div>

      <PageToolbar
        left={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/blog/analytics">Analytics</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/blog">All articles</Link>
            </Button>
          </div>
        )}
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={`rounded-full px-3 py-1.5 text-sm border ${
              status === tab.id
                ? "border-red-500 bg-red-50 text-red-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {status === tab.id ? (
              <span className="ml-1.5 text-xs text-gray-400">{counts.current}</span>
            ) : null}
          </button>
        ))}
      </div>

      {slugFilter && (
        <p className="text-sm text-gray-500">
          Filtered to article <span className="font-mono">{slugFilter}</span>{" "}
          <button type="button" className="text-red-600 underline" onClick={() => {
            const next = new URLSearchParams(params);
            next.delete("slug");
            setParams(next);
          }}>
            Clear
          </button>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading comments…</p>
      ) : (
        <div className="space-y-3">
          {paged.rows.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={statusTone[row.status] || "bg-gray-100"}>{row.status}</Badge>
                    {row.is_anonymous && <Badge className="bg-gray-100 text-gray-700">Anonymous</Badge>}
                    <span className="text-xs text-gray-400">
                      {row.created_at ? new Date(row.created_at).toLocaleString("en-GB") : ""}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {row.is_anonymous ? "Anonymous" : row.author_name || "—"}
                    {!row.is_anonymous && row.author_email ? (
                      <span className="text-sm font-normal text-gray-500"> · {row.author_email}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.post_title || row.post_slug}
                    {row.post_slug ? (
                      <>
                        {" · "}
                        <Link className="text-red-600 hover:underline" to={`/admin/blog/analytics?slug=${encodeURIComponent(row.post_slug)}`}>
                          Stats
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-3 text-gray-800 whitespace-pre-line leading-relaxed">{row.body}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {[row.device_type, row.browser, row.os].filter(Boolean).join(" / ") || "—"}
                    {row.visitor_id ? ` · ${String(row.visitor_id).slice(0, 10)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status !== "approved" && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => moderate(row, "approved")}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  )}
                  {row.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => moderate(row, "rejected")}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(row)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {!rows.length && (
            <Card className="p-8 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No comments in this view yet.
            </Card>
          )}
          <TablePagination {...paged} onPageChange={paged.setPage} />
        </div>
      )}
    </div>
  );
}
