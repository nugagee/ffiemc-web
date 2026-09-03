import { CHURCH_DOCTRINES, DOCTRINE_ACRONYMS, DOCTRINE_PURPOSE } from "./churchDoctrines";
import { CHURCH_HISTORY_DEFAULTS } from "./churchHistory";
import {
  CATECHISM_ITEMS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
} from "./catechism";

export const CONVENTION_BLOG_IDS = {
  septemberCatechism: "f1f1e008-0008-4008-8008-000000000008",
  septemberDoctrines: "f1f1e007-0007-4007-8007-000000000007",
  failure: "f1f1e001-0001-4001-8001-000000000001",
  timeYouth: "f1f1e002-0002-4002-8002-000000000002",
  wayTruthLife: "f1f1e003-0003-4003-8003-000000000003",
  allInAll: "f1f1e004-0004-4004-8004-000000000004",
  top10: "f1f1e005-0005-4005-8005-000000000005",
  steppingOut: "f1f1e006-0006-4006-8006-000000000006",
};

export function doctrinesCmsDefaults() {
  return {
    purposeTitle: DOCTRINE_PURPOSE.title,
    purposeDefinition: DOCTRINE_PURPOSE.definition,
    purposeAttitudes: DOCTRINE_PURPOSE.attitudes.join("\n"),
    items: CHURCH_DOCTRINES.map((d) => ({
      id: String(d.id),
      title: d.title,
      summary: d.summary,
      scriptures: d.scriptures.join(", "),
    })),
  };
}

export function catechismCmsDefaults() {
  return {
    badge: "Catechism",
    heading: "Church Catechism",
    intro:
      "Foundational questions and answers that teach our faith clearly — for families, youth, and new believers.",
    items: CATECHISM_ITEMS.map((item) => ({
      id: String(item.id),
      question: item.question,
      answer: item.answer,
    })),
    oldTestamentBooks: OLD_TESTAMENT_BOOKS.join("\n"),
    newTestamentBooks: NEW_TESTAMENT_BOOKS.join("\n"),
  };
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeItems(defaultItems, currentItems) {
  if (Array.isArray(currentItems) && currentItems.length) return currentItems;
  return defaultItems || [];
}

export function resolveDoctrinesContent(settings) {
  const defaults = doctrinesCmsDefaults();
  const stored = settings?.pages?.about?.doctrines || {};
  const items = mergeItems(defaults.items, stored.items).map((item, index) => ({
    id: Number(item.id) || index + 1,
    title: item.title || "",
    summary: item.summary || "",
    scriptures: splitCsv(item.scriptures),
  }));

  return {
    purpose: {
      title: stored.purposeTitle || defaults.purposeTitle,
      definition: stored.purposeDefinition || defaults.purposeDefinition,
      attitudes: splitLines(stored.purposeAttitudes || defaults.purposeAttitudes),
    },
    acronyms: DOCTRINE_ACRONYMS,
    doctrines: items,
  };
}

export function resolveCatechismContent(settings) {
  const defaults = catechismCmsDefaults();
  const stored = settings?.pages?.about?.catechism || {};
  const items = mergeItems(defaults.items, stored.items).map((item, index) => ({
    id: Number(item.id) || index + 1,
    question: item.question || "",
    answer: item.answer || "",
  }));

  return {
    badge: stored.badge || defaults.badge,
    heading: stored.heading || defaults.heading,
    intro: stored.intro || defaults.intro,
    items,
    oldTestament: splitLines(stored.oldTestamentBooks || defaults.oldTestamentBooks),
    newTestament: splitLines(stored.newTestamentBooks || defaults.newTestamentBooks),
  };
}

export function historyCmsDefaults() {
  const d = CHURCH_HISTORY_DEFAULTS;
  return {
    badge: d.badge,
    heading: d.heading,
    intro: d.intro,
    foundedDate: d.foundedDate,
    founder: d.founder,
    foundingPlace: d.foundingPlace,
    headquarters: d.headquarters,
    openingQuote: d.openingQuote,
    story: d.story.map((item) => ({ ...item })),
    pillars: d.pillars.map((item) => ({ ...item })),
    timeline: d.timeline.map((item) => ({ ...item })),
  };
}

export function resolveHistoryContent(settings) {
  const defaults = historyCmsDefaults();
  const stored = settings?.pages?.about?.history || {};

  return {
    badge: stored.badge || defaults.badge,
    heading: stored.heading || defaults.heading,
    intro: stored.intro || defaults.intro,
    foundedDate: stored.foundedDate || defaults.foundedDate,
    founder: stored.founder || defaults.founder,
    foundingPlace: stored.foundingPlace || defaults.foundingPlace,
    headquarters: stored.headquarters || defaults.headquarters,
    openingQuote: stored.openingQuote || defaults.openingQuote,
    story: mergeItems(defaults.story, stored.story),
    pillars: mergeItems(defaults.pillars, stored.pillars),
    timeline: mergeItems(defaults.timeline, stored.timeline),
  };
}
