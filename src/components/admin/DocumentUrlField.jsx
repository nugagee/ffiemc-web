import { useRef, useState } from "react";
import { FileText, Loader2, Upload, ExternalLink, Trash2 } from "lucide-react";
import { authApi } from "../../lib/api";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { toast } from "sonner";

function isPdfUrl(url) {
  return /\.pdf($|\?)/i.test(String(url || ""));
}

/**
 * URL field with document upload (PDF / Word / text) for church resource attachments.
 */
export default function DocumentUrlField({
  id = "document-url",
  label = "Document attachment (PDF)",
  value = "",
  onChange,
  hint = "Upload a PDF for members to preview and download, or paste a public URL.",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await authApi.uploadDocument(file);
      onChange?.(url);
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="https://…/study.pdf"
          className="flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.html,application/pdf"
          className="hidden"
          onChange={onFile}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload PDF
        </Button>
      </div>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
          <FileText className={`h-4 w-4 shrink-0 ${isPdfUrl(value) ? "text-red-600" : "text-gray-500"}`} />
          <span className="truncate text-gray-700 flex-1 min-w-0 font-mono text-xs">{value}</span>
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </a>
          <button
            type="button"
            onClick={() => onChange?.("")}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
