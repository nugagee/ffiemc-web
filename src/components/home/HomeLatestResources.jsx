import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Church, Mic2, Play, Sun } from "lucide-react";
import { useChurchResources } from "../../hooks/useChurchResources";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { mediaPlatforms, resourceMediaDate } from "../../lib/mediaEmbeds";

function fmtShort(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

function Lane({ icon: Icon, title, subtitle, tab, children, accent = "from-red-600 to-amber-500" }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden flex flex-col min-h-[280px]">
      <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
      <div className="p-5 flex items-start justify-between gap-3 border-b border-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 shrink-0">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="text-red-600 shrink-0">
          <Link to="/blog" state={{ blogTab: tab }} onClick={() => rememberBlogTab(tab)}>
            All <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}

function TextItem({ title, date, tab }) {
  return (
    <Link
      to="/blog"
      state={{ blogTab: tab }}
      onClick={() => rememberBlogTab(tab)}
      className="block rounded-xl px-3 py-2.5 hover:bg-red-50/70 transition-colors"
    >
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{title}</p>
      {date ? <p className="text-xs text-gray-400 mt-1">{date}</p> : null}
    </Link>
  );
}

function MediaItem({ item, tab }) {
  const platforms = mediaPlatforms(item);
  const date = fmtShort(resourceMediaDate(item));
  return (
    <Link
      to="/blog"
      state={{ blogTab: tab }}
      onClick={() => rememberBlogTab(tab)}
      className="flex gap-3 rounded-xl p-2 hover:bg-red-50/70 transition-colors"
    >
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-red-900 to-zinc-900" />
        )}
        <span className="absolute inset-0 flex items-center justify-center text-white">
          <Play className="h-5 w-5 fill-current" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
        <p className="text-xs text-gray-400 mt-1">
          {date}
          {platforms.length ? ` · ${platforms.map((p) => p.label).join(" · ")}` : ""}
        </p>
      </div>
    </Link>
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

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white via-red-50/30 to-white" data-testid="home-latest-resources">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-3">Stay fed</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Latest from the pulpit & choir</h2>
          <p className="mt-3 text-gray-600">
            Catch up on Bible study, Daily Manna, Sunday sermons, and choir ministrations — watch or read without leaving the site.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading latest resources…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <Lane icon={Church} title="Sunday sermons" subtitle="Service messages" tab="sunday-sermon" accent="from-red-700 to-red-500">
              {sunday.slice(0, 3).map((item) => (
                <MediaItem key={item.id} item={item} tab="sunday-sermon" />
              ))}
              {!sunday.length && <p className="text-sm text-gray-400 px-3 py-6 text-center">Coming soon</p>}
            </Lane>

            <Lane icon={Mic2} title="Choir" subtitle="Worship & ministrations" tab="choir" accent="from-amber-600 to-red-500">
              {choir.slice(0, 3).map((item) => (
                <MediaItem key={item.id} item={item} tab="choir" />
              ))}
              {!choir.length && <p className="text-sm text-gray-400 px-3 py-6 text-center">Coming soon</p>}
            </Lane>

            <Lane icon={BookOpen} title="Bible study" subtitle="Monday notes" tab="bible-study" accent="from-red-600 to-orange-400">
              {bible.slice(0, 3).map((item) => (
                <TextItem
                  key={item.id}
                  title={item.title}
                  date={fmtShort(item.week_of)}
                  tab="bible-study"
                />
              ))}
              {!bible.length && <p className="text-sm text-gray-400 px-3 py-6 text-center">Coming soon</p>}
            </Lane>

            <Lane icon={Sun} title="Daily Manna" subtitle="Daily devotion" tab="daily-manna" accent="from-orange-500 to-amber-300">
              {manna.slice(0, 3).map((item) => (
                <TextItem
                  key={item.id}
                  title={item.title}
                  date={fmtShort(item.study_date)}
                  tab="daily-manna"
                />
              ))}
              {!manna.length && <p className="text-sm text-gray-400 px-3 py-6 text-center">Coming soon</p>}
            </Lane>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button asChild className="bg-red-600 hover:bg-red-700">
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
