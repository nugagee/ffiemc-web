import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

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

export function RecordViewDialog({ open, onOpenChange, title = "Record", fields = [], footer }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[min(90dvh,100%)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          {fields.map((f) => (
            <div key={f.label} className="border-b border-gray-50 pb-2">
              <dt className="text-[11px] uppercase tracking-widest text-gray-400">{f.label}</dt>
              <dd className="mt-1 text-gray-800 whitespace-pre-wrap break-words">{displayValue(f.value)}</dd>
            </div>
          ))}
        </dl>
        {footer || (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
