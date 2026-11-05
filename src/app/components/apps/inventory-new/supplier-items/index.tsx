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
  IconFileExport,
  IconFileImport,
  IconLink,
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
import ExcelImportModal from "@/app/components/common/ExcelImportModal";
import ColumnVisibilityButton from "../shared/ColumnVisibilityButton";
import FilterButton from "../shared/FilterButton";
import InventoryTable from "../shared/InventoryTable";
import ConfirmDialog from "../shared/ConfirmDialog";
import LinkSupplierItemsDialog from "../shared/LinkSupplierItemsDialog";
import InternalItemPickDialog from "../shared/InternalItemPickDialog";
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
  const { options, reload: reloadOptions } = useInventoryOptions(companyId);

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

  // import dialog, and "Link to internal item" for the selected rows
  const [importOpen, setImportOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  // Internal item cell clicked: add / change / remove that row's internal item
  const [pickFor, setPickFor] = useState<any | null>(null);

  const openEdit = (item: any) => {
    setFormData({
      id: item.id,
      uuid: item.uuid ?? "",
      supplier_id: item.supplier_id ?? "",
      internal_item_ids: (item.internal_items ?? []).map((i: any) => i.id),
      supplier_code: item.supplier_code ?? "",
      name: item.name ?? "",
      is_pack: !!item.is_pack,
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
        reloadOptions();
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
      reloadOptions();
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

  const downloadExcel = async (
    url: string,
    companyId: number | null | undefined,
    ids: number[],
    fileName: string,
  ) => {
    try {
      const res = await api.post(
        url,
        { company_id: companyId, ids: ids.join(",") },
        { responseType: "blob" },
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(href);
    } catch (err) {
      console.error("Export failed", err);
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
    columnHelper.accessor("uuid", {
      header: "UUID",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }} whiteSpace="nowrap">
          {row.original.uuid}
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
      header: "Supplier item name",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.name}
        </Typography>
      ),
    }),
    columnHelper.accessor((row) => (row.internal_items ?? []).map((i: any) => i.uuid).join(", "), {
      id: "internal_items",
      header: "Internal items",
      cell: ({ row }) => {
        const item = row.original;
        const links: any[] = item.internal_items ?? [];
        const label = links.length
          ? links.map((i) => `${i.uuid} · ${i.name}`).join(", ")
          : "Unlinked";
        return (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
              setPickFor(item);
            }}
            sx={{ cursor: "pointer" }}
          >
            <Tooltip title={links.length ? label : "Add internal items"}>
              <Typography
                className="f-14"
                color={links.length ? undefined : "warning.main"}
                fontWeight={links.length ? undefined : 600}
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  wordBreak: "break-word",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                  "&:hover": { border: "1px solid #1976d2" },
                }}
              >
                {label}
              </Typography>
            </Tooltip>
            {item.is_preferred && (
              <Tooltip
                title={`Preferred supplier for ${links
                  .filter((i) => i.is_preferred)
                  .map((i) => i.uuid)
                  .join(", ")}`}
              >
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
          {row.original.is_pack
            ? `${qty(row.original.pack_qty)} ${row.original.pack_unit_name ?? ""}`
            : "Single unit"}
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
              <Button
                variant="contained"
                onClick={() =>
                  downloadExcel(
                    "inventory-new/supplier-items/export",
                    companyId,
                    Array.from(selectedRowIds),
                    "supplier_items.xlsx",
                  )
                }
                sx={{ mt: { xs: 1, sm: 0 } }}
              >
                <IconFileExport width={18} /> Export
              </Button>
              <Button
                variant="contained"
                startIcon={<IconFileImport width={18} />}
                onClick={() => setImportOpen(true)}
              >
                Import
              </Button>
            </Grid>
            <ExcelImportModal
              open={importOpen}
              onClose={() => setImportOpen(false)}
              importUrl="inventory-new/supplier-items/import"
              sampleHref="/files/supplier_items_import.xlsx"
              extraFormData={{
                company_id: companyId,
                selected_type: "addEditRecord",
              }}
              onSuccess={() => {
                fetchItems();
                reloadOptions();
              }}
            />

            <Stack direction="row" alignItems="center" pt={1}>
              {selectedRowIds.size > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<IconLink width={18} />}
                  sx={{ mr: 1 }}
                  onClick={() => setLinkOpen(true)}
                >
                  Link to internal item
                </Button>
              )}
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

        <LinkSupplierItemsDialog
          open={linkOpen}
          onClose={() => setLinkOpen(false)}
          companyId={companyId}
          options={options}
          supplierItemIds={Array.from(selectedRowIds)}
          onLinked={() => {
            setSelectedRowIds(new Set());
            fetchItems();
            reloadOptions();
          }}
        />

        <InternalItemPickDialog
          item={pickFor}
          onClose={() => setPickFor(null)}
          companyId={companyId}
          options={options}
          onOptionsChanged={reloadOptions}
          onSaved={() => {
            fetchItems();
            reloadOptions();
          }}
        />

        <SupplierItemDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          options={options}
          companyId={companyId}
          onOptionsChanged={reloadOptions}
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
