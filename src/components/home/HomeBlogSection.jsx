import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Calendar, FileText, User } from "lucide-react";
import { mergeBlogPosts } from "../../lib/blog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1200&h=630&fit=crop";

export { mergeBlogPosts, postTimestamp } from "../../lib/blog";

function postDate(post) {
  const raw = post?.published_at || post?.created_at || post?.date;
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function BlogPostMeta({ post }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
      <span className="inline-flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" />
        {post.author || "Fire-Fire Church"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        {postDate(post)}
      </span>
    </div>
  );
}

function FeaturedBlogCard({ post }) {
  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="h-full"
    >
      <Link to={`/blog/${post.id}`} className="group block h-full">
        <Card className="h-full overflow-hidden border-0 shadow-2xl bg-gray-900 text-white">
          <div className="relative min-h-[22rem] lg:min-h-[28rem]">
            <img
              src={post.image || FALLBACK_IMAGE}
              alt={post.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/75 to-gray-900/20" />
            <div className="relative h-full flex flex-col justify-end p-6 sm:p-8 lg:p-10">
              <Badge className="bg-red-600 text-white hover:bg-red-600 w-fit mb-4">
                {post.category || "Article"}
              </Badge>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3 group-hover:text-red-100 transition-colors">
                {post.title}
              </h3>
              <p className="text-gray-200 text-base sm:text-lg leading-relaxed line-clamp-3 max-w-2xl mb-5">
                {post.excerpt}
              </p>
              <BlogPostMeta post={post} />
              <span className="inline-flex items-center gap-2 mt-6 text-red-300 font-semibold group-hover:gap-3 transition-all">
                Read article <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function HomeBlogSection({
  posts = [],
  badge = "From the Blog",
  heading = "Latest Articles & Stories",
  body = "Teaching, inspiration, and church news — fresh from our ministry.",
  limit = 5,
}) {
  const articles = useMemo(() => posts.slice(0, limit), [posts, limit]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mobileApi, setMobileApi] = useState(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  const activePost = articles[active] || articles[0];

  useEffect(() => {
    setActive(0);
    setMobileIndex(0);
    mobileApi?.scrollTo(0);
  }, [articles, mobileApi]);

  const advance = useCallback(() => {
    if (articles.length < 2) return;
    setActive((prev) => (prev + 1) % articles.length);
  }, [articles.length]);

  useEffect(() => {
    if (paused || articles.length < 2) return undefined;
    const timer = window.setInterval(advance, 6000);
    return () => window.clearInterval(timer);
  }, [advance, paused, articles.length]);

  useEffect(() => {
    if (!mobileApi) return undefined;
    const onSelect = () => setMobileIndex(mobileApi.selectedScrollSnap());
    onSelect();
    mobileApi.on("select", onSelect);
    return () => mobileApi.off("select", onSelect);
  }, [mobileApi]);

  const mobileAutoplay = useMemo(
    () => Autoplay({ delay: 5500, stopOnInteraction: true, stopOnMouseEnter: true }),
    []
  );

  if (!articles.length) return null;

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.2),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.08),transparent_40%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 sm:mb-12">
          <div className="space-y-3 max-w-2xl">
            <Badge className="bg-red-600/90 text-white hover:bg-red-600">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{heading}</h2>
            <p className="text-gray-300 text-lg leading-relaxed">{body}</p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-white/20 text-white hover:bg-white hover:text-gray-900 shrink-0"
          >
            <Link to="/blog">
              View all resources <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Desktop: featured + interactive list */}
        <div
          className="hidden lg:grid lg:grid-cols-[1.35fr_0.65fr] gap-6"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="min-h-[28rem]">
            <AnimatePresence mode="wait">
              {activePost ? <FeaturedBlogCard post={activePost} /> : null}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-3">
            {articles.map((post, index) => {
              const selected = index === active;
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`text-left rounded-2xl border p-4 transition-all duration-300 ${
                    selected
                      ? "border-red-500/60 bg-red-600/15 shadow-lg shadow-red-900/20 scale-[1.02]"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-800">
                      <img
                        src={post.image || FALLBACK_IMAGE}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className={`mb-2 text-[10px] ${selected ? "border-red-400 text-red-200" : "border-white/20 text-gray-300"}`}
                      >
                        {post.category}
                      </Badge>
                      <p className={`font-semibold leading-snug line-clamp-2 ${selected ? "text-white" : "text-gray-200"}`}>
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{postDate(post)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile & tablet: autoplay carousel + dots */}
        <div className="lg:hidden">
          <Carousel
            className="w-full"
            opts={{ align: "start", loop: articles.length > 1 }}
            plugins={[mobileAutoplay]}
            setApi={setMobileApi}
          >
            <CarouselContent className="ml-0">
              {articles.map((post) => (
                <CarouselItem key={post.id} className="pl-0 basis-full">
                  <FeaturedBlogCard post={post} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="flex items-center justify-center gap-1.5 mt-5">
            {articles.map((post, index) => (
              <button
                key={`dot-${post.id}`}
                type="button"
                aria-label={`Go to article ${index + 1}`}
                onClick={() => mobileApi?.scrollTo(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === mobileIndex ? "h-2.5 w-7 bg-red-500" : "h-2 w-2 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress bar — desktop auto-rotate indicator */}
        {articles.length > 1 && (
          <div className="hidden lg:flex items-center gap-3 mt-6">
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                key={active}
                className="h-full bg-red-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">
              {active + 1} / {articles.length}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export default HomeBlogSection;
