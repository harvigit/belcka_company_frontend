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
  IconNotes,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { flexRender } from "@/utils/flexRender";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import EditProject from "@/app/components/apps/projects/edit";
import ArchiveProject from "@/app/components/apps/addresses/list/archive-project-list";

type AdminProjectRow = {
  id: number;
  name: string;
  uuid?: string;
  code?: string | null;
  status: number;
  status_text?: string;
};

const initialFormData = {
  name: "",
  address: "",
  budget: "",
  description: "",
  code: 0,
  team_ids: "",
  user_ids: "",
  company_id: 0,
  workzone_ids: "",
  project_limit: "",
  allow_work: true,
};

const AdminProjects = () => {
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
  };
  const [data, setData] = useState<AdminProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [switchLoadingIds, setSwitchLoadingIds] = useState<Set<number>>(
    new Set(),
  );
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [archiveListOpen, setArchiveListOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [formData, setFormData] = useState<any>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProjects = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(user.company_id),
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`project/dashboard?${params.toString()}`);
      const rows = Array.isArray(res.data?.info)
        ? res.data.info
        : Array.isArray(res.data?.info?.data)
          ? res.data.info.data
          : [];
      setData(rows);
      const meta =
        res.data?.data?.totalPages !== undefined ||
        res.data?.data?.totalItems !== undefined
          ? res.data.data
          : res.data?.info?.totalPages !== undefined
            ? res.data.info
            : res.data?.data || {};
      setTotalRows(Number(meta.totalItems ?? meta.total ?? rows.length));
      setPageCount(Number(meta.totalPages ?? meta.last_page ?? 1));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load projects");
      setData([]);
      setTotalRows(0);
      setPageCount(1);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (project: AdminProjectRow) => {
    if (!user?.company_id) return;
    try {
      const res = await api.get(
        `project/get?company_id=${user.company_id}&project_id=${project.id}`,
      );
      const projectRow = Array.isArray(res.data?.info)
        ? res.data.info[0]
        : res.data?.info;
      setSelectedProject(projectRow || project);
      setEditOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load project");
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put("project/update", formData);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Project updated successfully");
        setEditOpen(false);
        fetchProjects();
      } else {
        toast.error(res.data?.message || "Failed to update project");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (project: AdminProjectRow, checked: boolean) => {
    setSwitchLoadingIds((current) => new Set(current).add(project.id));
    try {
      const result = await api.post("project/change-status", {
        id: project.id,
        company_id: user.company_id,
        status: checked,
      });
      if (result.data?.IsSuccess) {
        setData((current) =>
          current.map((row) =>
            row.id === project.id
              ? {
                  ...row,
                  status: checked ? 1 : 0,
                  status_text: checked ? "Active" : "Closed",
                }
              : row,
          ),
        );
        toast.success(
          result.data.message ||
            (checked ? "Project marked as active!" : "Project marked as closed!"),
        );
      } else {
        toast.error(result.data?.message || "Failed to change status");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to change status");
    } finally {
      setSwitchLoadingIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  };

  const archiveSelected = async () => {
    try {
      let allSuccess = true;
      for (const id of Array.from(selectedRowIds)) {
        const res = await api.post("project/archive", { id });
        if (
          !res.data?.IsSuccess &&
          !res.data?.isSuccess &&
          !res.data?.success &&
          !(res.status >= 200 && res.status < 300)
        ) {
          allSuccess = false;
        }
      }
      if (allSuccess) toast.success("Projects archived successfully.");
      else toast.error("Some projects failed to archive.");
      setSelectedRowIds(new Set());
      fetchProjects();
    } catch (error) {
      console.error(error);
      toast.error("Error archiving projects.");
    } finally {
      setArchiveDialogOpen(false);
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
                  ? new Set(data.map((project) => project.id))
                  : new Set(),
              );
            }}
          />
        ),
        cell: ({ row }: { row: { original: AdminProjectRow } }) => {
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
        accessorKey: "name",
        header: () => <Typography variant="subtitle2">Name</Typography>,
        cell: ({ row }: { row: { original: AdminProjectRow } }) => (
          <Typography fontWeight={600}>{row.original.name || "-"}</Typography>
        ),
      },
      {
        id: "code",
        header: () => <Typography variant="subtitle2">Code</Typography>,
        cell: ({ row }: { row: { original: AdminProjectRow } }) => (
          <Typography>{row.original.uuid || row.original.code || "-"}</Typography>
        ),
      },
      {
        id: "status",
        header: () => <Typography variant="subtitle2">Status</Typography>,
        cell: ({ row }: { row: { original: AdminProjectRow } }) => (
          <Typography>
            {row.original.status_text ||
              (Number(row.original.status) === 1 ? "Active" : "Closed")}
          </Typography>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <Typography variant="subtitle2">Actions</Typography>,
        cell: ({ row }: { row: { original: AdminProjectRow } }) => {
          const project = row.original;
          const active = Number(project.status) === 1;
          return (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="Edit">
                <IconButton
                  color="primary"
                  onClick={() => void handleEdit(project)}
                >
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={active ? "Switch off" : "Switch on"}>
                <span>
                  <IOSSwitch
                    checked={active}
                    disabled={switchLoadingIds.has(project.id)}
                    onChange={(event) =>
                      void changeStatus(project, event.target.checked)
                    }
                  />
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [data, selectedRowIds, switchLoadingIds, user?.company_id],
  );

  const {
    table,
    pagination,
    setPageCount,
    totalRows,
    setTotalRows,
  } = useServerTable({
    data,
    columns,
    fetchData: fetchProjects,
    debounceDependencies: [search, user?.company_id],
    enableSorting: false,
  });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={1}
        px={2}
        py={1.5}
      >
        <TextField
          size="small"
          placeholder="Search projects..."
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
              onClick={() => setArchiveDialogOpen(true)}
            >
              Archive
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
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setArchiveListOpen(true);
              }}
            >
              <ListItemIcon>
                <IconNotes width={18} />
              </ListItemIcon>
              Archived project list
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
                    No projects found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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

      <ArchiveProject
        open={archiveListOpen}
        companyId={Number(user?.company_id)}
        onClose={() => setArchiveListOpen(false)}
        onWorkUpdated={fetchProjects}
      />
      {editOpen && (
        <EditProject
          open={editOpen}
          onClose={() => setEditOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleEditSubmit}
          isSaving={isSaving}
          project={selectedProject}
        />
      )}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
      >
        <DialogTitle>Confirm Archive</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to archive {selectedRowIds.size} project(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setArchiveDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button color="error" variant="outlined" onClick={() => void archiveSelected()}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProjects;
