import { useMemo, useState } from "react";
import { BookOpen, Eye, EyeOff, Lightbulb, ScrollText, Sparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { looksLikeHtml, sanitizeHtml } from "../../lib/blog";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "trait", label: "Trait" },
  { id: "prophecy", label: "Prophecy" },
  { id: "fact", label: "Fact" },
  { id: "riddle", label: "Riddle" },
];

const CAT_META = {
  trait: { label: "Character Trait", icon: Sparkles, tone: "bg-rose-100 text-rose-700" },
  prophecy: { label: "Prophecy", icon: ScrollText, tone: "bg-violet-100 text-violet-700" },
  fact: { label: "Bible Fact", icon: Lightbulb, tone: "bg-amber-100 text-amber-800" },
  riddle: { label: "Bible Riddle", icon: BookOpen, tone: "bg-sky-100 text-sky-800" },
};

function todayLagos() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function GrowthCard({ item, highlight }) {
  const [reveal, setReveal] = useState(false);
  const meta = CAT_META[item.category] || CAT_META.fact;
  const Icon = meta.icon;
  const body = item.body || "";
  const html = looksLikeHtml(body);

  return (
    <Card
      className={`overflow-hidden border-0 shadow-lg ${highlight ? "ring-2 ring-red-200" : ""}`}
      data-testid="daily-growth-card"
    >
      <div className="h-1.5 bg-gradient-to-r from-red-600 to-amber-500" />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge className={`${meta.tone} mb-2`}>
              <Icon className="h-3.5 w-3.5 mr-1 inline" />
              {meta.label}
            </Badge>
            <CardTitle className="text-xl">{item.title}</CardTitle>
            {item.scripture_ref ? (
              <CardDescription className="mt-2 italic">{item.scripture_ref}</CardDescription>
            ) : null}
          </div>
          {item.published_on ? (
            <Badge variant="outline" className="shrink-0">
              {fmtDate(item.published_on)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {html ? (
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-line">{body}</p>
        )}
        {item.category === "riddle" && item.answer ? (
          <div>
            <Button type="button" size="sm" variant="outline" onClick={() => setReveal((v) => !v)}>
              {reveal ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {reveal ? "Hide answer" : "Reveal answer"}
            </Button>
            {reveal ? (
              <p className="mt-3 rounded-xl bg-sky-50 border border-sky-100 px-3 py-2 text-sm text-sky-900 font-medium">
                {item.answer}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DailyGrowthCards({ items = [], filter = "all", onFilterChange }) {
  const today = todayLagos();
  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const todays = filtered.filter((i) => i.published_on === today);
  const archive = filtered.filter((i) => i.published_on !== today);

  if (!items.length) {
    return (
      <p className="text-center text-gray-500 py-10">
        Daily Growth content will appear here once published. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 justify-center">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange?.(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.id
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {todays.length ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Today&apos;s picks</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {todays.map((item) => (
              <GrowthCard key={item.id} item={item} highlight />
            ))}
          </div>
        </div>
      ) : null}

      {archive.length ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {todays.length ? "Earlier" : "Published"}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {archive.map((item) => (
              <GrowthCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      {!todays.length && !archive.length ? (
        <p className="text-center text-gray-500 py-6">No items in this filter yet.</p>
      ) : null}
    </div>
  );
}

export default DailyGrowthCards;
