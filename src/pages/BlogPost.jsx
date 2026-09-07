import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { CONVENTION_BLOG_POSTS } from '../data/conventionContent';
import { blogPostPath, isUuid } from '../lib/blog';
import { BlogPostArticle } from '../components/blog/BlogPostArticle';
import { Button } from '../components/ui/button';
import { Flame } from 'lucide-react';

export const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const key = decodeURIComponent(String(id || "").trim());
    const seeded = CONVENTION_BLOG_POSTS.find(
      (p) => String(p.id) === key || p.slug === key
    );
    if (seeded) {
      setPost(seeded);
      setNotFound(false);
      if (seeded.slug && (isUuid(key) || key !== seeded.slug)) {
        navigate(blogPostPath(seeded), { replace: true });
      }
      return undefined;
    }
    setPost(null);
    setNotFound(false);
    api
      .get(`/blog/${encodeURIComponent(key)}`)
      .then((res) => {
        const row = res.data;
        setPost(row);
        if (row?.slug && (isUuid(key) || key !== row.slug)) {
          navigate(blogPostPath(row), { replace: true });
        }
      })
      .catch(() => setNotFound(true));
    return undefined;
  }, [id, navigate]);

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4" data-testid="blogpost-notfound">
        <p className="text-gray-600">Post not found.</p>
        <Button asChild className="bg-red-600 hover:bg-red-700"><Link to="/blog">Back to Blog</Link></Button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Flame className="h-10 w-10 text-red-600 animate-pulse" />
      </div>
    );
  }

  return <BlogPostArticle post={post} />;
};
