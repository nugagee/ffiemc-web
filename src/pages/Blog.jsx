import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { useChurchResources } from '../hooks/useChurchResources';
import { useNewsArticles } from '../hooks/useNewsArticles';
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
import { NewsArticleCards } from '../components/blog/NewsArticleCards';

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

const VALID_TABS = new Set(['articles', 'christian-news', 'daily-manna']);
const MOVED_TO_SERMONS = new Set(['sunday-sermon', 'choir', 'bible-study']);

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

function sermonsRedirectPath(tab) {
  if (!MOVED_TO_SERMONS.has(tab)) return null;
  return `/sermons?tab=${tab}`;
}

export const Blog = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const hero = pageSection(settings, 'blog', 'hero');
  const { items, loading } = useCollection('/blog');
  const { items: dailyManna, loading: mannaLoading } = useChurchResources('daily_manna');
  const [tab, setTab] = useState(() => initialTab(location));
  const [category, setCategory] = useState('All');
  const [newsCategory, setNewsCategory] = useState('christian');
  const { items: newsItems, loading: newsLoading } = useNewsArticles(
    null,
    tab === 'christian-news'
  );

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('ffiemc_blog_tab');
      if (MOVED_TO_SERMONS.has(stored)) {
        sessionStorage.removeItem('ffiemc_blog_tab');
        navigate(sermonsRedirectPath(stored), { replace: true });
        return;
      }
    } catch {
      /* ignore */
    }

    const fromState = location?.state?.blogTab;
    try {
      const params = new URLSearchParams(location?.search || "");
      const fromQuery = params.get("tab");
      const candidate = VALID_TABS.has(fromState)
        ? fromState
        : VALID_TABS.has(fromQuery)
          ? fromQuery
          : MOVED_TO_SERMONS.has(fromState)
            ? fromState
            : MOVED_TO_SERMONS.has(fromQuery)
              ? fromQuery
              : null;

      if (candidate && MOVED_TO_SERMONS.has(candidate)) {
        navigate(sermonsRedirectPath(candidate), { replace: true });
        return;
      }
      if (candidate && VALID_TABS.has(candidate)) setTab(candidate);
    } catch {
      /* ignore */
    }
  }, [location?.state?.blogTab, location?.search, navigate]);

  const onTabChange = (next) => {
    if (!VALID_TABS.has(next)) return;
    setTab(next);
    navigate(
      { pathname: '/blog', search: next === 'articles' ? '' : `?tab=${next}` },
      { replace: true, state: { blogTab: next } }
    );
  };

  const posts = useMemo(() => mergePosts(items.length ? items : mockBlog), [items]);
  const filteredPosts = useMemo(() => {
    if (category === 'All') return posts;
    return posts.filter((p) => String(p.category || '').toLowerCase() === category.toLowerCase());
  }, [posts, category]);

  const sectionLoading =
    tab === 'articles' ? loading : tab === 'christian-news' ? newsLoading : mannaLoading;

  return (
    <div className="min-h-screen" data-testid="blog-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge || 'From Our Heart'}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {hero.headline || 'The Fire'} <span className="text-red-600 block">{hero.accent || 'Blog'}</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro ||
              'Articles, Christian & education news, and Daily Manna from Fire-Fire International Evangelical Church. For Sunday sermons, choir, and Bible study, visit Sermons.'}
          </p>
          <div className="mt-8">
            <BlogHubTabs active={tab} onChange={onTabChange} />
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
          ) : tab === 'christian-news' ? (
            <>
              <div className="mb-4 text-center max-w-2xl mx-auto">
                <p className="text-sm text-gray-500">
                  Faith/church and Nigerian education headlines only — from publishers like
                  Christianity Today (Nigeria) and Punch Education. Use filter, sort, and layout
                  controls below. Read full stories on the original website.
                </p>
              </div>
              <NewsArticleCards
                items={newsItems}
                filter={newsCategory}
                onFilterChange={setNewsCategory}
              />
            </>
          ) : (
            <ChurchResourceCards items={dailyManna} dateKey="study_date" dateLabel="Date" />
          )}
        </div>
      </section>
    </div>
  );
};
