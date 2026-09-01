import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Flame, Sparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

function DoctrineAcronymBlock({ acronym }) {
  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return undefined;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  if (!acronym) return null;

  const activeCol = acronym.columns[current];

  return (
    <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 sm:p-5 min-w-0">
      <p className="text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-red-600 font-semibold mb-3 text-center md:text-left">
        {acronym.word}
      </p>

      {/* Mobile: full-width cards, swipe + dot navigation */}
      <div className="md:hidden">
        <Carousel className="w-full" opts={{ align: "start", loop: false }} setApi={setApi}>
          <CarouselContent className="ml-0">
            {acronym.columns.map((col) => (
              <CarouselItem key={col.letter} className="pl-0 basis-full">
                <div className="rounded-2xl bg-white border border-red-100/80 p-5 shadow-sm">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white text-2xl font-bold mx-auto mb-4 shadow-md shadow-red-600/20">
                    {col.letter}
                  </div>
                  <ul className="space-y-2.5">
                    {col.items.map((item) => (
                      <li key={item} className="text-sm leading-relaxed text-gray-700 text-center px-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
          {acronym.columns.map((col, index) => (
            <button
              key={col.letter}
              type="button"
              aria-label={`Go to letter ${col.letter}`}
              onClick={() => api?.scrollTo(index)}
              className={`rounded-full transition-all duration-300 ${
                index === current
                  ? "h-2.5 w-7 bg-red-600"
                  : "h-2 w-2 bg-red-200 hover:bg-red-300"
              }`}
            />
          ))}
        </div>
        {activeCol ? (
          <p className="text-center text-xs font-medium text-red-600 mt-2">
            {activeCol.letter} — {activeCol.items[0]}
          </p>
        ) : null}
        <p className="text-[11px] text-gray-400 text-center mt-1">Swipe to explore each letter</p>
      </div>

      {/* Tablet & desktop: responsive grid */}
      <div className="hidden md:grid md:grid-cols-3 xl:grid-cols-3 gap-2.5">
        {acronym.columns.map((col) => (
          <div
            key={col.letter}
            className="rounded-xl bg-white border border-red-100 p-3 text-center shadow-sm min-h-[7.5rem] flex flex-col"
          >
            <p className="text-lg font-bold text-red-600">{col.letter}</p>
            <ul className="mt-2 space-y-1 flex-1">
              {col.items.map((item) => (
                <li key={item} className="text-[11px] sm:text-xs leading-snug text-gray-600">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DoctrinesSection({
  heading = "What We Stand For",
  intro = "",
  badge = "Our Doctrines",
  purpose,
  acronyms = [],
  doctrines = [],
}) {
  const [expanded, setExpanded] = useState(null);
  const acronym = acronyms[0];

  const grouped = useMemo(() => {
    const size = 6;
    const chunks = [];
    for (let i = 0; i < doctrines.length; i += size) {
      chunks.push(doctrines.slice(i, i + size));
    }
    return chunks;
  }, [doctrines]);

  if (!doctrines.length) return null;

  return (
    <section id="doctrines" className="py-16 sm:py-20 bg-gradient-to-b from-white via-red-50/40 to-white relative scroll-mt-24">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-red-100/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{badge}</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">{heading}</h2>
          {intro ? (
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">{intro}</p>
          ) : null}
        </div>

        {purpose ? (
          <Card className="mb-10 border-red-100 bg-white/80 backdrop-blur shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl">{purpose.title}</CardTitle>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                    Possess · Pursue · Practice · Proclaim · Preserve · Preach
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="min-w-0">
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{purpose.definition}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {(purpose.attitudes || []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <Sparkles className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <DoctrineAcronymBlock acronym={acronym} />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {grouped.map((chunk, groupIdx) => (
          <div key={groupIdx} className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-5">
            {chunk.map((doctrine) => {
              const open = expanded === doctrine.id;
              return (
                <Card
                  key={doctrine.id}
                  className={`group border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${open ? "ring-2 ring-red-500/30" : ""}`}
                >
                  <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpanded(open ? null : doctrine.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="shrink-0 h-9 w-9 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center">
                            {doctrine.id}
                          </span>
                          <CardTitle className="text-lg leading-snug">{doctrine.title}</CardTitle>
                        </div>
                        {open ? (
                          <ChevronUp className="h-5 w-5 text-red-600 shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-red-600 shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className={`text-gray-600 text-sm leading-relaxed ${open ? "" : "line-clamp-3"}`}>
                        {doctrine.summary}
                      </p>
                      {open && doctrine.scriptures?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {doctrine.scriptures.map((ref) => (
                            <Badge key={ref} variant="outline" className="text-[11px] border-red-200 text-red-700 bg-red-50/50">
                              {ref}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </button>
                </Card>
              );
            })}
          </div>
        ))}

        <div className="text-center mt-8">
          <p className="inline-flex items-center gap-2 text-sm text-gray-500">
            <BookOpen className="h-4 w-4 text-red-600" />
            Tap any doctrine card to read the full summary and scripture references.
          </p>
        </div>
      </div>
    </section>
  );
}

export default DoctrinesSection;
