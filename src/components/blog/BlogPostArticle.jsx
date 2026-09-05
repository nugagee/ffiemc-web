import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { looksLikeHtml, sanitizeHtml } from "../../lib/blog";
import { applyBlogShareMeta } from "../../lib/blogAnalytics";
import { Badge } from "../ui/badge";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { BlogReactions } from "./BlogReactions";
import { BlogShareBar } from "./BlogShareBar";
import { BlogComments } from "./BlogComments";
import { BlogReadTracker } from "./BlogReadTracker";

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return d;
  }
};

export function BlogPostArticle({ post, preview = false }) {
  useEffect(() => {
    if (!post || preview) return undefined;
    return applyBlogShareMeta(post);
  }, [post, preview]);

  if (!post) return null;

  return (
    <article className="min-h-screen" data-testid={preview ? "blogpost-preview" : "blogpost-page"}>
      {preview && (
        <div className="sticky top-0 z-30 bg-amber-500 text-white text-center text-sm font-medium py-2 px-4">
          Preview — this post is not published yet
        </div>
      )}
      {post.image && (
        <div className="relative h-[50vh] overflow-hidden">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full text-white">
              <Badge className="bg-red-600 text-white mb-4">{post.category || "General"}</Badge>
              <h1 className="text-3xl md:text-5xl font-bold">{post.title || "Untitled post"}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!preview && (
          <Link to="/blog" className="inline-flex items-center text-red-600 mb-8 hover:underline" data-testid="blogpost-back">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
          </Link>
        )}
        {!post.image && <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title || "Untitled post"}</h1>}
        <div className="flex items-center text-sm text-gray-500 gap-6 mb-8 border-b pb-6">
          <span className="flex items-center gap-1"><User className="h-4 w-4" />{post.author || "—"}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {fmtDate(post.published_at || post.created_at)}
          </span>
        </div>
        {looksLikeHtml(post.content) ? (
          <div
            className="blog-prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
        ) : (
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {post.content || <span className="text-gray-400 italic">No content yet.</span>}
          </div>
        )}
        {!preview && (
          <>
            <BlogReactions post={post} />
            <BlogShareBar post={post} />
            <BlogComments post={post} />
          </>
        )}
      </div>
      {!preview && <BlogReadTracker post={post} />}
    </article>
  );
}
