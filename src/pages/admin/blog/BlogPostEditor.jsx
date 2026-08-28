import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Eye, ImageIcon, Loader2, Save } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import api, { formatApiError } from "../../../lib/api";
import {
  fromDatetimeLocal,
  postStatus,
  slugify,
  toDatetimeLocal,
  wordCount,
  writeBlogPreview,
} from "../../../lib/blog";
import RichTextEditor from "../../../components/admin/RichTextEditor";
import MediaLibraryModal, { useRecentMedia } from "../../../components/admin/MediaLibraryModal";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";

const CATEGORIES = ["Faith", "Teaching", "Worship", "Family", "Youth", "Testimony", "Events", "General"];

const emptyPost = (author = "") => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  author,
  category: "General",
  tags: "",
  image: "",
  featured: false,
  status: "draft",
  scheduled_at: "",
});

export default function BlogPostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const [form, setForm] = useState(emptyPost(user?.username || ""));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaMode, setMediaMode] = useState("featured");
  const insertBodyImage = useRef(null);
  const recentMedia = useRecentMedia(6);

  const canEdit = can("blog.posts", "edit");
  const canView = can("blog.posts", "view");

  useEffect(() => {
    if (isNew || !canView) return undefined;
    let alive = true;
    api
      .get(`/blog/${id}?all=1`)
      .then((res) => {
        if (!alive) return;
        const post = res.data || {};
        setForm({
          title: post.title || "",
          slug: post.slug || slugify(post.title || ""),
          excerpt: post.excerpt || "",
          content: post.content || "",
          author: post.author || user?.username || "",
          category: post.category || "General",
          tags: post.tags || "",
          image: post.image || "",
          featured: Boolean(post.featured),
          status: postStatus(post),
          scheduled_at: toDatetimeLocal(post.scheduled_at),
        });
        setSlugTouched(Boolean(post.slug));
      })
      .catch(() => {
        toast.error("Post not found");
        navigate("/admin/blog");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, isNew, canView, navigate, user?.username]);

  const setField = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "title" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const payload = (status) => ({
    title: form.title.trim(),
    slug: slugify(form.slug || form.title),
    excerpt: form.excerpt.trim(),
    content: form.content,
    author: form.author.trim(),
    category: form.category.trim() || "General",
    tags: form.tags.trim(),
    image: form.image.trim(),
    featured: Boolean(form.featured),
    status,
    published: status === "published",
    scheduled_at: status === "scheduled" ? fromDatetimeLocal(form.scheduled_at) : "",
  });

  const save = async (status) => {
    if (!form.title.trim()) {
      toast.error("Add a title before saving");
      return;
    }
    if (status === "scheduled" && !form.scheduled_at) {
      toast.error("Choose a publish date and time");
      return;
    }
    setSaving(true);
    try {
      const body = payload(status);
      if (isNew) {
        const { data } = await api.post("/blog", body);
        toast.success(status === "published" ? "Post published" : status === "scheduled" ? "Post scheduled" : "Draft saved");
        navigate(`/admin/blog/${data.id}/edit`, { replace: true });
      } else {
        await api.put(`/blog/${id}`, body);
        setForm((prev) => ({ ...prev, status }));
        toast.success(status === "published" ? "Post published" : status === "scheduled" ? "Schedule updated" : "Draft saved");
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const words = useMemo(() => wordCount(form.content), [form.content]);

  const openPreview = () => {
    writeBlogPreview(form);
    window.open(`/blog/preview?t=${Date.now()}`, "ffiemc-blog-preview");
  };

  const openMedia = (mode) => {
    setMediaMode(mode);
    setMediaOpen(true);
  };

  const onMediaSelect = (url) => {
    if (mediaMode === "body") {
      insertBodyImage.current?.(url);
      return;
    }
    setField("image", url);
  };

  if (user === null) return null;
  if (!canView) return <Navigate to="/admin" replace />;
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/admin/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={14} /> All posts
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">{isNew ? "Create new post" : "Edit post"}</h1>
          <p className="text-sm text-gray-500 mt-1">{words} words · {canEdit ? "Changes save as draft, scheduled, or published." : "View only"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={openPreview}>
            <Eye size={15} /> Preview
          </Button>
          {form.status === "published" && id && (
            <Button asChild variant="outline" className="rounded-xl">
              <a href={`/blog/${id}`} target="_blank" rel="noreferrer">
                View live
              </a>
            </Button>
          )}
          {canEdit && (
            <>
              <Button variant="outline" className="rounded-xl" disabled={saving} onClick={() => save("draft")}>
                Save draft
              </Button>
              {form.status === "scheduled" || form.scheduled_at ? (
                <Button className="bg-amber-600 hover:bg-amber-700 rounded-xl" disabled={saving} onClick={() => save("scheduled")}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock size={15} />}
                  Schedule
                </Button>
              ) : null}
              <Button className="bg-red-600 hover:bg-red-700 rounded-xl min-w-[8rem]" disabled={saving} onClick={() => save(form.status === "scheduled" && form.scheduled_at ? "scheduled" : "published")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={15} />}
                {form.status === "scheduled" ? "Update schedule" : isNew ? "Publish" : "Update"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          <input
            value={form.title}
            disabled={!canEdit}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Add title"
            className="w-full bg-transparent text-3xl md:text-5xl font-bold tracking-tight placeholder:text-gray-300 focus:outline-none"
          />
          <Textarea
            value={form.excerpt}
            disabled={!canEdit}
            onChange={(e) => setField("excerpt", e.target.value)}
            placeholder="Write a short excerpt for the blog listing…"
            rows={3}
            className="rounded-2xl resize-none"
          />
          <RichTextEditor
            key={id || "new"}
            value={form.content}
            disabled={!canEdit}
            onChange={(html) => setField("content", html)}
            onRequestImage={(insert) => {
              insertBodyImage.current = insert;
              openMedia("body");
            }}
          />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="space-y-4 xl:sticky xl:top-6 self-start"
        >
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Publish</h2>
            <div className="mt-4 space-y-3">
              {[
                { id: "draft", label: "Draft", hint: "Only admins can see this" },
                { id: "published", label: "Publish now", hint: "Goes live on the website" },
                { id: "scheduled", label: "Schedule", hint: "Publish at a future time" },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-200 ${
                    form.status === option.id ? "border-red-200 bg-red-50/70" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    className="mt-1 accent-red-600"
                    disabled={!canEdit}
                    checked={form.status === option.id}
                    onChange={() => setField("status", option.id)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.hint}</span>
                  </span>
                </label>
              ))}
              {form.status === "scheduled" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">Publish at</Label>
                  <Input
                    type="datetime-local"
                    className="mt-2 rounded-xl"
                    disabled={!canEdit}
                    value={form.scheduled_at}
                    onChange={(e) => setField("scheduled_at", e.target.value)}
                  />
                </motion.div>
              )}
            </div>
            {canEdit && (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" disabled={saving} onClick={() => save("draft")}>
                    Draft
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={openPreview}>
                    <Eye size={15} /> Preview
                  </Button>
                </div>
                <Button
                  className="w-full rounded-xl bg-red-600 hover:bg-red-700"
                  disabled={saving}
                  onClick={() => save(form.status === "scheduled" ? "scheduled" : "published")}
                >
                  {form.status === "scheduled" ? "Schedule" : "Publish"}
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2"><ImageIcon size={16} /> Featured image</h2>
            <div className="mt-3 overflow-hidden rounded-xl bg-gray-50 aspect-video">
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => openMedia("featured")}
                  className="h-full w-full flex flex-col items-center justify-center text-xs text-gray-400 hover:text-red-600 hover:bg-red-50/60 transition-colors"
                >
                  <ImageIcon className="h-6 w-6 mb-2" />
                  Set featured image
                </button>
              )}
            </div>
            {canEdit && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openMedia("featured")}>
                  {form.image ? "Replace image" : "Set featured image"}
                </Button>
                {form.image && (
                  <Button variant="ghost" size="sm" className="rounded-lg text-red-600 hover:bg-red-50" onClick={() => setField("image", "")}>
                    Remove
                  </Button>
                )}
              </div>
            )}
            {recentMedia.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Recent images</p>
                <div className="grid grid-cols-4 gap-2">
                  {recentMedia.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setField("image", item.url)}
                      className={`aspect-square overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        form.image === item.url ? "border-red-600 ring-2 ring-red-100" : "border-transparent hover:border-gray-200"
                      }`}
                      title="Reuse this image"
                    >
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div>
              <Label>Permalink slug</Label>
              <Input
                className="mt-2 rounded-xl"
                disabled={!canEdit}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", slugify(e.target.value));
                }}
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input className="mt-2 rounded-xl" disabled={!canEdit} value={form.author} onChange={(e) => setField("author", e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setField("category", cat)}
                    className={`rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                      form.category === cat ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <Input
                className="mt-2 rounded-xl"
                placeholder="faith, prayer, family"
                disabled={!canEdit}
                value={form.tags}
                onChange={(e) => setField("tags", e.target.value)}
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
              <span className="text-sm">Featured post</span>
              <Switch checked={form.featured} disabled={!canEdit} onCheckedChange={(checked) => setField("featured", checked)} />
            </label>
          </section>
        </motion.aside>
      </div>

      <MediaLibraryModal
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        selectedUrl={mediaMode === "featured" ? form.image : ""}
        onSelect={onMediaSelect}
        title={mediaMode === "body" ? "Insert image" : "Featured image"}
        description={
          mediaMode === "body"
            ? "Upload a new image or reuse one already in the library."
            : "Upload a new image or reuse a previously uploaded one."
        }
        confirmLabel={mediaMode === "body" ? "Insert image" : "Set featured image"}
      />
    </div>
  );
}
