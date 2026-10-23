"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Autocomplete,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Popover,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconEdit, IconEye, IconFilter, IconHistory, IconPlus, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { flexRender } from "@/utils/flexRender";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { surveyInputAlignSx } from "@/app/components/apps/settings/survey-settings/input-align";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import ListFiltersDialog from "@/app/components/common/ListFiltersDialog";
import SurveyElementForm from "./element-form";
import ElementHistoryDialog from "./element-history";

type SurveyElement = {
  id: number;
  name: string;
  description?: string | null;
  form_factor?: string | null;
  measurement_mode?: string | null;
  dimension_1_name?: string | null;
  dimension_1_unit?: string | null;
  dimension_2_name?: string | null;
  dimension_2_unit?: string | null;
  dimension_3_name?: string | null;
  dimension_3_unit?: string | null;
  output_name?: string | null;
  output_unit?: string | null;
  surface_photo_minimum?: number | null;
  publish_status?: string;
  damage_types?: { id: number; name: string }[];
  materials?: { id: number; name: string; category?: string }[];
};

const columnLabels: Record<string, string> = {
  name: "Name",
  form_factor: "Form",
  measurement: "Measurement",
  output: "Output",
  damage_types: "Damage types",
  materials: "Materials",
  publish_status: "Status",
  actions: "Actions",
};

const columnWidth = (id: string) => {
  if (id === "select") return 56;
  if (id === "form_factor") return 130;
  if (id === "measurement") return 220;
  if (id === "output") return 150;
  if (id === "damage_types") return 200;
  if (id === "materials") return 200;
  if (id === "publish_status") return 120;
  if (id === "actions") return 150;
  return undefined;
};

const EmptyMark = () => (
  <Typography variant="body2" color="text.secondary">
    —
  </Typography>
);

const formFactorLabel = (value?: string | null) => {
  if (value === "flat") return "Flat";
  if (value === "volumetric") return "Volumetric";
  return "";
};

const measurementLabel = (element: SurveyElement) => {
  if (element.measurement_mode === "direct") return "Direct area / volume";
  if (element.measurement_mode !== "dimensions") return "";
  const parts = [1, 2, 3]
    .map((index) => {
      const name = element[`dimension_${index}_name` as keyof SurveyElement];
      const unit = element[`dimension_${index}_unit` as keyof SurveyElement];
      if (typeof name !== "string" || !name.trim()) return "";
      return typeof unit === "string" && unit.trim() ? `${name} (${unit})` : name;
    })
    .filter(Boolean);
  return parts.join(" × ");
};

const outputLabel = (element: SurveyElement) => {
  const name = element.output_name?.trim();
  const unit = element.output_unit?.trim();
  if (name && unit) return `${name} (${unit})`;
  return name || unit || "";
};

const NameChips = ({ names }: { names: string[] }) => {
  if (!names.length) return <EmptyMark />;
  const shown = names.slice(0, 2);
  const hidden = names.slice(2);
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {shown.map((name, index) => (
        <Chip
          key={`${name}-${index}`}
          size="small"
          label={name}
          sx={{
            bgcolor: "#e7ecf7",
            color: "#1e4db7",
            maxWidth: 120,
            "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
          }}
        />
      ))}
      {hidden.length > 0 && (
        <Tooltip title={hidden.join(", ")}>
          <Chip size="small" label={`+${hidden.length}`} variant="outlined" />
        </Tooltip>
      )}
    </Stack>
  );
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

type ElementFilters = {
  publish_status: string;
  form_factor: string;
  measurement_mode: string;
  damage_types: number[];
  materials: number[];
};

type FilterOption = { id: string | number; name: string; category?: string };
type FilterGroup = { key: string; name: string; data: FilterOption[] };

const emptyElementFilters: ElementFilters = {
  publish_status: "",
  form_factor: "",
  measurement_mode: "",
  damage_types: [],
  materials: [],
};

const filterPayload = (filters: ElementFilters) => {
  const payload: Record<string, string | number[]> = {};
  if (filters.publish_status) payload.publish_status = filters.publish_status;
  if (filters.form_factor) payload.form_factor = filters.form_factor;
  if (filters.measurement_mode) payload.measurement_mode = filters.measurement_mode;
  if (filters.damage_types.length) payload.damage_types = filters.damage_types;
  if (filters.materials.length) payload.materials = filters.materials;
  return payload;
};

const hasElementFilters = (filters: ElementFilters) =>
  Object.keys(filterPayload(filters)).length > 0;

const optionLabel = (option: FilterOption) => {
  if (option.category === "subbase") return `${option.name} · Subbase`;
  if (option.category === "topwear") return `${option.name} · Topwear`;
  return option.name;
};

const SurveyElements = () => {
  const [data, setData] = useState<SurveyElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editorId, setEditorId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [columnAnchor, setColumnAnchor] = useState<null | HTMLElement>(null);
  const [columnSearch, setColumnSearch] = useState("");
  const [filters, setFilters] = useState<ElementFilters>(emptyElementFilters);
  const [tempFilters, setTempFilters] = useState<ElementFilters>(emptyElementFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [historyElement, setHistoryElement] = useState<{ id: number; name: string } | null>(null);
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: string;
  };
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_survey_elements`,
    enabled: !!user?.id,
  });

  const fetchElements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      const payload = filterPayload(filters);
      if (Object.keys(payload).length) params.set("filters", JSON.stringify(payload));
      const res = await api.get(`survey-elements/get?${params.toString()}`);
      const rows = Array.isArray(res.data?.info) ? res.data.info : [];
      setData(rows);
      const meta = res.data?.data || {};
      setTotalRows(Number(meta.totalItems ?? rows.length));
      setPageCount(Number(meta.totalPages ?? 1));
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to load survey elements"));
      setData([]);
      setTotalRows(0);
      setPageCount(1);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (ids: number[]) => {
    setDeleteIds(ids);
    setDeleteOpen(true);
  };

  const deleteSelected = async () => {
    setIsSaving(true);
    try {
      let failed = 0;
      for (const id of deleteIds) {
        try {
          const res = await api.post("survey-elements/delete", { id });
          if (!res.data?.IsSuccess) failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) toast.success("Survey element deleted successfully!");
      else toast.error("Some survey elements failed to delete.");
      setSelectedRowIds(new Set());
      setDeleteOpen(false);
      fetchElements();
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <CustomCheckbox
            checked={data.length > 0 && selectedRowIds.size === data.length}
            indeterminate={selectedRowIds.size > 0 && selectedRowIds.size < data.length}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              setSelectedRowIds(
                event.target.checked ? new Set(data.map((element) => element.id)) : new Set(),
              );
            }}
          />
        ),
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const checked = selectedRowIds.has(row.original.id);
          return (
            <CustomCheckbox
              checked={checked}
              onClick={(event) => event.stopPropagation()}
              onChange={() => {
                setSelectedRowIds((current) => {
                  const next = new Set(current);
                  if (checked) next.delete(row.original.id);
                  else next.add(row.original.id);
                  return next;
                });
              }}
            />
          );
        },
      },
      {
        id: "name",
        meta: { label: columnLabels.name },
        header: () => <Typography variant="body2">Name</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const published = row.original.publish_status === "published";
          return (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: "#e7ecf7",
                  color: "#1e4db7",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {(row.original.name || "?").charAt(0).toUpperCase()}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  fontWeight={600}
                  noWrap
                  color={published ? "text.primary" : "text.secondary"}
                >
                  {row.original.name || "—"}
                </Typography>
                {row.original.description?.trim() && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {row.original.description.trim()}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        },
      },
      {
        id: "form_factor",
        meta: { label: columnLabels.form_factor },
        enableSorting: false,
        header: () => <Typography variant="body2">Form</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const label = formFactorLabel(row.original.form_factor);
          return label ? <Typography variant="body2">{label}</Typography> : <EmptyMark />;
        },
      },
      {
        id: "measurement",
        meta: { label: columnLabels.measurement },
        enableSorting: false,
        header: () => <Typography variant="body2">Measurement</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const label = measurementLabel(row.original);
          if (!label) return <EmptyMark />;
          const photos = Number(row.original.surface_photo_minimum);
          return (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {label}
              </Typography>
              {photos >= 1 && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {photos} surface photo{photos === 1 ? "" : "s"}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        id: "output",
        meta: { label: columnLabels.output },
        enableSorting: false,
        header: () => <Typography variant="body2">Output</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const label = outputLabel(row.original);
          return label ? (
            <Typography variant="body2" noWrap>
              {label}
            </Typography>
          ) : (
            <EmptyMark />
          );
        },
      },
      {
        id: "damage_types",
        meta: { label: columnLabels.damage_types },
        enableSorting: false,
        header: () => <Typography variant="body2">Damage types</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => (
          <NameChips names={(row.original.damage_types || []).map((item) => item.name)} />
        ),
      },
      {
        id: "materials",
        meta: { label: columnLabels.materials },
        enableSorting: false,
        header: () => <Typography variant="body2">Materials</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const materials = row.original.materials || [];
          const subbase = materials
            .filter((item) => item.category === "subbase")
            .map((item) => item.name);
          const topwear = materials
            .filter((item) => item.category === "topwear")
            .map((item) => item.name);
          if (!subbase.length && !topwear.length) return <EmptyMark />;
          return (
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                Subbase: {subbase.join(", ") || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                Topwear: {topwear.join(", ") || "—"}
              </Typography>
            </Stack>
          );
        },
      },
      {
        id: "publish_status",
        meta: { label: columnLabels.publish_status },
        enableSorting: false,
        header: () => <Typography variant="body2">Status</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const published = row.original.publish_status === "published";
          return (
            <Chip
              size="small"
              label={published ? "Published" : "Draft"}
              color={published ? "success" : "default"}
              variant={published ? "filled" : "outlined"}
            />
          );
        },
      },
      {
        id: "actions",
        meta: { label: columnLabels.actions },
        enableSorting: false,
        header: () => <Typography variant="body2">Actions</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => (
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            <Tooltip title="Version history">
              <IconButton
                color="primary"
                onClick={() =>
                  setHistoryElement({ id: row.original.id, name: row.original.name || "Element" })
                }
              >
                <IconHistory size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton
                color="primary"
                onClick={() => {
                  setEditorId(row.original.id);
                  setEditorOpen(true);
                }}
              >
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => confirmDelete([row.original.id])}>
                <IconTrash size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [data, selectedRowIds],
  );

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data,
    columns,
    fetchData: fetchElements,
    debounceDependencies: [search, JSON.stringify(filters)],
    enableSorting: false,
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  const filterGroup = (key: string) => filterGroups.find((group) => group.key === key);

  const openFilters = async () => {
    setTempFilters(filters);
    setFilterOpen(true);
    try {
      const res = await api.get("survey-elements/get-filters");
      setFilterGroups(Array.isArray(res.data?.info) ? res.data.info : []);
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to load filters"));
    }
  };

  const clearFilters = () => {
    setTempFilters(emptyElementFilters);
    setFilters(emptyElementFilters);
    setFilterOpen(false);
  };

  if (editorOpen) {
    return (
      <SurveyElementForm
        elementId={editorId}
        onClose={() => {
          setEditorOpen(false);
          setEditorId(null);
        }}
        onSaved={() => {
          setEditorOpen(false);
          setEditorId(null);
          fetchElements();
        }}
        onRestored={() => fetchElements()}
      />
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...surveyInputAlignSx,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems="center"
        spacing={1.5}
        px={2}
        py={1.5}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <TextField
            size="small"
            placeholder="Search elements..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 280 } }}
          />
          <Button
            variant="contained"
            onClick={() => void openFilters()}
            sx={{ minWidth: 40, px: 1, minHeight: 40 }}
            aria-label="Filters"
          >
            <IconFilter width={18} />
          </Button>
          {hasElementFilters(filters) && (
            <Button
              color="error"
              variant="outlined"
              onClick={clearFilters}
              sx={{ minWidth: 40, px: 1, minHeight: 40 }}
              aria-label="Clear filters"
            >
              <IconX size={18} />
            </Button>
          )}
        </Stack>
        <ListFiltersDialog
          open={filterOpen}
          onClose={() => {
            setTempFilters(filters);
            setFilterOpen(false);
          }}
          onClear={clearFilters}
          onApply={() => {
            setFilters(tempFilters);
            setFilterOpen(false);
          }}
        >
          {(["publish_status", "form_factor", "measurement_mode"] as const).map((key) => {
            const group = filterGroup(key);
            return (
              <TextField
                key={key}
                select
                label={group?.name || key}
                value={tempFilters[key] || "All"}
                onChange={(event) =>
                  setTempFilters((current) => ({
                    ...current,
                    [key]: event.target.value === "All" ? "" : event.target.value,
                  }))
                }
                fullWidth
                sx={surveyInputAlignSx}
              >
                <MenuItem value="All">All</MenuItem>
                {(group?.data || []).map((option) => (
                  <MenuItem key={String(option.id)} value={String(option.id)}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
            );
          })}
          {(["damage_types", "materials"] as const).map((key) => {
            const group = filterGroup(key);
            const options = group?.data || [];
            const selected = options.filter((option) =>
              tempFilters[key].includes(Number(option.id)),
            );
            return (
              <Autocomplete
                key={key}
                multiple
                options={options}
                value={selected}
                getOptionLabel={optionLabel}
                isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                onChange={(_, value) =>
                  setTempFilters((current) => ({
                    ...current,
                    [key]: value.map((option) => Number(option.id)),
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={group?.name || key}
                    placeholder={options.length ? "All" : "None available"}
                    sx={surveyInputAlignSx}
                  />
                )}
              />
            );
          })}
        </ListFiltersDialog>
        <Stack direction="row" alignItems="center" spacing={1}>
          {selectedRowIds.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconTrash width={18} />}
              onClick={() => confirmDelete(Array.from(selectedRowIds))}
            >
              Delete
            </Button>
          )}
          <Tooltip title="Show / hide columns">
            <IconButton
              color="primary"
              onClick={(event) => setColumnAnchor(event.currentTarget)}
            >
              <IconEye size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<IconPlus width={18} />}
            onClick={() => {
              setEditorId(null);
              setEditorOpen(true);
            }}
          >
            Add element
          </Button>
        </Stack>
      </Stack>
      <Popover
        open={Boolean(columnAnchor)}
        anchorEl={columnAnchor}
        onClose={() => setColumnAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={surveyInputAlignSx}
        PaperProps={{
          sx: {
            width: 280,
            mt: 1,
            p: 1,
            borderRadius: 2,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
            border: "1px solid #e5e7eb",
            maxHeight: "min(420px, calc(100vh - 140px))",
            overflow: "hidden",
          },
        }}
      >
        <TextField
          size="small"
          placeholder="Search columns..."
          fullWidth
          value={columnSearch}
          onChange={(event) => setColumnSearch(event.target.value)}
          sx={{
            mb: 1,
            "& .MuiInputBase-root": {
              borderRadius: 1.5,
              backgroundColor: "#fff",
            },
          }}
        />
        <Box
          sx={{
            maxHeight: "calc(min(420px, calc(100vh - 140px)) - 64px)",
            overflowY: "auto",
            pr: 0.5,
          }}
        >
          <FormGroup sx={{ gap: 0.25 }}>
            {(() => {
              const columnOptions = table.getAllLeafColumns().filter((col) => {
                if (col.id === "select") return false;
                const label = String(
                  (col.columnDef.meta as { label?: string } | undefined)?.label || col.id,
                );
                return label.toLowerCase().includes(columnSearch.trim().toLowerCase());
              });
              const allSelected =
                columnOptions.length > 0 && columnOptions.every((col) => col.getIsVisible());
              const someSelected = columnOptions.some((col) => col.getIsVisible());

              return (
                <>
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        size="small"
                        checked={allSelected}
                        indeterminate={!allSelected && someSelected}
                        disabled={columnOptions.length === 0}
                        onChange={(event) => {
                          event.stopPropagation();
                          columnOptions.forEach((col) => col.toggleVisibility(event.target.checked));
                        }}
                        onClick={(event) => event.stopPropagation()}
                        sx={{ p: 0.5, mr: 1 }}
                      />
                    }
                    sx={{
                      m: 0,
                      px: 0.75,
                      py: 0.375,
                      width: "100%",
                      borderRadius: 1.5,
                      alignItems: "center",
                      borderBottom: "1px solid #eef2f7",
                      mb: 0.25,
                      "&:hover": { backgroundColor: "#f8fafc" },
                      "& .MuiFormControlLabel-label": {
                        fontSize: "14px",
                        lineHeight: 1.35,
                        fontWeight: 600,
                      },
                    }}
                    onClick={(event) => event.stopPropagation()}
                    label="Select All"
                  />
                  {columnOptions.map((col) => (
                    <FormControlLabel
                      key={col.id}
                      control={
                        <CustomCheckbox
                          size="small"
                          checked={col.getIsVisible()}
                          onChange={(event) => {
                            event.stopPropagation();
                            col.getToggleVisibilityHandler()(event);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          sx={{ p: 0.5, mr: 1 }}
                        />
                      }
                      sx={{
                        m: 0,
                        px: 0.75,
                        py: 0.375,
                        width: "100%",
                        borderRadius: 1.5,
                        alignItems: "center",
                        "&:hover": { backgroundColor: "#f8fafc" },
                        "& .MuiFormControlLabel-label": {
                          fontSize: "14px",
                          lineHeight: 1.35,
                        },
                      }}
                      onClick={(event) => event.stopPropagation()}
                      label={
                        (col.columnDef.meta as { label?: string } | undefined)?.label || col.id
                      }
                    />
                  ))}
                </>
              );
            })()}
          </FormGroup>
        </Box>
      </Popover>

      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader size="small" sx={{ tableLayout: "fixed", minWidth: 1180 }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    align={header.column.id === "actions" ? "right" : "left"}
                    sx={{
                      width: columnWidth(header.column.id),
                      bgcolor: "#f8fafc",
                      py: 1.25,
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonLoader
                columns={table.getVisibleLeafColumns().map((column) => ({ name: column.id }))}
                rowCount={6}
              />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} align="center">
                  <Typography color="text.secondary" py={6}>
                    No elements yet. Use Add element to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      align={cell.column.id === "actions" ? "right" : "left"}
                      sx={{ width: columnWidth(cell.column.id), py: 1.25 }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePaginationFooter table={table} totalRows={totalRows} />

      <ElementHistoryDialog
        open={Boolean(historyElement)}
        elementId={historyElement?.id || null}
        elementName={historyElement?.name || ""}
        onClose={() => setHistoryElement(null)}
        onRestored={() => fetchElements()}
      />
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm delete</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete {deleteIds.length} element(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="outlined"
            disabled={isSaving}
            onClick={() => void deleteSelected()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SurveyElements;
