import { MenuItem, Pagination as MuiPagination, Select, Stack, Typography } from "@mui/material";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};

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
      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Rows per page
        </Typography>
        <Select
          size="small"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          sx={{ minWidth: 84, fontSize: "0.75rem" }}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </Stack>
    ) : null;
  }

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", md: "center" }}
      spacing={1.5}
      sx={{ pt: 1.5 }}
    >
      <Typography variant="caption" color="text.secondary">
        Page {page} of {totalPages}
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {onPageSizeChange && pageSize ? (
          <>
            <Typography variant="caption" color="text.secondary">
              Rows per page
            </Typography>
            <Select
              size="small"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              sx={{ minWidth: 84, fontSize: "0.75rem" }}
            >
              {pageSizeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </>
        ) : null}
        <MuiPagination
          page={page}
          count={totalPages}
          color="primary"
          size="small"
          shape="rounded"
          siblingCount={1}
          boundaryCount={1}
          onChange={(_event, value) => onPageChange(value)}
        />
      </Stack>
    </Stack>
  );
}
