import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, Users, Music, BookOpen, Heart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const SERVICE_ICONS = [Heart, Users, BookOpen, Music, Heart, Users];
const SERVICE_STYLES = [
  { bg: 'bg-blue-50', icon: 'text-blue-600' },
  { bg: 'bg-red-50', icon: 'text-red-600' },
  { bg: 'bg-green-50', icon: 'text-green-600' },
  { bg: 'bg-orange-50', icon: 'text-orange-600' },
  { bg: 'bg-purple-50', icon: 'text-purple-600' },
  { bg: 'bg-pink-50', icon: 'text-pink-600' },
];
const EXPECT_ICONS = [Music, BookOpen, Users, Heart];

const PROGRAMME_GROUPS = ['Monthly', 'Mountain Programs', 'Yearly'];

const GROUP_STYLES = {
  Monthly: { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  'Mountain Programs': { badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  Yearly: { badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
};

function groupProgrammes(items = []) {
  const buckets = Object.fromEntries(PROGRAMME_GROUPS.map((group) => [group, []]));
  const other = [];
  items.forEach((item) => {
    const group = item.group || '';
    if (buckets[group]) buckets[group].push(item);
    else other.push(item);
  });
  const grouped = PROGRAMME_GROUPS
    .filter((group) => buckets[group].length)
    .map((group) => ({ group, items: buckets[group] }));
  if (other.length) grouped.push({ group: 'Other', items: other });
  return grouped;
}

function parseFeatures(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export const Services = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'services', 'hero');
  const timesCopy = pageSection(settings, 'services', 'times');
  const programmesCopy = pageSection(settings, 'services', 'programmes');
  const expectCopy = pageSection(settings, 'services', 'expect');
  const guidelinesCopy = pageSection(settings, 'services', 'guidelines');
  const cta = pageSection(settings, 'services', 'cta');
  const serviceTimes = (timesCopy.items?.length ? timesCopy.items : settings.serviceTimes) || [];
  const specialServices = (programmesCopy.items?.length ? programmesCopy.items : settings.programmes) || [];
  const groupedProgrammes = useMemo(() => groupProgrammes(specialServices), [specialServices]);
  const expectItems = expectCopy.items || [];
  const guidelines = guidelinesCopy.items || [];

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline}
            <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro || settings.servicesIntro}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{timesCopy.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {timesCopy.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {timesCopy.intro}
            </p>
          </div>

          {serviceTimes.length === 0 ? (
            <p className="text-center text-gray-500">No service times yet. Add them in Admin → Services.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {serviceTimes.map((service, index) => {
                const Icon = SERVICE_ICONS[index % SERVICE_ICONS.length];
                const style = SERVICE_STYLES[index % SERVICE_STYLES.length];
                const features = parseFeatures(service.features);
                return (
                  <Card key={`${service.name}-${index}`} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                    <CardHeader className="text-center pb-6">
                      <div className={`inline-flex items-center justify-center w-16 h-16 ${style.bg} rounded-full mb-4 mx-auto`}>
                        <Icon className={`h-8 w-8 ${style.icon}`} />
                      </div>
                      <div className="space-y-2">
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{service.day}</Badge>
                        <CardTitle className="text-2xl">{service.name}</CardTitle>
                        <div className="flex items-center justify-center text-red-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-medium">{service.time}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      <CardDescription className="text-gray-600 text-base leading-relaxed">
                        {service.description}
                      </CardDescription>
                      {features.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">What to Expect:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {features.map((feature, idx) => (
                              <div key={idx} className="flex items-center text-sm text-gray-600">
                                <div className="w-2 h-2 bg-red-600 rounded-full mr-2" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{programmesCopy.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {programmesCopy.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {programmesCopy.intro}
            </p>
          </div>

          {specialServices.length === 0 ? (
            <p className="text-center text-gray-500">No programmes listed yet.</p>
          ) : (
            <div className="space-y-12">
              {groupedProgrammes.map(({ group, items }) => {
                const style = GROUP_STYLES[group] || { badge: 'bg-gray-100 text-gray-700', border: 'border-gray-200' };
                return (
                  <div key={group}>
                    <div className="flex items-center gap-3 mb-6">
                      <Badge className={style.badge}>{group}</Badge>
                      <div className={`flex-1 h-px ${style.border} border-t`} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map((service, index) => (
                        <Card key={`${group}-${service.title}-${index}`} className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                              <CardTitle className="text-lg leading-snug">{service.title}</CardTitle>
                              {service.frequency && (
                                <Badge variant="secondary" className="text-xs shrink-0 max-w-[45%] text-right leading-tight text-white">
                                  {service.frequency}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-gray-600 leading-relaxed">
                              {service.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{expectCopy.badge}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {expectCopy.heading}
                </h2>
                <div className="space-y-4">
                  {expectItems.map((item, index) => {
                    const Icon = EXPECT_ICONS[index % EXPECT_ICONS.length];
                    return (
                      <div key={`${item.title}-${index}`} className="flex items-start space-x-4">
                        <div className="bg-red-100 p-2 rounded-lg mt-1">
                          <Icon className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.title}</h4>
                          <p className="text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{guidelinesCopy.heading}</h3>
                <div className="bg-red-50 rounded-lg p-6 space-y-4">
                  {guidelines.map((item, index) => (
                    <div key={`${item.title}-${index}`}>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">{cta.heading}</h2>
            <p className="text-xl text-red-100 leading-relaxed">{cta.body}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-red-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold">
                <Link to="/contact">Plan Your Visit</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold">
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
