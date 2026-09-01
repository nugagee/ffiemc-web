import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { MapPin, Clock, Calendar } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';
import { resolveCatechismContent, resolveDoctrinesContent, resolveHistoryContent } from '../data/aboutDefaults';
import { DoctrinesSection } from '../components/About/DoctrinesSection';
import { CatechismSection } from '../components/About/CatechismSection';
import { ChurchHistorySection } from '../components/About/ChurchHistorySection';

export const About = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'about', 'hero');
  const mission = pageSection(settings, 'about', 'mission');
  const valuesBlock = pageSection(settings, 'about', 'values');
  const pastor = pageSection(settings, 'about', 'pastor');
  const visit = pageSection(settings, 'about', 'visit');
  const doctrinesContent = resolveDoctrinesContent(settings);
  const catechismContent = resolveCatechismContent(settings);
  const historyContent = resolveHistoryContent(settings);
  const serviceTimes = settings.serviceTimes || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline}
            <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Our Mission</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {mission.motto || settings.motto}
                  </h2>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {mission.mission || settings.mission}
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {mission.vision}
                  </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-red-50 rounded-2xl p-8">
                <img 
                  src={settings.logo}
                  alt="Church Logo"
                  className="w-full max-w-sm mx-auto rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Church Doctrines */}
      <DoctrinesSection
        badge={valuesBlock.badge}
        heading={valuesBlock.heading}
        intro={valuesBlock.intro}
        purpose={doctrinesContent.purpose}
        acronyms={doctrinesContent.acronyms}
        doctrines={doctrinesContent.doctrines}
      />

      {/* Catechism */}
      <CatechismSection
        badge={catechismContent.badge}
        heading={catechismContent.heading}
        intro={catechismContent.intro}
        items={catechismContent.items}
        oldTestament={catechismContent.oldTestament}
        newTestament={catechismContent.newTestament}
      />

      {/* Church History */}
      <ChurchHistorySection
        badge={historyContent.badge}
        heading={historyContent.heading}
        intro={historyContent.intro}
        foundedDate={historyContent.foundedDate}
        founder={historyContent.founder}
        foundingPlace={historyContent.foundingPlace}
        headquarters={historyContent.headquarters}
        openingQuote={historyContent.openingQuote}
        story={historyContent.story}
        pillars={historyContent.pillars}
        timeline={historyContent.timeline}
      />

      {/* Pastor's Message */}
      <section className="py-16 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <Badge className="bg-red-700 text-white hover:bg-red-700">{pastor.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              {pastor.heading}
            </h2>
            <blockquote className="text-xl md:text-2xl italic leading-relaxed">
              "{pastor.quote}"
            </blockquote>
            <cite className="text-lg font-medium">- {settings.pastor}</cite>
          </div>
        </div>
      </section>

      {/* Visit Information */}
      
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{visit.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {visit.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {visit.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {settings.location}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Service Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {serviceTimes.map((service) => (
                  <div key={service.id} className="text-sm">
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-gray-600">{service.day} • {service.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">What to Expect</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {visit.expect}
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg">
              <Link to="/contact">Contact Us Today</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};