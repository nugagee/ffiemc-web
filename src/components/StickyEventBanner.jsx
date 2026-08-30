import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveAnnouncements } from "../hooks/useActiveAnnouncements";
import { trackBannerEvent } from "../lib/bannerTrack";

function tickerText(item) {
  const title = (item.title || "").trim();
  const body = (item.body || "").replace(/\s+/g, " ").trim();
  if (title && body) return `${title}  ·  ${body}`;
  return title || body || "";
}

function contrastText(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#111827" : "#ffffff";
}

export function StickyEventBanner() {
  const items = useActiveAnnouncements("sticky");
  const barRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = items[index] || items[0] || null;
  const rotateMs = Math.max(4, Number(current?.rotate_seconds) || 12) * 1000;

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 320);
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [items.length, rotateMs, current?.id]);

  useEffect(() => {
    if (current?.id) trackBannerEvent(current.id, "sticky_view");
  }, [current?.id]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const h = barRef.current?.offsetHeight || 0;
      root.style.setProperty("--ffiemc-banner-h", `${h}px`);
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    if (barRef.current && ro) ro.observe(barRef.current);
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [current]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty("--ffiemc-banner-h", "0px");
    };
  }, []);

  const text = useMemo(() => (current ? tickerText(current) : ""), [current]);
  if (!current || !text) return null;

  const link = current.route_enabled !== false ? (current.link_url || "").trim() : "";
  const isInternal = link.startsWith("/");
  const label = current.link_text || "Open";
  const bg = current.accent_color || "#b91c1c";
  const btn = current.button_color || "#fbbf24";
  const fg = contrastText(bg);
  const btnFg = contrastText(btn);

  const onClick = () => trackBannerEvent(current.id, "sticky_click");

  const inner = (
    <div
      className="relative z-[60] overflow-hidden transition-opacity duration-300"
      style={{ background: bg, color: fg, opacity: visible ? 1 : 0 }}
    >
      <div className="ffiemc-sticky-shimmer pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex items-center gap-2 sm:gap-3 h-10 sm:h-11 px-2 sm:px-4">
        <span
          className="shrink-0 inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] sm:text-xs font-semibold tracking-[0.14em] uppercase"
          style={{ background: "rgba(0,0,0,0.22)" }}
        >
          <span className="ffiemc-live-dot h-1.5 w-1.5 rounded-full bg-amber-300" />
          Live
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div key={current.id} className="ffiemc-marquee-track">
            <span className="ffiemc-marquee-item">{text}</span>
            <span className="ffiemc-marquee-item" aria-hidden>
              {text}
            </span>
          </div>
        </div>
        {link ? (
          <span
            className="shrink-0 hidden sm:inline text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm"
            style={{ background: btn, color: btnFg }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <div ref={barRef} className="fixed top-0 inset-x-0 z-[60]">
      {!link ? (
        inner
      ) : isInternal ? (
        <Link to={link} className="block focus:outline-none" onClick={onClick}>
          {inner}
        </Link>
      ) : (
        <a href={link} target="_blank" rel="noreferrer" className="block focus:outline-none" onClick={onClick}>
          {inner}
        </a>
      )}
    </div>
  );
}

export default StickyEventBanner;
