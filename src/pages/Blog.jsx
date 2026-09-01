import React, { useMemo, useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useChurchResources } from '../hooks/useChurchResources';
import { blogPosts as mockBlog } from '../mock';
import { mergeBlogPosts } from '../lib/blog';
import { CONVENTION_BLOG_POSTS } from '../data/conventionContent';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';
import { Badge } from '../components/ui/badge';
import {
  ArticleCards,
  BlogCategoryFilter,
  BlogHubTabs,
  ChurchResourceCards,
  BLOG_CATEGORIES,
} from '../components/blog/BlogHub';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d || '';
  }
};

function mergePosts(apiPosts) {
  return mergeBlogPosts(apiPosts, CONVENTION_BLOG_POSTS);
}

export const Blog = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'blog', 'hero');
  const { items, loading } = useCollection('/blog');
  const { items: bibleStudies, loading: bibleLoading } = useChurchResources('bible_study');
  const { items: dailyManna, loading: mannaLoading } = useChurchResources('daily_manna');
  const [tab, setTab] = useState('articles');
  const [category, setCategory] = useState('All');

  const posts = useMemo(() => mergePosts(items.length ? items : mockBlog), [items]);
  const filteredPosts = useMemo(() => {
    if (category === 'All') return posts;
    return posts.filter((p) => String(p.category || '').toLowerCase() === category.toLowerCase());
  }, [posts, category]);

  const sectionLoading = tab === 'articles' ? loading : tab === 'bible-study' ? bibleLoading : mannaLoading;

  return (
    <div className="min-h-screen" data-testid="blog-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge || 'Resources'}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {hero.headline || 'Church'} <span className="text-red-600 block">{hero.accent || 'Resources & Blog'}</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro || 'Articles, Monday Bible study notes, and Daily Manna — read online or download in your preferred format.'}
          </p>
          <div className="mt-8">
            <BlogHubTabs active={tab} onChange={setTab} />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {sectionLoading ? (
            <p className="text-center text-gray-500" data-testid="blog-loading">Loading…</p>
          ) : tab === 'articles' ? (
            <>
              <div className="mb-8">
                <BlogCategoryFilter value={category} onChange={setCategory} />
              </div>
              <ArticleCards posts={filteredPosts} fmtDate={fmtDate} />
            </>
          ) : tab === 'bible-study' ? (
            <ChurchResourceCards items={bibleStudies} dateKey="week_of" dateLabel="Week of" />
          ) : (
            <ChurchResourceCards items={dailyManna} dateKey="study_date" dateLabel="Date" />
          )}
        </div>
      </section>
    </div>
  );
};

export { BLOG_CATEGORIES };
