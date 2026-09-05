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
    <div className="space-y-2 min-w-0">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="flex flex-col gap-2 sm:flex-row min-w-0">
        <Input
          id={id}
          type="url"
          placeholder="https://… or upload below"
          value={value || ""}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          data-testid={id ? `field-${id}` : undefined}
          className="flex-1 min-w-0"
        />
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => setMediaOpen(true)}
            className="flex-1 sm:flex-none whitespace-nowrap"
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
              className="text-red-600 hover:bg-red-50 shrink-0"
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
        <div className="mt-1 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 aspect-[4/3] sm:aspect-video w-full max-w-full sm:max-w-sm">
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
