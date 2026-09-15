import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Film } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useChurchResources } from "../hooks/useChurchResources";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";
import { ChurchResourceCards, SermonsHubTabs } from "../components/blog/BlogHub";
import { MediaResourceCards } from "../components/blog/MediaResourceCards";
import { churchResourceFormat } from "../lib/mediaEmbeds";

const VALID_TABS = new Set(["sunday-sermon", "choir", "bible-study"]);
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
      return;
    }
    try {
      const params = new URLSearchParams(location?.search || "");
      const fromQuery = params.get("cat");
      if (VALID_CATS.has(fromQuery)) setBibleCat(fromQuery);
    } catch {
      /* ignore */
    }
  }, [location?.state?.sermonsTab, location?.state?.blogTab, location?.state?.sermonsCat, location?.search]);

  const syncUrl = (nextTab, nextCat = bibleCat) => {
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
    navigate(
      { pathname: "/sermons", search: `?${params.toString()}` },
      {
        replace: true,
        state: {
          sermonsTab: nextTab,
          ...(nextTab === "bible-study" ? { sermonsCat: nextCat } : {}),
        },
      }
    );
  };

  const onTabChange = (next) => {
    if (!VALID_TABS.has(next)) return;
    setTab(next);
    syncUrl(next, bibleCat);
  };

  const onBibleCatChange = (next) => {
    if (!VALID_CATS.has(next)) return;
    setBibleCat(next);
    syncUrl("bible-study", next);
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
    tab === "sunday-sermon" ? sundayLoading : tab === "choir" ? choirLoading : bibleLoading;

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
              "Sunday sermons, choir ministrations, and Monday Bible study — watch videos or read the written study on this site."}
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

          {sectionLoading ? (
            <p className="text-center text-gray-500">Loading…</p>
          ) : tab === "sunday-sermon" ? (
            <MediaResourceCards items={sundaySermons} badge="Sunday sermon" />
          ) : tab === "choir" ? (
            <MediaResourceCards items={choirItems} badge="Choir" />
          ) : bibleCat === "video" ? (
            <MediaResourceCards items={bibleVideos} badge="Bible study" emptyHint="Bible study videos will appear here once published under Monday Bible Study → Videos." />
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
