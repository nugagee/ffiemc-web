import { useState } from "react";
import { ImagePlus, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import MediaLibraryModal from "./MediaLibraryModal";

/**
 * Multi-image flyer gallery for scheduled popups.
 * Images shuffle by week or session based on image_shuffle on the announcement.
 */
export default function BannerImagesField({
  idPrefix = "banner-images",
  images = [],
  onChange,
  disabled = false,
}) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState(null);
  const list = Array.isArray(images) ? images.filter(Boolean) : [];

  const setList = (next) => onChange?.(next);

  const updateAt = (idx, url) => {
    const next = [...list];
    next[idx] = url;
    setList(next);
  };

  const removeAt = (idx) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const addEmpty = () => setList([...list, ""]);

  const onPick = (url) => {
    if (!url) return;
    if (replaceIndex == null) {
      setList([...list, url]);
    } else {
      updateAt(replaceIndex, url);
    }
    setReplaceIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>Popup flyer images</Label>
          <p className="text-xs text-gray-500 mt-1">
            Add multiple flyers — they shuffle each week (or each visit session). Upload more any time.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setReplaceIndex(null);
            setMediaOpen(true);
          }}
        >
          <ImagePlus className="h-4 w-4 mr-1.5" />
          Add image
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No flyers yet. Add at least one image for the popup.
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((url, idx) => (
            <li
              key={`${idPrefix}-${idx}`}
              className="flex flex-col sm:flex-row gap-3 rounded-xl border border-gray-100 bg-white p-3"
            >
              <div className="flex items-center gap-2 text-gray-400 shrink-0">
                <GripVertical className="h-4 w-4" />
                <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  type="url"
                  placeholder="https://… or upload"
                  value={url}
                  disabled={disabled}
                  onChange={(e) => updateAt(idx, e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      setReplaceIndex(idx);
                      setMediaOpen(true);
                    }}
                  >
                    <ImagePlus className="h-3.5 w-3.5 mr-1" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="text-red-600"
                    onClick={() => removeAt(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              {url ? (
                <div className="w-full sm:w-28 h-28 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={addEmpty}>
        <Plus className="h-4 w-4 mr-1" />
        Add URL slot
      </Button>

      <MediaLibraryModal
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        selectedUrl={replaceIndex != null ? list[replaceIndex] || "" : ""}
        title="Select flyer image"
        description="Upload from your device or pick from the media library. You can add more images later for weekly shuffle."
        confirmLabel={replaceIndex != null ? "Replace image" : "Add image"}
        onSelect={onPick}
      />
    </div>
  );
}
