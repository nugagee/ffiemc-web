import React from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Mail, Calendar, Users, Heart, BookOpen } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const DEPT_ICONS = [Heart, Users, Users, Users, Heart, BookOpen];

export const Leadership = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'leadership', 'hero');
  const teamBlock = pageSection(settings, 'leadership', 'team');
  const deptBlock = pageSection(settings, 'leadership', 'departments');
  const values = pageSection(settings, 'leadership', 'values');
  const cta = pageSection(settings, 'leadership', 'cta');
  const leadership = teamBlock.items || [];
  const departments = deptBlock.items || [];
  const qualities = values.items || [];

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

      {/* Senior Leadership */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{teamBlock.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {teamBlock.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {teamBlock.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {leadership.map((leader, index) => (
              <Card key={`${leader.name || "leader"}-${index}`} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg text-center">
                <CardHeader className="pb-6">
                  <div className="relative inline-block mb-6">
                    <img 
                      src={leader.image}
                      alt={leader.name}
                      className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg"
                    />
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-red-600 text-white px-3 py-1 text-xs">
                        {leader.position}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-gray-900">{leader.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {leader.bio}
                  </CardDescription>
                  
                  {/* <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-4">
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                  </div> */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{deptBlock.badge}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {deptBlock.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {deptBlock.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => {
              const Icon = DEPT_ICONS[index % DEPT_ICONS.length];
              return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Icon className="h-5 w-5 text-red-600" />
                    </div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                  </div>
                  <div className="text-sm text-red-600 font-medium">
                    Led by {dept.head}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{values.badge}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {values.heading}
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  {values.body}
                </p>
              </div>
              
              <div className="space-y-4">
                {qualities.map((item, index) => {
                  const Icon = [Heart, Users, BookOpen][index % 3];
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

            <div className="space-y-6">
              <div className="bg-red-50 rounded-2xl p-8">
                <blockquote className="text-xl italic text-gray-700 mb-4">
                  "{values.quote}"
                </blockquote>
                <cite className="text-red-600 font-medium">- {values.cite}</cite>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{values.stat1Value}</div>
                  <div className="text-sm text-gray-600">{values.stat1Label}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{values.stat2Value}</div>
                  <div className="text-sm text-gray-600">{values.stat2Label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Leadership */}
      <section className="py-16 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              {cta.heading}
            </h2>
            <p className="text-xl text-red-100 leading-relaxed">
              {cta.body}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
              >
                Contact Leadership
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-8 py-6 text-lg font-semibold"
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