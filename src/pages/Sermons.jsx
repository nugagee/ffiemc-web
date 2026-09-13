import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { useChurchResources } from "../hooks/useChurchResources";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";
import { ChurchResourceCards, SermonsHubTabs } from "../components/blog/BlogHub";
import { MediaResourceCards } from "../components/blog/MediaResourceCards";

const VALID_TABS = new Set(["sunday-sermon", "choir", "bible-study"]);
const STORAGE_KEY = "ffiemc_sermons_tab";

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

export const Sermons = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const hero = pageSection(settings, "sermons", "hero");
  const { items: sundaySermons, loading: sundayLoading } = useChurchResources("sunday_sermon");
  const { items: choirItems, loading: choirLoading } = useChurchResources("choir_ministration");
  const { items: bibleStudies, loading: bibleLoading } = useChurchResources("bible_study");
  const [tab, setTab] = useState(() => initialTab(location));

  useEffect(() => {
    const fromState = location?.state?.sermonsTab || location?.state?.blogTab;
    if (VALID_TABS.has(fromState)) {
      setTab(fromState);
      return;
    }
    try {
      const params = new URLSearchParams(location?.search || "");
      const fromQuery = params.get("tab");
      if (VALID_TABS.has(fromQuery)) setTab(fromQuery);
    } catch {
      /* ignore */
    }
  }, [location?.state?.sermonsTab, location?.state?.blogTab, location?.search]);

  const onTabChange = (next) => {
    if (!VALID_TABS.has(next)) return;
    setTab(next);
    navigate({ pathname: "/sermons", search: `?tab=${next}` }, { replace: true, state: { sermonsTab: next } });
  };

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
              "Sunday sermons, choir ministrations, and Monday Bible study — watch or read on this site."}
          </p>
          <div className="mt-8">
            <SermonsHubTabs active={tab} onChange={onTabChange} />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {sectionLoading ? (
            <p className="text-center text-gray-500">Loading…</p>
          ) : tab === "sunday-sermon" ? (
            <MediaResourceCards items={sundaySermons} badge="Sunday sermon" />
          ) : tab === "choir" ? (
            <MediaResourceCards items={choirItems} badge="Choir" />
          ) : (
            <ChurchResourceCards items={bibleStudies} dateKey="week_of" dateLabel="Week of" />
          )}
        </div>
      </section>
    </div>
  );
};

export default Sermons;
