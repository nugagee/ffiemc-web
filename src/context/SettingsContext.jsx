import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "../lib/api";
import { isSupabaseConfigured, getSupabase } from "../lib/supabase";
import { DEFAULT_PAGE_CONTENT, mergePageContent } from "../data/sitePages";

const SETTINGS_SYNC_KEY = "ffiemc_settings_updated_at";
const SETTINGS_CHANNEL = "ffiemc-settings";

const defaultChurch = DEFAULT_PAGE_CONTENT.contact?.church || {};
const defaultWelcome = DEFAULT_PAGE_CONTENT.home?.welcome || {};
const defaultStats = DEFAULT_PAGE_CONTENT.home?.stats?.items || [];
const defaultTimes = DEFAULT_PAGE_CONTENT.services?.times?.items || [];
const defaultProgrammes = DEFAULT_PAGE_CONTENT.services?.programmes?.items || [];
const defaultMission = DEFAULT_PAGE_CONTENT.about?.mission || {};

const FALLBACK = {
  name: defaultChurch.name || "Fire-Fire International Evangelical Church",
  pastor: defaultChurch.pastor || "",
  logo: defaultChurch.logo || "",
  location: defaultChurch.location || "",
  phone: defaultChurch.phone || "",
  email: defaultChurch.email || "",
  socials: {
    facebook: defaultChurch.facebook || "",
    twitter: defaultChurch.twitter || "",
    instagram: defaultChurch.instagram || "",
    tiktok: defaultChurch.tiktok || "",
    youtube: defaultChurch.youtube || "",
    audiomack: defaultChurch.audiomack || "",
  },
  serviceTimes: defaultTimes,
  notificationEmail: defaultChurch.notificationEmail || "",
  welcomeHeadline: defaultWelcome.headline || "",
  welcomeBody: defaultWelcome.body || "",
  servicesIntro: DEFAULT_PAGE_CONTENT.services?.hero?.intro || "",
  stats: defaultStats,
  programmes: defaultProgrammes,
  motto: defaultMission.motto || "",
  mission: defaultMission.mission || "",
  pages: mergePageContent({}),
};

const SettingsContext = createContext({
  settings: FALLBACK,
  refresh: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

function notifyOtherTabs() {
  const stamp = String(Date.now());
  try {
    localStorage.setItem(SETTINGS_SYNC_KEY, stamp);
  } catch {
    /* ignore */
  }
  try {
    const bc = new BroadcastChannel(SETTINGS_CHANNEL);
    bc.postMessage({ at: stamp });
    bc.close();
  } catch {
    /* ignore */
  }
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(FALLBACK);
  const refreshing = useRef(false);

  const applySettings = useCallback((data = {}) => {
    const storedPages = data.pages || {};
    const pages = mergePageContent(storedPages);
    const church = storedPages.contact?.church || {};
    const welcome = storedPages.home?.welcome || {};
    const statsItems = storedPages.home?.stats?.items || pages.home?.stats?.items;
    const times = storedPages.services?.times?.items || pages.services?.times?.items;
    const programmes = storedPages.services?.programmes?.items || pages.services?.programmes?.items;
    setSettings({
      ...FALLBACK,
      ...data,
      pages,
      name: church.name || data.name || FALLBACK.name,
      pastor: church.pastor || data.pastor || FALLBACK.pastor,
      logo: church.logo || data.logo || FALLBACK.logo,
      location: church.location || data.location || FALLBACK.location,
      phone: church.phone || data.phone || FALLBACK.phone,
      email: church.email || data.email || FALLBACK.email,
      notificationEmail: church.notificationEmail || data.notificationEmail || FALLBACK.notificationEmail,
      socials: {
        ...FALLBACK.socials,
        ...(data.socials || {}),
        facebook: church.facebook ?? data.socials?.facebook ?? "",
        twitter: church.twitter ?? data.socials?.twitter ?? "",
        instagram: church.instagram ?? data.socials?.instagram ?? "",
        tiktok: church.tiktok ?? data.socials?.tiktok ?? "",
        youtube: church.youtube ?? data.socials?.youtube ?? "",
        audiomack: church.audiomack ?? data.socials?.audiomack ?? "",
      },
      motto: storedPages.about?.mission?.motto || data.motto || FALLBACK.motto,
      mission: storedPages.about?.mission?.mission || data.mission || FALLBACK.mission,
      welcomeHeadline: welcome.headline || data.welcomeHeadline || FALLBACK.welcomeHeadline,
      welcomeBody: welcome.body || data.welcomeBody || FALLBACK.welcomeBody,
      servicesIntro: storedPages.services?.hero?.intro || data.servicesIntro || FALLBACK.servicesIntro,
      stats: statsItems?.length ? statsItems : (data.stats?.length ? data.stats : FALLBACK.stats),
      serviceTimes: times?.length ? times : (data.serviceTimes?.length ? data.serviceTimes : FALLBACK.serviceTimes),
      programmes: programmes?.length ? programmes : (data.programmes?.length ? data.programmes : FALLBACK.programmes),
    });
  }, []);

  const refresh = useCallback(async ({ notify = false } = {}) => {
    if (!isSupabaseConfigured) return;
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const { data } = await api.get("/settings");
      applySettings(data || {});
      if (notify) notifyOtherTabs();
    } catch (e) {
      /* keep current / fallback */
    } finally {
      refreshing.current = false;
    }
  }, [applySettings]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === SETTINGS_SYNC_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);

    let channel;
    try {
      channel = new BroadcastChannel(SETTINGS_CHANNEL);
      channel.onmessage = () => refresh();
    } catch {
      channel = null;
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
    };
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured || !getSupabase()) return undefined;
    const client = getSupabase();
    const channel = client
      .channel("ffiemc-site-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          refresh();
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};
