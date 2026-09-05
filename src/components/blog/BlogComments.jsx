import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { fetchBlogComments, submitBlogComment } from "../../lib/blogTrack";
import { postAnalyticsKey } from "../../lib/blogAnalytics";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

const PAGE_SIZE = 10;

function fmtWhen(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function BlogComments({ post }) {
  const slug = postAnalyticsKey(post);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", body: "" });

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const rows = await fetchBlogComments(slug);
      setComments(rows);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const pageCount = Math.max(1, Math.ceil(comments.length / PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return comments.slice(start, start + PAGE_SIZE);
  }, [comments, safePage]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await submitBlogComment(post, {
        body: form.body,
        authorName: form.authorName,
        authorEmail: form.authorEmail,
        isAnonymous,
      });
      toast.success(result?.message || "Comment submitted for review");
      setForm({ authorName: "", authorEmail: "", body: "" });
      setIsAnonymous(false);
    } catch (err) {
      toast.error(err?.message || "Could not submit comment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-200" data-testid="blog-comments">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
        {comments.length > 0 && (
          <span className="text-sm text-gray-400">({comments.length})</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Share a reflection. Comments are reviewed before they appear publicly. You may post anonymously.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 mb-10 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="blog-comment-anon"
            checked={isAnonymous}
            onCheckedChange={(v) => setIsAnonymous(Boolean(v))}
          />
          <Label htmlFor="blog-comment-anon" className="text-sm font-medium cursor-pointer">
            Comment anonymously
          </Label>
        </div>

        {!isAnonymous && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="blog-comment-name">Name</Label>
              <Input
                id="blog-comment-name"
                value={form.authorName}
                onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                placeholder="Your name"
                maxLength={120}
                required={!isAnonymous}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blog-comment-email">Email (optional)</Label>
              <Input
                id="blog-comment-email"
                type="email"
                value={form.authorEmail}
                onChange={(e) => setForm((f) => ({ ...f, authorEmail: e.target.value }))}
                placeholder="you@example.com"
                maxLength={160}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="blog-comment-body">Your comment</Label>
          <Textarea
            id="blog-comment-body"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Write your comment…"
            rows={4}
            maxLength={2000}
            required
          />
          <p className="text-xs text-gray-400 text-right">{form.body.length}/2000</p>
        </div>

        <Button type="submit" disabled={busy} className="bg-red-600 hover:bg-red-700">
          {busy ? "Sending…" : "Post comment"}
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet. Be the first to share.</p>
      ) : (
        <div>
          <ol className="space-y-5 list-none" start={(safePage - 1) * PAGE_SIZE + 1}>
            {pageRows.map((c, index) => {
              const number = (safePage - 1) * PAGE_SIZE + index + 1;
              return (
                <li key={c.id} className="border-b border-gray-100 pb-5 last:border-0">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <p className="font-medium text-gray-900">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] text-sm text-red-600 tabular-nums mr-2">
                        {number}.
                      </span>
                      {c.is_anonymous || !c.author_name ? "Anonymous" : c.author_name}
                    </p>
                    <time className="text-xs text-gray-400 whitespace-nowrap">{fmtWhen(c.created_at)}</time>
                  </div>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed pl-9">{c.body}</p>
                </li>
              );
            })}
          </ol>

          {comments.length > PAGE_SIZE && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <p>
                Showing{" "}
                <span className="font-medium text-gray-900">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, comments.length)}
                </span>{" "}
                of <span className="font-medium text-gray-900">{comments.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="tabular-nums text-gray-500">
                  {safePage} / {pageCount}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
