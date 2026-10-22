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
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { flexRender } from "@/utils/flexRender";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import SkeletonLoader from "@/app/components/SkeletonLoader";

type SurveyElement = {
  id: number;
  name: string;
  status: boolean | number;
};

const emptyForm = { id: 0, name: "" };

const isActive = (status: boolean | number) =>
  status === true || Number(status) === 1;

const columnWidth = (id: string) => {
  if (id === "select") return 64;
  if (id === "status") return 120;
  if (id === "actions") return 120;
  return undefined;
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const SurveyElements = () => {
  const [data, setData] = useState<SurveyElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [switchLoadingIds, setSwitchLoadingIds] = useState<Set<number>>(
    new Set(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fetchElements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
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

  const openCreate = () => {
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (element: SurveyElement) => {
    setFormData({
      id: element.id,
      name: element.name || "",
    });
    setDialogOpen(true);
  };

  const saveElement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is a required field!");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
      };
      const res = formData.id
        ? await api.put("survey-elements/update", { id: formData.id, ...payload })
        : await api.post("survey-elements/create", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Survey element saved");
        setDialogOpen(false);
        fetchElements();
      } else {
        toast.error(res.data?.message || "Failed to save survey element");
      }
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to save survey element"));
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (element: SurveyElement, checked: boolean) => {
    setSwitchLoadingIds((current) => new Set(current).add(element.id));
    try {
      const result = await api.post("survey-elements/change-status", {
        id: element.id,
        status: checked,
      });
      if (result.data?.IsSuccess) {
        setData((current) =>
          current.map((row) =>
            row.id === element.id ? { ...row, status: checked } : row,
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
        next.delete(element.id);
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
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              setSelectedRowIds(
                event.target.checked
                  ? new Set(data.map((element) => element.id))
                  : new Set(),
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
        header: () => <Typography variant="body2">Name</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => (
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
            <Typography
              fontWeight={600}
              color={isActive(row.original.status) ? "text.primary" : "text.secondary"}
            >
              {row.original.name || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        id: "status",
        enableSorting: false,
        header: () => <Typography variant="body2">Active</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const element = row.original;
          const active = isActive(element.status);
          return (
            <Tooltip title={active ? "Active" : "Inactive"}>
              <span>
                <IOSSwitch
                  checked={active}
                  disabled={switchLoadingIds.has(element.id)}
                  onChange={(event) =>
                    void changeStatus(element, event.target.checked)
                  }
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
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const element = row.original;
          return (
            <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
              <Tooltip title="Edit">
                <IconButton color="primary" onClick={() => openEdit(element)}>
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  color="error"
                  onClick={() => confirmDelete([element.id])}
                >
                  <IconTrash size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [data, selectedRowIds, switchLoadingIds],
  );

  const { table, pagination, setPageCount, totalRows, setTotalRows } =
    useServerTable({
      data,
      columns,
      fetchData: fetchElements,
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
        <Stack direction="row" alignItems="center" spacing={0.5}>
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
          <Button
            variant="contained"
            startIcon={<IconPlus width={18} />}
            onClick={openCreate}
          >
            Add element
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
                      header.column.id === "status" ||
                      header.column.id === "actions"
                        ? "right"
                        : "left"
                    }
                    sx={{
                      width: columnWidth(header.column.id),
                      bgcolor: "#f8fafc",
                      py: 1.25,
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
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
                      align={
                        cell.column.id === "status" ||
                        cell.column.id === "actions"
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
      >
        <Box component="form" onSubmit={saveElement}>
          <DialogTitle>
            {formData.id ? "Edit element" : "Add element"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                fullWidth
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
