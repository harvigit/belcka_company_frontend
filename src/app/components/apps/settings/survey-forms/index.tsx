"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
import { IconEdit, IconFileTypePdf, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { flexRender } from "@/utils/flexRender";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { surveyInputAlignSx } from "@/app/components/apps/settings/survey-settings/input-align";
import SurveyFormEditor, { SurveyFormRecord } from "./form-editor";
import SurveyFormPdfPreview from "./pdf-preview";

const isActive = (status: boolean | number) =>
  status === true || Number(status) === 1;

const columnWidth = (id: string) => {
  if (id === "select") return 64;
  if (id === "name") return "40%";
  if (id === "status") return 120;
  if (id === "actions") return 150;
  return undefined;
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const SurveyForms = () => {
  const [data, setData] = useState<SurveyFormRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [switchLoadingIds, setSwitchLoadingIds] = useState<Set<number>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<SurveyFormRecord | null>(null);
  const [previewForm, setPreviewForm] = useState<SurveyFormRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`survey-forms/get?${params.toString()}`);
      const rows = Array.isArray(res.data?.info) ? res.data.info : [];
      setData(rows);
      const meta = res.data?.data || {};
      setTotalRows(Number(meta.totalItems ?? rows.length));
      setPageCount(Number(meta.totalPages ?? 1));
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to load property details"));
      setData([]);
      setTotalRows(0);
      setPageCount(1);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (form: SurveyFormRecord | null) => {
    setEditingForm(form);
    setEditorOpen(true);
  };

  const changeStatus = async (form: SurveyFormRecord, checked: boolean) => {
    setSwitchLoadingIds((current) => new Set(current).add(form.id));
    try {
      const result = await api.post("survey-forms/change-status", { id: form.id, status: checked });
      if (result.data?.IsSuccess) {
        setData((current) =>
          current.map((row) => (row.id === form.id ? { ...row, status: checked } : row)),
        );
        toast.success(result.data.message || "Status updated");
      } else {
        toast.error(result.data?.message || "Failed to change status");
      }
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to change status"));
    } finally {
      setSwitchLoadingIds((current) => {
        const next = new Set(current);
        next.delete(form.id);
        return next;
      });
    }
  };

  const confirmDelete = (ids: number[]) => {
    setDeleteIds(ids);
    setDeleteOpen(true);
  };

  const deleteSelected = async () => {
    setIsDeleting(true);
    try {
      let failed = 0;
      for (const id of deleteIds) {
        try {
          const res = await api.post("survey-forms/delete", { id });
          if (!res.data?.IsSuccess) failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) toast.success("Property detail deleted successfully!");
      else toast.error("Some property details failed to delete.");
      setSelectedRowIds(new Set());
      setDeleteOpen(false);
      fetchForms();
    } finally {
      setIsDeleting(false);
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
                event.target.checked ? new Set(data.map((form) => form.id)) : new Set(),
              );
            }}
          />
        ),
        cell: ({ row }: { row: { original: SurveyFormRecord } }) => {
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
        header: () => <Typography variant="body2">Name</Typography>,
        cell: ({ row }: { row: { original: SurveyFormRecord } }) => (
          <Typography
            fontWeight={600}
            color={isActive(row.original.status) ? "text.primary" : "text.secondary"}
          >
            {row.original.name || "-"}
          </Typography>
        ),
      },
      {
        id: "groups",
        header: () => <Typography variant="body2">Sections</Typography>,
        cell: ({ row }: { row: { original: SurveyFormRecord } }) => (
          <Typography color="text.secondary">{row.original.group_count ?? 0}</Typography>
        ),
      },
      {
        id: "fields",
        header: () => <Typography variant="body2">Fields</Typography>,
        cell: ({ row }: { row: { original: SurveyFormRecord } }) => (
          <Typography color="text.secondary">{row.original.field_count ?? 0}</Typography>
        ),
      },
      {
        id: "status",
        enableSorting: false,
        header: () => <Typography variant="body2">Active</Typography>,
        cell: ({ row }: { row: { original: SurveyFormRecord } }) => {
          const form = row.original;
          const active = isActive(form.status);
          return (
            <Tooltip title={active ? "Active" : "Inactive"}>
              <span>
                <IOSSwitch
                  checked={active}
                  disabled={switchLoadingIds.has(form.id)}
                  onChange={(event) => void changeStatus(form, event.target.checked)}
                />
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <Typography variant="body2">Actions</Typography>,
        cell: ({ row }: { row: { original: SurveyFormRecord } }) => (
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            <Tooltip title="Preview PDF">
              <IconButton color="primary" onClick={() => setPreviewForm(row.original)}>
                <IconFileTypePdf size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => openEditor(row.original)}>
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
    [data, selectedRowIds, switchLoadingIds],
  );

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data,
    columns,
    fetchData: fetchForms,
    debounceDependencies: [search],
    enableSorting: false,
  });

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
        <TextField
          size="small"
          placeholder="Search property details..."
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
          <Button variant="contained" startIcon={<IconPlus width={18} />} onClick={() => openEditor(null)}>
            Add property detail
          </Button>
        </Stack>
      </Stack>

      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    align={
                      header.column.id === "status" || header.column.id === "actions" ? "right" : "left"
                    }
                    sx={{ width: columnWidth(header.column.id), bgcolor: "#f8fafc", py: 1.25 }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonLoader columns={columns.map((column) => ({ name: column.id }))} rowCount={6} />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography color="text.secondary" py={6}>
                    No property details yet. Use Add property detail to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      align={cell.column.id === "status" || cell.column.id === "actions" ? "right" : "left"}
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

      <SurveyFormEditor
        open={editorOpen}
        form={editingForm}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          fetchForms();
        }}
      />

      <SurveyFormPdfPreview form={previewForm} onClose={() => setPreviewForm(null)} />

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm delete</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete {deleteIds.length} property detail(s)? Property details that are used by a template cannot be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button color="error" variant="outlined" disabled={isDeleting} onClick={() => void deleteSelected()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SurveyForms;
