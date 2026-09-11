import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Facebook, Flame, Radio, WifiOff } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import {
  facebookPagePluginSrc,
  getFacebookLiveConfig,
  resolveLiveEmbedSrc,
} from "../../data/facebookLive";
import { useFacebookLiveAnalytics } from "../../hooks/useFacebookLiveAnalytics";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

function LivePulse() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}

export function FacebookLiveSection() {
  const { settings, refresh } = useSettings();
  const [ready, setReady] = useState(false);
  const sectionRef = useRef(null);
  const config = useMemo(() => getFacebookLiveConfig(settings), [settings]);
  const pageUrl =
    settings?.socials?.facebook || "https://www.facebook.com/firefireministry";
  const embedSrc = useMemo(
    () => resolveLiveEmbedSrc(config, pageUrl),
    [config, pageUrl]
  );
  const pagePluginSrc = useMemo(() => facebookPagePluginSrc(pageUrl), [pageUrl]);
  const isLive = Boolean(config.isLive);

  const { trackAction } = useFacebookLiveAnalytics({
    enabled: config.enabled,
    wasLive: isLive,
    sectionRef,
  });

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!config.enabled) return undefined;
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [config.enabled, refresh]);

  if (!config.enabled) return null;

  return (
    <section
      ref={sectionRef}
      id="watch-live"
      className="relative scroll-mt-24 py-12 sm:py-16 overflow-hidden bg-gradient-to-b from-zinc-950 via-red-950/90 to-zinc-950 text-white"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <Badge className="bg-red-600 text-white border-0 gap-2 px-3 py-1">
                  <LivePulse />
                  LIVE NOW
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/90 border-0 gap-2 px-3 py-1">
                  <Radio className="h-3.5 w-3.5" />
                  Facebook Live
                </Badge>
              )}
              <Badge className="bg-white/10 text-white/80 border-0">
                <Facebook className="h-3.5 w-3.5 mr-1.5" />
                Fire-Fire Ministry
              </Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              {isLive ? config.title || "We are live" : "Watch with us"}
            </h2>
            <p className="text-white/70 max-w-2xl text-sm sm:text-base leading-relaxed">
              {isLive
                ? "Join the live broadcast from our Facebook page — worship, Word, and fellowship streaming now."
                : config.idleBody}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 border-white/30 bg-white/5 text-white hover:bg-white hover:text-red-700"
          >
            <a
              href={pageUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackAction("open_facebook", { source: "header_cta" })}
            >
              {config.ctaLabel}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-6 lg:gap-8 items-stretch">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl shadow-red-950/40 min-h-[240px] sm:min-h-[360px] lg:min-h-[420px]">
            {!ready ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
                <div className="h-10 w-10 rounded-full border-2 border-red-500/40 border-t-red-500 animate-spin" />
                <p className="text-sm text-white/60">Loading stream…</p>
              </div>
            ) : isLive && embedSrc ? (
              <iframe
                title="Fire-Fire Facebook Live"
                src={embedSrc}
                className="absolute inset-0 w-full h-full"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : isLive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-5 bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950">
                <div className="flex items-center gap-2 text-red-300 font-semibold tracking-wide">
                  <LivePulse />
                  BROADCASTING ON FACEBOOK
                </div>
                <Flame className="h-14 w-14 text-red-500" />
                <p className="text-white/80 max-w-md text-sm sm:text-base">
                  The live stream is on our Facebook page. Open it to watch instantly — or paste the live video link in Admin so it plays here.
                </p>
                <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                  <a
                    href={pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackAction("watch_cta", { source: "live_fallback" })}
                  >
                    Watch live on Facebook
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-zinc-900 via-red-950/50 to-zinc-950">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    <WifiOff className="h-6 w-6 text-white/50" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">Offline</span>
                </div>
                <div className="space-y-3 max-w-lg">
                  <h3 className="text-2xl sm:text-3xl font-semibold">{config.idleHeading}</h3>
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                    Come back during Sunday service and special programmes — or follow the page so you never miss a broadcast.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(settings.serviceTimes || []).slice(0, 3).map((service, i) => (
                      <span
                        key={service.id || i}
                        className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
                      >
                        {service.name}: {service.day} {service.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white shadow-xl min-h-[320px] sm:min-h-[420px]">
            {!ready ? (
              <div className="h-full min-h-[320px] flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
                Loading Facebook feed…
              </div>
            ) : (
              <iframe
                title="Fire-Fire Facebook page"
                src={pagePluginSrc}
                className="w-full h-full min-h-[420px]"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                frameBorder="0"
                allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FacebookLiveSection;
