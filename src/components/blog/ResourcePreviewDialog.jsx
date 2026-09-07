import { useEffect } from "react";
import { Eye, X } from "lucide-react";
import { looksLikeHtml, sanitizeHtml } from "../../lib/blog";
import { Button } from "../ui/button";

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function ResourcePreviewDialog({ resource, open, onClose, dateKey, dateLabel = "Date" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !resource) return null;

  const dateValue = dateKey ? resource[dateKey] : resource.week_of || resource.study_date;
  const body = resource.content || resource.excerpt || "";
  const html = looksLikeHtml(body);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${resource.title}`}
      data-testid="resource-preview-dialog"
    >
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-3xl max-h-[94vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 sm:px-6 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-red-600 font-semibold flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Read on site
            </p>
            <h3 className="font-semibold text-lg text-gray-900 truncate">{resource.title}</h3>
            {dateValue ? (
              <p className="text-xs text-gray-500 mt-0.5">
                {dateLabel}: {fmtDate(dateValue)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 flex-1">
          {resource.excerpt ? (
            <p className="text-base text-gray-600 italic border-l-4 border-red-200 pl-4 mb-6">{resource.excerpt}</p>
          ) : null}
          {body ? (
            html ? (
              <div
                className="blog-prose prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
              />
            ) : (
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {body}
              </div>
            )
          ) : (
            <p className="text-gray-400 italic text-center py-10">No content available to preview.</p>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 sm:px-6 bg-gray-50 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResourcePreviewDialog;
