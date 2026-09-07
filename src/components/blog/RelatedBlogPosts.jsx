import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { mergeBlogPosts, relatedBlogPosts, blogPostPath } from "../../lib/blog";
import { CONVENTION_BLOG_POSTS } from "../../data/conventionContent";
import { Badge } from "../ui/badge";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&h=450&fit=crop";

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function RelatedBlogPosts({ post, limit = 3 }) {
  const { items, loading } = useCollection("/blog");
  const related = useMemo(() => {
    const all = mergeBlogPosts(items, CONVENTION_BLOG_POSTS);
    return relatedBlogPosts(post, all, limit);
  }, [items, post, limit]);

  if (loading || !related.length) return null;

  return (
    <section className="mt-14 pt-10 border-t border-gray-100" data-testid="related-blog-posts">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Keep reading</p>
        <h2 className="text-2xl font-bold text-gray-900">Related articles</h2>
        <p className="text-sm text-gray-500 mt-1">More teaching and stories you may enjoy next.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {related.map((item) => (
          <Link
            key={item.id || item.slug}
            to={blogPostPath(item)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            data-testid={`related-post-${item.id}`}
          >
            <div className="aspect-[16/10] overflow-hidden bg-gray-100">
              <img
                src={item.image || FALLBACK_IMAGE}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center gap-2 mb-2">
                {item.category ? (
                  <Badge className="bg-red-50 text-red-700 hover:bg-red-50 text-[11px]">{item.category}</Badge>
                ) : null}
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(item.published_at || item.created_at)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-red-700 transition-colors">
                {item.title}
              </h3>
              {item.excerpt ? (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2 flex-1">{item.excerpt}</p>
              ) : null}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 text-center sm:text-left">
        <Link to="/blog" className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors">
          Browse all articles →
        </Link>
      </div>
    </section>
  );
}

export default RelatedBlogPosts;
