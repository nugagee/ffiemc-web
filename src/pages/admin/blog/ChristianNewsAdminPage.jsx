import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EyeOff, Eye, Newspaper, RefreshCw } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authApi, formatApiError } from "../../../lib/api";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function decodeEntities(text = "") {
  const raw = String(text || "");
  if (!raw) return "";
  try {
    if (typeof document !== "undefined") {
      const el = document.createElement("textarea");
      el.innerHTML = raw;
      return el.value;
    }
  } catch {
    /* fall through */
  }
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

export default function ChristianNewsAdminPage() {
  const { can } = useAuth();
  const canEdit = can("blog.posts", "edit");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [category, setCategory] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await authApi.listNewsArticles(category === "all" ? null : category, 150);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const toggleHidden = async (row) => {
    try {
      await authApi.setNewsArticleHidden(row.id, !row.hidden);
      toast.success(row.hidden ? "Shown on Blog" : "Hidden from Blog");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message) || "Update failed");
    }
  };

  const fetchNow = async () => {
    const url = process.env.REACT_APP_NEWS_FETCH_URL;
    const secret = process.env.REACT_APP_NEWS_CRON_SECRET;
    if (!url) {
      toast.error("Set REACT_APP_NEWS_FETCH_URL to your fetch-christian-news function URL");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(secret ? `${url}?secret=${encodeURIComponent(secret)}` : url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-cron-secret": secret } : {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Fetch failed (${res.status})`);
      toast.success(`Fetched ${body.fetched || 0} headlines`);
      await load();
    } catch (err) {
      toast.error(err?.message || "Fetch failed — see supabase/NEWS.md");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      <PageToolbar
        className="mb-6"
        align="start"
        left={(
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Christian News</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Aggregated headlines from Christianity Today (Nigeria), Christian outlets, and Nigerian education news.
              Visitors open the original publisher — we only store titles and short summaries.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Public:{" "}
              <a href="/blog?tab=christian-news" className="text-red-600 hover:underline">
                /blog?tab=christian-news
              </a>
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button onClick={fetchNow} disabled={fetching} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Fetching…" : "Fetch now"}
          </Button>
        ) : null}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { id: "all", label: "All" },
          { id: "nigeria", label: "Nigeria" },
          { id: "christian", label: "Christian" },
          { id: "education", label: "Education" },
        ].map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={category === c.id ? "default" : "outline"}
            className={category === c.id ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          <Newspaper className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          No headlines yet. Deploy <code className="text-xs">fetch-christian-news</code> and click Fetch now
          (see <code className="text-xs">supabase/NEWS.md</code>).
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-4 flex flex-wrap items-start gap-4 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline">{row.category}</Badge>
                  {row.hidden ? <Badge className="bg-gray-200 text-gray-700">Hidden</Badge> : null}
                  <span className="text-xs text-gray-400">{row.source_name}</span>
                </div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 hover:text-red-700"
                >
                  {decodeEntities(row.title)}
                </a>
                {row.excerpt ? (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{decodeEntities(row.excerpt)}</p>
                ) : null}
                <p className="text-xs text-gray-400 mt-2">
                  Published {fmtDate(row.published_at)} · Fetched {fmtDate(row.fetched_at)}
                </p>
              </div>
              {canEdit ? (
                <Button size="sm" variant="outline" onClick={() => toggleHidden(row)}>
                  {row.hidden ? (
                    <>
                      <Eye className="h-4 w-4 mr-1.5" /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-1.5" /> Hide
                    </>
                  )}
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
