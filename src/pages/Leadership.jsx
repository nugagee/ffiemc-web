import React from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Mail, Users, Heart, BookOpen, Phone, MapPin } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const DEPT_ICONS = [Heart, Users, Users, Users, Heart, BookOpen];

export const Leadership = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'leadership', 'hero');
  const teamBlock = pageSection(settings, 'leadership', 'team');
  const youthEscos = pageSection(settings, 'leadership', 'youthEscos');
  const deptBlock = pageSection(settings, 'leadership', 'departments');
  const values = pageSection(settings, 'leadership', 'values');
  const cta = pageSection(settings, 'leadership', 'cta');
  const leadership = teamBlock.items || [];
  const departments = deptBlock.items || [];
  const qualities = values.items || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            {hero.headline}
            <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      {/* Senior Leadership */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{teamBlock.badge}</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {teamBlock.heading}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {teamBlock.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {leadership.map((leader, index) => (
              <Card
                key={`${leader.name || "leader"}-${index}`}
                className="min-w-0 overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-lg text-center"
              >
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 space-y-3">
                  <div className="mx-auto">
                    <img
                      src={leader.image}
                      alt={leader.name}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full mx-auto object-cover shadow-lg"
                    />
                  </div>
                  <div className="space-y-2 min-w-0 px-1">
                    <CardTitle className="text-xl sm:text-2xl text-gray-900 break-words leading-snug">
                      {leader.name}
                    </CardTitle>
                    {leader.position ? (
                      <Badge className="max-w-full whitespace-normal text-center h-auto bg-red-600 text-white px-3 py-1 text-xs leading-snug">
                        {leader.position}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                  <CardDescription className="text-gray-600 text-sm sm:text-base leading-relaxed break-words">
                    {leader.bio}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {youthEscos.items?.length > 0 && (
        <section id="youth-escos" className="py-12 sm:py-20 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white scroll-mt-24">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12 space-y-3">
              <Badge className="bg-red-600 text-white hover:bg-red-600">{youthEscos.badge}</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{youthEscos.heading}</h2>
              <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
                {youthEscos.intro}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {youthEscos.items.map((esco, index) => (
                <Card
                  key={`${esco.email || esco.name}-${index}`}
                  className="min-w-0 overflow-hidden border-0 bg-white/5 text-white hover:bg-white/10 transition-all duration-300 shadow-xl"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-gray-800">
                    {esco.image ? (
                      <img
                        src={esco.image}
                        alt={esco.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-red-300">
                        {(esco.name || "?").charAt(0)}
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 sm:p-5 pb-2 space-y-2 min-w-0">
                    <CardTitle className="text-base sm:text-lg leading-snug break-words">
                      {esco.name}
                    </CardTitle>
                    {esco.post ? (
                      <Badge className="w-fit max-w-full whitespace-normal text-left h-auto bg-red-600 text-white hover:bg-red-600 text-[11px] font-medium leading-snug">
                        {esco.post}
                      </Badge>
                    ) : null}
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-sm text-gray-300 pb-5 min-w-0">
                    {esco.branch && (
                      <p className="flex items-start gap-2 min-w-0">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                        <span className="break-words">{esco.branch}</span>
                      </p>
                    )}
                    {esco.email && (
                      <a href={`mailto:${esco.email}`} className="flex items-start gap-2 min-w-0 hover:text-white">
                        <Mail className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                        <span className="break-all">{esco.email}</span>
                      </a>
                    )}
                    {esco.phone && (
                      <a href={`tel:${String(esco.phone).replace(/\s/g, "")}`} className="flex items-start gap-2 min-w-0 hover:text-white">
                        <Phone className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                        <span className="break-words">{esco.phone}</span>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Departments */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{deptBlock.badge}</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {deptBlock.heading}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {deptBlock.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {departments.map((dept, index) => {
              const Icon = DEPT_ICONS[index % DEPT_ICONS.length];
              return (
              <Card key={index} className="min-w-0 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-3 min-w-0">
                    <div className="bg-red-100 p-2 rounded-lg shrink-0">
                      <Icon className="h-5 w-5 text-red-600" />
                    </div>
                    <CardTitle className="text-lg break-words leading-snug">{dept.name}</CardTitle>
                  </div>
                  <div className="text-sm text-red-600 font-medium break-words">
                    Led by {dept.head}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <CardDescription className="text-gray-600 break-words">
                    {dept.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      </section>

      {/* Leadership Qualities */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-6 min-w-0">
              <div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{values.badge}</Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  {values.heading}
                </h2>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  {values.body}
                </p>
              </div>
              
              <div className="space-y-4">
                {qualities.map((item, index) => {
                  const Icon = [Heart, Users, BookOpen][index % 3];
                  return (
                    <div key={`${item.title}-${index}`} className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <div className="bg-red-100 p-2 rounded-lg mt-1 shrink-0">
                        <Icon className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 break-words">{item.title}</h4>
                        <p className="text-gray-600 break-words">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 min-w-0">
              <div className="bg-red-50 rounded-2xl p-5 sm:p-8">
                <blockquote className="text-lg sm:text-xl italic text-gray-700 mb-4 break-words">
                  "{values.quote}"
                </blockquote>
                <cite className="text-red-600 font-medium">- {values.cite}</cite>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 break-words">{values.stat1Value}</div>
                  <div className="text-xs sm:text-sm text-gray-600 break-words">{values.stat1Label}</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 break-words">{values.stat2Value}</div>
                  <div className="text-xs sm:text-sm text-gray-600 break-words">{values.stat2Label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Leadership */}
      <section className="py-12 sm:py-16 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 text-center">
          <div className="space-y-5 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              {cta.heading}
            </h2>
            <p className="text-base sm:text-xl text-red-100 leading-relaxed">
              {cta.body}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-gray-100 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold w-full sm:w-auto"
              >
                Contact Leadership
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold w-full sm:w-auto"
              >
                Learn About Service
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};