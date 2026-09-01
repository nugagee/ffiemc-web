import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Phone,
  Sparkles,
  Flame,
  ChevronRight,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useSettings } from "../../context/SettingsContext";
import { resolveBibleSchoolContent } from "../../data/bibleSchoolDefaults";

export function BibleSchoolSection() {
  const { settings } = useSettings();
  const data = resolveBibleSchoolContent(settings);

  return (
    <section
      id="bible-school"
      className="py-16 sm:py-24 bg-[#0a1628] text-white relative overflow-hidden scroll-mt-24"
      data-testid="bible-school-section"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(234,179,8,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(30,58,138,0.35),transparent_50%)]" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-4">
          <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/30 hover:bg-amber-400/15">
            <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
            {data.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {data.headline}{" "}
            <span className="text-amber-400 block sm:inline">{data.accent}</span>
          </h2>
          <p className="text-blue-100/90 text-lg leading-relaxed italic">{data.motto}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Flyer / image */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-3 bg-gradient-to-br from-amber-400/20 to-blue-600/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-2xl shadow-black/40">
              <img
                src={data.image || "/gosbc-admission-flyer.png"}
                alt={data.collegeName}
                className="w-full h-auto object-cover"
              />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-[#0a1628] font-bold text-sm sm:text-base shadow-lg shadow-amber-400/25">
              <Sparkles className="h-4 w-4 shrink-0" />
              {data.announcement} — only {data.formPrice}
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-100">{data.collegeName}</h3>
              <p className="mt-3 text-blue-100/85 leading-relaxed">{data.description}</p>
            </div>

            <p className="text-lg font-medium text-white border-l-4 border-amber-400 pl-4">
              {data.tagline}
            </p>

            {data.items?.length > 0 && (
              <div className="space-y-3">
                {data.items.map((item, index) => (
                  <Card
                    key={index}
                    className="bg-white/5 border-white/10 text-white backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    <CardContent className="p-4 flex gap-3 items-start">
                      <div className="shrink-0 p-2 rounded-lg bg-amber-400/15 text-amber-300">
                        <Flame className="h-4 w-4" />
                      </div>
                      <p className="text-sm sm:text-base text-blue-50 leading-relaxed">
                        {item.question}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {data.scriptureRef && (
              <p className="text-sm text-amber-200/80 flex items-center gap-2">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>{data.scriptureRef}</span>
              </p>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4">
              <p className="text-sm uppercase tracking-widest text-amber-300 font-semibold">
                {data.formInstructions}
              </p>
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-200/70 mb-2">
                  {data.contactHeading}
                </p>
                <div className="flex flex-wrap gap-3">
                  {data.phoneList.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-400 text-[#0a1628] px-4 py-2.5 font-semibold text-sm hover:bg-amber-300 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {phone}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-amber-400 text-[#0a1628] hover:bg-amber-300 font-semibold w-full sm:w-auto"
            >
              <Link to="/contact">
                Enquire about admission
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
