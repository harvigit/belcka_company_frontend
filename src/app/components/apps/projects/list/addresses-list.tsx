"use client";
import React, { useEffect, useState, useMemo } from "react";
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
  Divider,
  IconButton,
  Stack,
  MenuItem,
  CircularProgress,
  Drawer,
  Tab,
  Tabs,
  ListItemIcon,
  Menu,
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
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { ProjectList } from "./index";

import { WorksTab } from "./address-sidebar-tab/works-tab";
import { DocumentsTab } from "./address-sidebar-tab/documents-tab";
import { TradesTab } from "./address-sidebar-tab/trades-tab";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CreateProjectTask from "../tasks";
import toast from "react-hot-toast";

dayjs.extend(customParseFormat);

interface AddressesListProps {
  projectId: number | null;
  searchTerm: string;
  filters: {
    status: string;
    sortOrder: string;
  };
  onProjectUpdated?: () => void;
  onSelectionChange: (ids: number[]) => void;
  processedIds: number[];
  // onParentActionPerformed?: (fetchAddresses: Function) => void;
  shouldRefresh: boolean;
}

export interface TradeList {
  id: number;
  name: string;
}

const AddressesList = ({
  projectId,
  searchTerm,
  filters,
  onProjectUpdated,
  onSelectionChange,
  processedIds,
  shouldRefresh,
}: AddressesListProps) => {
  const [data, setData] = useState<ProjectList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [value, setValue] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    onSelectionChange(Array.from(selectedRowIds));
  }, [selectedRowIds]);

  const openMenu = Boolean(anchorEl);

  const [formData, setFormData] = useState<any>({});
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${user.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);

  const handleOpenCreateDrawer = () => {
    setFormData({
      address_id: null,
      type_of_work_id: 0,
      location_id: null,
      trade_id: null,
      company_id: user?.company_id || 0,
      duration: 0,
      rate: 0,
      is_attchment: false,
    });
    setDrawerOpen(true);
  };

  const fetchAddresses = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(`address/get?project_id=${projectId}`);
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch addresses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [projectId, processedIds, shouldRefresh]);

  useEffect(() => {
    if (sidebarData !== null) {
      setValue(0);
    }
  }, [sidebarData]);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        project_id: projectId,
      };
      const result = await api.post("company-tasks/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setDrawerOpen(false);
        setLoading(true);
        onProjectUpdated?.();
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          address_id: null,
          type_of_work_id: 0,
          location_id: null,
          trade_id: null,
          company_id: user?.company_id || 0,
          duration: 0,
          rate: 0,
          is_attchment: false,
        });
      } else {
        toast.error(result.data.message);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating address:", error);
      setLoading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const currentFilteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesStatus = filters.status
        ? item.status_text === filters.status
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(search) ||
        item.progress.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });

    if (filters.sortOrder === "asc") {
      filtered = filtered.sort((a, b) => a.name?.localeCompare(b.name));
    } else if (filters.sortOrder === "desc") {
      filtered = filtered.sort((a, b) => b.name?.localeCompare(a.name));
    }

    return filtered;
  }, [data, filters, searchTerm]);

  const columnHelper = createColumnHelper<ProjectList>();

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  useEffect(() => {
    // remove processed IDs from selectedRowIds
    setSelectedRowIds((prev) => {
      const updated = new Set(
        [...prev].filter((id) => !processedIds.includes(id))
      );
      return updated;
    });
  }, [processedIds]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "name",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <CustomCheckbox
              checked={
                selectedRowIds.size === currentFilteredData.length &&
                currentFilteredData.length > 0
              }
              // indeterminate={
              //   selectedRowIds.size > 0 && selectedRowIds.size < data.length
              // }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRowIds(
                    new Set(currentFilteredData.map((row) => row.id))
                  );
                } else {
                  setSelectedRowIds(new Set());
                }
              }}
            />
            <Typography variant="subtitle2" fontWeight="inherit">
              Address
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(item.id);
          const isProcessed = processedIds.includes(item.id);
          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={4}
              sx={{ pl: 0.2 }}
            >
              <CustomCheckbox
                checked={isChecked}
                onChange={() => {
                  if (isProcessed) return;

                  const newSelected = new Set(selectedRowIds);
                  if (isChecked) newSelected.delete(item.id);
                  else newSelected.add(item.id);
                  setSelectedRowIds(newSelected);
                }}
              />

              <Typography
                className="f-17"
                onClick={() => {
                  setSidebarData({
                    addressName: item.name,
                    companyId: item.company_id,
                    projectId: item.project_id,
                    addressId: item.id,
                    info: [true],
                  });
                }}
                sx={{
                  cursor: "pointer",
                }}
              >
                {" "}
                {item.name ?? "-"}{" "}
              </Typography>
            </Stack>
          );
        },
      }),
      columnHelper.accessor("progress", {
        id: "progress",
        header: () => "Progress",
        cell: (info) => {
          const statusInt = info.row.original.status_int;
          let color = "textPrimary";
          if (statusInt === 13) color = "#999999";
          else if (statusInt === 4) color = "#32A852";
          else if (statusInt === 3) color = "#FF7F00";

          return (
            <Typography className="f-17" color={color} fontWeight={700}>
              {info.getValue() ?? "-"}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("check_ins", {
        id: "check_ins",
        header: () => "Check-ins",
        cell: (info) => (
          <Typography className="f-17" color={"#007AFF"} fontWeight={700}>
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("start_date", {
        id: "start_date",
        header: () => "Start date",
        cell: (info) => (
          <Typography className="f-17" color="textPrimary">
            {formatDate(info.getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("end_date", {
        id: "end_date",
        header: () => "End date",
        cell: (info) => (
          <Typography className="f-17" color="textPrimary">
            {formatDate(info.getValue())}
          </Typography>
        ),
      }),
    ],
    [data, selectedRowIds]
  );

  const table = useReactTable({
    data: currentFilteredData,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  // if (loading) {
  //   return (
  //     <Box
  //       display="flex"
  //       justifyContent="center"
  //       alignItems="center"
  //       minHeight="300px"
  //     >
  //       <CircularProgress />
  //     </Box>
  //   );
  // }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Box>
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
                              <Typography
                                variant="subtitle2"
                                fontWeight="inherit"
                              >
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
                  {
                    // table.getRowModel().rows.length ? (
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
                    // ) : (
                    //   <TableRow>
                    //     <TableCell colSpan={columns.length} align="center">
                    //       No records found
                    //     </TableCell>
                    //   </TableRow>
                    // )
                  }
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
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
      </Grid>

      <Drawer
        anchor="right"
        open={sidebarData !== null}
        onClose={() => setSidebarData(null)}
        sx={{
          width: { xs: "100%", sm: 500 },
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 500 },
            padding: 2,
            backgroundColor: "#fff",
            boxSizing: "border-box",
          },
        }}
      >
        <Box>
          {Array.isArray(sidebarData?.info) && sidebarData.info.length > 0 ? (
            <>
              {/* Header */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Box display="flex" alignItems="center">
                  <IconButton onClick={() => setSidebarData(null)}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" fontWeight={700} noWrap>
                    {sidebarData.addressName}
                  </Typography>
                  <Menu
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleClose}
                    slotProps={{
                      list: {
                        "aria-labelledby": "basic-button",
                      },
                    }}
                  >
                    <MenuItem onClick={handleClose}>
                      <Link
                        color="body1"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenCreateDrawer();
                        }}
                        style={{
                          width: "100%",
                          color: "#11142D",
                          textTransform: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyItems: "center",
                        }}
                      >
                        <ListItemIcon>
                          <IconPlus width={18} />
                        </ListItemIcon>
                        Add Task
                      </Link>
                    </MenuItem>
                  </Menu>
                </Box>
                <Box display="flex">
                  <IconButton
                    sx={{ margin: "0px" }}
                    id="basic-button"
                    aria-controls={openMenu ? "basic-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={openMenu ? "true" : undefined}
                    onClick={handleClick}
                  >
                    <IconDotsVertical width={18} />
                  </IconButton>
                </Box>
              </Box>
              {/* Add task */}
              <CreateProjectTask
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                formData={formData}
                setFormData={setFormData}
                handleTaskSubmit={handleTaskSubmit}
                trade={trade}
                isSaving={isSaving}
                address_id={sidebarData.addressId}
                projectId={projectId}
              />
              {/* Tabs */}
              <Tabs
                className="address-sidebar-tabs"
                value={value}
                onChange={handleTabChange}
                aria-label="Sidebar Tabs"
                variant="fullWidth"
                TabIndicatorProps={{ style: { display: "none" } }}
                sx={{
                  backgroundColor: "#E0E0E0",
                  borderRadius: "12px",
                  minHeight: "40px",
                  padding: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                {["Works", "Documents", "Trades"].map((label, index) => (
                  <Tab
                    key={label}
                    label={label}
                    sx={{
                      textTransform: "none",
                      borderRadius: "10px",
                      minHeight: "32px",
                      minWidth: "auto",
                      px: 3,
                      py: 0.5,
                      fontSize: "14px",
                      fontWeight: value === index ? "600" : "400",
                      color: value === index ? "#000 !important" : "#888",
                      backgroundColor: value === index ? "#fff" : "transparent",
                      boxShadow:
                        value === index
                          ? "0px 2px 4px rgba(0,0,0,0.1)"
                          : "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </Tabs>

              {value === 0 && (
                <WorksTab
                  companyId={sidebarData.companyId}
                  addressId={sidebarData.addressId}
                />
              )}
              {value === 1 && (
                <DocumentsTab
                  companyId={sidebarData.companyId}
                  addressId={sidebarData.addressId}
                  projectId={sidebarData.projectId}
                />
              )}
              {value === 2 && (
                <TradesTab
                  companyId={sidebarData.companyId}
                  addressId={sidebarData.addressId}
                  projectId={sidebarData.projectId}
                />
              )}
            </>
          ) : (
            <Typography variant="body1" color="text.secondary" mt={2}>
              No work logs available.
            </Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default AddressesList;
