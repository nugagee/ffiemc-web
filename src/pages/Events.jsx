import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { MapPin, Clock, Calendar } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { events as mockEvents } from '../mock';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
};

export const Events = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'events', 'hero');
  const { items, loading } = useCollection('/events');
  const sorted = [...(items.length ? items : mockEvents)].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="min-h-screen" data-testid="events-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
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
            <p className="text-center text-gray-500">Loading events...</p>
          ) : sorted.length === 0 ? (
            <p className="text-center text-gray-500" data-testid="events-empty">No events scheduled yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sorted.map((event) => (
                <Card key={event.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1" data-testid={`event-card-${event.id}`}>
                  <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Calendar className="h-5 w-5" /><span className="font-semibold">{fmtDate(event.date)}</span></div>
                    {event.featured && <Badge className="bg-yellow-500 text-black">Featured</Badge>}
                  </div>
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription className="flex flex-col gap-1 mt-2">
                      {event.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.time}</span>}
                      {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
