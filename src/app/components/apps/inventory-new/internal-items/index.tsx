"use client";
import React, { useEffect, useRef, useState } from "react";
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
  IconChevronDown,
  IconChevronRight,
  IconDotsVertical,
  IconEdit,
  IconFileExport,
  IconFileImport,
  IconPlus,
  IconSearch,
  IconStarFilled,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User } from "next-auth";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ExcelImportModal from "@/app/components/common/ExcelImportModal";
import InventoryTable from "../shared/InventoryTable";
import ConfirmDialog from "../shared/ConfirmDialog";
import LinkedSupplierItemsTable from "../shared/LinkedSupplierItemsTable";
import LinkSupplierItemsDialog from "../shared/LinkSupplierItemsDialog";
import ColumnVisibilityButton from "../shared/ColumnVisibilityButton";
import FilterButton from "../shared/FilterButton";
import { keepVisibleSelection, selectColumn } from "../shared/selectColumn";
import { money, useInventoryOptions } from "../shared/useInventoryOptions";
import SupplierItemDrawer, {
  emptySupplierItem,
  SupplierItemForm,
} from "../supplier-items/form";
import InternalItemDrawer, {
  emptyInternalItem,
  InternalItemForm,
} from "./form";
import InternalItemDetails from "./view-details";

const InternalItemList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id;
  const { options, reload: reloadOptions } = useInventoryOptions(companyId);
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_inventory_new_internal_items`,
      enabled: !!user?.id,
    });

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // ?search=CODE opens the list filtered (used by the link on the Products list)
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams?.get("search") ?? "",
  );
  const [filters, setFilters] = useState({ status: "", category_id: "" });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<InternalItemForm>(emptyInternalItem);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<number[]>([]);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [viewItemId, setViewItemId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(
    Number(searchParams?.get("id")) || null,
  );
  const openFocusRef = useRef(!!focusId);
  const router = useRouter();
  const pathname = usePathname();
  const clearFocus = () => {
    if (!focusId) return;
    setFocusId(null);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("id");
    const query = params.toString();
    const path = pathname ?? "/apps/inventory-new/internal-items/list";
    router.replace(query ? `${path}?${query}` : path, { scroll: false });
  };
  useEffect(() => {
    const id = Number(searchParams?.get("id")) || null;
    setFocusId(id);
    openFocusRef.current = !!id;
  }, [searchParams]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);
  const [supplierForm, setSupplierForm] =
    useState<SupplierItemForm>(emptySupplierItem);

  const viewItem = data.find((d) => d.id === viewItemId) ?? null;

  const fetchItems = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/internal-items/get?company_id=${companyId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (focusId) url += `&id=${focusId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.category_id) url += `&category_id=${filters.category_id}`;
      const res = await api.get(url);
      if (res.data) {
        const rows = res.data.info ?? [];
        setData(rows);
        if (
          openFocusRef.current &&
          focusId &&
          rows.some((r: any) => r.id === focusId)
        ) {
          setViewItemId(focusId);
        }
        openFocusRef.current = false;
        setSelectedRowIds(keepVisibleSelection(rows));
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch internal items", err);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setFormData(emptyInternalItem);
    setDrawerOpen(true);
  };

  const openEdit = (item: any) => {
    setFormData({
      id: item.id,
      uuid: item.uuid ?? "",
      code: item.code ?? "",
      name: item.name ?? "",
      description: item.description ?? "",
      category_id: item.category_id ?? "",
      unit_id: item.unit_id ?? "",
      market_price: item.market_price === null ? "" : String(item.market_price),
      is_sub_qty: !!item.is_sub_qty,
      issue_pack_qty: item.issue_pack_qty ? String(item.issue_pack_qty) : "",
      issue_pack_unit_id: item.issue_pack_unit_id ?? "",
      image_file: null,
      image_url: item.image_url ?? null,
      base_price: item.base_price ?? null,
      remove_image: false,
    });
    setViewItemId(null);
    setDrawerOpen(true);
  };

  const [linkFor, setLinkFor] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const openLinkSupplierItem = (item: any) => {
    setLinkFor(item.id);
    setLinkOpen(true);
  };

  const openNewSupplierItem = (internalItemId: number | null) => {
    const item = options.internal_items.find((i) => i.id === internalItemId);
    setSupplierForm({
      ...emptySupplierItem,
      internal_item_ids: internalItemId ? [internalItemId] : [],
      name: item?.name ?? "",
    });
    setSupplierDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { image_file, image_url, remove_image, base_price, ...fields } =
        formData;
      const payload = new FormData();
      Object.entries({ ...fields, company_id: companyId }).forEach(
        ([key, value]) => {
          if (value !== undefined && value !== null)
            payload.append(key, String(value));
        },
      );
      if (image_file) payload.append("image", image_file);
      if (remove_image) payload.append("remove_image", "true");
      const result = await api.post(
        formData.id
          ? "inventory-new/internal-items/update"
          : "inventory-new/internal-items/create",
        payload,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setDrawerOpen(false);
        fetchItems();
        reloadOptions();
      }
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await api.post("inventory-new/supplier-items/create", {
        ...supplierForm,
        company_id: companyId,
      });
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setSupplierDrawerOpen(false);
        fetchItems();
        reloadOptions();
      }
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await api.post("inventory-new/internal-items/delete", {
        company_id: companyId,
        ids: toDelete.join(","),
      });
      toast.success(result.data.message);
      setSelectedRowIds(new Set());
      fetchItems();
      reloadOptions();
    } catch (error) {
    } finally {
      setToDelete([]);
    }
  };

  const handleToggleStatus = async (item: any) => {
    setSwitchLoading(true);
    try {
      const result = await api.post(
        "inventory-new/internal-items/change-status",
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
    columnHelper.display({
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const count = row.original.supplier_items?.length ?? 0;
        if (!count) return null;
        const isOpen = expandedIds.has(row.original.id);
        return (
          <Tooltip
            title={
              isOpen
                ? "Hide supplier items"
                : `Show ${count} supplier item${count > 1 ? "s" : ""}`
            }
          >
            <IconButton
              size="small"
              onClick={() => toggleExpanded(row.original.id)}
            >
              {isOpen ? (
                <IconChevronDown size={18} />
              ) : (
                <IconChevronRight size={18} />
              )}
            </IconButton>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("image_url", {
      id: "image",
      header: "Image",
      enableSorting: false,
      cell: ({ row }) => (
        <Stack
          direction="row"
          alignItems="center"
          onClick={() => setViewItemId(row.original.id)}
        >
          <Image
            src={row.original.image_url || "/images/products/product.svg"}
            alt={row.original.name ?? "Internal item"}
            width={40}
            height={40}
            style={{ objectFit: "cover", borderRadius: 4 }}
          />
        </Stack>
      ),
    }),
    columnHelper.accessor("uuid", {
      header: "UUID",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1} whiteSpace="nowrap">
          {row.original.uuid}
        </Typography>
      ),
    }),
    columnHelper.accessor("code", {
      header: "Code",
      cell: ({ row }) => (
        <Typography
          className="f-14"
          color="primary"
          fontWeight={600}
          ml={1}
          onClick={() => setViewItemId(row.original.id)}
          sx={{ "&:hover": { textDecoration: "underline" } }}
        >
          {row.original.code}
        </Typography>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }) => (
        <Tooltip title={row.original.name ?? ""}>
          <Typography
            className="f-14"
            ml={1}
            onClick={() => setViewItemId(row.original.id)}
            sx={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 1,
              overflow: "hidden",
              maxWidth: 220,
            }}
          >
            {row.original.name}
          </Typography>
        </Tooltip>
      ),
    }),
    columnHelper.accessor("category_name", {
      header: "Category",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1}>
          {row.original.category_name ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("unit_name", {
      header: "Unit",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1}>
          {row.original.unit_name ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("market_price", {
      header: "Market Price",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1}>
          {money(row.original.market_price)}
        </Typography>
      ),
    }),
    columnHelper.accessor("base_price", {
      id: "basePrice",
      header: "Base Price",
      cell: ({ row }) => (
        <Tooltip title="Average cost of the stock on site, from purchases and issues">
          <Typography className="f-14" ml={1}>
            {row.original.base_price === null ||
            row.original.base_price === undefined
              ? "-"
              : `£${Number(row.original.base_price).toFixed(4)}`}
          </Typography>
        </Tooltip>
      ),
    }),
    columnHelper.accessor("is_sub_qty", {
      header: "Sub Qty",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Typography className="f-14" ml={1} whiteSpace="nowrap">
            {item.is_sub_qty
              ? `1 ${item.issue_pack_unit_name ?? "pack"} = ${item.issue_pack_qty} ${item.unit_name ?? "unit"}`
              : "-"}
          </Typography>
        );
      },
    }),
    columnHelper.accessor("supplier_items_count", {
      id: "supplierItems",
      header: "Supplier Items",
      cell: ({ row }) => {
        const links: any[] = row.original.supplier_items ?? [];
        if (!links.length) {
          return (
            <Typography
              className="f-14"
              color="textSecondary"
              ml={1}
              onClick={() => openLinkSupplierItem(row.original)}
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              + Link
            </Typography>
          );
        }
        return (
          <Tooltip title="View linked supplier items">
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              ml={1}
              onClick={() => setViewItemId(row.original.id)}
            >
              {links[0].is_preferred && (
                <Box
                  component="span"
                  sx={{ color: "warning.main", display: "flex" }}
                >
                  <IconStarFilled size={13} />
                </Box>
              )}
              <Typography className="f-14" whiteSpace="nowrap">
                {links[0].supplier_name} · {links[0].supplier_code}
              </Typography>
              {links.length > 1 && (
                <Typography className="f-14" color="primary" fontWeight={600}>
                  +{links.length - 1}
                </Typography>
              )}
            </Stack>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("store_items_count", {
      id: "stores",
      header: "Stores",
      cell: ({ row }) => (
        <Typography className="f-14" ml={1}>
          {row.original.store_items_count}
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
    <PermissionGuard permission="Internal Products">
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
              onChange={(e) => {
                clearFocus();
                setSearchTerm(e.target.value);
              }}
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
                  category_id: v.category_id ?? "",
                })
              }
              fields={[
                {
                  key: "status",
                  label: "Status",
                  options: [
                    { value: "1", label: "Active" },
                    { value: "0", label: "Inactive" },
                  ],
                },
                {
                  key: "category_id",
                  label: "Category",
                  options: options.categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
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
                  "inventory-new/internal-items/export",
                  companyId,
                  Array.from(selectedRowIds),
                  "internal_items.xlsx",
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
            importUrl="inventory-new/internal-items/import"
            sampleHref="/files/internal_items_import.xlsx"
            extraFormData={{
              company_id: companyId,
              selected_type: "addEditRecord",
            }}
            onSuccess={() => {
              fetchItems();
              reloadOptions();
            }}
          />

          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
            {selectedRowIds.size > 0 && (
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
                  openCreate();
                }}
              >
                <ListItemIcon>
                  <IconPlus width={18} />
                </ListItemIcon>
                Add Internal Item
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
        <Divider />

        <InventoryTable
          table={table}
          loading={loading}
          rowCount={data.length}
          renderExpanded={(row) =>
            expandedIds.has(row.original.id) &&
            row.original.supplier_items?.length ? (
              <LinkedSupplierItemsTable
                items={row.original.supplier_items}
                unit={row.original.unit_name ?? "unit"}
                showStatus
              />
            ) : null
          }
        />
        <Divider />
        <TablePaginationFooter
          selectedCount={selectedRowIds.size}
          table={table}
          totalRows={totalRows}
        />

        <InternalItemDrawer
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

        <InternalItemDetails
          open={!!viewItem}
          item={viewItem}
          onClose={() => setViewItemId(null)}
          onEdit={openEdit}
          onAddSupplierItem={openLinkSupplierItem}
        />

        <LinkSupplierItemsDialog
          open={linkOpen}
          onClose={() => setLinkOpen(false)}
          companyId={companyId}
          options={options}
          internalItemId={linkFor}
          onLinked={() => {
            fetchItems();
            reloadOptions();
          }}
          onCreateNew={openNewSupplierItem}
        />

        <SupplierItemDrawer
          open={supplierDrawerOpen}
          onClose={() => setSupplierDrawerOpen(false)}
          formData={supplierForm}
          setFormData={setSupplierForm}
          onSubmit={handleSupplierSubmit}
          isSaving={isSaving}
          options={options}
          companyId={companyId}
          onOptionsChanged={reloadOptions}
        />

        <ConfirmDialog
          open={toDelete.length > 0}
          title="Confirm Deletion"
          message={`Are you sure you want to remove ${toDelete.length} internal item${toDelete.length > 1 ? "s" : ""}?`}
          onClose={() => setToDelete([])}
          onConfirm={handleDelete}
        />
      </Box>
    </PermissionGuard>
  );
};

export default InternalItemList;
