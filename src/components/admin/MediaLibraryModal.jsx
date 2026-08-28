import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ImagePlus, Link2, Loader2, Search, Upload } from "lucide-react";
import { authApi, formatApiError } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

const LOCAL_KEY = "ffiemc_media_library";

function readLocalMedia() {
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeLocalMedia(rows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(0, 200)));
}

function rememberLocal(item) {
  const next = [item, ...readLocalMedia().filter((row) => row.url !== item.url)];
  writeLocalMedia(next);
  window.dispatchEvent(new Event("ffiemc-media-updated"));
  return next;
}

function mergeMedia(...lists) {
  const map = new Map();
  lists.flat().forEach((item) => {
    if (!item?.url) return;
    if (!map.has(item.url)) map.set(item.url, item);
  });
  return Array.from(map.values());
}

export default function MediaLibraryModal({
  open,
  onOpenChange,
  onSelect,
  selectedUrl = "",
  title = "Featured image",
  description = "Upload a new image or reuse one from the media library.",
  confirmLabel = "Set featured image",
}) {
  const [tab, setTab] = useState("library");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(selectedUrl);
  const [urlValue, setUrlValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await authApi.listMedia();
      setItems(mergeMedia(remote, readLocalMedia()));
    } catch {
      setItems(readLocalMedia());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPicked(selectedUrl || "");
    setTab("library");
    setQuery("");
    setUrlValue("");
    load();
  }, [open, selectedUrl, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!q) return true;
      return [item.name, item.url].join(" ").toLowerCase().includes(q);
    });
  }, [items, query]);

  const addItem = async (url, name = "") => {
    const item = { id: url, url, name: name || url.split("/").pop(), created_at: new Date().toISOString() };
    try {
      const saved = await authApi.addMedia(url, item.name);
      const next = { ...item, ...(saved || {}) };
      rememberLocal(next);
      setItems((prev) => mergeMedia([next], prev));
      return next;
    } catch {
      rememberLocal(item);
      setItems((prev) => mergeMedia([item], prev));
      return item;
    }
  };

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Images must be 8MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await authApi.uploadMedia(file);
      const item = await addItem(uploaded.url, file.name);
      setPicked(item.url);
      setTab("library");
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail || err.message) || "Upload failed. You can still paste an image URL.");
      setTab("url");
    } finally {
      setUploading(false);
    }
  };

  const confirm = () => {
    if (!picked) {
      toast.error("Select an image first");
      return;
    }
    addItem(picked);
    onSelect?.(picked);
    onOpenChange?.(false);
  };

  const useUrl = async () => {
    if (!urlValue.trim()) {
      toast.error("Paste an image URL");
      return;
    }
    const item = await addItem(urlValue.trim());
    setPicked(item.url);
    onSelect?.(item.url);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[min(86vh,760px)] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload files</TabsTrigger>
              <TabsTrigger value="library">Media library</TabsTrigger>
              <TabsTrigger value="url">From URL</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload" className="flex-1 min-h-0 px-6 py-4 m-0">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`flex h-full min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
                dragOver ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-red-50/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-red-500 mb-3" />
                  <p className="font-semibold">Drop an image here, or click to browse</p>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG, WEBP or GIF up to 8MB</p>
                </>
              )}
            </label>
          </TabsContent>

          <TabsContent value="library" className="flex-1 min-h-0 m-0 flex flex-col px-6 py-4">
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media" className="pl-9 rounded-xl" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-gray-500">
                  <ImagePlus className="h-8 w-8 mb-2 text-gray-300" />
                  <p>No images yet. Upload a file or paste a URL.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {visible.map((item) => {
                    const active = picked === item.url;
                    return (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setPicked(item.url)}
                        onDoubleClick={() => {
                          setPicked(item.url);
                          addItem(item.url, item.name);
                          onSelect?.(item.url);
                          onOpenChange?.(false);
                        }}
                        className={`group relative overflow-hidden rounded-xl border-2 aspect-square bg-gray-50 text-left transition-all duration-200 ${
                          active ? "border-red-600 ring-2 ring-red-200" : "border-transparent hover:border-gray-200"
                        }`}
                      >
                        <img src={item.url} alt={item.name || ""} className="h-full w-full object-cover" />
                        {active && (
                          <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-600 text-white inline-flex items-center justify-center">
                            <Check size={14} />
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-black/55 text-[11px] text-white truncate px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.name || "Image"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="flex-1 px-6 py-6 m-0 space-y-3">
            <Label>Image URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9 rounded-xl"
                  placeholder="https://…"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
              </div>
              <Button className="rounded-xl bg-red-600 hover:bg-red-700" onClick={useUrl}>
                Use image
              </Button>
            </div>
            {urlValue && (
              <div className="mt-4 overflow-hidden rounded-xl bg-gray-50 aspect-video">
                <img src={urlValue} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-gray-50">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl bg-red-600 hover:bg-red-700" disabled={!picked} onClick={confirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useRecentMedia(limit = 6) {
  const [items, setItems] = useState(readLocalMedia());

  const refresh = useCallback(() => {
    authApi
      .listMedia()
      .then((rows) => setItems(mergeMedia(rows, readLocalMedia())))
      .catch(() => setItems(readLocalMedia()));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("ffiemc-media-updated", refresh);
    return () => window.removeEventListener("ffiemc-media-updated", refresh);
  }, [refresh]);

  return items.slice(0, limit);
}
