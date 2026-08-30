import { Download, Search } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export function DataToolbar({ query, onQueryChange, onExport, exportLabel = "Export CSV", placeholder = "Search all columns…" }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
      <div className="relative w-full sm:max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {onExport && (
        <Button type="button" variant="outline" size="sm" onClick={onExport} className="shrink-0">
          <Download size={14} className="mr-2" />
          {exportLabel}
        </Button>
      )}
    </div>
  );
}
