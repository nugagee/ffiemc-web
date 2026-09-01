import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Church,
  GraduationCap,
  MapPin,
  Megaphone,
  Mountain,
  Quote,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CHURCH_FOUNDED_YEAR } from "../../data/churchHistory";

const PILLAR_ICONS = [Mountain, Sparkles, Megaphone, GraduationCap];

export function ChurchHistorySection({
  badge = "Our Story",
  heading = "History of the Church",
  intro = "",
  foundedDate = "",
  founder = "",
  foundingPlace = "",
  headquarters = "",
  openingQuote = "",
  story = [],
  pillars = [],
  timeline = [],
}) {
  const [activeStory, setActiveStory] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState(0);

  const yearsServing = useMemo(() => {
    const match = String(foundedDate).match(/\d{4}/);
    const year = match ? Number(match[0]) : CHURCH_FOUNDED_YEAR;
    const span = new Date().getFullYear() - year;
    return span > 0 ? `${span}+` : "1+";
  }, [foundedDate]);

  const currentStory = story[activeStory] || story[0];
  const currentMilestone = timeline[activeMilestone] || timeline[0];

  if (!story.length && !timeline.length) return null;

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.22),transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_40%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <Badge className="bg-red-600 text-white hover:bg-red-600 mb-4">{badge}</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">{heading}</h2>
          {intro ? <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">{intro}</p> : null}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Established", value: foundedDate, icon: Church },
            { label: "General Overseer", value: founder, icon: User },
            { label: "First Meeting Place", value: foundingPlace, icon: MapPin },
            { label: "Years of Faithfulness", value: yearsServing, icon: Sparkles },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-red-400" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-red-300">{stat.label}</p>
                  </div>
                  <p className="text-sm sm:text-base font-medium leading-relaxed text-gray-100">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {openingQuote ? (
          <Card className="mb-10 border-red-500/20 bg-gradient-to-r from-red-950/60 to-gray-900/60 text-white">
            <CardContent className="p-6 sm:p-8 flex gap-4 items-start">
              <Quote className="h-8 w-8 text-red-400 shrink-0" />
              <p className="text-lg sm:text-xl italic leading-relaxed text-red-50">{openingQuote}</p>
            </CardContent>
          </Card>
        ) : null}

        {story.length > 0 && (
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 mb-12">
            <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-red-400" />
                  <CardTitle className="text-xl">Our Story</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[24rem] overflow-y-auto divide-y divide-white/10">
                  {story.map((chapter, idx) => (
                    <button
                      key={`${chapter.title}-${idx}`}
                      type="button"
                      onClick={() => setActiveStory(idx)}
                      className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 transition-colors ${
                        idx === activeStory ? "bg-red-600/25" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="text-sm font-medium">{chapter.title}</span>
                      {idx === activeStory ? (
                        <ChevronUp className="h-4 w-4 text-red-300 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-700 to-red-900 border-0 text-white shadow-2xl min-h-[16rem]">
              <CardHeader>
                <p className="text-xs uppercase tracking-[0.25em] text-red-100">
                  Chapter {activeStory + 1} of {story.length}
                </p>
                <CardTitle className="text-2xl leading-snug">{currentStory?.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-50 leading-relaxed text-base">{currentStory?.body}</p>
                {headquarters && activeStory === story.length - 2 ? (
                  <p className="mt-4 text-sm text-red-100/90">
                    <span className="font-semibold">Headquarters:</span> {headquarters}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        {pillars.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {pillars.map((pillar, idx) => {
              const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
              return (
                <Card
                  key={pillar.title}
                  className="group bg-white/5 border-white/10 text-white hover:border-red-400/40 hover:bg-white/10 transition-all duration-300"
                >
                  <CardHeader className="pb-2">
                    <div className="h-11 w-11 rounded-xl bg-red-600/20 flex items-center justify-center mb-2 group-hover:bg-red-600/30 transition-colors">
                      <Icon className="h-5 w-5 text-red-400" />
                    </div>
                    <CardTitle className="text-lg">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 leading-relaxed">{pillar.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {timeline.length > 0 && (
          <div>
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold">Milestones</h3>
              <p className="text-gray-400 mt-2 text-sm">Tap a milestone to explore our journey through the years</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {timeline.map((item, idx) => (
                <button
                  key={`${item.year}-${item.title}-${idx}`}
                  type="button"
                  onClick={() => setActiveMilestone(idx)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    idx === activeMilestone
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "bg-white/10 text-gray-300 hover:bg-white/15"
                  }`}
                >
                  {item.year}
                </button>
              ))}
            </div>

            <Card className="bg-white text-gray-900 border-0 shadow-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-red-600 text-white hover:bg-red-600">{currentMilestone?.year}</Badge>
                  <CardTitle className="text-2xl">{currentMilestone?.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed text-base">{currentMilestone?.description}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}

export default ChurchHistorySection;
