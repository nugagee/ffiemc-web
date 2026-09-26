import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

function displayValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function RecordViewDialog({ open, onOpenChange, title = "Record", fields = [], footer, contentClassName = "" }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg max-h-[min(90dvh,100%)] overflow-hidden p-0 flex flex-col",
          contentClassName
        )}
      >
        <div className="px-4 pt-4 sm:px-6 sm:pt-6 shrink-0">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm overflow-y-auto px-4 sm:px-6 flex-1 min-h-0 py-2">
          {fields.map((f) => (
            <div key={f.label} className="border-b border-gray-50 pb-2">
              <dt className="text-[11px] uppercase tracking-widest text-gray-400">{f.label}</dt>
              <dd className="mt-1 text-gray-800 whitespace-pre-wrap break-words">{displayValue(f.value)}</dd>
            </div>
          ))}
        </dl>
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
          {footer || (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
