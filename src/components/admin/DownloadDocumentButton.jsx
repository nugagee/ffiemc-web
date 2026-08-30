import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DOCUMENT_FORMATS, downloadDocument } from "../../lib/downloadDocument";

export function DownloadDocumentButton({
  getDocument,
  disabled = false,
  size = "sm",
  variant = "outline",
  label = "Download",
  iconOnly = false,
  className = "",
}) {
  const onPick = (formatId) => {
    const doc = typeof getDocument === "function" ? getDocument() : getDocument;
    if (!doc || (!(doc.body || "").trim() && !(doc.sections || []).some((s) => String(s.body || "").trim()))) {
      toast.error("Nothing to download yet");
      return;
    }
    const id = downloadDocument(doc, formatId);
    if (id === "pdf") toast.message("Choose “Save as PDF” in the print dialog");
    else toast.success("Download started");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={iconOnly ? "icon" : size}
          variant={variant}
          disabled={disabled}
          className={className}
          title="Download"
        >
          <Download className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} />
          {iconOnly ? <span className="sr-only">{label}</span> : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Choose format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DOCUMENT_FORMATS.map((fmt) => (
          <DropdownMenuItem key={fmt.id} onSelect={() => onPick(fmt.id)}>
            <span className="flex flex-col">
              <span>{fmt.label}</span>
              <span className="text-[11px] text-muted-foreground">{fmt.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
