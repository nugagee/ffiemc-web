import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

export function TableActions({ onView, onEdit, onDelete, canEdit = false, canDelete = false }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      {onView ? (
        <Button type="button" size="icon" variant="ghost" title="View" onClick={onView}>
          <Eye size={14} />
        </Button>
      ) : null}
      {canEdit && onEdit ? (
        <Button type="button" size="icon" variant="ghost" title="Edit" onClick={onEdit}>
          <Pencil size={14} />
        </Button>
      ) : null}
      {canDelete && onDelete ? (
        <Button type="button" size="icon" variant="ghost" className="text-red-600" title="Delete" onClick={onDelete}>
          <Trash2 size={14} />
        </Button>
      ) : null}
    </div>
  );
}
