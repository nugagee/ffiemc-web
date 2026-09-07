import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Church, Mic2, Play, Sun } from "lucide-react";
import { useChurchResources } from "../../hooks/useChurchResources";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { mediaPlatforms, resourceMediaDate } from "../../lib/mediaEmbeds";

function fmtShort(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function rememberBlogTab(tab) {
  try {
    sessionStorage.setItem("ffiemc_blog_tab", tab);
  } catch {
    /* ignore */
  }
}

function blogLinkProps(tab) {
  return {
    to: "/blog",
    state: { blogTab: tab },
    onClick: () => rememberBlogTab(tab),
  };
}

function MediaSpotlight({ item, tab, label, icon: Icon, emptyHint }) {
  if (!item) {
    return (
      <div className="relative overflow-hidden rounded-[1.75rem] min-h-[280px] sm:min-h-[320px] bg-gradient-to-br from-zinc-900 via-red-950 to-zinc-900 text-white flex flex-col justify-end p-6 sm:p-8">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_15%,rgba(220,38,38,0.55),transparent_50%)]" />
        <div className="relative">
          <Badge className="bg-white/15 text-white border-0 mb-3">{label}</Badge>
          <p className="text-white/70 text-sm">{emptyHint}</p>
        </div>
      </div>
    );
  }

  const platforms = mediaPlatforms(item);
  const date = fmtShort(resourceMediaDate(item));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Link
        {...blogLinkProps(tab)}
        className="group relative block overflow-hidden rounded-[1.75rem] min-h-[280px] sm:min-h-[320px] text-white shadow-xl shadow-red-950/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-red-950 to-zinc-900">
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt=""
              className="h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.5),transparent_55%)]" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

        <div className="absolute top-5 left-5 right-5 flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md px-3 py-1.5 text-xs font-semibold tracking-wide">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
          {date ? <span className="text-xs text-white/75">{date}</span> : null}
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 transition-transform duration-300 group-hover:scale-110">
            <Play className="h-7 w-7 fill-current ml-0.5" />
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold leading-snug line-clamp-2 mb-2 group-hover:text-red-100 transition-colors">
            {item.title}
          </h3>
          {item.excerpt ? (
            <p className="text-sm text-white/70 line-clamp-2 mb-4 max-w-lg">{item.excerpt}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-300">
              Watch on site <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
            {platforms.slice(0, 3).map((p) => (
              <span key={p.id} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ReadingLane({ icon: Icon, title, subtitle, tab, accent, items, dateKey, emptyHint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[1.75rem] bg-white border border-red-100/80 shadow-[0_18px_50px_-28px_rgba(127,29,29,0.35)]"
    >
      <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md shadow-red-600/25 shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>
          <Link
            {...blogLinkProps(tab)}
            className="text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 shrink-0"
          >
            All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {items.length ? (
          <ul className="space-y-2">
            {items.slice(0, 3).map((item, index) => (
              <li key={item.id}>
                <Link
                  {...blogLinkProps(tab)}
                  className="group flex items-start gap-3 rounded-2xl px-3 py-3 hover:bg-red-50/80 transition-colors"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-[11px] font-bold text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-red-700 transition-colors">
                      {item.title}
                    </span>
                    {item[dateKey] ? (
                      <span className="block text-xs text-gray-400 mt-1">{fmtShort(item[dateKey])}</span>
                    ) : null}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-300 mt-1 shrink-0 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 px-1 py-8 text-center">{emptyHint}</p>
        )}
      </div>
    </motion.div>
  );
}

export function HomeLatestResources() {
  const { items: bible, loading: l1 } = useChurchResources("bible_study");
  const { items: manna, loading: l2 } = useChurchResources("daily_manna");
  const { items: sunday, loading: l3 } = useChurchResources("sunday_sermon");
  const { items: choir, loading: l4 } = useChurchResources("choir_ministration");

  const loading = l1 || l2 || l3 || l4;
  const hasAny = bible.length || manna.length || sunday.length || choir.length;
  if (!loading && !hasAny) return null;

  const latestSunday = sunday[0];
  const latestChoir = choir[0];

  return (
    <section
      className="relative py-16 sm:py-24 overflow-hidden"
      data-testid="home-latest-resources"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff7f5_0%,#ffffff_42%,#fff8f1_100%)]" />
      <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.12),_transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23991b1b' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-3">Stay fed</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Latest from the pulpit & choir
          </h2>
          <p className="mt-4 text-gray-600 text-base sm:text-lg leading-relaxed">
            Catch the newest Sunday sermon, choir ministration, Bible study, and Daily Manna — watch or read without leaving the site.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-16">Loading latest resources…</p>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              <MediaSpotlight
                item={latestSunday}
                tab="sunday-sermon"
                label="Sunday sermon"
                icon={Church}
                emptyHint="New Sunday messages will appear here after they are published."
              />
              <MediaSpotlight
                item={latestChoir}
                tab="choir"
                label="Choir ministration"
                icon={Mic2}
                emptyHint="Choir worship videos will appear here after they are published."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <ReadingLane
                icon={BookOpen}
                title="Bible study"
                subtitle="Monday notes"
                tab="bible-study"
                accent="from-red-700 to-orange-500"
                items={bible}
                dateKey="week_of"
                emptyHint="Monday Bible study notes coming soon."
              />
              <ReadingLane
                icon={Sun}
                title="Daily Manna"
                subtitle="Daily devotion"
                tab="daily-manna"
                accent="from-amber-500 to-red-500"
                items={manna}
                dateKey="study_date"
                emptyHint="Fresh Daily Manna devotionals coming soon."
              />
            </div>
          </div>
        )}

        <div className="mt-10 sm:mt-12 text-center">
          <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8">
            <Link to="/blog">
              Open church resources <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HomeLatestResources;
