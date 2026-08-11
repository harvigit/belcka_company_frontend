import React from "react";
import { Stack, Box, Typography, MenuItem, IconButton } from "@mui/material";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import { useTranslation } from "react-i18next";

interface TablePaginationFooterProps {
  table: any;
  totalRows: number;
  selectedCount?: number;
  totalUsers?: number;
  workingMemberCount?: number;
}

export const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({
  table,
  totalRows,
  selectedCount,
  totalUsers,
  workingMemberCount,
}) => {
  const { t } = useTranslation();
  const tableSelectedCount = table.getState().rowSelection
    ? Object.keys(table.getState().rowSelection).filter(
        (key) => table.getState().rowSelection[key],
      ).length
    : 0;

  const finalSelectedCount =
    selectedCount !== undefined ? selectedCount : tableSelectedCount;

  return (
    <Stack
      gap={1}
      pr={3}
      pt={1}
      pl={3}
      pb={2}
      alignItems="center"
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography color="textSecondary" className="f-14">
          {finalSelectedCount > 0
            ? t("table.selectedFrom", {
                selected: finalSelectedCount,
                visible: table.getRowModel().rows.length,
                total: totalRows,
              })
            : table.options.manualPagination
            ? t("table.outOfRows", {
                visible: table.getRowModel().rows.length,
                total: totalRows,
              })
            : t("table.rows", { total: totalRows })}
        </Typography>
        {(totalUsers !== undefined || workingMemberCount !== undefined) && (
          <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 0.5 }}>
            {workingMemberCount !== undefined && (
              <Typography variant="h6" fontWeight={600} color="primary">
                {workingMemberCount}
              </Typography>
            )}

            {totalUsers !== undefined && (
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
              >
                / {totalUsers} {t("Working")}
              </Typography>
            )}
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: {
            xs: "block",
            sm: "flex",
          },
        }}
        alignItems="center"
      >
        <Stack direction="row" alignItems="center">
          <Typography color="textSecondary" className="f-14">
            {t("Page")}
          </Typography>
          <Typography
            color="textSecondary"
            className="f-14"
            fontWeight={600}
            ml={1}
          >
            {table.getState().pagination.pageIndex + 1} {t("of")}{" "}
            {Math.max(1, table.getPageCount())}
          </Typography>
          <Typography color="textSecondary" ml="3px" className="f-14">
            {" "}
            | {t("Entries")} :{" "}
          </Typography>
        </Stack>
        <Stack
          ml="5px"
          direction="row"
          alignItems="center"
          color="textSecondary"
        >
          <CustomSelect
            value={table.getState().pagination.pageSize}
            onChange={(e: { target: { value: any } }) =>
              table.setPageSize(Number(e.target.value))
            }
          >
            {[50, 100, 250, 500].map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </CustomSelect>
          <IconButton
            size="small"
            sx={{ width: "30px" }}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronsLeft />
          </IconButton>
          <IconButton
            size="small"
            sx={{ width: "30px" }}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft />
          </IconButton>
          <IconButton
            size="small"
            sx={{ width: "30px" }}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight />
          </IconButton>
          <IconButton
            size="small"
            sx={{ width: "30px" }}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronsRight />
          </IconButton>
        </Stack>
      </Box>
    </Stack>
  );
};

export default TablePaginationFooter;
