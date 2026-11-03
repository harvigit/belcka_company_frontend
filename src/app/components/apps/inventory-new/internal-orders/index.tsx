"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import PermissionGuard from "@/app/auth/PermissionGuard";
import InventoryTable from "../shared/InventoryTable";
import ConfirmDialog from "../shared/ConfirmDialog";
import ColumnVisibilityButton from "../shared/ColumnVisibilityButton";
import FilterButton from "../shared/FilterButton";
import { keepVisibleSelection, selectColumn } from "../shared/selectColumn";
import { money, useInventoryOptions } from "../shared/useInventoryOptions";
import { dateText, IO_STATUS, StatusText } from "../shared/orderUtils";
import InternalOrderDrawer from "./form";
import InternalOrderDetails from "./view-details";

type IoAction = { kind: "issue" | "cancel"; order: any } | null;

const InternalOrderList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id;
  const { options } = useInventoryOptions(companyId);
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_inventory_new_internal_orders`,
      enabled: !!user?.id,
    });

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    store_id: "",
    project_id: "",
  });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [action, setAction] = useState<IoAction>(null);
  const [toDelete, setToDelete] = useState<number[]>([]);

  const detail = data.find((d) => d.id === detailId) ?? null;

  const fetchOrders = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/internal-orders/get?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
      if (filters.project_id) url += `&project_id=${filters.project_id}`;
      const res = await api.get(url);
      if (res.data) {
        const rows = res.data.info ?? [];
        setData(rows);
        // a new page, search or filter drops selected rows that are no longer shown
        setSelectedRowIds(keepVisibleSelection(rows));
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch internal orders", err);
    }
    setLoading(false);
  };

  const openEdit = (order: any) => {
    setEditing(order);
    setDetailId(null);
    setFormOpen(true);
  };

  const runAction = async () => {
    if (!action) return;
    try {
      const result = await api.post(
        `inventory-new/internal-orders/${action.kind}`,
        {
          company_id: companyId,
          id: action.order.id,
        },
      );
      toast.success(result.data.message);
      fetchOrders();
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setAction(null);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await api.post("inventory-new/internal-orders/delete", {
        company_id: companyId,
        ids: toDelete.join(","),
      });
      toast.success(result.data.message);
      setSelectedRowIds(new Set());
      fetchOrders();
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setToDelete([]);
    }
  };

  const text = (value: React.ReactNode) => (
    <Typography className="f-14" ml={1} whiteSpace="nowrap">
      {value}
    </Typography>
  );

  const columnHelper = createColumnHelper<any>();
  const columns = [
    selectColumn(data, selectedRowIds, setSelectedRowIds),
    columnHelper.accessor("order_number", {
      header: "Order Number",
      cell: ({ row }) => (
        <Typography
          className="f-14"
          color="primary"
          fontWeight={600}
          ml={1}
          onClick={() => setDetailId(row.original.id)}
          sx={{ "&:hover": { textDecoration: "underline" } }}
        >
          {row.original.order_number}
        </Typography>
      ),
    }),
    columnHelper.accessor("store_name", {
      header: "Store",
      cell: ({ row }) => text(row.original.store_name ?? "-"),
    }),
    columnHelper.accessor("project_name", {
      header: "Project",
      cell: ({ row }) => text(row.original.project_name ?? "-"),
    }),
    columnHelper.accessor("requested_for_name", {
      id: "for",
      header: "For",
      cell: ({ row }) => text(row.original.requested_for_name ?? "-"),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => {
        const s = IO_STATUS[row.original.status] ?? IO_STATUS[0];
        return <StatusText label={s.label} tone={s.tone} />;
      },
    }),
    columnHelper.accessor("lines_count", {
      header: "Items",
      cell: ({ row }) => text(row.original.lines_count),
    }),
    columnHelper.accessor("total", {
      header: "Value",
      cell: ({ row }) =>
        text(row.original.status === 1 ? money(row.original.total) : "-"),
    }),
    columnHelper.accessor("issued_at", {
      header: "Issued",
      cell: ({ row }) => text(dateText(row.original.issued_at)),
    }),
    columnHelper.accessor("created_at", {
      id: "created",
      header: "Created",
      cell: ({ row }) => text(dateText(row.original.created_at)),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="View">
              <IconButton onClick={() => setDetailId(order.id)} color="primary">
                <IconEye size={18} />
              </IconButton>
            </Tooltip>
            {order.status === 0 && (
              <Tooltip title="Edit">
                <IconButton onClick={() => openEdit(order)} color="primary">
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
            )}
            {order.status !== 1 && (
              <Tooltip title="Remove">
                <IconButton
                  onClick={() => setToDelete([order.id])}
                  color="error"
                >
                  <IconTrash size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } =
    useServerTable({
      data,
      columns,
      fetchData: fetchOrders,
      debounceDependencies: [searchTerm, filters, companyId],
      state: { columnVisibility },
      onColumnVisibilityChange,
    });

  const canRemoveSelected = data
    .filter((d) => selectedRowIds.has(d.id))
    .every((d) => d.status !== 1);

  return (
    <PermissionGuard permission="Purchasing">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
                  status: v.status ?? "",
                  store_id: v.store_id ?? "",
                  project_id: v.project_id ?? "",
                })
              }
              fields={[
                {
                  key: "status",
                  label: "Status",
                  options: Object.entries(IO_STATUS).map(([value, s]) => ({
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
                {
                  key: "project_id",
                  label: "Project",
                  options: options.projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                },
              ]}
            />
          </Grid>

          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
            {selectedRowIds.size > 0 && canRemoveSelected && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                sx={{ marginRight: "5px" }}
                onClick={() => setToDelete(Array.from(selectedRowIds))}
              >
                Remove
              </Button>
            )}
            <ColumnVisibilityButton table={table} />
            <IconButton
              sx={{ margin: "0px" }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <IconDotsVertical width={18} />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <ListItemIcon>
                  <IconPlus width={18} />
                </ListItemIcon>
                Add Internal Order
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
        <Divider />

        <InventoryTable
          table={table}
          loading={loading}
          rowCount={data.length}
        />
        <Divider />
        <TablePaginationFooter
          selectedCount={selectedRowIds.size}
          table={table}
          totalRows={totalRows}
        />

        <InternalOrderDrawer
          open={formOpen}
          order={editing}
          companyId={companyId}
          options={options}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            fetchOrders();
          }}
        />

        <InternalOrderDetails
          open={!!detail}
          order={detail}
          onClose={() => setDetailId(null)}
          onEdit={openEdit}
          onIssue={(order) => setAction({ kind: "issue", order })}
          onCancel={(order) => setAction({ kind: "cancel", order })}
        />

        <ConfirmDialog
          open={!!action}
          title={action?.kind === "issue" ? "Issue order" : "Cancel order"}
          message={
            action?.kind === "issue"
              ? `Issue ${action.order.order_number}? The stock leaves ${action.order.store_name} at today's base price.`
              : `Cancel ${action?.order.order_number}? This can't be undone.`
          }
          confirmLabel={action?.kind === "issue" ? "Issue" : "Cancel order"}
          confirmColor={action?.kind === "issue" ? "primary" : "error"}
          onClose={() => setAction(null)}
          onConfirm={runAction}
        />

        <ConfirmDialog
          open={toDelete.length > 0}
          title="Confirm Deletion"
          message={`Are you sure you want to remove ${toDelete.length} internal order${toDelete.length > 1 ? "s" : ""}?`}
          onClose={() => setToDelete([])}
          onConfirm={handleDelete}
        />
      </Box>
    </PermissionGuard>
  );
};

export default InternalOrderList;
