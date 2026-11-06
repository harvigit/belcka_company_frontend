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
import { dateText, PO_STATUS, StatusText } from "../shared/orderUtils";
import PurchaseOrderDrawer from "./form";
import PurchaseOrderDetails from "./view-details";
import ReceiveDialog from "./receive-dialog";

type PoAction = { kind: "place" | "cancel" | "close"; order: any } | null;

const ACTION_TEXT = {
  place: {
    title: "Place order",
    verb: "Place",
    tone: "primary" as const,
    url: "place",
  },
  cancel: {
    title: "Cancel order",
    verb: "Cancel order",
    tone: "error" as const,
    url: "cancel",
  },
  close: {
    title: "Close short",
    verb: "Close short",
    tone: "primary" as const,
    url: "close",
  },
};

const PurchaseOrderList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id;
  const { options } = useInventoryOptions(companyId);
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_inventory_new_purchase_orders`,
      enabled: !!user?.id,
    });

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    supplier_id: "",
    store_id: "",
  });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [receiving, setReceiving] = useState<any | null>(null);
  const [action, setAction] = useState<PoAction>(null);
  const [toDelete, setToDelete] = useState<number[]>([]);

  const fetchOrders = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/purchase-orders/get?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.supplier_id) url += `&supplier_id=${filters.supplier_id}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
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
      console.error("Failed to fetch purchase orders", err);
    }
    setLoading(false);
  };

  // the list has no lines, so the full order is loaded for the drawer and the forms
  const loadOrder = async (id: number) => {
    const res = await api.get(
      `inventory-new/purchase-orders/get?company_id=${companyId}&id=${id}`,
    );
    return res.data?.info?.[0] ?? null;
  };

  const openDetail = async (id: number) => setDetail(await loadOrder(id));

  const refresh = async () => {
    fetchOrders();
    if (detail) setDetail(await loadOrder(detail.id));
  };

  const openEdit = async (order: any) => {
    setEditing(order.lines ? order : await loadOrder(order.id));
    setDetail(null);
    setFormOpen(true);
  };

  const runAction = async () => {
    if (!action) return;
    try {
      const result = await api.post(
        `inventory-new/purchase-orders/${ACTION_TEXT[action.kind].url}`,
        {
          company_id: companyId,
          id: action.order.id,
        },
      );
      toast.success(result.data.message);
      refresh();
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setAction(null);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await api.post("inventory-new/purchase-orders/delete", {
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
    columnHelper.accessor("po_number", {
      header: "PO Number",
      cell: ({ row }) => (
        <Typography
          className="f-14"
          color="primary"
          fontWeight={600}
          ml={1}
          onClick={() => openDetail(row.original.id)}
          sx={{ "&:hover": { textDecoration: "underline" } }}
        >
          {row.original.po_number}
        </Typography>
      ),
    }),
    columnHelper.accessor("supplier_name", {
      header: "Supplier",
      cell: ({ row }) => text(row.original.supplier_name ?? "-"),
    }),
    columnHelper.accessor("store_name", {
      header: "Store",
      cell: ({ row }) => text(row.original.store_name ?? "-"),
    }),
    columnHelper.accessor("project_name", {
      header: "Project",
      cell: ({ row }) => text(row.original.project_name ?? "-"),
    }),
    columnHelper.accessor("source", {
      header: "Source",
      cell: ({ row }) =>
        text(row.original.source === "reorder" ? "Reorder planner" : "Manual"),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => {
        const s = PO_STATUS[row.original.status] ?? PO_STATUS[0];
        return <StatusText label={s.label} tone={s.tone} />;
      },
    }),
    columnHelper.accessor("lines_count", {
      header: "Items",
      cell: ({ row }) => text(row.original.lines_count),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      cell: ({ row }) => text(money(row.original.total)),
    }),
    columnHelper.accessor("expected_date", {
      header: "Expected",
      cell: ({ row }) => text(dateText(row.original.expected_date)),
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
              <IconButton onClick={() => openDetail(order.id)} color="primary">
                <IconEye size={18} />
              </IconButton>
            </Tooltip>
            {order.status === 0 && (
              <>
                <Tooltip title="Edit">
                  <IconButton onClick={() => openEdit(order)} color="primary">
                    <IconEdit size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove draft">
                  <IconButton
                    onClick={() => setToDelete([order.id])}
                    color="error"
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </Tooltip>
              </>
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

  const selectedDrafts = data
    .filter((d) => selectedRowIds.has(d.id))
    .every((d) => d.status === 0);

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
                  supplier_id: v.supplier_id ?? "",
                  store_id: v.store_id ?? "",
                })
              }
              fields={[
                {
                  key: "status",
                  label: "Status",
                  options: Object.entries(PO_STATUS).map(([value, s]) => ({
                    value,
                    label: s.label,
                  })),
                },
                {
                  key: "supplier_id",
                  label: "Supplier",
                  options: options.suppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
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
          </Grid>

          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
            {selectedRowIds.size > 0 && selectedDrafts && (
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
                Add Purchase Order
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

        <PurchaseOrderDrawer
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

        <PurchaseOrderDetails
          open={!!detail}
          order={detail}
          onClose={() => setDetail(null)}
          onEdit={openEdit}
          onPlace={(order) => setAction({ kind: "place", order })}
          onReceive={(order) => setReceiving(order)}
          onCloseShort={(order) => setAction({ kind: "close", order })}
          onCancel={(order) => setAction({ kind: "cancel", order })}
        />

        <ReceiveDialog
          open={!!receiving}
          order={receiving}
          companyId={companyId}
          onClose={() => setReceiving(null)}
          onSaved={() => {
            setReceiving(null);
            refresh();
          }}
        />

        <ConfirmDialog
          open={!!action}
          title={action ? ACTION_TEXT[action.kind].title : ""}
          message={
            action?.kind === "place"
              ? `Place ${action.order.po_number} with ${action.order.supplier_name}? It then counts as on order and can be received.`
              : action?.kind === "close"
                ? `Close ${action?.order.po_number} short? The rest is no longer expected and stops counting as on order.`
                : `Cancel ${action?.order.po_number}? This can't be undone.`
          }
          confirmLabel={action ? ACTION_TEXT[action.kind].verb : ""}
          confirmColor={action ? ACTION_TEXT[action.kind].tone : "primary"}
          onClose={() => setAction(null)}
          onConfirm={runAction}
        />

        <ConfirmDialog
          open={toDelete.length > 0}
          title="Confirm Deletion"
          message={`Are you sure you want to remove ${toDelete.length} draft order${toDelete.length > 1 ? "s" : ""}?`}
          onClose={() => setToDelete([])}
          onConfirm={handleDelete}
        />
      </Box>
    </PermissionGuard>
  );
};

export default PurchaseOrderList;
