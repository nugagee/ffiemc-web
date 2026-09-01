import { useMemo, useState } from "react";
import { BookMarked, ChevronRight, HelpCircle, Library } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function CatechismSection({
  heading = "Church Catechism",
  intro = "",
  badge = "Catechism",
  items = [],
  oldTestament = [],
  newTestament = [],
}) {
  const [active, setActive] = useState(0);
  const [bookTab, setBookTab] = useState("ot");

  const current = items[active] || items[0];
  const books = useMemo(
    () => (bookTab === "ot" ? oldTestament : newTestament),
    [bookTab, oldTestament, newTestament]
  );

  if (!items.length) return null;

  return (
    <section id="catechism" className="py-16 sm:py-20 bg-gray-950 text-white relative overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.18),transparent_45%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <Badge className="bg-red-600 text-white hover:bg-red-600 mb-4">{badge}</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">{heading}</h2>
          {intro ? <p className="text-lg text-gray-300 max-w-3xl mx-auto">{intro}</p> : null}
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-red-400" />
                <CardTitle className="text-xl">Questions & Answers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[28rem] overflow-y-auto divide-y divide-white/10">
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(idx)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      idx === active ? "bg-red-600/20" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0 text-xs font-bold text-red-300 mt-1">{item.id}</span>
                    <span className="text-sm leading-snug">{item.question}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 ml-auto mt-0.5 ${idx === active ? "text-red-300" : "text-gray-500"}`} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {current ? (
              <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 text-white shadow-2xl">
                <CardHeader>
                  <p className="text-xs uppercase tracking-[0.25em] text-red-100">Answer {current.id}</p>
                  <CardTitle className="text-2xl leading-snug">{current.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-50 leading-relaxed text-base">{current.answer}</p>
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Library className="h-5 w-5 text-red-400" />
                  <CardTitle className="text-lg">Books of the Bible</CardTitle>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setBookTab("ot")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${bookTab === "ot" ? "bg-red-600 text-white" : "bg-white/10 text-gray-300"}`}
                  >
                    Old Testament ({oldTestament.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookTab("nt")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${bookTab === "nt" ? "bg-red-600 text-white" : "bg-white/10 text-gray-300"}`}
                  >
                    New Testament ({newTestament.length})
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {books.map((book) => (
                    <Badge key={book} className="bg-white/10 hover:bg-white/10 text-gray-100 border-white/10">
                      {book}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4 flex items-center gap-2">
                  <BookMarked className="h-3.5 w-3.5" />
                  Recite and teach these books as part of our catechism training.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CatechismSection;
