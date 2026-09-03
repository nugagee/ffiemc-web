import { CheckCircle2, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

export function TableActions({
  onView,
  onEdit,
  onDelete,
  onApprove,
  canEdit = false,
  canDelete = false,
  approveLabel = "Approve",
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      {canEdit && onApprove ? (
        <Button
          type="button"
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-2 text-xs"
          title={approveLabel}
          onClick={onApprove}
        >
          <CheckCircle2 size={14} className="mr-1" />
          {approveLabel}
        </Button>
      ) : null}
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
