import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Play, Music, BookOpen } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { sermons as mockSermons } from '../mock';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
};

export const Sermons = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'sermons', 'hero');
  const { items, loading } = useCollection('/sermons');
  const sermons = items.length ? items : mockSermons;

  return (
    <div className="min-h-screen" data-testid="sermons-page">
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-600 text-white hover:bg-red-600 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {hero.headline} <span className="text-red-500 block">{hero.accent}</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-center text-gray-500">Loading sermons...</p>
          ) : sermons.length === 0 ? (
            <p className="text-center text-gray-500" data-testid="sermons-empty">No sermons yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {sermons.map((sermon) => (
                <Card key={sermon.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300" data-testid={`sermon-card-${sermon.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        {sermon.series && <Badge className="bg-red-600 text-white">{sermon.series}</Badge>}
                        <CardTitle className="text-2xl">{sermon.title}</CardTitle>
                        <div className="text-sm text-gray-500">{sermon.pastor} • {fmtDate(sermon.date)}</div>
                      </div>
                      <div className="bg-red-600 p-3 rounded-full"><Play className="h-6 w-6 text-white" /></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-base">{sermon.description}</CardDescription>
                    {sermon.scripture && <p className="text-sm text-gray-500"><BookOpen className="h-4 w-4 inline mr-1 text-red-600" /><strong>Scripture:</strong> {sermon.scripture}</p>}
                    <div className="flex gap-3">
                      {sermon.videoUrl && <Button asChild size="sm" className="bg-red-600 hover:bg-red-700"><a href={sermon.videoUrl} target="_blank" rel="noreferrer"><Play className="h-4 w-4 mr-2" />Watch</a></Button>}
                      {sermon.audioUrl && <Button asChild size="sm" variant="outline" className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"><a href={sermon.audioUrl} target="_blank" rel="noreferrer"><Music className="h-4 w-4 mr-2" />Listen</a></Button>}
                    </div>
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
