"use client";
import React, { useState } from "react";
import {
  Box,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import {
  IconAdjustmentsHorizontal,
  IconHistory,
  IconSearch,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import PermissionGuard from "@/app/auth/PermissionGuard";
import InventoryTable from "../shared/InventoryTable";
import ColumnVisibilityButton from "../shared/ColumnVisibilityButton";
import FilterButton from "../shared/FilterButton";
import { money, qty, useInventoryOptions } from "../shared/useInventoryOptions";
import { packsText, STOCK_LEVEL, StatusText } from "../shared/orderUtils";
import AdjustDialog from "./adjust-dialog";
import MovementsDrawer from "./movements-drawer";
import ReorderPlanner from "./reorder-planner";
import AdjustmentsList from "./adjustments-list";

const SummaryTile: React.FC<{
  label: string;
  value: React.ReactNode;
  tone?: string;
}> = ({ label, value, tone }) => (
  <Box
    sx={{
      border: "1px solid #eef2f7",
      borderRadius: 1,
      px: 2,
      py: 1,
      minWidth: 150,
    }}
  >
    <Typography variant="caption" color="textSecondary">
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={700} color={tone}>
      {value}
    </Typography>
  </Box>
);

const StockList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id;
  const { options } = useInventoryOptions(companyId);
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_inventory_new_stock`,
      enabled: !!user?.id,
    });

  const [tab, setTab] = useState<"stock" | "reorder" | "adjustments">("stock");
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    stock_value: 0,
    below_min: 0,
    items: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ store_id: "", level: "" });
  const [adjusting, setAdjusting] = useState<any | null>(null);
  const [history, setHistory] = useState<any | null>(null);

  const fetchStock = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/stock/get?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
      if (filters.level) url += `&level=${filters.level}`;
      const res = await api.get(url);
      if (res.data) {
        setData((res.data.info ?? []).map((r: any) => ({ ...r, id: r.key })));
        setSummary(
          res.data.summary ?? { stock_value: 0, below_min: 0, items: 0 },
        );
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch stock", err);
    }
    setLoading(false);
  };

  const text = (value: React.ReactNode) => (
    <Typography className="f-14" ml={1} whiteSpace="nowrap">
      {value}
    </Typography>
  );
  const inPacks = (r: any, n: number | null) =>
    n === null
      ? "-"
      : packsText(
          n,
          r.is_sub_qty ? r.issue_pack_qty : null,
          r.unit_name,
          r.issue_pack_unit_name,
        );

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("store_name", {
      header: "Store",
      cell: ({ row }) => text(row.original.store_name ?? "-"),
    }),
    columnHelper.accessor("code", {
      header: "Code",
      cell: ({ row }) => (
        <Typography className="f-14" fontWeight={600} ml={1}>
          {row.original.code}
        </Typography>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }) => text(row.original.name),
    }),
    columnHelper.accessor("on_hand", {
      id: "onHand",
      header: "On Hand",
      cell: ({ row }) => text(inPacks(row.original, row.original.on_hand)),
    }),
    columnHelper.accessor("on_order", {
      id: "onOrder",
      header: "On Order",
      cell: ({ row }) =>
        text(row.original.on_order ? qty(row.original.on_order) : "-"),
    }),
    columnHelper.accessor("min_qty", {
      header: "Min",
      cell: ({ row }) => text(qty(row.original.min_qty)),
    }),
    columnHelper.accessor("max_qty", {
      header: "Max",
      cell: ({ row }) => text(qty(row.original.max_qty)),
    }),
    columnHelper.accessor("base_price", {
      id: "basePrice",
      header: "Base Price",
      cell: ({ row }) =>
        text(
          row.original.base_price === null
            ? "-"
            : `£${row.original.base_price.toFixed(4)}`,
        ),
    }),
    columnHelper.accessor("stock_value", {
      id: "value",
      header: "Value",
      cell: ({ row }) => text(money(row.original.stock_value)),
    }),
    columnHelper.accessor("level", {
      header: "Level",
      cell: ({ row }) => {
        const level = STOCK_LEVEL[row.original.level] ?? STOCK_LEVEL.ok;
        return <StatusText label={level.label} tone={level.tone} />;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Missing / damaged / found">
            <IconButton
              onClick={() => setAdjusting(row.original)}
              color="primary"
            >
              <IconAdjustmentsHorizontal size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Movements">
            <IconButton
              onClick={() => setHistory(row.original)}
              color="primary"
            >
              <IconHistory size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } =
    useServerTable({
      data,
      columns,
      fetchData: fetchStock,
      debounceDependencies: [searchTerm, filters, companyId],
      state: { columnVisibility },
      onColumnVisibilityChange,
      getRowId: (row: any) => row.key,
    });

  return (
    <PermissionGuard permission="Stock">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, mb: 1 }}>
          <Tab value="stock" label="Stock" />
          <Tab value="reorder" label="Reorder planner" />
          <Tab value="adjustments" label="Adjustments" />
        </Tabs>

        {tab === "adjustments" ? (
          <AdjustmentsList
            companyId={companyId}
            options={options}
            onChanged={fetchStock}
          />
        ) : tab === "reorder" ? (
          <ReorderPlanner
            companyId={companyId}
            options={options}
            onCreated={fetchStock}
          />
        ) : (
          <>
            <Stack
              mr={2}
              ml={2}
              mb={2}
              justifyContent="space-between"
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 2, md: 4 }}
            >
              <Grid display="flex" gap={1} alignItems="center">
                <TextField
                  id="search"
                  type="text"
                  size="small"
                  variant="outlined"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconSearch size={"16"} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <FilterButton
                  value={filters}
                  onApply={(v) =>
                    setFilters({
                      store_id: v.store_id ?? "",
                      level: v.level ?? "",
                    })
                  }
                  fields={[
                    {
                      key: "store_id",
                      label: "Store",
                      options: options.stores.map((s) => ({
                        value: s.id,
                        label: s.name,
                      })),
                    },
                    {
                      key: "level",
                      label: "Level",
                      options: Object.entries(STOCK_LEVEL).map(
                        ([value, l]) => ({ value, label: l.label }),
                      ),
                    },
                  ]}
                />
              </Grid>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SummaryTile
                  label="Stock value"
                  value={money(summary.stock_value)}
                />
                <SummaryTile
                  label="Below min"
                  value={summary.below_min}
                  tone={summary.below_min ? "error.main" : undefined}
                />
                <ColumnVisibilityButton table={table} />
              </Stack>
            </Stack>
            <Divider />

            <InventoryTable
              table={table}
              loading={loading}
              rowCount={data.length}
            />
            <Divider />
            <TablePaginationFooter table={table} totalRows={totalRows} />
          </>
        )}

        <AdjustDialog
          open={!!adjusting}
          row={adjusting}
          companyId={companyId}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            fetchStock();
          }}
        />
        <MovementsDrawer
          open={!!history}
          row={history}
          companyId={companyId}
          onClose={() => setHistory(null)}
        />
      </Box>
    </PermissionGuard>
  );
};

export default StockList;
