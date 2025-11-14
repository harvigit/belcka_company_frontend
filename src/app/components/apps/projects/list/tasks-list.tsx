"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  Typography,
  Box,
  Grid,
  IconButton,
  Stack,
  CircularProgress,
  Badge,
  Button,
  Tooltip,
  Drawer,
  Autocomplete,
  Divider,
  MenuItem,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { IconArrowLeft, IconChevronRight, IconDownload, IconEdit } from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import { IconChevronLeft } from "@tabler/icons-react";

dayjs.extend(customParseFormat);

export type TaskList = {
  id: number;
  company_task_name: string;
  address_name: string;
  start_date?: string;
  end_date?: string;
  status_int: number;
  status_text: string;
  progress: string;
  image_count: string;
  address_id: number;
  company_task_id: number;
};

interface TasksListProps {
  projectId: number | null;
  searchTerm: string;
  filters: {
    status: string;
    sortOrder: string;
  };
  shouldRefresh: boolean;
  onUpdate: () => void;
}

const TasksList = ({ projectId, searchTerm, filters,shouldRefresh,onUpdate }: TasksListProps) => {
  const [data, setData] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, seIsSaving] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskList | null>(null);
  const [trade, setTrade] = useState<any[]>([]);
  const [address, setAddress] = useState<any[]>([]);
  const [location, setLocation] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [formData, setFormData] = useState<any>({});
  const [columnFilters, setColumnFilters] = useState<any>([]);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`project/get-tasks?project_id=${projectId}`);
      if (res.data) setData(res.data.info);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!projectId) return;
    fetchTasks();
  }, [projectId]);

  useEffect(() =>{
    if(shouldRefresh == false && projectId){
      fetchTasks()
      onUpdate?.();
    }
  }, [shouldRefresh == false])

  useEffect(() => {
    if (!user.company_id) return;
    (async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${user.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    })();
  }, [user.company_id]);

  useEffect(() => {
    if (!drawerOpen || !projectId) return;
    (async () => {
      try {
        const res = await api.get(`address/get?project_id=${projectId}`);
        if (res.data && Array.isArray(res.data.info)) {
          setAddress(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching addresses", err);
      }
    })();
  }, [drawerOpen, projectId]);

  useEffect(() => {
    if (!user.company_id) return;
    (async () => {
      try {
        const res = await api.get(
          `company-locations/get?company_id=${user.company_id}`
        );
        if (res.data && Array.isArray(res.data.info)) {
          setLocation(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching locations", err);
      }
    })();
  }, [user.company_id]);

  useEffect(() => {
    if (!formData.trade_id) {
      setTasks([]);
      return;
    }

    (async () => {
      try {
        const res = await api.get(
          `type-works/get-work-resources?trade_id=${formData.trade_id}`
        );
        if (res.data && Array.isArray(res.data.info)) {
          setTasks(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching tasks", err);
      }
    })();
  }, [formData.trade_id]);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    seIsSaving(true);

    try {
      const payload = {
        ...formData,
        id: selectedTask?.id,
        project_id: projectId,
        company_id: user.company_id,
      };

      const endpoint = `company-tasks/update`;

      const res = await api.put(endpoint, payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setDrawerOpen(false);
        setSelectedTask(null);
        setFormData({});
        // Refresh list
        const refresh = await api.get(
          `project/get-tasks?project_id=${projectId}`
        );
        if (refresh.data) setData(refresh.data.info);
      } else {
      }
    } catch (error) {
      console.error("Error submitting task:", error);
    } finally {
      seIsSaving(false);
    }
  };

  // ✅ Handle Edit
  const handleEdit = useCallback((task: any) => {
    setSelectedTask(task);
    setFormData({
      id: task.company_task_id,
      company_task_name: task.company_task_name,
      address_id: task.address_id,
      trade_id: task.trade_id,
      location_id: task.location_id,
      is_attchment: task.is_attchment,
    });
    setDrawerOpen(true);
  }, []);

  // ✅ UI Filtering
  const currentFilteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesStatus = filters.status
        ? item.status_text === filters.status
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.company_task_name.toLowerCase().includes(search) ||
        item.address_name.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });

    if (filters.sortOrder === "asc") {
      filtered = filtered.sort((a, b) =>
        a.company_task_name?.localeCompare(b.company_task_name)
      );
    } else if (filters.sortOrder === "desc") {
      filtered = filtered.sort((a, b) =>
        b.company_task_name?.localeCompare(a.company_task_name)
      );
    }
    return filtered;
  }, [data, searchTerm, filters]);

  const handleDownloadZip = async (addressId: number, taskId: number) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${addressId}?taskId=${taskId}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tasks_address_${addressId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };
  const columnHelper = createColumnHelper<TaskList>();
  const columns = useMemo(() => {
    return [
      columnHelper.accessor("company_task_name", {
        id: "company_task_name",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <CustomCheckbox
              checked={selectedRowIds.size === data.length && data.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRowIds(new Set(data.map((_, i) => i)));
                } else {
                  setSelectedRowIds(new Set());
                }
              }}
            />
            <Typography variant="subtitle2" fontWeight="inherit">
              Tasks
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(row.index);
          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={4}
              sx={{ pl: 1 }}
            >
              <CustomCheckbox
                checked={isChecked}
                onChange={() => {
                  const newSelected = new Set(selectedRowIds);
                  isChecked
                    ? newSelected.delete(row.index)
                    : newSelected.add(row.index);
                  setSelectedRowIds(newSelected);
                }}
              />
              <Typography className="f-14">
                {item.company_task_name ?? "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("address_name", {
        id: "address_name",
        header: () => "Address",
        cell: (info) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),

      columnHelper.accessor("status_text", {
        id: "status_text",
        header: () => "Status",
        cell: (info) => {
          const statusInt = info.row.original.status_int;
          let color = "textPrimary";
          if (statusInt === 1) color = "#1854d8";
          else if (statusInt === 4) color = "#32A852";
          else if (statusInt === 3) color = "#FF7F00";

          return (
            <Typography
              className="f-14"
              color={color}
              fontWeight={500}
              sx={{ px: 1.5 }}
            >
              {info.getValue() ?? "-"}
            </Typography>
          );
        },
      }),

      columnHelper.accessor("progress", {
        id: "progress",
        header: () => "Progress",
        cell: (info) => {
          const statusInt = info.row.original.status_int;
          let color = "textPrimary";
          if (statusInt === 1 || statusInt === 14) color = "#1854d8";
          else if (statusInt === 4) color = "#32A852";
          else if (statusInt === 3) color = "#FF7F00";

          return (
            <Typography
              className="f-14"
              color={color}
              fontWeight={500}
              sx={{ px: 1.5 }}
            >
              {info.getValue() ?? "-"}
            </Typography>
          );
        },
      }),

      columnHelper.accessor("start_date", {
        id: "start_date",
        header: () => "Start date",
        cell: (info) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),

      columnHelper.accessor("end_date", {
        id: "end_date",
        header: () => "End date",
        cell: (info) => {
          const rowIndex = info.row.index;
          return (
            <Box
              display="flex"
              alignItems="center"
              gap={6}
              justifyContent={"space-between"}
            >
              <Typography variant="h5" color="textPrimary">
                {info.row.original.status_int == 4 ? info.getValue() : "-"}
              </Typography>
              <Badge
                badgeContent={info.row.original.image_count}
                color="error"
                overlap="circular"
              >
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() =>
                    handleDownloadZip(
                      info.row.original.address_id,
                      info.row.original.company_task_id
                    )
                  }
                >
                  <IconDownload size={24} />
                </Button>
              </Badge>
            </Box>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original.status_int;
          const id = row.original.id;
          return (
            <>
              {item == 1 && (
                <Box display="flex">
                  <Tooltip title="Edit">
                    <IconButton
                      onClick={() => handleEdit(row.original)}
                      color="primary"
                    >
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </>
          );
        },
      }),
    ];
  }, [data, selectedRowIds]);
  const table = useReactTable<TaskList>({
    data: currentFilteredData,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isActive = header.column.getIsSorted();
                      const isAsc = header.column.getIsSorted() === "asc";
                      const isSortable = header.column.getCanSort();

                      return (
                        <TableCell
                          key={header.id}
                          align="center"
                          sx={{
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            width:
                              header.column.id === "actions" ? 120 : "auto",
                          }}
                        >
                          <Box
                            onClick={header.column.getToggleSortingHandler()}
                            p={0}
                            sx={{
                              cursor: isSortable ? "pointer" : "default",
                              border: "2px solid transparent",
                              borderRadius: "6px",
                              display: "flex",
                              justifyContent: "flex-start",
                              "&:hover": { color: "#888" },
                              "&:hover .hoverIcon": { opacity: 1 },
                            }}
                          >
                            <Typography variant="subtitle2">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </Typography>
                            {isSortable && (
                              <Box
                                component="span"
                                className="hoverIcon"
                                ml={0.5}
                                sx={{
                                  transition: "opacity 0.2s",
                                  opacity: isActive ? 1 : 0,
                                  fontSize: "0.9rem",
                                  color: isActive ? "#000" : "#888",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                {isActive ? (isAsc ? "↑" : "↓") : "↑"}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} sx={{ padding: "10px" }}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Divider />
        <Stack
          gap={1}
          pr={3}
          pt={1}
          pl={3}
          pb={3}
          alignItems="center"
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography color="textSecondary">
              {table.getPrePaginationRowModel().rows.length} Rows
            </Typography>
          </Box>
          <Box
            sx={{
              display: {
                xs: "block",
                sm: "flex",
              },
            }}
            alignItems="center"
          >
            <Stack direction="row" alignItems="center">
              <Typography color="textSecondary">Page</Typography>
              <Typography color="textSecondary" fontWeight={600} ml={1}>
                {table.getState().pagination.pageIndex + 1} of{" "}
                {Math.max(1, table.getPageCount())}
              </Typography>
              <Typography color="textSecondary" ml={"3px"}>
                {" "}
                | Entries :{" "}
              </Typography>
            </Stack>
            <Stack
              ml={"5px"}
              direction="row"
              alignItems="center"
              color="textSecondary"
            >
              <CustomSelect
                value={table.getState().pagination.pageSize}
                onChange={(e: { target: { value: any } }) => {
                  table.setPageSize(Number(e.target.value));
                }}
              >
                {[50, 100, 250, 500].map((pageSize) => (
                  <MenuItem key={pageSize} value={pageSize}>
                    {pageSize}
                  </MenuItem>
                ))}
              </CustomSelect>
              <IconButton
                size="small"
                sx={{ width: "30px" }}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft />
              </IconButton>
              <IconButton
                size="small"
                sx={{ width: "30px" }}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </Grid>

      {/* ✅ Drawer for Add/Edit */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
          setFormData({});
        }}
        sx={{
          "& .MuiDrawer-paper": {
            width: 500,
            padding: 3,
            boxSizing: "border-box",
          },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box height={"100%"}>
            <form onSubmit={handleTaskSubmit} className="address-form">
              <Grid>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <IconButton onClick={() => setDrawerOpen(false)}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6">
                    {selectedTask ? "Edit Task" : "Add Task"}
                  </Typography>
                </Stack>
                <CustomTextField
                  fullWidth
                  label="Task Name"
                  value={formData.company_task_name || ""}
                  onChange={(e: any) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      company_task_name: e.target.value,
                    }))
                  }
                  sx={{ mt: 2 }}
                />

                <Autocomplete
                  options={trade}
                  className="trade-selection"
                  value={trade.find((t) => t.id === formData.trade_id) ?? null}
                  disabled
                  //   onChange={(e, val) =>
                  //     setFormData((prev: any) => ({
                  //       ...prev,
                  //       trade_id: val ? val.id : null,
                  //     }))
                  //   }
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <CustomTextField {...params} label="" />
                  )}
                  sx={{ mt: 2 ,width: "100% !important"}}
                />

                <Autocomplete
                  options={address}
                  value={
                    address.find((a) => a.id === formData.address_id) ?? null
                  }
                  onChange={(e, val) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      address_id: val ? val.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <CustomTextField {...params} label="Select Address" />
                  )}
                  sx={{ mt: 2 }}
                />

                <Autocomplete
                  options={location}
                  value={
                    location.find((l) => l.id === formData.location_id) ?? null
                  }
                  onChange={(e, val) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      location_id: val ? val.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <CustomTextField {...params} label="Select Location" />
                  )}
                  sx={{ mt: 2 }}
                />
              </Grid>
              <Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <CustomCheckbox
                    checked={formData.is_attchment || false}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        is_attchment: e.target.checked,
                      }))
                    }
                  />
                  <Typography>Attachment Mandatory</Typography>
                </Stack>

                <Box mt={2} display="flex" justifyContent="start" gap={2}>
                  <Button
                    color="primary"
                    variant="contained"
                    size="large"
                    type="submit"
                    disabled={isSaving}
                    sx={{ borderRadius: 3 }}
                    className="drawer_buttons"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    color="inherit"
                    onClick={() => setDrawerOpen(false)}
                    variant="contained"
                    size="large"
                    sx={{
                      backgroundColor: "transparent",
                      borderRadius: 3,
                      color: "GrayText",
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>
    </Grid>
  );
};

export default TasksList;
