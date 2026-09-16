import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Film } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useChurchResources } from "../hooks/useChurchResources";
import { useSpecialPrograms, useSpecialProgramItems } from "../hooks/useSpecialPrograms";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";
import { ChurchResourceCards, SermonsHubTabs } from "../components/blog/BlogHub";
import { MediaResourceCards } from "../components/blog/MediaResourceCards";
import { churchResourceFormat } from "../lib/mediaEmbeds";

const VALID_TABS = new Set(["sunday-sermon", "choir", "bible-study", "special-programs"]);
const VALID_CATS = new Set(["video", "written"]);
const STORAGE_KEY = "ffiemc_sermons_tab";
const CAT_STORAGE_KEY = "ffiemc_sermons_bible_cat";

function initialTab(location) {
  const fromState = location?.state?.sermonsTab || location?.state?.blogTab;
  if (VALID_TABS.has(fromState)) return fromState;
  try {
    const params = new URLSearchParams(location?.search || "");
    const fromQuery = params.get("tab");
    if (VALID_TABS.has(fromQuery)) return fromQuery;
  } catch {
    /* ignore */
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem("ffiemc_blog_tab");
    if (VALID_TABS.has(stored)) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("ffiemc_blog_tab");
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "sunday-sermon";
}

function initialCat(location) {
  const fromState = location?.state?.sermonsCat;
  if (VALID_CATS.has(fromState)) return fromState;
  try {
    const params = new URLSearchParams(location?.search || "");
    const fromQuery = params.get("cat");
    if (VALID_CATS.has(fromQuery)) return fromQuery;
  } catch {
    /* ignore */
  }
  try {
    const stored = sessionStorage.getItem(CAT_STORAGE_KEY);
    if (VALID_CATS.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "video";
}

function initialProgramSlug(location) {
  const fromState = location?.state?.programSlug;
  if (fromState) return String(fromState);
  try {
    const params = new URLSearchParams(location?.search || "");
    return params.get("program") || "";
  } catch {
    return "";
  }
}

function fmtRange(starts, ends) {
  const fmt = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };
  const a = fmt(starts);
  const b = fmt(ends);
  if (a && b) return `${a} – ${b}`;
  return a || b || "";
}

const BIBLE_CATS = [
  { id: "video", label: "Videos / sermons", icon: Film },
  { id: "written", label: "Written version", icon: BookOpen },
];

export const Sermons = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const hero = pageSection(settings, "sermons", "hero");
  const { items: sundaySermons, loading: sundayLoading } = useChurchResources("sunday_sermon");
  const { items: choirItems, loading: choirLoading } = useChurchResources("choir_ministration");
  const { items: bibleStudies, loading: bibleLoading } = useChurchResources("bible_study");
  const [tab, setTab] = useState(() => initialTab(location));
  const [bibleCat, setBibleCat] = useState(() => initialCat(location));
  const [programSlug, setProgramSlug] = useState(() => initialProgramSlug(location));

  const { items: programs, loading: programsLoading } = useSpecialPrograms(tab === "special-programs");
  const selectedProgram = useMemo(
    () => programs.find((p) => p.slug === programSlug) || null,
    [programs, programSlug]
  );
  const { items: programItems, loading: programItemsLoading } = useSpecialProgramItems(
    null,
    programSlug || null,
    tab === "special-programs" && Boolean(programSlug)
  );

  useEffect(() => {
    const fromState = location?.state?.sermonsTab || location?.state?.blogTab;
    if (VALID_TABS.has(fromState)) {
      setTab(fromState);
    } else {
      try {
        const params = new URLSearchParams(location?.search || "");
        const fromQuery = params.get("tab");
        if (VALID_TABS.has(fromQuery)) setTab(fromQuery);
      } catch {
        /* ignore */
      }
    }
    const catState = location?.state?.sermonsCat;
    if (VALID_CATS.has(catState)) {
      setBibleCat(catState);
    } else {
      try {
        const params = new URLSearchParams(location?.search || "");
        const fromQuery = params.get("cat");
        if (VALID_CATS.has(fromQuery)) setBibleCat(fromQuery);
      } catch {
        /* ignore */
      }
    }
    const progState = location?.state?.programSlug;
    if (progState) {
      setProgramSlug(String(progState));
    } else {
      try {
        const params = new URLSearchParams(location?.search || "");
        setProgramSlug(params.get("program") || "");
      } catch {
        /* ignore */
      }
    }
  }, [
    location?.state?.sermonsTab,
    location?.state?.blogTab,
    location?.state?.sermonsCat,
    location?.state?.programSlug,
    location?.search,
  ]);

  const syncUrl = (nextTab, nextCat = bibleCat, nextProgram = programSlug) => {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (nextTab === "bible-study" && VALID_CATS.has(nextCat)) {
      params.set("cat", nextCat);
      try {
        sessionStorage.setItem(CAT_STORAGE_KEY, nextCat);
      } catch {
        /* ignore */
      }
    }
    if (nextTab === "special-programs" && nextProgram) {
      params.set("program", nextProgram);
    }
    navigate(
      { pathname: "/sermons", search: `?${params.toString()}` },
      {
        replace: true,
        state: {
          sermonsTab: nextTab,
          ...(nextTab === "bible-study" ? { sermonsCat: nextCat } : {}),
          ...(nextTab === "special-programs" && nextProgram
            ? { programSlug: nextProgram }
            : {}),
        },
      }
    );
  };

  const onTabChange = (next) => {
    if (!VALID_TABS.has(next)) return;
    setTab(next);
    if (next !== "special-programs") setProgramSlug("");
    syncUrl(next, bibleCat, next === "special-programs" ? programSlug : "");
  };

  const onBibleCatChange = (next) => {
    if (!VALID_CATS.has(next)) return;
    setBibleCat(next);
    syncUrl("bible-study", next, "");
  };

  const openProgram = (slug) => {
    setProgramSlug(slug);
    syncUrl("special-programs", bibleCat, slug);
  };

  const backToPrograms = () => {
    setProgramSlug("");
    syncUrl("special-programs", bibleCat, "");
  };

  const bibleVideos = useMemo(
    () => bibleStudies.filter((item) => churchResourceFormat(item) === "video"),
    [bibleStudies]
  );
  const bibleWritten = useMemo(
    () => bibleStudies.filter((item) => churchResourceFormat(item) === "written"),
    [bibleStudies]
  );

  const sectionLoading =
    tab === "sunday-sermon"
      ? sundayLoading
      : tab === "choir"
        ? choirLoading
        : tab === "special-programs"
          ? programSlug
            ? programItemsLoading
            : programsLoading
          : bibleLoading;

  return (
    <div className="min-h-screen" data-testid="sermons-page">
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-black py-16 sm:py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-600 text-white hover:bg-red-600 mb-4">
            {hero.badge || "Messages"}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {hero.headline || "Sermons &"}{" "}
            <span className="text-red-500 block">{hero.accent || "Church Media"}</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {hero.intro ||
              "Sunday sermons, choir, Monday Bible study, and special programs like revivals and conventions — watch on this site."}
          </p>
          <div className="mt-8">
            <SermonsHubTabs active={tab} onChange={onTabChange} />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {tab === "bible-study" ? (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {BIBLE_CATS.map((cat) => {
                const Icon = cat.icon;
                const active = bibleCat === cat.id;
                const count = cat.id === "video" ? bibleVideos.length : bibleWritten.length;
                return (
                  <Button
                    key={cat.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={active ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => onBibleCatChange(cat.id)}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {cat.label}
                    <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
                  </Button>
                );
              })}
            </div>
          ) : null}

          {tab === "special-programs" && selectedProgram ? (
            <div className="mb-8 max-w-3xl mx-auto text-center">
              <Button type="button" variant="ghost" size="sm" className="mb-3" onClick={backToPrograms}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> All special programs
              </Button>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{selectedProgram.title}</h2>
              {selectedProgram.description ? (
                <p className="text-gray-500 mt-2 leading-relaxed">{selectedProgram.description}</p>
              ) : null}
              {fmtRange(selectedProgram.starts_on, selectedProgram.ends_on) ? (
                <p className="text-sm text-gray-400 mt-2">
                  {fmtRange(selectedProgram.starts_on, selectedProgram.ends_on)}
                </p>
              ) : null}
            </div>
          ) : null}

          {sectionLoading ? (
            <p className="text-center text-gray-500">Loading…</p>
          ) : tab === "sunday-sermon" ? (
            <MediaResourceCards items={sundaySermons} badge="Sunday sermon" />
          ) : tab === "choir" ? (
            <MediaResourceCards items={choirItems} badge="Choir" />
          ) : tab === "special-programs" ? (
            programSlug ? (
              <MediaResourceCards
                items={programItems}
                badge={selectedProgram?.title || "Special program"}
                emptyHint="Videos for this program will appear here once published in Admin → Special programs."
              />
            ) : programs.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Special programs such as revivals and conventions will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {programs.map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => openProgram(program.slug)}
                    className="group text-left overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-red-950 to-zinc-900 overflow-hidden">
                      {program.cover_url ? (
                        <img
                          src={program.cover_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.45),transparent_55%)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                        <Badge className="bg-white/15 text-white border-0 backdrop-blur">
                          Special program
                        </Badge>
                        <span className="text-xs text-white/80">{program.item_count || 0} videos</span>
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <h3 className="font-semibold text-lg text-gray-900 leading-snug">
                        {program.title}
                      </h3>
                      {program.description ? (
                        <p className="text-sm text-gray-500 line-clamp-2">{program.description}</p>
                      ) : null}
                      {fmtRange(program.starts_on, program.ends_on) ? (
                        <p className="text-xs text-gray-400">
                          {fmtRange(program.starts_on, program.ends_on)}
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : bibleCat === "video" ? (
            <MediaResourceCards
              items={bibleVideos}
              badge="Bible study"
              emptyHint="Bible study videos will appear here once published under Monday Bible Study → Videos."
            />
          ) : (
            <ChurchResourceCards
              items={bibleWritten}
              dateKey="week_of"
              dateLabel="Week of"
              emptyHint="Written Bible study notes will appear here once published under Monday Bible Study → Written version."
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default Sermons;
