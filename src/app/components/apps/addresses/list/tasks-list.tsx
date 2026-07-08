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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import {
  IconArrowLeft,
  IconChevronRight,
  IconDownload,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
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
import { AxiosResponse } from "axios";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";

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
  onTableReady: any;
}

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";

const TasksList = ({
  projectId,
  searchTerm,
  filters,
  shouldRefresh,
  onUpdate,
  onTableReady,
}: TasksListProps) => {
  const [data, setData] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchTask, setFetchTask] = useState(false);
  const [isSaving, seIsSaving] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskList | null>(null);
  const [trade, setTrade] = useState<any[]>([]);
  const [address, setAddress] = useState<any[]>([]);
  const [location, setLocation] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const fetchTasks = async () => {
    setFetchTask(true);
    try {
      let url = `project/get-tasks?project_id=${projectId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (filters?.status) {
        url += `&status=${encodeURIComponent(filters.status)}`;
      }
      if (filters?.sortOrder) {
        url += `&sortOrder=${encodeURIComponent(filters.sortOrder)}`;
      }
      const res = await api.get(url);
      if (res.data) {
        setData(res.data.info);
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setFetchTask(false);
    }
  };

  useEffect(() => {
    if (shouldRefresh == false && projectId) {
      fetchTasks();
      onUpdate?.();
    }
  }, [shouldRefresh == false]);

  useEffect(() => {
    const getTrades = async () => {
      try {
        const res: AxiosResponse<any> = await api.get(
          `get-company-resources?flag=tradeList&company_id=${user.company_id}`,
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    if (drawerOpen == true) {
      getTrades();
    }
  }, [drawerOpen, user.company_id]);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!drawerOpen || !projectId) return;

      try {
        const res = await api.get(`address/get?project_id=${projectId}`);
        if (res.data && Array.isArray(res.data.info)) {
          setAddress(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching addresses", err);
      }
    };
    if (drawerOpen == true) {
      fetchAddress();
    }
  }, [drawerOpen]);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!user.company_id) return;

      try {
        const res = await api.get(
          `company-locations/get?company_id=${user.company_id}`,
        );
        if (res.data && Array.isArray(res.data.info)) {
          setLocation(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching locations", err);
      }
    };
    if (drawerOpen == true) {
      fetchAddress();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!formData.trade_id) {
      setTasks([]);
      return;
    }

    (async () => {
      try {
        const res = await api.get(
          `type-works/get-work-resources?trade_id=${formData.trade_id}`,
        );
        if (res.data && Array.isArray(res.data.info)) {
          setTasks(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching tasks", err);
      }
    })();
  }, [formData.trade_id]);

  const handleConfirmDelete = async () => {
    try {
      const payload = {
        task_ids: deleteIds.join(","),
      };
      const res = await api.post("company-tasks/delete", payload);
      if (res.data.IsSuccess == true) {
        toast.success(res.data.message);
        setDeleteModalOpen(false);
        fetchTasks();
      }
    } catch (error) {}
    setDeleteModalOpen(false);
  };

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
        fetchTasks();
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
    return data;
  }, [data]);

  const handleDownloadZip = async (addressId: number, taskId: number) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${addressId}?taskId=${taskId}`,
        {
          responseType: "blob",
        },
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

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth >
            tableContainerRef.current.clientWidth,
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);

    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const columnHelper = createColumnHelper<TaskList>();
  const columns = useMemo(() => {
    return [
      {
        id: "select",
        header: ({ table }: any) => (
          <Stack direction="row" alignItems="center">
            <CustomCheckbox
              className="header-checkbox"
              checked={
                selectedRowIds.size === currentFilteredData.length &&
                currentFilteredData.length > 0
              }
              indeterminate={
                selectedRowIds.size > 0 &&
                selectedRowIds.size < currentFilteredData.length
              }
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const isChecked = e.target.checked;

                if (isChecked) {
                  setSelectedRowIds(
                    new Set(currentFilteredData.map((row) => row.id)),
                  );
                } else {
                  setSelectedRowIds(new Set());
                }
              }}
            />
          </Stack>
        ),
        cell: ({ row }: any) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(item.id);
          const isHovered = hoveredRow === item.id;
          const showCheckbox = isChecked || isHovered;

          return (
            <Stack
              direction="row"
              alignItems="center"
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
              sx={{ pl: 1 }}
            >
              <CustomCheckbox
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const newSelected = new Set(selectedRowIds);
                  if (isChecked) {
                    newSelected.delete(item.id);
                  } else {
                    newSelected.add(item.id);
                  }
                  setSelectedRowIds(newSelected);
                }}
                sx={{
                  opacity: showCheckbox ? 1 : 0,
                  pointerEvents: showCheckbox ? "auto" : "none",
                  transition: "opacity 0.2s ease",
                }}
              />
            </Stack>
          );
        },
      },
      columnHelper.accessor("company_task_name", {
        id: "companyTaskName",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Tasks
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(item.id);

          return (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography className="f-14">
                {item.company_task_name ?? "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("address_name", {
        id: "addressName",
        header: () => "Address",
        cell: (info) => (
          <Typography className="f-14" sx={{ px: 1 }}>
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),

      columnHelper.accessor("status_text", {
        id: "statusText",
        header: () => "Status",
        cell: (info) => {
          const statusInt = info.row.original.status_int;
          let color = "textPrimary";
          if (statusInt === 1) color = "#999999";
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
          if (statusInt === 1 || statusInt === 14) color = "#999999";
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
        id: "startDate",
        header: () => "Start date",
        cell: (info) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),

      columnHelper.accessor("end_date", {
        id: "endDate",
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
              <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                {info.row.original.status_int == 4 ? info.getValue() : "-"}
              </Typography>
              <Badge
                badgeContent={info.row.original.image_count}
                color="error"
                overlap="circular"
              >
                <IconButton
                  color="error"
                  onClick={() =>
                    handleDownloadZip(
                      info.row.original.address_id,
                      info.row.original.company_task_id,
                    )
                  }
                >
                  <IconDownload size={20} />
                </IconButton>
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
                  <Tooltip title="Delete">
                    <IconButton
                      color="error"
                      onClick={() => {
                        setDeleteIds([id]);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </>
          );
        },
      }),
    ];
  }, [data, selectedRowIds, hoveredRow, showAllCheckboxes]);

  const {
    table,
    pagination,
    setPagination,
    pageCount,
    setPageCount,
    totalRows,
    setTotalRows,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useServerTable({
    data: currentFilteredData,
    columns,
    fetchData: () => {
      if (projectId) fetchTasks();
    },
    debounceDependencies: [
      searchTerm,
      filters?.status,
      filters?.sortOrder,
      projectId,
    ],
  });
  useEffect(() => {
    if (onTableReady) onTableReady(table);
    table.setPageIndex(0);
  }, [table]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <Box
      sx={{
        height: "calc(95vh - 130px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <TableContainer ref={tableContainerRef}>
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
                            header.column.id === "actions"
                              ? 120
                              : header.column.id === "select"
                                ? 30
                                : "auto",

                          ...(header.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 3,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
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
                              header.getContext(),
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
              {fetchTask ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
                />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "calc(50vh - 100px)",
                      }}
                    >
                      <Image
                        src="/images/no-data.png"
                        alt="No data"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                        }}
                        width={200}
                        height={200}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{
                          padding: "10px",
                          ...(cell.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 1,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                        }}
                      >
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
        {data.length ? <Divider /> : <></>}
      </Box>

      <Divider />
      <TablePaginationFooter table={table} totalRows={totalRows} />

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
                  sx={{ mt: 2, width: "100% !important" }}
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

      {/* Delete task */}
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this task?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksList;
