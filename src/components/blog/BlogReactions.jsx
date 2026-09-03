import { useEffect, useState } from "react";
import { BLOG_REACTIONS } from "../../lib/blogAnalytics";
import { fetchBlogEngagement, trackBlogEvent } from "../../lib/blogTrack";
import { postAnalyticsKey } from "../../lib/blogAnalytics";

export function BlogReactions({ post }) {
  const slug = postAnalyticsKey(post);
  const [counts, setCounts] = useState({});
  const [mine, setMine] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return undefined;
    let active = true;
    fetchBlogEngagement(slug).then((data) => {
      if (!active) return;
      setCounts(data.counts || {});
      setMine(data.mine || "");
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const onReact = async (id) => {
    if (busy) return;
    setBusy(true);
    const next = mine === id ? "" : id;
    const prevMine = mine;
    const prevCounts = counts;
    setMine(next);
    setCounts((cur) => {
      const copy = { ...cur };
      if (prevMine) copy[prevMine] = Math.max(0, (copy[prevMine] || 1) - 1);
      if (next) copy[next] = (copy[next] || 0) + 1;
      return copy;
    });
    try {
      await trackBlogEvent(post, "react", { reaction: next, slug });
      const fresh = await fetchBlogEngagement(slug);
      setCounts(fresh.counts || {});
      setMine(fresh.mine || "");
    } catch {
      setMine(prevMine);
      setCounts(prevCounts);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-200" data-testid="blog-reactions">
      <p className="text-sm font-semibold text-gray-800 mb-1">How did this bless you?</p>
      <p className="text-sm text-gray-500 mb-4">Tap a reaction — your pastors can see the feedback (not your name).</p>
      <div className="flex flex-wrap gap-2">
        {BLOG_REACTIONS.map((item) => {
          const selected = mine === item.id;
          const n = counts[item.id] || 0;
          return (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              onClick={() => onReact(item.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all ${
                selected
                  ? "border-red-500 bg-red-50 text-red-800 shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50/50"
              }`}
            >
              <span className="text-lg leading-none">{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
              {n > 0 && <span className="text-xs text-gray-500 tabular-nums">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
