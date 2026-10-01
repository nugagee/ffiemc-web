import { useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, ImagePlus, Trash2 } from "lucide-react";
import MediaLibraryModal from "./MediaLibraryModal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const MAX_ANNOUNCEMENT_IMAGES = 6;

export default function AnnouncementMediaFields({
  headerImageUrl = "",
  images = [],
  buttonLabel = "",
  buttonUrl = "",
  onChange,
}) {
  const [picker, setPicker] = useState(null);

  const update = (patch) =>
    onChange({
      headerImageUrl,
      images,
      buttonLabel,
      buttonUrl,
      ...patch,
    });

  const moveImage = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;
    const copy = images.slice();
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    update({ images: copy });
  };

  return (
    <div className="rounded-lg border border-gray-100 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Email images
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Optional. Upload a flyer or choose one from the media library. Images are stored in the
          public media library and shown inside the email. Leave this empty to send the usual text-only message.
          SMS stays text.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Header image</Label>
        {headerImageUrl ? (
          <div className="flex items-start gap-3">
            <img
              src={headerImageUrl}
              alt=""
              className="h-24 w-40 rounded-md object-cover border bg-gray-50"
            />
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPicker("header")}>
                Change header
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => update({ headerImageUrl: "" })}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setPicker("header")}>
            <ImagePlus className="h-4 w-4 mr-2" />
            Add header image
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label>More images</Label>
        {images.length ? (
          <ul className="space-y-3">
            {images.map((image, index) => (
              <li key={`${image.url}-${index}`} className="flex items-start gap-3">
                <img
                  src={image.url}
                  alt=""
                  className="h-16 w-24 rounded-md object-cover border bg-gray-50 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={image.alt || ""}
                    placeholder="Description (shown if the image is blocked)"
                    onChange={(e) => {
                      const copy = images.slice();
                      copy[index] = { ...image, alt: e.target.value };
                      update({ images: copy });
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Move image up"
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Move image down"
                      disabled={index === images.length - 1}
                      onClick={() => moveImage(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="text-red-600"
                      aria-label="Remove image"
                      onClick={() => update({ images: images.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">No extra images yet.</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={images.length >= MAX_ANNOUNCEMENT_IMAGES}
          onClick={() => setPicker("body")}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          {images.length >= MAX_ANNOUNCEMENT_IMAGES
            ? `Limit of ${MAX_ANNOUNCEMENT_IMAGES} images`
            : "Add image"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Button label</Label>
          <Input
            value={buttonLabel}
            placeholder="Register"
            maxLength={80}
            onChange={(e) => update({ buttonLabel: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Button link</Label>
          <Input
            value={buttonUrl}
            placeholder="https://ffiem.org/…"
            onChange={(e) => update({ buttonUrl: e.target.value })}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        The button is included when the link starts with http:// or https://. It is also added to the
        plain-text version of the email, and to SMS when the message still fits.
      </p>

      <MediaLibraryModal
        open={picker != null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        selectedUrl={picker === "header" ? headerImageUrl : ""}
        title={picker === "header" ? "Header image" : "Announcement image"}
        description="Upload a flyer or graphic, or choose one already in the media library. Email apps load it from the public media address."
        confirmLabel={picker === "header" ? "Use as header" : "Add image"}
        onSelect={(url) => {
          if (!url) return;
          if (picker === "header") {
            update({ headerImageUrl: url });
            return;
          }
          if (images.some((image) => image.url === url)) return;
          if (images.length >= MAX_ANNOUNCEMENT_IMAGES) return;
          update({ images: [...images, { url, alt: "" }] });
        }}
      />
    </div>
  );
}
