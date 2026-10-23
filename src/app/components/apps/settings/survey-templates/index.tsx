"use client";

import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
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
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { flexRender } from "@/utils/flexRender";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { surveyInputAlignSx } from "@/app/components/apps/settings/survey-settings/input-align";

type SurveyGroupOption = { id: number; name: string };

type SurveyTemplate = {
  id: number;
  name: string;
  status: boolean | number;
  groups: SurveyGroupOption[];
};

const emptyForm = { id: 0, name: "", groupIds: [] as number[] };

const isActive = (status: boolean | number) =>
  status === true || Number(status) === 1;

const columnWidth = (id: string) => {
  if (id === "select") return 64;
  if (id === "name") return "28%";
  if (id === "status") return 120;
  if (id === "actions") return 120;
  return undefined;
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const SurveyTemplates = () => {
  const [data, setData] = useState<SurveyTemplate[]>([]);
  const [groupOptions, setGroupOptions] = useState<SurveyGroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [switchLoadingIds, setSwitchLoadingIds] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`survey-templates/get?${params.toString()}`);
      const rows = Array.isArray(res.data?.info) ? res.data.info : [];
      setData(rows);
      const meta = res.data?.data || {};
      setTotalRows(Number(meta.totalItems ?? rows.length));
      setPageCount(Number(meta.totalPages ?? 1));
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to load survey templates"));
      setData([]);
      setTotalRows(0);
      setPageCount(1);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await api.get("survey-groups/get");
      const rows = Array.isArray(res.data?.info) ? res.data.info : [];
      setGroupOptions(
        rows
          .filter(
            (row: SurveyGroupOption & { status?: boolean | number }) =>
              row?.id &&
              row?.name &&
              (row.status === true || Number(row.status) === 1),
          )
          .map((row: SurveyGroupOption) => ({ id: row.id, name: row.name })),
      );
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to load survey groups"));
    }
  };

  const openCreate = () => {
    setFormData(emptyForm);
    setDialogOpen(true);
    void loadGroups();
  };

  const openEdit = (template: SurveyTemplate) => {
    setFormData({
      id: template.id,
      name: template.name || "",
      groupIds: (template.groups || []).map((group) => group.id),
    });
    setDialogOpen(true);
    void loadGroups();
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is a required field!");
      return;
    }
    if (!formData.groupIds.length) {
      toast.error("Select at least one group!");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        group_ids: formData.groupIds,
      };
      const res = formData.id
        ? await api.put("survey-templates/update", { id: formData.id, ...payload })
        : await api.post("survey-templates/create", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Survey template saved");
        setDialogOpen(false);
        fetchTemplates();
      } else {
        toast.error(res.data?.message || "Failed to save survey template");
      }
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to save survey template"));
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (template: SurveyTemplate, checked: boolean) => {
    setSwitchLoadingIds((current) => new Set(current).add(template.id));
    try {
      const result = await api.post("survey-templates/change-status", {
        id: template.id,
        status: checked,
      });
      if (result.data?.IsSuccess) {
        setData((current) =>
          current.map((row) =>
            row.id === template.id ? { ...row, status: checked } : row,
          ),
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
        next.delete(template.id);
        return next;
      });
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
          const res = await api.post("survey-templates/delete", { id });
          if (!res.data?.IsSuccess) failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) toast.success("Survey template deleted successfully!");
      else toast.error("Some survey templates failed to delete.");
      setSelectedRowIds(new Set());
      setDeleteOpen(false);
      fetchTemplates();
    } finally {
      setIsSaving(false);
    }
  };

  const selectedGroups = formData.groupIds
    .map((id) => groupOptions.find((group) => group.id === id))
    .filter((group): group is SurveyGroupOption => Boolean(group));

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
                event.target.checked
                  ? new Set(data.map((template) => template.id))
                  : new Set(),
              );
            }}
          />
        ),
        cell: ({ row }: { row: { original: SurveyTemplate } }) => {
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
        cell: ({ row }: { row: { original: SurveyTemplate } }) => (
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
        header: () => <Typography variant="body2">Groups</Typography>,
        cell: ({ row }: { row: { original: SurveyTemplate } }) => {
          const groups = row.original.groups || [];
          if (!groups.length) return <Typography color="text.secondary">-</Typography>;
          return (
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {groups.map((group) => (
                <Chip key={group.id} label={group.name} size="small" />
              ))}
            </Stack>
          );
        },
      },
      {
        id: "status",
        enableSorting: false,
        header: () => <Typography variant="body2">Active</Typography>,
        cell: ({ row }: { row: { original: SurveyTemplate } }) => {
          const template = row.original;
          const active = isActive(template.status);
          return (
            <Tooltip title={active ? "Active" : "Inactive"}>
              <span>
                <IOSSwitch
                  checked={active}
                  disabled={switchLoadingIds.has(template.id)}
                  onChange={(event) => void changeStatus(template, event.target.checked)}
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
        cell: ({ row }: { row: { original: SurveyTemplate } }) => (
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => openEdit(row.original)}>
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
    fetchData: fetchTemplates,
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
          placeholder="Search templates..."
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
          <Button variant="contained" startIcon={<IconPlus width={18} />} onClick={openCreate}>
            Add template
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
                      header.column.id === "status" || header.column.id === "actions"
                        ? "right"
                        : "left"
                    }
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
                columns={columns.map((column) => ({ name: column.id }))}
                rowCount={6}
              />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography color="text.secondary" py={6}>
                    No templates yet. Use Add template to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      align={
                        cell.column.id === "status" || cell.column.id === "actions"
                          ? "right"
                          : "left"
                      }
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={surveyInputAlignSx}
      >
        <Box component="form" onSubmit={saveTemplate}>
          <DialogTitle>{formData.id ? "Edit template" : "Add template"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, name: event.target.value }))
                }
                fullWidth
              />
              <Autocomplete
                multiple
                options={groupOptions}
                value={selectedGroups}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, value) =>
                  setFormData((current) => ({
                    ...current,
                    groupIds: value.map((group) => group.id),
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Groups"
                    placeholder={
                      groupOptions.length ? "Select active groups" : "No active groups"
                    }
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm delete</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete {deleteIds.length} template(s)?
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

export default SurveyTemplates;
