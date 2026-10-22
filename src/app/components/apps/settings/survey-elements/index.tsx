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
  ListItemIcon,
  Menu,
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
import {
  IconDotsVertical,
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [rowMenuAnchor, setRowMenuAnchor] = useState<HTMLElement | null>(null);
  const [rowMenuElement, setRowMenuElement] = useState<SurveyElement | null>(
    null,
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
    setMenuAnchor(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (element: SurveyElement) => {
    setRowMenuAnchor(null);
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
    setMenuAnchor(null);
    setRowMenuAnchor(null);
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
          <Typography fontWeight={600} className="f-14">
            {row.original.name || "-"}
          </Typography>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <Typography variant="body2">Actions</Typography>,
        cell: ({ row }: { row: { original: SurveyElement } }) => {
          const element = row.original;
          const active = isActive(element.status);
          return (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="Edit">
                <IconButton color="primary" onClick={() => openEdit(element)}>
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={active ? "Switch off" : "Switch on"}>
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
              <IconButton
                onClick={(event) => {
                  setRowMenuAnchor(event.currentTarget);
                  setRowMenuElement(element);
                }}
              >
                <IconDotsVertical size={18} />
              </IconButton>
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
        spacing={1}
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
          <IconButton onClick={(event) => setMenuAnchor(event.currentTarget)}>
            <IconDotsVertical size={20} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={openCreate}>
              <ListItemIcon>
                <IconPlus width={18} />
              </ListItemIcon>
              Add element
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id}>
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
                    No survey elements found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePaginationFooter table={table} totalRows={totalRows} />

      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
      >
        <MenuItem
          onClick={() =>
            rowMenuElement && confirmDelete([rowMenuElement.id])
          }
        >
          <ListItemIcon>
            <IconTrash width={18} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

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
                required
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
