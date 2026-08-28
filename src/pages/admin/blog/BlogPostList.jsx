import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Calendar, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useCollection } from "../../../hooks/useCollection";
import api, { formatApiError } from "../../../lib/api";
import { displayDate, postStatus, statusLabel, statusTone } from "../../../lib/blog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
];

function fmt(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function BlogPostList() {
  const { can, user } = useAuth();
  const { items, loading, reload } = useCollection("/blog?all=1");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  const canEdit = can("blog.posts", "edit");
  const canDelete = can("blog.posts", "delete");

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || []).filter((post) => {
      const status = postStatus(post);
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return [post.title, post.excerpt, post.author, post.category]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, filter]);

  if (user === null) return null;
  if (!canEdit && !canDelete) return <Navigate to="/admin" replace />;

  const doDelete = async () => {
    try {
      await api.delete(`/blog/${deleteId}`);
      toast.success("Post deleted");
      reload();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Blog</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">All posts</h1>
          <p className="text-sm text-gray-500 mt-2">Edit, schedule, or remove stories before they go live.</p>
        </div>
        {canEdit && (
          <Button asChild className="bg-red-600 hover:bg-red-700 rounded-xl h-11 px-5">
            <Link to="/admin/blog/new">
              <Plus size={16} /> New post
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, or category"
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                filter === item.id ? "bg-gray-950 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
          <p className="text-lg font-semibold">No posts yet</p>
          <p className="text-sm text-gray-500 mt-2">Create a draft, then publish or schedule it when it is ready.</p>
          {canEdit && (
            <Button asChild className="mt-6 bg-red-600 hover:bg-red-700 rounded-xl">
              <Link to="/admin/blog/new">Write the first post</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence initial={false}>
            {posts.map((post, index) => {
              const status = postStatus(post);
              return (
                <motion.article
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.04 }}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-48 h-36 md:h-auto overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 shrink-0">
                      {post.image ? (
                        <img src={post.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full min-h-[9rem] w-full flex items-center justify-center text-xs uppercase tracking-widest text-red-300">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-5 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(status)}`}>
                          {statusLabel(status)}
                        </span>
                        {post.featured && (
                          <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[11px] font-semibold">
                            Featured
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{post.category || "General"}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold leading-snug">{post.title || "Untitled post"}</h2>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt || "No excerpt yet."}</p>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1"><User size={13} />{post.author || "—"}</span>
                          <span className="inline-flex items-center gap-1"><Calendar size={13} />{fmt(displayDate(post))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button asChild variant="outline" size="sm" className="rounded-lg">
                              <Link to={`/admin/blog/${post.id}/edit`}>
                                <Pencil size={14} /> Edit
                              </Link>
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg" onClick={() => setDeleteId(post.id)}>
                              <Trash2 size={14} /> Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post from the website and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={doDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
