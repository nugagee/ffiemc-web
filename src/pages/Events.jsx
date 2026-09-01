import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
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

const eventCtaLink = (event) => {
  if (event.registerSlug) return `/register/${event.registerSlug}`;
  if ((event.title || '').toLowerCase().includes('youth convention')) return '/register/youth-convention-2026';
  return null;
};

export const Events = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'events', 'hero');
  const { items, loading } = useCollection('/events');
  const list = useMemo(() => {
    const source = items.length ? items : mockEvents;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...source].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const da = a.date ? new Date(a.date) : today;
      const db = b.date ? new Date(b.date) : today;
      return da - db;
    });
  }, [items]);

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
          ) : list.length === 0 ? (
            <p className="text-center text-gray-500" data-testid="events-empty">No events scheduled yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {list.map((event) => {
                const cta = eventCtaLink(event);
                return (
                  <Card key={event.id} className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${event.featured ? 'ring-2 ring-red-200' : ''}`} data-testid={`event-card-${event.id}`}>
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={event.image || 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&h=450&fit=crop'}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-white">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="font-semibold text-sm">{fmtDate(event.date)}</span>
                        </div>
                        {event.featured && <Badge className="bg-yellow-500 text-black">Featured</Badge>}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription className="flex flex-col gap-1 mt-2">
                        {event.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.time}</span>}
                        {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                      {cta && (
                        <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                          <Link to={cta}>Register Now</Link>
                        </Button>
                      )}
                    </CardContent>
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
