import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Autoplay from 'embla-carousel-autoplay';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import { Calendar, Clock, MapPin, Users, Heart, Flame, ArrowRight, Play, ChevronRight, Quote, Star, Facebook, Twitter, Instagram, Music, MessageCircle, Share, ThumbsUp } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';
import {
  heroSlides as mockHeroSlides,
  events as mockEvents,
  sermons as mockSermons,
  ministries as mockMinistries,
  testimonies as mockTestimonies,
} from '../mock';

export const Home = () => {
  const { settings } = useSettings();
  const serviceTimes = settings.serviceTimes || [];
  const stats = settings.stats || [];
  const welcome = pageSection(settings, 'home', 'welcome');
  const eventsCopy = pageSection(settings, 'home', 'eventsPreview');
  const sermonsCopy = pageSection(settings, 'home', 'sermonsPreview');
  const ministriesCopy = pageSection(settings, 'home', 'ministriesPreview');
  const ctaCopy = pageSection(settings, 'home', 'cta');
  const testimoniesCopy = pageSection(settings, 'home', 'testimoniesPreview');
  const socialCopy = pageSection(settings, 'home', 'social');
  const socialPosts = socialCopy.items || [];
  const { items: eventsApi } = useCollection('/events');
  const { items: sermonsApi } = useCollection('/sermons');
  const { items: testimoniesApi } = useCollection('/testimonies');
  const { items: ministriesApi } = useCollection('/ministries');
  const { items: heroFromApi } = useCollection('/hero-slides');
  // Use CMS data when present; fall back to mock until admin publishes content
  const events = eventsApi.length ? eventsApi : mockEvents;
  const sermons = sermonsApi.length ? sermonsApi : mockSermons;
  const testimonies = testimoniesApi.length ? testimoniesApi : mockTestimonies;
  const ministries = ministriesApi.length ? ministriesApi : mockMinistries;
  const heroSlides = (heroFromApi.length ? [...heroFromApi] : [...mockHeroSlides])
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const upcomingEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  const latestSermons = sermons.slice(0, 2);
  const featuredMinistries = ministries.slice(0, 3);
  const carouselTestimonies = useMemo(() => {
    const featured = testimonies.filter((t) => t.featured);
    const rest = testimonies.filter((t) => !t.featured);
    const ordered = [...featured, ...rest];
    return ordered.length ? ordered : testimonies;
  }, [testimonies]);
  const testimonyAutoplay = useMemo(
    () => Autoplay({ delay: 5500, stopOnInteraction: true, stopOnMouseEnter: true }),
    []
  );
  const heroAutoplay = useMemo(
    () => Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
    []
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Hero Carousel Section */}
      <section className="relative w-full max-w-full">
        <Carousel
          className="w-full max-w-full"
          opts={{ align: 'start', loop: true }}
          plugins={[heroAutoplay]}
        >
          <CarouselContent className="ml-0">
            {heroSlides.map((slide) => (
              <CarouselItem key={slide.id} className="pl-0 basis-full min-w-0">
                <div className="relative w-full h-[70vh] min-h-[520px] max-h-[640px] sm:h-[80vh] sm:min-h-0 sm:max-h-none lg:h-[90vh] overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${slide.backgroundImage})` }}
                  >
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 via-red-800/60 to-transparent" />
                  </div>

                  <div className="relative h-full w-full flex items-end sm:items-center pt-20 pb-28 sm:pt-24 sm:pb-32 md:pb-36">
                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="w-full max-w-3xl text-white space-y-4 sm:space-y-8">
                        <div className="space-y-2.5 sm:space-y-4">
                          <Badge className="bg-red-600/90 text-white hover:bg-red-600 border-0 px-2.5 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm max-w-full">
                            <Flame className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
                            <span className="truncate max-w-[14rem] sm:max-w-none">{settings.name}</span>
                          </Badge>
                          <h1 className="text-[1.75rem] leading-tight sm:text-5xl md:text-7xl font-bold sm:leading-tight">
                            {slide.title}
                          </h1>
                          <p className="text-sm sm:text-xl md:text-2xl font-medium text-red-100 line-clamp-2 sm:line-clamp-none">
                            {slide.subtitle}
                          </p>
                          <p className="hidden sm:block text-lg md:text-xl text-gray-200 leading-relaxed max-w-xl">
                            {slide.description}
                          </p>
                        </div>

                        <div className="flex flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 sm:flex-none h-9 sm:h-12 px-3 sm:px-8 text-xs sm:text-lg font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg sm:shadow-xl"
                          >
                            <Link to={slide.ctaLink}>
                              <span className="truncate">{slide.ctaText}</span>
                              <ArrowRight className="ml-1 sm:ml-2 h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none h-9 sm:h-12 px-3 sm:px-8 text-xs sm:text-lg font-semibold rounded-full border border-white sm:border-2 text-white hover:bg-white hover:text-red-600 bg-transparent backdrop-blur-sm"
                          >
                            <Link to="/services">
                              <Play className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />
                              Watch Live
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex left-4 md:left-8 bg-white/20 border-white/30 text-white hover:bg-white hover:text-red-600" />
          <CarouselNext className="hidden sm:flex right-4 md:right-8 bg-white/20 border-white/30 text-white hover:bg-white hover:text-red-600" />
        </Carousel>
      </section>

      {/* Service Times Quick Access */}
      {serviceTimes.length > 0 && (
        <section className="relative z-10 w-full -mt-14 sm:-mt-20 md:-mt-28 px-3 sm:px-4 pb-4 sm:pb-6">
          <div className="w-full max-w-6xl mx-auto bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl sm:shadow-2xl border border-white/20">
            <div className="text-center mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Join Us for Worship</h3>
              <p className="text-[11px] sm:text-sm text-gray-600">All are welcome to experience God's love</p>
            </div>
            <div
              className={`flex gap-2.5 sm:gap-4 pb-1 scroll-smooth [scrollbar-width:thin] ${
                serviceTimes.length >= 5
                  ? 'overflow-x-auto snap-x snap-mandatory'
                  : 'overflow-x-auto snap-x snap-mandatory sm:overflow-visible sm:snap-none sm:flex-wrap sm:justify-center'
              }`}
            >
              {serviceTimes.map((service, i) => (
                <div
                  key={service.id || i}
                  className={`snap-start text-center p-2.5 sm:p-3 bg-red-50 rounded-lg ${
                    serviceTimes.length >= 5
                      ? 'shrink-0 w-[9.5rem] sm:w-[11.5rem]'
                      : 'shrink-0 w-[9.5rem] sm:w-auto sm:flex-1 sm:min-w-[10rem] sm:max-w-[15rem]'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 min-w-0">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                    <p className="font-medium text-gray-900 text-xs sm:text-sm leading-snug break-words">{service.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-600">{service.day}</p>
                    <p className="text-[10px] sm:text-xs font-medium text-red-600">{service.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Welcome Section with Video */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-gradient-to-br from-red-50/20 to-orange-50/20"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-3 sm:space-y-4">
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Welcome Home</Badge>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                  {(welcome.headline || 'Teaching One by One Another').split(' ').slice(0, -2).join(' ')}
                  <span className="text-red-600 block">{(welcome.headline || 'Teaching One by One Another').split(' ').slice(-2).join(' ')}</span>
                </h2>
                <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                  {welcome.body}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                  <div className="bg-red-100 p-2.5 sm:p-3 rounded-full w-fit mx-auto mb-2 sm:mb-3">
                    <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{welcome.card1Title}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{welcome.card1Body}</p>
                </div>
                <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                  <div className="bg-red-100 p-2.5 sm:p-3 rounded-full w-fit mx-auto mb-2 sm:mb-3">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{welcome.card2Title}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{welcome.card2Body}</p>
                </div>
              </div>

              {stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center p-3 sm:p-4 bg-red-50 rounded-xl">
                      <div className="text-xl sm:text-2xl font-bold text-red-600">{stat.value}</div>
                      <div className="text-[10px] sm:text-xs text-gray-600 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-row gap-2 sm:gap-4">
                <Button asChild size="sm" className="flex-1 sm:flex-none h-9 sm:h-11 px-3 sm:px-8 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white">
                  <Link to="/about">
                    Discover Our Story
                    <ChevronRight className="ml-1 sm:ml-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none h-9 sm:h-11 px-3 sm:px-8 text-xs sm:text-sm border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                  <Link to="/leadership">Meet Our Team</Link>
                </Button>
              </div>
            </div>

            <div className="relative max-w-sm mx-auto lg:max-w-none">
              <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                <img 
                  src={settings.logo}
                  alt="Church Logo"
                  className="w-full max-w-md mx-auto rounded-xl sm:rounded-2xl shadow-2xl"
                />
              </div>
              <div className="absolute -top-3 -right-2 sm:-top-4 sm:-right-4 bg-red-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold">{stats[0]?.value || '15+'}</div>
                  <div className="text-[10px] sm:text-xs">{stats[0]?.label || 'Years Serving'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events - Enhanced */}
      <section className="py-20 bg-red-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800"></div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-black/20 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge className="bg-red-800 text-white hover:bg-red-800">{eventsCopy.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">{eventsCopy.heading}</h2>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              {eventsCopy.body}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {upcomingEvents.map((event, index) => (
              <Card key={event.id} className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${event.featured ? "bg-yellow-500 text-black" : "bg-white/20 text-white"}`}>
                      {event.featured ? "Featured" : "Event"}
                    </Badge>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-red-100">{event.time}</p>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-red-100 text-base">
                    {event.description}
                  </CardDescription>
                  <div className="flex items-center text-sm text-red-200">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                  <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white hover:text-red-600">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-white text-red-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold">
              <Link to="/events">View All Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Sermons - Enhanced */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge className="bg-red-600 text-white hover:bg-red-600">{sermonsCopy.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">{sermonsCopy.heading}</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              {sermonsCopy.body}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {latestSermons.map((sermon, index) => (
              <Card key={sermon.id} className="bg-white/5 backdrop-blur-lg border-white/10 text-white hover:bg-white/10 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <Badge className="bg-red-600 text-white hover:bg-red-600">{sermon.series}</Badge>
                      <CardTitle className="text-2xl">{sermon.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-300">
                        <span>{sermon.pastor}</span>
                        <span>•</span>
                        <span>{new Date(sermon.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="bg-red-600 p-3 rounded-full">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-gray-300 text-base">
                    {sermon.description}
                  </CardDescription>
                  <div className="text-sm text-gray-400">
                    <strong>Scripture:</strong> {sermon.scripture}
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      <Play className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white hover:text-gray-900">
                      Listen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-semibold">
              <Link to="/sermons">View All Sermons</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Ministries Preview - Enhanced */}
      <section className="py-20 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{ministriesCopy.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{ministriesCopy.heading}</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {ministriesCopy.body}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredMinistries.map((ministry, index) => (
              <Card key={ministry.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0 shadow-lg">
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={ministry.image}
                    alt={ministry.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <Badge className="bg-red-600 text-white">{ministry.name}</Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{ministry.name}</CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    {ministry.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-red-600" />
                      <span className="text-gray-600">Led by {ministry.leader}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-red-600" />
                      <span className="text-gray-600">{ministry.meetingTime}</span>
                    </div>
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    Join Ministry
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-6 text-lg font-semibold">
              <Link to="/ministries">Explore All Ministries</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Enhanced */}
      <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="bg-red-800 text-white hover:bg-red-800 px-4 py-2 text-lg">
                <Flame className="w-5 h-5 mr-2" />
                {ctaCopy.badge}
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold">
                {ctaCopy.heading}
              </h2>
              <p className="text-xl md:text-2xl text-red-100 max-w-3xl mx-auto leading-relaxed">
                {ctaCopy.body}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-white text-red-600 hover:bg-gray-100 px-10 py-8 text-xl font-semibold rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
              >
                <Link to="/contact">
                  <Calendar className="mr-3 h-6 w-6" />
                  Visit This Sunday
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-10 py-8 text-xl font-semibold rounded-full backdrop-blur-sm"
              >
                <Link to="/prayer-request">
                  <Heart className="mr-3 h-6 w-6" />
                  Request Prayer
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonies Section — autoplay carousel */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{testimoniesCopy.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{testimoniesCopy.heading}</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {testimoniesCopy.body}
            </p>
          </div>

          {carouselTestimonies.length > 0 && (
            <Carousel
              className="w-full"
              opts={{ align: 'start', loop: true }}
              plugins={[testimonyAutoplay]}
            >
              <CarouselContent className="-ml-4">
                {carouselTestimonies.map((testimony) => (
                  <CarouselItem
                    key={testimony.id || testimony.name}
                    className="pl-4 basis-full md:basis-1/2"
                  >
                    <Card className="relative h-full overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                      <div className="absolute top-4 right-4">
                        <div className="bg-yellow-100 p-2 rounded-full">
                          <Quote className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                      <CardHeader className="space-y-4">
                        <div className="flex items-center space-x-4">
                          {testimony.image ? (
                            <img
                              src={testimony.image}
                              alt={testimony.name}
                              className="w-16 h-16 rounded-full object-cover shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xl font-semibold shadow-lg">
                              {(testimony.name || '?').charAt(0)}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-xl text-gray-900">{testimony.name}</CardTitle>
                            <p className="text-sm text-red-600 font-medium">{testimony.role}</p>
                            {testimony.dateJoined && (
                              <p className="text-xs text-gray-500">Member since {testimony.dateJoined}</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <blockquote className="text-gray-700 italic leading-relaxed text-base line-clamp-6">
                          &ldquo;{testimony.testimony}&rdquo;
                        </blockquote>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                          <span className="text-sm text-gray-500 ml-2">Blessed by God&apos;s goodness</span>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex -left-3 lg:-left-12" />
              <CarouselNext className="hidden sm:flex -right-3 lg:-right-12" />
            </Carousel>
          )}

          <div className="text-center mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" variant="outline" className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-6 text-lg font-semibold">
              <Link to="/testimonies">Read More Stories</Link>
            </Button>
            <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-semibold">
              <Link to="/share-testimony">Share Your Testimony</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Social Media Feed Section */}
      <section className="py-20 bg-gradient-to-br from-gray-100 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{socialCopy.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{socialCopy.heading}</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {socialCopy.body}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {socialPosts.slice(0, 6).map((post, index) => {
              const platformIcons = {
                facebook: Facebook,
                instagram: Instagram,
                twitter: Twitter,
                tiktok: Music,
                youtube: Play,
                audiomack: Music
              };
              const platformColors = {
                facebook: "bg-blue-600",
                instagram: "bg-gradient-to-br from-purple-600 to-pink-600",
                twitter: "bg-sky-500",
                tiktok: "bg-black",
                youtube: "bg-red-600",
                audiomack: "bg-orange-500"
              };
              const platform = String(post.platform || "facebook").toLowerCase();
              const PlatformIcon = platformIcons[platform] || Share;
              
              return (
                <Card key={`${platform}-${index}`} className="hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg">
                  {post.image && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={post.image}
                        alt={`${platform} post`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-full ${platformColors[platform] || "bg-gray-700"} text-white`}>
                          <PlatformIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-gray-900 capitalize">{platform}</span>
                      </div>
                      <span className="text-sm text-gray-500">{post.timestamp}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-gray-700 text-sm leading-relaxed">
                      {post.content}
                    </CardDescription>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 text-gray-500">
                          <ThumbsUp className="h-4 w-4" />
                          <span className="text-sm">{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">{post.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <Share className="h-4 w-4" />
                          <span className="text-sm">{post.shares}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {!socialPosts.length && (
            <p className="text-center text-gray-500 mt-4">No social posts yet. Add them from Admin → Home → Social feed.</p>
          )}

          <div className="text-center mt-12">
            <div className="space-y-4">
              <p className="text-lg text-gray-600">Follow us on all platforms</p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {[
                  {
                    key: "facebook",
                    label: "Facebook",
                    href: settings.socials?.facebook || "https://www.facebook.com/firefireministry",
                    icon: Facebook,
                    className: "hover:bg-blue-50 hover:border-blue-500",
                    iconClass: "text-blue-600",
                  },
                  {
                    key: "instagram",
                    label: "Instagram",
                    href: settings.socials?.instagram || "https://www.instagram.com/firefireministry",
                    icon: Instagram,
                    className: "hover:bg-pink-50 hover:border-pink-500",
                    iconClass: "text-pink-600",
                  },
                  {
                    key: "twitter",
                    label: "Twitter",
                    href: settings.socials?.twitter || "https://x.com/firefiremin",
                    icon: Twitter,
                    className: "hover:bg-sky-50 hover:border-sky-500",
                    iconClass: "text-sky-600",
                  },
                  {
                    key: "tiktok",
                    label: "TikTok",
                    href: settings.socials?.tiktok || "https://www.tiktok.com/@firefire.ministry",
                    icon: Music,
                    className: "hover:bg-gray-50 hover:border-gray-500",
                    iconClass: "text-gray-700",
                  },
                  {
                    key: "audiomack",
                    label: "Audiomack",
                    href: settings.socials?.audiomack || "https://audiomack.com/fire-fire-ministry",
                    icon: Music,
                    className: "hover:bg-orange-50 hover:border-orange-500",
                    iconClass: "text-orange-600",
                  },
                ]
                  .filter((item) => item.href)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.key}
                        asChild
                        variant="outline"
                        size="sm"
                        className={item.className}
                      >
                        <a href={item.href} target="_blank" rel="noreferrer">
                          <Icon className={`h-4 w-4 mr-2 ${item.iconClass}`} />
                          {item.label}
                        </a>
                      </Button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};