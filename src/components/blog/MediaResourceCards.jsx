import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Play, X } from "lucide-react";
import { mediaPlatforms } from "../../lib/mediaEmbeds";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export function MediaWatchDialog({ item, open, onClose, initialPlatform }) {
  const platforms = useMemo(() => mediaPlatforms(item || {}), [item]);
  const [activeId, setActiveId] = useState(initialPlatform || platforms[0]?.id || "");

  useEffect(() => {
    if (!open) return undefined;
    setActiveId(initialPlatform || platforms[0]?.id || "");
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initialPlatform, platforms, onClose]);

  if (!open || !item) return null;

  const active = platforms.find((p) => p.id === activeId) || platforms[0];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Watch ${item.title}`}
    >
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-zinc-950 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-zinc-950/95 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-red-300 font-semibold">Watch on site</p>
            <h3 className="font-semibold text-lg truncate">{item.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 transition-colors"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {platforms.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                    active?.id === p.id
                      ? "bg-red-600 border-red-500 text-white"
                      : "border-white/15 text-zinc-300 hover:border-white/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-video">
            {active?.embed ? (
              <iframe
                key={active.embed}
                title={`${item.title} — ${active.label}`}
                src={active.embed}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400 p-6 text-center">
                <p>In-page preview isn’t available for this link.</p>
                {active?.url && (
                  <Button asChild className="bg-red-600 hover:bg-red-700">
                    <a href={active.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Open on {active.label}
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Button key={p.id} asChild size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <a href={p.url} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> {p.label}
                </a>
              </Button>
            ))}
            {item.attachment_url ? (
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-zinc-950">
                <a href={item.attachment_url} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Download file
                </a>
              </Button>
            ) : null}
          </div>

          {item.excerpt ? <p className="text-sm text-zinc-400 leading-relaxed">{item.excerpt}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function MediaResourceCards({ items = [], badge = "Service" }) {
  const [watching, setWatching] = useState(null);
  const [platform, setPlatform] = useState("");

  if (!items.length) {
    return <p className="text-center text-gray-500 py-10">No videos published yet. Check back after the next service.</p>;
  }

  const openWatch = (item, platformId = "") => {
    setWatching(item);
    setPlatform(platformId);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => {
          const platforms = mediaPlatforms(item);
          const thumb = item.thumbnail_url || "";
          const dateLabel = item.service_date
            ? new Date(item.service_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "";
          return (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <button
                type="button"
                onClick={() => openWatch(item, platforms[0]?.id)}
                className="relative block w-full aspect-video bg-gradient-to-br from-zinc-900 via-red-950 to-zinc-900 overflow-hidden text-left"
              >
                {thumb ? (
                  <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.45),transparent_55%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 fill-current ml-0.5" />
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <Badge className="bg-white/15 text-white border-0 backdrop-blur">{badge}</Badge>
                  {dateLabel ? <span className="text-xs text-white/80">{dateLabel}</span> : null}
                </div>
              </button>
              <div className="p-5 space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 leading-snug line-clamp-2">{item.title}</h3>
                {item.excerpt ? <p className="text-sm text-gray-500 line-clamp-2">{item.excerpt}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => openWatch(item)}>
                    <Play className="h-4 w-4 mr-1.5" /> Watch here
                  </Button>
                  {platforms.map((p) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant="outline"
                      onClick={() => openWatch(item, p.id)}
                    >
                      {p.label}
                    </Button>
                  ))}
                  {item.attachment_url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={item.attachment_url} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4 mr-1.5" /> File
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <MediaWatchDialog
        item={watching}
        open={Boolean(watching)}
        initialPlatform={platform}
        onClose={() => setWatching(null)}
      />
    </>
  );
}
