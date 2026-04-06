import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  return Array.from(pages).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange
}: PaginationProps) {
  if (totalPages <= 1) {
    return onPageSizeChange && pageSize ? (
      <div className="flex items-center justify-end pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Rows per page</span>
          <Select className="h-8 w-20 text-xs" value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </div>
    ) : null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && pageSize ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows per page</span>
            <Select className="h-8 w-20 text-xs" value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          {visiblePages.map((pageNumber, index) => {
            const previous = visiblePages[index - 1];
            const showGap = previous && pageNumber - previous > 1;

            return (
              <div key={pageNumber} className="flex items-center gap-1">
                {showGap ? <span className="px-1 text-xs text-gray-400">...</span> : null}
                <Button
                  variant={pageNumber === page ? "default" : "outline"}
                  size="sm"
                  className="min-w-8 px-2"
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
