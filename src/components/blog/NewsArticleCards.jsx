import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  CalendarClock,
  ExternalLink,
  LayoutGrid,
  List,
  Newspaper,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const CAT_LABEL = {
  christian: "Faith",
  nigeria: "Faith (Nigeria)",
  education: "Education",
};

const FILTERS = [
  { id: "christian", label: "Faith / Church" },
  { id: "education", label: "Education" },
  { id: "nigeria", label: "Faith (Nigeria)" },
];

const SORTS = [
  { id: "newest", label: "Newest first", icon: CalendarClock },
  { id: "oldest", label: "Oldest first", icon: CalendarClock },
  { id: "title", label: "Title A–Z", icon: ArrowDownAZ },
  { id: "source", label: "Source A–Z", icon: ArrowUpDown },
];

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/** Decode HTML entities like &#039; &amp; &quot; for clean headlines. */
function decodeEntities(text = "") {
  const raw = String(text || "");
  if (!raw) return "";
  try {
    if (typeof document !== "undefined") {
      const el = document.createElement("textarea");
      el.innerHTML = raw;
      return el.value;
    }
  } catch {
    /* fall through */
  }
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function isPunchImage(item) {
  const src = String(item?.image_url || "").toLowerCase();
  const sourceId = String(item?.source_id || "").toLowerCase();
  if (sourceId.startsWith("punch")) return true;
  return /punchng\.com|cdn\.punchng\.com/.test(src);
}

function sortItems(items, sort) {
  const rows = [...items];
  const time = (r) => {
    const t = Date.parse(r.published_at || r.fetched_at || "") || 0;
    return t;
  };
  switch (sort) {
    case "oldest":
      return rows.sort((a, b) => time(a) - time(b));
    case "title":
      return rows.sort((a, b) =>
        decodeEntities(a.title || "").localeCompare(decodeEntities(b.title || ""))
      );
    case "source":
      return rows.sort((a, b) => String(a.source_name || "").localeCompare(String(b.source_name || "")));
    case "newest":
    default:
      return rows.sort((a, b) => time(b) - time(a));
  }
}

function NewsToolbar({ filter, onFilter, sort, onSort, layout, onLayout }) {
  return (
    <div className="mb-8 space-y-4" data-testid="news-toolbar">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Filter</span>
        {FILTERS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === cat.id
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Sort</span>
        {SORTS.map((s) => {
          const Icon = s.icon;
          const active = sort === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSort(s.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-zinc-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
        <span className="hidden sm:inline w-px h-5 bg-gray-200 mx-1" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Layout</span>
        <button
          type="button"
          onClick={() => onLayout("grid")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            layout === "grid" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-50"
          }`}
          aria-label="Column / grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Columns
        </button>
        <button
          type="button"
          onClick={() => onLayout("list")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            layout === "list" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-50"
          }`}
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
          List
        </button>
      </div>
    </div>
  );
}

function NewsCard({ item, layout }) {
  const isList = layout === "list";
  const title = decodeEntities(item.title);
  const excerpt = decodeEntities(item.excerpt);
  const showImage = Boolean(item.image_url) && !isPunchImage(item);
  return (
    <Card
      className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow ${
        isList ? "flex flex-col sm:flex-row sm:items-stretch" : "flex flex-col"
      }`}
    >
      {showImage ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block overflow-hidden bg-gray-100 shrink-0 ${
            isList ? "sm:w-48 aspect-video sm:aspect-auto sm:min-h-full" : "aspect-video"
          }`}
        >
          <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        </a>
      ) : (
        <div className={`bg-gradient-to-r from-red-600 to-amber-500 shrink-0 ${isList ? "sm:w-1.5" : "h-1.5"}`} />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <CardHeader className={`pb-2 ${isList ? "py-4" : ""}`}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              {CAT_LABEL[item.category] || item.category}
            </Badge>
            <span className="text-xs text-gray-400">{item.source_name}</span>
            {item.published_at || item.fetched_at ? (
              <span className="text-xs text-gray-400 ml-auto">
                {fmtDate(item.published_at || item.fetched_at)}
              </span>
            ) : null}
          </div>
          <CardTitle className={`${isList ? "text-base sm:text-lg" : "text-lg"} leading-snug`}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-700 transition-colors"
            >
              {title}
            </a>
          </CardTitle>
          {excerpt ? (
            <CardDescription className={`mt-2 ${isList ? "line-clamp-2" : "line-clamp-3"}`}>
              {excerpt}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className={`mt-auto pt-0 space-y-2 ${isList ? "pb-4 sm:flex sm:items-center sm:gap-3 sm:space-y-0" : ""}`}>
          <Button asChild className={`${isList ? "sm:w-auto" : "w-full"} bg-red-600 hover:bg-red-700`}>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              Read full article
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
          <p className="text-[11px] text-gray-400 sm:text-left text-center">
            Opens on {item.source_name || "the original website"}
          </p>
        </CardContent>
      </div>
    </Card>
  );
}

/** @deprecated kept for Blog.jsx imports that still use the old name */
export function NewsCategoryFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {FILTERS.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(cat.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            value === cat.id
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

export function NewsArticleCards({ items = [], filter: controlledFilter, onFilterChange }) {
  const [filter, setFilter] = useState(controlledFilter || "christian");
  const [sort, setSort] = useState("newest");
  const [layout, setLayout] = useState("grid");

  const activeFilter = controlledFilter ?? filter;

  const handleFilter = (next) => {
    setFilter(next);
    onFilterChange?.(next);
  };

  const visible = useMemo(() => {
    const base = items.filter((i) => i.category === activeFilter);
    return sortItems(base, sort);
  }, [items, activeFilter, sort]);

  if (!items.length) {
    return (
      <div className="text-center py-14 px-4">
        <Newspaper className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          No faith or education headlines yet. Use Admin → Christian News → Fetch now after sources are configured.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="news-article-cards">
      <NewsToolbar
        filter={activeFilter}
        onFilter={handleFilter}
        sort={sort}
        onSort={setSort}
        layout={layout}
        onLayout={setLayout}
      />

      {visible.length === 0 ? (
        <p className="text-center text-gray-500 py-10">No stories in this category yet. Try Education or Faith (Nigeria).</p>
      ) : layout === "list" ? (
        <div className="space-y-4">
          {visible.map((item) => (
            <NewsCard key={item.id} item={item} layout="list" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visible.map((item) => (
            <NewsCard key={item.id} item={item} layout="grid" />
          ))}
        </div>
      )}
    </div>
  );
}
