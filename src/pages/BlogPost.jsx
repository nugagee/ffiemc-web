import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { BlogPostArticle } from '../components/blog/BlogPostArticle';
import { Button } from '../components/ui/button';
import { Flame } from 'lucide-react';

export const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/blog/${id}`)
      .then((res) => setPost(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

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
