import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

export const DEFAULT_PAGE_SIZE = 20;

export function usePagedRows(rows, pageSize = DEFAULT_PAGE_SIZE) {
  const list = Array.isArray(rows) ? rows : [];
  const [page, setPage] = useState(1);
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize, list[0]?.id]);

  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const slice = useMemo(() => list.slice(start, start + pageSize), [list, start, pageSize]);

  return {
    page: safePage,
    setPage,
    pageCount,
    pageSize,
    total,
    rows: slice,
    enabled: total > pageSize,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  };
}

export function TablePagination({ page, pageCount, total, from, to, onPageChange, enabled }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
      <p>
        Showing <span className="font-medium text-gray-900">{from}-{to}</span> of{" "}
        <span className="font-medium text-gray-900">{total}</span>
      </p>
      {enabled ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={14} className="mr-1" /> Prev
          </Button>
          <span className="text-xs tabular-nums">
            Page {page} / {pageCount}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
