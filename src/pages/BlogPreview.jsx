import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BlogPostArticle } from "../components/blog/BlogPostArticle";
import { readBlogPreview } from "../lib/blog";
import { Button } from "../components/ui/button";

export function BlogPreview() {
  const location = useLocation();
  const [post, setPost] = useState(null);

  useEffect(() => {
    setPost(readBlogPreview());
  }, [location.search]);

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4" data-testid="blog-preview-empty">
        <p className="text-gray-600">No preview is available. Open Preview from the blog editor.</p>
        <Button asChild className="bg-red-600 hover:bg-red-700">
          <Link to="/admin/blog">Back to blog</Link>
        </Button>
      </div>
    );
  }

  return <BlogPostArticle post={post} preview />;
}
