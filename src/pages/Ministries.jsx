import React from 'react';
import { Card, CardDescription, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Users, Clock } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { ministries as mockMinistries } from '../mock';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

export const Ministries = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'ministries', 'hero');
  const { items, loading } = useCollection('/ministries');
  const ministries = items.length ? items : mockMinistries;

  return (
    <div className="min-h-screen" data-testid="ministries-page">
      <section className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline} <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-center text-gray-500">Loading ministries...</p>
          ) : ministries.length === 0 ? (
            <p className="text-center text-gray-500" data-testid="ministries-empty">No ministries listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {ministries.map((ministry) => {
                const name = (ministry.name || '').toLowerCase();
                const anchor = name.includes('youth') ? 'youth' : name.includes('women') ? 'women' : name.includes('men') ? 'men' : ministry.id;
                return (
                  <Card key={ministry.id} id={anchor} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 scroll-mt-24" data-testid={`ministry-card-${ministry.id}`}>
                    <div className="grid sm:grid-cols-2">
                      {ministry.image && (
                        <div className="aspect-video sm:aspect-auto overflow-hidden">
                          <img src={ministry.image} alt={ministry.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-6 flex flex-col justify-center">
                        <CardTitle className="text-2xl mb-2">{ministry.name}</CardTitle>
                        <CardDescription className="text-base mb-4">{ministry.description}</CardDescription>
                        <div className="space-y-2 text-sm text-gray-600">
                          {ministry.leader && <div className="flex items-center"><Users className="h-4 w-4 mr-2 text-red-600" />Led by {ministry.leader}</div>}
                          {ministry.meetingTime && <div className="flex items-center"><Clock className="h-4 w-4 mr-2 text-red-600" />{ministry.meetingTime}</div>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
