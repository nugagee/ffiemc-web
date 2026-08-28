import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { blogPosts as mockBlog } from '../mock';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
};

export const Blog = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'blog', 'hero');
  const { items, loading } = useCollection('/blog');
  const posts = items.length ? items : mockBlog;
  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = posts.filter((p) => p.id !== featured?.id);

  return (
    <div className="min-h-screen" data-testid="blog-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline} <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-lg md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-center text-gray-500" data-testid="blog-loading">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-500" data-testid="blog-empty">No posts yet. Check back soon!</p>
          ) : (
            <>
              {featured && (
                <Link to={`/blog/${featured.id}`} data-testid={`blog-featured-${featured.id}`}>
                  <Card className="mb-12 overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 grid md:grid-cols-2">
                    {featured.image && (
                      <div className="aspect-video md:aspect-auto overflow-hidden">
                        <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-8 flex flex-col justify-center">
                      <Badge className="bg-red-600 text-white w-fit mb-3">{featured.category}</Badge>
                      <h2 className="text-3xl font-bold text-gray-900 mb-3">{featured.title}</h2>
                      <p className="text-gray-600 mb-4">{featured.excerpt}</p>
                      <div className="flex items-center text-sm text-gray-500 gap-4">
                        <span className="flex items-center gap-1"><User className="h-4 w-4" />{featured.author}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{fmtDate(featured.created_at)}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rest.map((post) => (
                  <Link key={post.id} to={`/blog/${post.id}`} data-testid={`blog-card-${post.id}`}>
                    <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {post.image && (
                        <div className="aspect-video overflow-hidden">
                          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardHeader>
                        <Badge className="bg-red-100 text-red-700 w-fit mb-2">{post.category}</Badge>
                        <CardTitle className="text-xl">{post.title}</CardTitle>
                        <CardDescription>{post.excerpt}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-red-600 font-medium text-sm flex items-center">
                          Read More <ArrowRight className="ml-1 h-4 w-4" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
