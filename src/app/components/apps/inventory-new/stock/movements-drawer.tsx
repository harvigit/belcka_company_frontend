"use client";
import React, { useState } from "react";
import { Box, Divider, Drawer, IconButton, Typography } from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "../shared/InventoryTable";
import { dateText, MOVEMENT_TEXT } from "../shared/orderUtils";
import { money, qty } from "../shared/useInventoryOptions";

interface MovementsDrawerProps {
  open: boolean;
  row: any | null;
  companyId?: number | null;
  onClose: () => void;
}

const text = (value: React.ReactNode) => (
  <Typography className="f-14" ml={1} whiteSpace="nowrap">
    {value}
  </Typography>
);

// Stock ledger of one item in one store, newest first (server paginated).
const MovementsDrawer: React.FC<MovementsDrawerProps> = ({
  open,
  row,
  companyId,
  onClose,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMovements = async () => {
    if (!open || !row || !companyId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `inventory-new/stock/movements?company_id=${companyId}&store_id=${row.store_id}&internal_item_id=${row.internal_item_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`,
      );
      setRows(res.data?.info ?? []);
      setPageCount(res.data?.data?.totalPages || 0);
      setTotalRows(res.data?.data?.totalItems || 0);
    } catch (err) {
      setRows([]);
    }
    setLoading(false);
  };

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("created_at", {
      header: "Date",
      cell: ({ row: r }) => text(dateText(r.original.created_at)),
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: ({ row: r }) => text(MOVEMENT_TEXT[r.original.type] ?? r.original.type),
    }),
    columnHelper.accessor("qty", {
      header: "Qty",
      cell: ({ row: r }) => {
        const m = r.original;
        return (
          <Typography
            className="f-14"
            ml={1}
            fontWeight={600}
            color={m.qty > 0 ? "success.main" : m.qty < 0 ? "error.main" : "textSecondary"}
          >
            {m.qty > 0 ? "+" : ""}
            {qty(m.qty)}
          </Typography>
        );
      },
    }),
    columnHelper.accessor("rate", {
      header: "Rate",
      cell: ({ row: r }) => text(r.original.rate === null ? "-" : `£${r.original.rate.toFixed(4)}`),
    }),
    columnHelper.accessor("value", {
      header: "Value",
      cell: ({ row: r }) => text(r.original.value ? money(r.original.value) : "-"),
    }),
    columnHelper.accessor("base_price_after", {
      header: "Base after",
      cell: ({ row: r }) =>
        text(r.original.base_price_after === null ? "-" : `£${r.original.base_price_after.toFixed(4)}`),
    }),
    columnHelper.accessor("store_balance_after", {
      header: "Balance",
      cell: ({ row: r }) => text(qty(r.original.store_balance_after)),
    }),
    columnHelper.accessor("action_by_name", {
      header: "By / note",
      cell: ({ row: r }) => (
        <Box ml={1}>
          <Typography className="f-14">{r.original.action_by_name ?? "-"}</Typography>
          {r.original.note && (
            <Typography variant="caption" color="textSecondary">
              {r.original.note}
            </Typography>
          )}
        </Box>
      ),
    }),
  ];

  // opening the drawer for another item reloads from page 1
  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data: rows,
    columns,
    fetchData: fetchMovements,
    debounceDependencies: [open, row?.store_id, row?.internal_item_id, companyId],
    debounceTimeMs: 0,
    enableSorting: false,
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 680, md: 820 },
          borderRadius: 0,
          boxShadow: "none",
        },
      }}
    >
      <Box p={3} pt={2} height="100%" display="flex" flexDirection="column">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Stock Movements
              </Typography>
              {row && (
                <Typography variant="body2" color="textSecondary">
                  {row.uuid} · {row.name} at {row.store_name}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>

        <Box flex={1} overflow="auto" mt={2} display="flex" flexDirection="column">
          <InventoryTable table={table} loading={loading} rowCount={rows.length} />
          <Divider />
          <TablePaginationFooter table={table} totalRows={totalRows} />
        </Box>
      </Box>
    </Drawer>
  );
};

export default MovementsDrawer;
