import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Heart, Users, BookOpen, Flame, MapPin, Clock, Calendar } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const VALUE_ICONS = [Heart, BookOpen, Users, Flame];

export const About = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'about', 'hero');
  const mission = pageSection(settings, 'about', 'mission');
  const valuesBlock = pageSection(settings, 'about', 'values');
  const historyBlock = pageSection(settings, 'about', 'history');
  const pastor = pageSection(settings, 'about', 'pastor');
  const visit = pageSection(settings, 'about', 'visit');
  const values = valuesBlock.items || [];
  const history = historyBlock.items || [];
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

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{valuesBlock.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {valuesBlock.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {valuesBlock.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const Icon = VALUE_ICONS[index % VALUE_ICONS.length];
              return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="bg-red-100 p-3 rounded-lg">
                      <Icon className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      </section>

      {/* Church History Timeline */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{historyBlock.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {historyBlock.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {historyBlock.intro}
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-red-200"></div>
            <div className="space-y-12">
              {history.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-red-600 text-white">{milestone.year}</Badge>
                        </div>
                        <CardTitle className="text-xl">{milestone.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-gray-600">
                          {milestone.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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