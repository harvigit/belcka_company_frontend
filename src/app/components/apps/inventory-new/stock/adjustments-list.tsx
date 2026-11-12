"use client";
import React, { useState } from "react";
import { Box, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import { IconCheck, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "../shared/InventoryTable";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import ConfirmDialog from "../shared/ConfirmDialog";
import FilterButton from "../shared/FilterButton";
import { InventoryOptions, qty } from "../shared/useInventoryOptions";
import { dateText, StatusText } from "../shared/orderUtils";

interface AdjustmentsListProps {
  companyId?: number | null;
  options: InventoryOptions;
  onChanged: () => void;
}

const STATUS: Record<
  string,
  { label: string; tone: "warning" | "success" | "error" }
> = {
  pending: { label: "Waiting for admin", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

const TYPE_TEXT: Record<string, string> = {
  missing: "Missing",
  damaged: "Damaged",
  found: "Found",
};

const text = (value: React.ReactNode) => (
  <Typography className="f-14" ml={1} whiteSpace="nowrap">
    {value}
  </Typography>
);

// Missing / damaged / found reports. Stock only changes once an admin approves a report.
const AdjustmentsList: React.FC<AdjustmentsListProps> = ({
  companyId,
  options,
  onChanged,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", store_id: "" });
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/stock/adjustments?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
      const res = await api.get(url);
      setRows(res.data?.info ?? []);
      setIsAdmin(!!res.data?.is_admin);
      setPageCount(res.data?.data?.totalPages || 0);
      setTotalRows(res.data?.data?.totalItems || 0);
    } catch (err) {
      console.error("Failed to fetch stock adjustments", err);
    }
    setLoading(false);
  };

  const decide = async (row: any, approve: boolean, reason?: string) => {
    try {
      const result = await api.post(
        `inventory-new/stock/adjustments/${approve ? "approve" : "reject"}`,
        {
          company_id: companyId,
          id: row.id,
          reject_reason: reason,
        },
      );
      toast.success(result.data.message);
      load();
      onChanged();
      return true;
    } catch (error) {
      // the api interceptor already shows the error message
      return false;
    }
  };

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("created_at", {
      header: "Date",
      cell: ({ row }) => text(dateText(row.original.created_at)),
    }),
    columnHelper.accessor("name", {
      header: "Item",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1} fontWeight={600}>
          {row.original.uuid} · {row.original.name}
        </Typography>
      ),
    }),
    columnHelper.accessor("store_name", {
      header: "Store",
      cell: ({ row }) => text(row.original.store_name ?? "-"),
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: ({ row }) => text(TYPE_TEXT[row.original.type] ?? row.original.type),
    }),
    columnHelper.accessor("qty", {
      header: "Qty",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <Typography
            className="f-14"
            ml={1}
            whiteSpace="nowrap"
            color={r.type === "found" ? "success.main" : "error.main"}
          >
            {r.type === "found" ? "+" : "-"}
            {qty(r.qty)} {r.unit_name ?? ""}
          </Typography>
        );
      },
    }),
    columnHelper.accessor("reason", {
      header: "Reason",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1}>
          {row.original.reason ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("reported_by_name", {
      header: "Reported by",
      cell: ({ row }) => text(row.original.reported_by_name ?? "-"),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => {
        const r = row.original;
        const status = STATUS[r.status] ?? STATUS.pending;
        return (
          <Tooltip title={r.status === "rejected" && r.reject_reason ? `Reason: ${r.reject_reason}` : ""}>
            <Box component="span" ml={1}>
              <StatusText label={status.label} tone={status.tone} />
            </Box>
          </Tooltip>
        );
      },
    }),
    // approve / reject: admins only
    ...(isAdmin
      ? [
          columnHelper.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) =>
              row.original.status === "pending" ? (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Approve">
                    <IconButton color="success" onClick={() => decide(row.original, true)}>
                      <IconCheck size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton color="error" onClick={() => setRejecting(row.original)}>
                      <IconX size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : null,
          }),
        ]
      : []),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data: rows,
    columns,
    fetchData: load,
    debounceDependencies: [filters, companyId],
    enableSorting: false,
  });

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <Stack mx={2} mb={2} direction="row" spacing={1} alignItems="center">
        <FilterButton
          value={filters}
          onApply={(v) =>
            setFilters({ status: v.status ?? "", store_id: v.store_id ?? "" })
          }
          fields={[
            {
              key: "status",
              label: "Status",
              options: Object.entries(STATUS).map(([value, s]) => ({
                value,
                label: s.label,
              })),
            },
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
          {isAdmin
            ? "Approve a report to change the stock."
            : "Reports wait for an admin before the stock changes."}
        </Typography>
      </Stack>
      <Divider />

      <InventoryTable table={table} loading={loading} rowCount={rows.length} />
      <Divider />
      <TablePaginationFooter table={table} totalRows={totalRows} />

      <ConfirmDialog
        open={!!rejecting}
        title="Reject report"
        message={
          rejecting
            ? `Reject ${qty(rejecting.qty)} ${rejecting.name} reported as ${rejecting.type}?`
            : ""
        }
        confirmLabel="Reject"
        onClose={() => {
          setRejecting(null);
          setRejectReason("");
        }}
        onConfirm={async () => {
          if (!rejectReason.trim()) {
            toast.error("Please add a reason for rejecting!");
            return;
          }
          if (await decide(rejecting, false, rejectReason.trim())) {
            setRejecting(null);
            setRejectReason("");
          }
        }}
      >
        <CustomTextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          placeholder="Reason..."
          value={rejectReason}
          onChange={(e: any) => setRejectReason(e.target.value)}
          sx={{ mt: 2 }}
        />
      </ConfirmDialog>
    </Box>
  );
};

export default AdjustmentsList;
