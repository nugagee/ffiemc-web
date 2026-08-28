import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import MediaLibraryModal from "./MediaLibraryModal";

export function isImageField(field) {
  if (!field) return false;
  if (field.type === "image") return true;
  const name = String(field.name || "");
  const label = String(field.label || "");
  return /^(image|photo|backgroundImage|background_image)$/i.test(name)
    || /(image|photo)\s*url/i.test(label)
    || /photo url/i.test(label);
}

export default function ImageUrlField({
  id,
  label,
  value = "",
  onChange,
  disabled = false,
  hint = "Paste a URL or upload from your device.",
}) {
  const [mediaOpen, setMediaOpen] = useState(false);

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          id={id}
          type="url"
          placeholder="https://… or upload below"
          value={value || ""}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          data-testid={id ? `field-${id}` : undefined}
          className="flex-1"
        />
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => setMediaOpen(true)}
            className="whitespace-nowrap"
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Upload
          </Button>
          {value ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              className="text-red-600 hover:bg-red-50"
              onClick={() => onChange?.("")}
              title="Clear image"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {value ? (
        <div className="mt-1 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 aspect-video max-w-sm">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <MediaLibraryModal
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        selectedUrl={value || ""}
        title={label || "Select image"}
        description="Upload from your device or pick an image from the library."
        confirmLabel="Use this image"
        onSelect={(url) => onChange?.(url)}
      />
    </div>
  );
}
