"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "../shared/InventoryTable";
import FilterButton from "../shared/FilterButton";
import { InventoryOptions, money, qty } from "../shared/useInventoryOptions";

interface ReorderPlannerProps {
  companyId?: number | null;
  options: InventoryOptions;
  onCreated: () => void;
}

type Part = { supplier_item_id: number | ""; packs: string };
type Plan = Record<string, { urgent: Part; bulk: Part }>;


const optionLabel = (o: any) =>
  `${o.supplier_name} · ${o.pack_qty} per pack · £${o.unit_price.toFixed(4)} each · ${
    o.lead_time_days === null ? "lead -" : `${o.lead_time_days}d`
  }`;

/**
 * Items whose available qty (on hand + on order) is below min.
 * Urgent tops up to min from the fastest supplier, bulk the rest to max from the cheapest.
 * The buyer can change either supplier or the packs, then draft POs are made per supplier.
 */
const ReorderPlanner: React.FC<ReorderPlannerProps> = ({
  companyId,
  options,
  onCreated,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [plan, setPlan] = useState<Plan>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({ store_id: "" });

  // The plan covers every item below min (Create draft POs and the totals use all rows), so the rows are
  // loaded once per filter and paged in the browser; changing page keeps the edits.
  const loadedKey = useRef<string | null>(null);
  const load = async (force = false) => {
    if (!companyId) return;
    const key = `${companyId}|${filters.store_id}`;
    if (!force && key === loadedKey.current) return;
    loadedKey.current = key;
    setLoading(true);
    try {
      let url = `inventory-new/stock/reorder?company_id=${companyId}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
      const res = await api.get(url);
      const list = res.data?.info ?? [];
      setRows(list);
      setPlan(
        Object.fromEntries(
          list.map((r: any) => [
            r.key,
            {
              urgent: {
                supplier_item_id: r.urgent?.supplier_item_id ?? "",
                packs: String(r.urgent?.packs ?? 0),
              },
              bulk: {
                supplier_item_id:
                  r.bulk?.supplier_item_id ?? r.urgent?.supplier_item_id ?? "",
                packs: String(r.bulk?.packs ?? 0),
              },
            },
          ]),
        ),
      );
    } catch (err) {
      console.error("Failed to fetch reorder suggestions", err);
    }
    setLoading(false);
  };

  const optionOf = (row: any, id: number | "") =>
    row.options.find((o: any) => o.supplier_item_id === id);
  const partQty = (row: any, part: Part) =>
    (optionOf(row, part.supplier_item_id)?.pack_qty ?? 0) *
    Number(part.packs || 0);
  const partCost = (row: any, part: Part) =>
    (optionOf(row, part.supplier_item_id)?.pack_price ?? 0) *
    Number(part.packs || 0);

  const setPart = (
    key: string,
    which: "urgent" | "bulk",
    value: Partial<Part>,
  ) =>
    setPlan((prev) => ({
      ...prev,
      [key]: { ...prev[key], [which]: { ...prev[key][which], ...value } },
    }));

  const summary = useMemo(() => {
    const suppliers = new Set<string>();
    let cost = 0;
    for (const r of rows) {
      const p = plan[r.key];
      if (!p) continue;
      for (const part of [p.urgent, p.bulk]) {
        const o = optionOf(r, part.supplier_item_id);
        if (o && Number(part.packs) > 0) {
          suppliers.add(`${o.supplier_id}:${r.store_id}`);
          cost += o.pack_price * Number(part.packs);
        }
      }
    }
    return { orders: suppliers.size, cost };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, plan]);

  const createPOs = async () => {
    const lines = rows.flatMap((r) => {
      const p = plan[r.key];
      return [p.urgent, p.bulk]
        .filter((part) => part.supplier_item_id && Number(part.packs) > 0)
        .map((part) => ({
          store_id: r.store_id,
          supplier_item_id: part.supplier_item_id,
          // a supplier item can serve several internal items: say which one this is for
          internal_item_id: r.internal_item_id,
          packs: Number(part.packs),
        }));
    });
    if (!lines.length) {
      toast.error("Nothing to order: every line has 0 packs!");
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.post(
        "inventory-new/purchase-orders/create-from-plan",
        { company_id: companyId, lines },
      );
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        load(true);
        onCreated();
      }
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setIsSaving(false);
    }
  };

  // a render function, not a component, so the packs input keeps focus while typing
  const renderPart = (row: any, which: "urgent" | "bulk") => {
    const part = plan[row.key]?.[which];
    if (!part) return null;
    return (
      <Stack spacing={0.75} minWidth={260}>
        <TextField
          select
          size="small"
          value={part.supplier_item_id}
          onChange={(e) =>
            setPart(row.key, which, {
              supplier_item_id: Number(e.target.value),
            })
          }
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value="" disabled>
            Select supplier
          </MenuItem>
          {row.options.map((o: any) => (
            <MenuItem key={o.supplier_item_id} value={o.supplier_item_id}>
              {optionLabel(o)}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            size="small"
            type="number"
            value={part.packs}
            onChange={(e) => setPart(row.key, which, { packs: e.target.value })}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            sx={{ width: 84, "& input": { textAlign: "right", py: "7px" } }}
          />
          <Typography
            variant="caption"
            color="textSecondary"
            whiteSpace="nowrap"
          >
            packs = {qty(partQty(row, part))} {row.unit_name ?? "unit"} ·{" "}
            {money(partCost(row, part))}
          </Typography>
        </Stack>
      </Stack>
    );
  };

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("name", {
      header: "Item",
      cell: ({ row }) => (
        <Box ml={1}>
          <Typography variant="body2" fontWeight={600}>
            {row.original.uuid} · {row.original.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.original.store_name}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor("available", {
      header: "On hand + on order",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <Typography variant="body2" ml={1} whiteSpace="nowrap">
            {qty(r.on_hand)} + {qty(r.on_order)} = <b>{qty(r.available)}</b> {r.unit_name ?? ""}
          </Typography>
        );
      },
    }),
    columnHelper.accessor("min_qty", {
      header: "Min / Max",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <Box ml={1}>
            <Typography variant="body2" whiteSpace="nowrap">
              {qty(r.min_qty)} / {qty(r.max_qty)}
            </Typography>
            <Typography variant="caption" color="error">
              needs {qty(r.to_min)} to min
            </Typography>
          </Box>
        );
      },
    }),
    columnHelper.display({
      id: "urgent",
      header: "Urgent: up to min (fastest)",
      cell: ({ row }) =>
        row.original.options.length ? (
          renderPart(row.original, "urgent")
        ) : (
          <Alert severity="warning" sx={{ py: 0 }}>
            No active supplier item with a price is linked to this item.
          </Alert>
        ),
    }),
    columnHelper.display({
      id: "bulk",
      header: "Bulk: up to max (cheapest)",
      cell: ({ row }) => (row.original.options.length ? renderPart(row.original, "bulk") : null),
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data: rows,
    columns,
    fetchData: () => load(),
    debounceDependencies: [filters, companyId],
    manualPagination: false,
    enableSorting: false,
    getRowId: (row: any) => row.key,
  });

  // paged in the browser: page count and total follow the loaded rows and page size
  useEffect(() => {
    setTotalRows(rows.length);
    setPageCount(Math.max(1, Math.ceil(rows.length / Math.max(pagination.pageSize, 1))));
  }, [rows.length, pagination.pageSize, setTotalRows, setPageCount]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <Stack
        mx={2}
        mb={2}
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterButton
            value={filters}
            onApply={(v) => setFilters({ store_id: v.store_id ?? "" })}
            fields={[
              {
                key: "store_id",
                label: "Store",
                options: options.stores.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              },
            ]}
          />
          <Typography variant="body2" color="textSecondary">
            {rows.length} item{rows.length === 1 ? "" : "s"} below min
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="textSecondary">
            {summary.orders} draft PO{summary.orders === 1 ? "" : "s"} ·{" "}
            {money(summary.cost)}
          </Typography>
          <Button
            variant="contained"
            onClick={createPOs}
            disabled={isSaving || !rows.length}
          >
            {isSaving ? "Creating..." : "Create draft POs"}
          </Button>
        </Stack>
      </Stack>
      <Divider />

      <InventoryTable table={table} loading={loading} rowCount={rows.length} />
      <Divider />
      <TablePaginationFooter table={table} totalRows={totalRows} />
    </Box>
  );
};

export default ReorderPlanner;
