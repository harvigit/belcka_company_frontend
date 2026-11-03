"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  IconPlus,
  IconSearch,
  IconStarFilled,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ColumnVisibilityButton from "../shared/ColumnVisibilityButton";
import FilterButton from "../shared/FilterButton";
import InventoryTable from "../shared/InventoryTable";
import ConfirmDialog from "../shared/ConfirmDialog";
import { keepVisibleSelection, selectColumn } from "../shared/selectColumn";
import { money, qty, useInventoryOptions } from "../shared/useInventoryOptions";
import SupplierItemDrawer, {
  emptySupplierItem,
  SupplierItemForm,
} from "./form";

const SupplierItemList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id;
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_inventory_new_supplier_items`,
      enabled: !!user?.id,
    });
  const { options } = useInventoryOptions(companyId);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // ?id= (from a notification) shows just that supplier item
  const searchParams = useSearchParams();
  const [focusId, setFocusId] = useState<number | null>(
    Number(searchParams?.get("id")) || null,
  );
  const router = useRouter();
  const pathname = usePathname();
  // leaving the notification view also takes ?id= out of the URL
  const clearFocus = () => {
    if (!focusId) return;
    setFocusId(null);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("id");
    const query = params.toString();
    const path = pathname ?? "/apps/inventory-new/supplier-items/list";
    router.replace(query ? `${path}?${query}` : path, { scroll: false });
  };
  useEffect(() => {
    setFocusId(Number(searchParams?.get("id")) || null);
  }, [searchParams]);
  const [filters, setFilters] = useState({ supplier_id: "", linked: "" });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<SupplierItemForm>(emptySupplierItem);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<number[]>([]);
  const [switchLoading, setSwitchLoading] = useState(false);

  const fetchItems = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/supplier-items/get?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (focusId) url += `&id=${focusId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.supplier_id) url += `&supplier_id=${filters.supplier_id}`;
      if (filters.linked) url += `&linked=${filters.linked}`;
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
      console.error("Failed to fetch supplier items", err);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setFormData({
      ...emptySupplierItem,
      supplier_id: filters.supplier_id ? Number(filters.supplier_id) : "",
    });
    setDrawerOpen(true);
  };

  const openEdit = (item: any) => {
    setFormData({
      id: item.id,
      supplier_id: item.supplier_id ?? "",
      internal_item_id: item.internal_item_id ?? null,
      supplier_code: item.supplier_code ?? "",
      name: item.name ?? "",
      pack_qty: item.pack_qty === null ? "1" : String(item.pack_qty),
      pack_unit_id: item.pack_unit_id ?? "",
      pack_price: item.pack_price === null ? "" : String(item.pack_price),
      lead_time_days:
        item.lead_time_days === null ? "" : String(item.lead_time_days),
      is_preferred: !!item.is_preferred,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData, company_id: companyId };
      const result = await api.post(
        formData.id
          ? "inventory-new/supplier-items/update"
          : "inventory-new/supplier-items/create",
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

  const handleDelete = async () => {
    try {
      const result = await api.post("inventory-new/supplier-items/delete", {
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

  const handleToggleStatus = async (item: any) => {
    setSwitchLoading(true);
    try {
      const result = await api.post(
        "inventory-new/supplier-items/change-status",
        {
          id: item.id,
          company_id: companyId,
          status: !item.status,
        },
      );
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setData((prev) =>
          prev.map((d) =>
            d.id === item.id ? { ...d, status: !item.status } : d,
          ),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSwitchLoading(false);
    }
  };

  const columnHelper = createColumnHelper<any>();
  const columns = [
    selectColumn(data, selectedRowIds, setSelectedRowIds),
    columnHelper.accessor("supplier_name", {
      header: "Supplier",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.supplier_name ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("supplier_code", {
      header: "Supplier code",
      cell: ({ row }) => (
        <Typography className="f-14" fontWeight={600} sx={{ pl: 1 }}>
          {row.original.supplier_code}
        </Typography>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.name}
        </Typography>
      ),
    }),
    columnHelper.accessor("internal_item_code", {
      header: "Internal item",
      cell: ({ row }) => {
        const item = row.original;
        if (!item.internal_item_id)
          return (
            <Typography
              className="f-14"
              color="warning.main"
              fontWeight={600}
              ml={1}
            >
              Unlinked
            </Typography>
          );
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography className="f-14" sx={{ pl: 1 }}>
              {item.internal_item_code} · {item.internal_item_name}
            </Typography>
            {item.is_preferred && (
              <Tooltip title="Preferred supplier">
                <Box
                  component="span"
                  sx={{ color: "warning.main", display: "flex" }}
                >
                  <IconStarFilled size={14} />
                </Box>
              </Tooltip>
            )}
          </Stack>
        );
      },
    }),
    columnHelper.accessor("pack_qty", {
      header: "Pack",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {qty(row.original.pack_qty)} {row.original.pack_unit_name ?? ""}
        </Typography>
      ),
    }),
    columnHelper.accessor("pack_price", {
      header: "Pack price",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {money(row.original.pack_price)}
        </Typography>
      ),
    }),
    columnHelper.accessor("unit_price", {
      header: "Unit price",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.unit_price === null
            ? "-"
            : `£${Number(row.original.unit_price).toFixed(4)}`}
        </Typography>
      ),
    }),
    columnHelper.accessor("lead_time_days", {
      header: "Lead time",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.lead_time_days === null
            ? "-"
            : `${row.original.lead_time_days} days`}
        </Typography>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => (
        <IOSSwitch
          checked={!!row.original.status}
          onChange={() => handleToggleStatus(row.original)}
          disabled={switchLoading}
          color="success"
        />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Edit">
            <IconButton onClick={() => openEdit(row.original)} color="primary">
              <IconEdit size={18} />
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
      fetchData: fetchItems,
      debounceDependencies: [searchTerm, filters, companyId, focusId],
      state: { columnVisibility },
      onColumnVisibilityChange,
    });

  return (
    <PermissionGuard permission="Supplier Products">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
            <Grid
              display="flex"
              gap={1}
              alignItems="center"
              pt={1}
              flexWrap="wrap"
            >
              <TextField
                size="small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  clearFocus();
                  setSearchTerm(e.target.value);
                }}
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
                    supplier_id: v.supplier_id ?? "",
                    linked: v.linked ?? "",
                  })
                }
                fields={[
                  {
                    key: "supplier_id",
                    label: "Supplier",
                    options: options.suppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                    })),
                  },
                  {
                    key: "linked",
                    label: "Internal item link",
                    options: [
                      { value: "1", label: "Linked" },
                      { value: "0", label: "Unlinked" },
                    ],
                  },
                ]}
              />
              {focusId && (
                <Button
                  color="error"
                  variant="outlined"
                  onClick={clearFocus}
                  sx={{
                    mt: { xs: 1, sm: 0 },
                    minHeight: 34,
                    height: 34,
                    minWidth: 64,
                    px: 1.5,
                  }}
                  aria-label="Show all items"
                >
                  <IconX size={18} />
                </Button>
              )}
            </Grid>

            <Stack direction="row" alignItems="center" pt={1}>
              {selectedRowIds.size > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash width={18} />}
                  sx={{ mr: 1 }}
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
                  Add Supplier Item
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

        <SupplierItemDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          options={options}
        />

        <ConfirmDialog
          open={toDelete.length > 0}
          title="Confirm Deletion"
          message={`Are you sure you want to remove ${toDelete.length} supplier item${toDelete.length > 1 ? "s" : ""}?`}
          onClose={() => setToDelete([])}
          onConfirm={handleDelete}
        />
      </Box>
    </PermissionGuard>
  );
};

export default SupplierItemList;
