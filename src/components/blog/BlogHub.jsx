import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar, Church, Download, Eye, FileText, Mic2, Sun, User } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DownloadDocumentButton } from "../admin/DownloadDocumentButton";
import { resourceToDocument } from "../../lib/resourceDocument";
import { blogPostPath } from "../../lib/blog";
import { ResourcePreviewDialog } from "./ResourcePreviewDialog";

const BLOG_CATEGORIES = ["All", "Education", "Music", "News", "Politics", "Youth", "Teaching", "Faith", "Worship", "Events", "General"];

export function ResourceDownloadMenu({ resource, label = "Download" }) {
  return (
    <DownloadDocumentButton
      size="sm"
      variant="outline"
      label={label}
      getDocument={() => resourceToDocument(resource)}
    />
  );
}

export function BlogHubTabs({ active, onChange }) {
  const tabs = [
    { id: "articles", label: "Articles", icon: FileText },
    { id: "sunday-sermon", label: "Sunday Sermons", icon: Church },
    { id: "choir", label: "Choir", icon: Mic2 },
    { id: "bible-study", label: "Monday Bible Study", icon: BookOpen },
    { id: "daily-manna", label: "Daily Manna", icon: Sun },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              selected
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "bg-white text-gray-700 border border-gray-200 hover:border-red-200 hover:text-red-600"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function BlogCategoryFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            value === cat ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export function ArticleCards({ posts = [], fmtDate }) {
  if (!posts.length) {
    return <p className="text-center text-gray-500 py-10">No articles in this category yet.</p>;
  }
  // Posts arrive newest-first; lead with the latest article.
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      {featured && (
        <Link to={blogPostPath(featured)} data-testid={`blog-featured-${featured.id}`}>
          <Card className="mb-12 overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 grid md:grid-cols-2">
            {featured.image && (
              <div className="aspect-video md:aspect-auto overflow-hidden">
                <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-8 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className="bg-red-600 text-white w-fit">Latest</Badge>
                {featured.category ? (
                  <Badge className="bg-red-100 text-red-700 w-fit">{featured.category}</Badge>
                ) : null}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{featured.title}</h2>
              <p className="text-gray-600 mb-4">{featured.excerpt}</p>
              <div className="flex items-center text-sm text-gray-500 gap-4">
                <span className="flex items-center gap-1"><User className="h-4 w-4" />{featured.author}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{fmtDate(featured.published_at || featured.created_at)}</span>
              </div>
            </div>
          </Card>
        </Link>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rest.map((post) => (
          <Link key={post.id} to={blogPostPath(post)} data-testid={`blog-card-${post.id}`}>
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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">
                    {fmtDate(post.published_at || post.created_at)}
                  </span>
                  <span className="text-red-600 font-medium text-sm flex items-center">
                    Read More <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ChurchResourceCards({ items = [], dateKey, dateLabel }) {
  const [preview, setPreview] = useState(null);

  if (!items.length) {
    return <p className="text-center text-gray-500 py-10">No entries published yet. Check back soon.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((item) => {
          const hasBody = Boolean(String(item.content || item.excerpt || "").trim());
          return (
            <Card key={item.id} className="overflow-hidden border-0 shadow-lg">
              <div className="h-1.5 bg-gradient-to-r from-red-600 to-amber-500" />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className="bg-red-100 text-red-700 mb-2">{dateLabel}</Badge>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="mt-2">{item.excerpt}</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {item[dateKey] ? new Date(item[dateKey]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="prose prose-sm max-w-none text-gray-700 line-clamp-6"
                  dangerouslySetInnerHTML={{ __html: item.content || "" }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    disabled={!hasBody}
                    onClick={() => setPreview(item)}
                  >
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </Button>
                  <ResourceDownloadMenu resource={item} />
                  {item.attachment_url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={item.attachment_url} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4 mr-2" /> Original file
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ResourcePreviewDialog
        resource={preview}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        dateKey={dateKey}
        dateLabel={dateLabel}
      />
    </>
  );
}

export { BLOG_CATEGORIES };
