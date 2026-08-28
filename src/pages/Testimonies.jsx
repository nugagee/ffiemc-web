import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Quote, Star } from "lucide-react";
import { useCollection } from "../hooks/useCollection";
import { testimonies as mockTestimonies } from "../mock";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";

export const Testimonies = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, "testimonies", "hero");
  const { items, loading } = useCollection("/testimonies");
  const testimonies = items.length ? items : mockTestimonies;

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">
            {hero.badge}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline}
            <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
          <div className="mt-8">
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
              <Link to="/share-testimony">Share Your Testimony</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loading ? (
              <p className="text-center text-gray-500 col-span-full">Loading testimonies...</p>
            ) : testimonies.length === 0 ? (
              <p className="text-center text-gray-500 col-span-full">No testimonies yet.</p>
            ) : (
              testimonies.map((testimony) => (
                <Card
                  key={testimony.id || testimony._id}
                  className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-0 shadow-lg"
                >
                  <div className="absolute top-4 right-4 bg-yellow-100 p-2 rounded-full">
                    <Quote className="h-5 w-5 text-yellow-600" />
                  </div>
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      {testimony.image ? (
                        <img
                          src={testimony.image}
                          alt={testimony.name}
                          className="w-16 h-16 rounded-full object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xl font-semibold shadow-lg">
                          {(testimony.name || "?").charAt(0)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-xl">{testimony.name}</CardTitle>
                        <p className="text-sm text-red-600 font-medium">{testimony.role}</p>
                        {testimony.dateJoined && (
                          <p className="text-xs text-gray-500">
                            Member since {testimony.dateJoined}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {testimony.title && (
                      <p className="text-sm font-semibold text-gray-900">{testimony.title}</p>
                    )}
                    <blockquote className="text-gray-700 italic leading-relaxed">
                      &ldquo;{testimony.testimony}&rdquo;
                    </blockquote>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="text-center mt-12">
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
              <Link to="/share-testimony">Share Your Story</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Testimonies;
