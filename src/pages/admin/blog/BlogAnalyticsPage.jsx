import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, Clock, Eye, MessageSquare, Share2, Smile, Users } from "lucide-react";
import { authApi, formatApiError } from "../../../lib/api";
import {
  BLOG_REACTIONS,
  BLOG_SHARE_CHANNELS,
  formatReadTime,
  reactionMeta,
  shareChannelLabel,
} from "../../../lib/blogAnalytics";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function BlogAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const slugFilter = params.get("slug") || "";
  const [data, setData] = useState({
    posts: [],
    events: [],
    visitors: [],
    shares: [],
    share_totals: {},
    comment_counts: {},
  });
  const [loading, setLoading] = useState(true);

  const load = async (slug) => {
    setLoading(true);
    try {
      const report = await authApi.blogAnalytics(slug || null);
      setData({
        posts: report?.posts || [],
        events: report?.events || [],
        visitors: report?.visitors || [],
        shares: report?.shares || [],
        share_totals: report?.share_totals || {},
        comment_counts: report?.comment_counts || {},
      });
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load blog analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(slugFilter);
  }, [slugFilter]);

  const totals = useMemo(() => {
    return (data.posts || []).reduce(
      (acc, row) => ({
        views: acc.views + (row.views || 0),
        visitors: acc.visitors + (row.unique_visitors || 0),
        reactions: acc.reactions + (row.reactions || 0),
        shares: acc.shares + (row.shares || 0),
        seconds: acc.seconds + (row.avg_seconds || 0),
        n: acc.n + 1,
      }),
      { views: 0, visitors: 0, reactions: 0, shares: 0, seconds: 0, n: 0 }
    );
  }, [data.posts]);

  const selectSlug = (slug) => {
    const next = new URLSearchParams(params);
    if (!slug || slug === slugFilter) next.delete("slug");
    else next.set("slug", slug);
    setParams(next);
  };

  const shareTotalCount = Object.values(data.share_totals || {}).reduce((a, b) => a + Number(b || 0), 0);
  const commentsPending = data.comment_counts?.pending || 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Blog</p>
        <h1 className="text-3xl font-bold mt-2">Article analytics</h1>
        <p className="text-sm text-gray-500 mt-2">
          Views, reading time, reactions, social shares, and comment activity. Identifiers are anonymous.
        </p>
      </div>

      <PageToolbar
        left={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/blog">All articles</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/blog/comments${slugFilter ? `?slug=${encodeURIComponent(slugFilter)}` : ""}`}>
                Comments{commentsPending ? ` (${commentsPending} pending)` : ""}
              </Link>
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Views", value: totals.views, icon: Eye },
          { label: "Unique readers", value: totals.visitors, icon: Users },
          { label: "Reactions", value: totals.reactions, icon: Smile },
          { label: "Shares", value: slugFilter ? (data.posts.find((p) => p.slug === slugFilter)?.shares || 0) : totals.shares || shareTotalCount, icon: Share2 },
          { label: "Comments", value: data.comment_counts?.total || 0, icon: MessageSquare },
          {
            label: "Avg. read",
            value: formatReadTime(
              slugFilter
                ? data.posts.find((p) => p.slug === slugFilter)?.avg_seconds || 0
                : Math.round(totals.seconds / Math.max(totals.n, 1))
            ),
            icon: Clock,
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold mt-2">{stat.value}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading analytics…</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.posts.map((post) => (
              <Card
                key={post.slug}
                className={`p-4 cursor-pointer ${slugFilter === post.slug ? "ring-2 ring-red-500" : ""}`}
                onClick={() => selectSlug(post.slug)}
              >
                <p className="font-semibold text-gray-900 line-clamp-2">{post.title || post.slug}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {post.unique_visitors || 0} readers · {formatReadTime(post.avg_seconds)} avg
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                  <span>Views {post.views || 0}</span>
                  <span>Finished {post.completed || 0}</span>
                  <span>Shares {post.shares || 0}</span>
                  <span>Comments {post.comments_total || 0}</span>
                  <span>Scroll {post.avg_scroll || 0}%</span>
                  <span>Reactions {post.reactions || 0}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {BLOG_REACTIONS.map((r) => (
                    <span key={r.id} className="text-xs bg-gray-50 rounded-full px-2 py-0.5">
                      {r.emoji} {post[r.id] || 0}
                    </span>
                  ))}
                </div>
                {(post.comments_pending || 0) > 0 && (
                  <Link
                    to={`/admin/blog/comments?status=pending&slug=${encodeURIComponent(post.slug)}`}
                    className="inline-block mt-3 text-xs text-amber-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.comments_pending} pending comments
                  </Link>
                )}
              </Card>
            ))}
            {!data.posts.length && (
              <p className="text-sm text-gray-500">No article stats yet. They appear after readers open a post.</p>
            )}
          </div>

          <Card className="p-5">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Share2 className="h-4 w-4 text-red-600" /> Share channels
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              How readers shared {slugFilter ? "this article" : "all articles"}.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {BLOG_SHARE_CHANNELS.map((ch) => (
                <span key={ch.id} className="text-sm bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                  {ch.label}: <strong>{data.share_totals?.[ch.id] || 0}</strong>
                </span>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-400">
                  <tr>
                    {["Time", "Article", "Channel", "Visitor", "Device"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.shares.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {row.created_at ? new Date(row.created_at).toLocaleString("en-GB") : "—"}
                      </td>
                      <td className="px-3 py-2">{row.post_title || row.post_slug}</td>
                      <td className="px-3 py-2">{shareChannelLabel(row.share_channel)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{String(row.visitor_id || "").slice(0, 10)}</td>
                      <td className="px-3 py-2">{[row.device_type, row.browser].filter(Boolean).join(" / ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.shares.length && <p className="p-4 text-center text-gray-500">No shares recorded yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-4 w-4 text-red-600" /> Visitor feedback
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Each row is an anonymous visitor on {slugFilter ? "this article" : "all articles"}.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-400">
                  <tr>
                    {["Visitor", "Last article", "Views", "Shares", "Time on page", "Scroll", "Reaction", "Device", "Last seen"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.visitors.map((row) => (
                    <tr key={row.visitor_id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{String(row.visitor_id || "").slice(0, 10)}</td>
                      <td className="px-3 py-2">{row.last_title || "—"}</td>
                      <td className="px-3 py-2">{row.views || 0}</td>
                      <td className="px-3 py-2">
                        {row.shares || 0}
                        {row.share_channels ? (
                          <span className="block text-xs text-gray-400">{row.share_channels}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{formatReadTime(row.max_seconds)}</td>
                      <td className="px-3 py-2">{row.max_scroll || 0}%</td>
                      <td className="px-3 py-2">
                        {(row.reactions || "")
                          .split(",")
                          .map((id) => id.trim())
                          .filter(Boolean)
                          .map((id) => `${reactionMeta(id).emoji} ${reactionMeta(id).label}`)
                          .join(" · ") || "—"}
                      </td>
                      <td className="px-3 py-2">{[row.device_type, row.browser, row.os].filter(Boolean).join(" / ")}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {row.last_seen ? new Date(row.last_seen).toLocaleString("en-GB") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.visitors.length && <p className="p-4 text-center text-gray-500">No visitor rows yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-red-600" /> Activity log
            </h2>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-400">
                  <tr>
                    {["Time", "Article", "Action", "Visitor", "Time spent", "Scroll", "Device"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {row.created_at ? new Date(row.created_at).toLocaleString("en-GB") : "—"}
                      </td>
                      <td className="px-3 py-2">{row.post_title || row.post_slug}</td>
                      <td className="px-3 py-2">
                        {row.action === "react"
                          ? `${reactionMeta(row.reaction).emoji} ${reactionMeta(row.reaction).label}`
                          : row.action === "share"
                            ? `Share · ${shareChannelLabel(row.share_channel)}`
                            : row.action}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{String(row.visitor_id || "").slice(0, 10)}</td>
                      <td className="px-3 py-2">{row.duration_seconds ? formatReadTime(row.duration_seconds) : "—"}</td>
                      <td className="px-3 py-2">{row.scroll_percent ? `${row.scroll_percent}%` : "—"}</td>
                      <td className="px-3 py-2">{[row.device_type, row.browser].filter(Boolean).join(" / ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.events.length && <p className="p-4 text-center text-gray-500">No events yet.</p>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
