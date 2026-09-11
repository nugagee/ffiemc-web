import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
} from '../components/blog/BlogHub';
import { MediaResourceCards } from '../components/blog/MediaResourceCards';

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

const VALID_TABS = new Set(['articles', 'sunday-sermon', 'choir', 'bible-study', 'daily-manna']);

function initialTab(location) {
  const fromState = location?.state?.blogTab;
  if (VALID_TABS.has(fromState)) return fromState;
  try {
    const params = new URLSearchParams(location?.search || "");
    const fromQuery = params.get("tab");
    if (VALID_TABS.has(fromQuery)) return fromQuery;
  } catch {
    /* ignore */
  }
  try {
    const stored = sessionStorage.getItem('ffiemc_blog_tab');
    if (VALID_TABS.has(stored)) {
      sessionStorage.removeItem('ffiemc_blog_tab');
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'articles';
}

export const Blog = () => {
  const location = useLocation();
  const { settings } = useSettings();
  const hero = pageSection(settings, 'blog', 'hero');
  const { items, loading } = useCollection('/blog');
  const { items: bibleStudies, loading: bibleLoading } = useChurchResources('bible_study');
  const { items: dailyManna, loading: mannaLoading } = useChurchResources('daily_manna');
  const { items: sundaySermons, loading: sundayLoading } = useChurchResources('sunday_sermon');
  const { items: choirItems, loading: choirLoading } = useChurchResources('choir_ministration');
  const [tab, setTab] = useState(() => initialTab(location));
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const next = location?.state?.blogTab;
    if (VALID_TABS.has(next)) {
      setTab(next);
      return;
    }
    try {
      const params = new URLSearchParams(location?.search || "");
      const fromQuery = params.get("tab");
      if (VALID_TABS.has(fromQuery)) setTab(fromQuery);
    } catch {
      /* ignore */
    }
  }, [location?.state?.blogTab, location?.search]);

  const posts = useMemo(() => mergePosts(items.length ? items : mockBlog), [items]);
  const filteredPosts = useMemo(() => {
    if (category === 'All') return posts;
    return posts.filter((p) => String(p.category || '').toLowerCase() === category.toLowerCase());
  }, [posts, category]);

  const sectionLoading =
    tab === 'articles' ? loading
      : tab === 'bible-study' ? bibleLoading
        : tab === 'daily-manna' ? mannaLoading
          : tab === 'sunday-sermon' ? sundayLoading
            : choirLoading;

  return (
    <div className="min-h-screen" data-testid="blog-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge || 'Resources'}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {hero.headline || 'Church'} <span className="text-red-600 block">{hero.accent || 'Resources & Blog'}</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro ||
              'Articles, Sunday sermons, choir ministrations, Monday Bible study, and Daily Manna — watch on this site or download where available.'}
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
          ) : tab === 'sunday-sermon' ? (
            <MediaResourceCards items={sundaySermons} badge="Sunday sermon" />
          ) : tab === 'choir' ? (
            <MediaResourceCards items={choirItems} badge="Choir" />
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
