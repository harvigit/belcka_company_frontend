"use client";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ColumnVisibilityButton from "../shared/ColumnVisibilityButton";
import FilterButton from "../shared/FilterButton";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import InventoryTable from "../shared/InventoryTable";
import ConfirmDialog from "../shared/ConfirmDialog";
import { keepVisibleSelection, selectColumn } from "../shared/selectColumn";
import { qty, useInventoryOptions } from "../shared/useInventoryOptions";
import StoreItemDrawer, { emptyStoreItem, StoreItemForm } from "./form";

// approval_status: 0 = pending, 1 = approved, 2 = rejected
const STATUS_CHIP: Record<
  number,
  { label: string; color: "warning" | "success" | "error" }
> = {
  0: { label: "Waiting for admin", color: "warning" },
  1: { label: "Approved", color: "success" },
  2: { label: "Rejected", color: "error" },
};

const StoreItemList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id;
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_inventory_new_store_items`,
      enabled: !!user?.id,
    });
  const { options, isAdmin } = useInventoryOptions(companyId);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ store_id: "", approval_status: "" });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<StoreItemForm>(emptyStoreItem);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<number[]>([]);
  const [toReject, setToReject] = useState<number[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  const fetchItems = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/store-items/get?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
      if (filters.approval_status)
        url += `&approval_status=${filters.approval_status}`;
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
      console.error("Failed to fetch store items", err);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setFormData({
      ...emptyStoreItem,
      store_id: filters.store_id ? Number(filters.store_id) : "",
    });
    setDrawerOpen(true);
  };

  const openEdit = (item: any) => {
    setFormData({
      id: item.id,
      store_id: item.store_id,
      internal_item_id: item.internal_item_id,
      min_qty: String(item.min_qty ?? 0),
      max_qty: String(item.max_qty ?? 0),
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id && (!formData.store_id || !formData.internal_item_id)) {
      toast.error("Please select a store and an internal item!");
      return;
    }
    if (Number(formData.max_qty || 0) < Number(formData.min_qty || 0)) {
      toast.error("Max qty can't be less than min qty!");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...formData, company_id: companyId };
      const result = await api.post(
        formData.id
          ? "inventory-new/store-items/update"
          : "inventory-new/store-items/create",
        payload,
      );
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setDrawerOpen(false);
        fetchItems();
      }
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setIsSaving(false);
    }
  };

  const decide = async (ids: number[], approve: boolean, reason?: string) => {
    try {
      const result = await api.post(
        `inventory-new/store-items/${approve ? "approve" : "reject"}`,
        {
          company_id: companyId,
          ids: ids.join(","),
          reject_reason: reason,
        },
      );
      toast.success(result.data.message);
      setSelectedRowIds(new Set());
      fetchItems();
      return true;
    } catch (error) {
      // the api interceptor already shows the error message
      return false;
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please add a reason for rejecting!");
      return;
    }
    if (await decide(toReject, false, rejectReason.trim())) {
      setToReject([]);
      setRejectReason("");
    }
  };

  const handleDelete = async () => {
    try {
      const result = await api.post("inventory-new/store-items/delete", {
        company_id: companyId,
        ids: toDelete.join(","),
      });
      toast.success(result.data.message);
      setSelectedRowIds(new Set());
      fetchItems();
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setToDelete([]);
    }
  };

  const selectedRows = data.filter((d) => selectedRowIds.has(d.id));
  const selectedAllPending =
    selectedRows.length > 0 &&
    selectedRows.every((d) => d.approval_status === 0);
  const canRemoveSelected =
    isAdmin || selectedRows.every((d) => d.approval_status !== 1);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    selectColumn(data, selectedRowIds, setSelectedRowIds),
    columnHelper.accessor("store_name", {
      header: "Store",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.store_name ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("internal_item_code", {
      header: "Internal item",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          <b>{row.original.internal_item_code}</b> ·{" "}
          {row.original.internal_item_name}
        </Typography>
      ),
    }),
    columnHelper.accessor("min_qty", {
      header: "Min",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {qty(row.original.min_qty)} {row.original.unit_name ?? ""}
        </Typography>
      ),
    }),
    columnHelper.accessor("max_qty", {
      header: "Max",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {qty(row.original.max_qty)} {row.original.unit_name ?? ""}
        </Typography>
      ),
    }),
    columnHelper.accessor("approval_status", {
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        const chip = STATUS_CHIP[item.approval_status] ?? STATUS_CHIP[0];
        return (
          <Tooltip
            title={
              item.approval_status === 2 && item.reject_reason
                ? `Reason: ${item.reject_reason}`
                : ""
            }
          >
            <Chip size="small" color={chip.color} label={chip.label} />
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("requested_by_name", {
      header: "Requested",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.requested_by_name ?? "-"}
          {row.original.requested_at && (
            <Typography
              component="span"
              display="block"
              variant="caption"
              color="textSecondary"
            >
              {dayjs(row.original.requested_at).format("DD/MM/YYYY")}
            </Typography>
          )}
        </Typography>
      ),
    }),
    columnHelper.accessor("approved_by_name", {
      header: "Decided by",
      cell: ({ row }) =>
        row.original.approval_status === 0 ? (
          <Typography className="f-14" sx={{ pl: 1 }}>-</Typography>
        ) : (
          <Typography className="f-14" sx={{ pl: 1 }}>
            {row.original.approved_by_name ?? "-"}
            {row.original.approved_at && (
              <Typography
                component="span"
                display="block"
                variant="caption"
                color="textSecondary"
              >
                {dayjs(row.original.approved_at).format("DD/MM/YYYY")}
              </Typography>
            )}
          </Typography>
        ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" spacing={0.5}>
            {isAdmin && item.approval_status === 0 && (
              <>
                <Tooltip title="Approve">
                  <IconButton
                    onClick={() => decide([item.id], true)}
                    color="success"
                  >
                    <IconCheck size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton
                    onClick={() => setToReject([item.id])}
                    color="error"
                  >
                    <IconX size={18} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Edit min / max">
              <IconButton onClick={() => openEdit(item)} color="primary">
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
            {(isAdmin || item.approval_status !== 1) && (
              <Tooltip title="Remove">
                <IconButton
                  onClick={() => setToDelete([item.id])}
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
      fetchData: fetchItems,
      debounceDependencies: [searchTerm, filters, companyId],
      state: { columnVisibility },
      onColumnVisibilityChange,
    });

  return (
    <PermissionGuard permission="Stores">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Alert severity="info" sx={{ mb: 1 }}>
          Each store has its own approved item list with min / max. Only
          approved items can be ordered into a store, issued from it and planned
          for reorder.{" "}
          {isAdmin
            ? "As an admin you can approve or reject requests."
            : "New requests go to an admin for approval."}
        </Alert>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Stack
            mx={2}
            mb={2}
            justifyContent="space-between"
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
          >
            <Grid display="flex" gap={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconSearch size={16} />
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
                    approval_status: v.approval_status ?? "",
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
                    key: "approval_status",
                    label: "Approval status",
                    options: [
                      { value: "0", label: "Waiting for admin" },
                      { value: "1", label: "Approved" },
                      { value: "2", label: "Rejected" },
                    ],
                  },
                ]}
              />
            </Grid>

            <Stack direction="row" alignItems="center" pt={1} spacing={1}>
              {isAdmin && selectedAllPending && (
                <>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<IconCheck width={18} />}
                    onClick={() => decide(Array.from(selectedRowIds), true)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<IconX width={18} />}
                    onClick={() => setToReject(Array.from(selectedRowIds))}
                  >
                    Reject
                  </Button>
                </>
              )}
              {selectedRowIds.size > 0 && canRemoveSelected && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash width={18} />}
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
                    openCreate();
                  }}
                >
                  <ListItemIcon>
                    <IconPlus width={18} />
                  </ListItemIcon>
                  {isAdmin ? "Add Item to Store" : "Request Item for Store"}
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
        </Box>

        <StoreItemDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          options={options}
          isAdmin={isAdmin}
        />

        <ConfirmDialog
          open={toDelete.length > 0}
          title="Confirm Deletion"
          message={`Are you sure you want to remove ${toDelete.length} store item${toDelete.length > 1 ? "s" : ""}?`}
          onClose={() => setToDelete([])}
          onConfirm={handleDelete}
        />

        <ConfirmDialog
          open={toReject.length > 0}
          title="Reject request"
          message={`Reject ${toReject.length} request${toReject.length > 1 ? "s" : ""}? The buyer will see your reason.`}
          confirmLabel="Reject"
          onClose={() => {
            setToReject([]);
            setRejectReason("");
          }}
          onConfirm={handleReject}
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
    </PermissionGuard>
  );
};

export default StoreItemList;
