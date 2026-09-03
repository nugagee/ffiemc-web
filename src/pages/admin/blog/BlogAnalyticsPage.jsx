import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, Clock, Eye, Smile, Users } from "lucide-react";
import { authApi, formatApiError } from "../../../lib/api";
import { BLOG_REACTIONS, formatReadTime, reactionMeta } from "../../../lib/blogAnalytics";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function BlogAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const slugFilter = params.get("slug") || "";
  const [data, setData] = useState({ posts: [], events: [], visitors: [] });
  const [loading, setLoading] = useState(true);

  const load = async (slug) => {
    setLoading(true);
    try {
      const report = await authApi.blogAnalytics(slug || null);
      setData({
        posts: report?.posts || [],
        events: report?.events || [],
        visitors: report?.visitors || [],
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
        seconds: acc.seconds + (row.avg_seconds || 0),
        n: acc.n + 1,
      }),
      { views: 0, visitors: 0, reactions: 0, seconds: 0, n: 0 }
    );
  }, [data.posts]);

  const selectSlug = (slug) => {
    const next = new URLSearchParams(params);
    if (!slug || slug === slugFilter) next.delete("slug");
    else next.set("slug", slug);
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Blog</p>
        <h1 className="text-3xl font-bold mt-2">Article analytics</h1>
        <p className="text-sm text-gray-500 mt-2">
          Views, time spent reading, scroll depth, and emoji reactions from visitors. Identifiers are anonymous.
        </p>
      </div>

      <PageToolbar
        left={(
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/blog">All articles</Link>
          </Button>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Views", value: totals.views, icon: Eye },
          { label: "Unique readers", value: totals.visitors, icon: Users },
          { label: "Reactions", value: totals.reactions, icon: Smile },
          { label: "Avg. read (selected)", value: formatReadTime(slugFilter ? (data.posts.find((p) => p.slug === slugFilter)?.avg_seconds || 0) : Math.round(totals.seconds / Math.max(totals.n, 1))), icon: Clock },
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
                <p className="text-xs text-gray-400 mt-1">{post.unique_visitors || 0} readers · {formatReadTime(post.avg_seconds)} avg</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                  <span>Views {post.views || 0}</span>
                  <span>Finished {post.completed || 0}</span>
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
              </Card>
            ))}
            {!data.posts.length && (
              <p className="text-sm text-gray-500">No article stats yet. They appear after readers open a post.</p>
            )}
          </div>

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
                    {["Visitor", "Last article", "Views", "Time on page", "Scroll", "Reaction", "Device", "Last seen"].map((h) => (
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
