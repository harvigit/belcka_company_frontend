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
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  DialogActions,
  DialogTitle,
  DialogContent,
  Dialog,
  CircularProgress,
  Tabs,
  Tab,
  Menu,
  ListItemIcon,
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
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconFilter,
  IconLocation,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { IconX } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Link from "next/link";
import { IconNotes } from "@tabler/icons-react";
import { IconUser } from "@tabler/icons-react";
import Image from "next/image";

dayjs.extend(customParseFormat);

export type ProjectList = {
  id: number;
  name: string;
  currency: string | null;
  address: string;
  budget: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  progress: string;
  status_int: number;
  status_text: string;
  check_ins: number;
};

const TablePagination = ({ projectId }: { projectId: number | null }) => {
  const [data, setData] = useState<ProjectList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);

  const [value, setValue] = useState(0);

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  const [filters, setFilters] = useState({ status: "", sortOrder: "" });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetching data when projectId or value changes
  useEffect(() => {
    if (projectId && value === 0) {
      const fetchTrades = async () => {
        setLoading(true);
        try {
          const res = await api.get(`address/get?project_id=${projectId}`);
          if (res.data) {
            setData(res.data.info);
          }
        } catch (err) {
          console.error("Failed to fetch projects", err);
        } finally {
          setLoading(false);
        }
      };
      fetchTrades();
    } else if (value === 1) {
      // const fetchWorks = async () => {
      //   setLoading(true);
      //   try {
      //     const res = await api.get(
      //       `type-works/get?company_id=${user.company_id}`
      //     );
      //     if (res.data) {
      //       setData(res.data.info);
      //     }
      //   } catch (err) {
      //     console.error("Failed to fetch types", err);
      //   } finally {
      //     setLoading(false);
      //   }
      // };
      // fetchWorks();
      setData([]);
    } else {
      setData([]);
    }
  }, [projectId, value, user]);

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const status = ["Completed", "Pending", "In Progress"];
  const uniqueTrades = status;

  const filteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesTeam = filters.status
        ? item.status_text === filters.status
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.progress?.toLowerCase().includes(search);
      return matchesTeam && matchesSearch;
    });

    if (filters.sortOrder === "asc") {
      filtered = filtered.sort((a, b) => (a.name > b.name ? 1 : -1));
    } else if (filters.sortOrder === "desc") {
      filtered = filtered.sort((a, b) => (a.name < b.name ? 1 : -1));
    }

    return filtered;
  }, [data, filters, searchTerm, tempFilters.sortOrder]);

  const columnHelper = createColumnHelper<ProjectList>();

  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor("name", {
        id: "name",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <CustomCheckbox
              checked={
                selectedRowIds.size === filteredData.length &&
                filteredData.length > 0
              }
              indeterminate={
                selectedRowIds.size > 0 &&
                selectedRowIds.size < filteredData.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRowIds(new Set(filteredData.map((_, i) => i)));
                } else {
                  setSelectedRowIds(new Set());
                }
              }}
            />
            <Typography variant="subtitle2" fontWeight="inherit">
              {value === 0 ? "Address" : "Tasks"}
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(row.index);
          return (
            <Stack direction="row" alignItems="center" spacing={4}>
              <CustomCheckbox
                checked={isChecked}
                onChange={() => {
                  const newSelected = new Set(selectedRowIds);
                  if (isChecked) {
                    newSelected.delete(row.index);
                  } else {
                    newSelected.add(row.index);
                  }
                  setSelectedRowIds(newSelected);
                }}
              />
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h5">{item.name ?? "-"}</Typography>
              </Stack>
            </Stack>
          );
        },
      }),

      ...(value === 0
        ? [
            columnHelper.accessor((row) => row?.progress, {
              id: "progress",
              header: () => "Progress",
              cell: (info) => {
                const statusInt = info.row.original.status_int;
                let color = "textPrimary";
                if (statusInt === 13) {
                  color = "#999999";
                } else if (statusInt === 4) {
                  color = "#32A852";
                } else if (statusInt === 3) {
                  color = "#FF7F00";
                }

                return (
                  <Typography variant="h5" color={color} fontWeight={700}>
                    {info.getValue() ?? "-"}
                  </Typography>
                );
              },
            }),

            columnHelper.accessor((row) => row?.check_ins, {
              id: "check_ins",
              header: () => "Check-ins",
              cell: (info) => {
                return (
                  <Typography variant="h5" color={"#007AFF"} fontWeight={700}>
                    {info.getValue() ?? "-"}
                  </Typography>
                );
              },
            }),
          ]
        : []),

      ...(value === 1
        ? [
            columnHelper.accessor((row) => row?.address, {
              id: "address",
              header: () => "Address",
              cell: (info) => {
                return (
                  <Typography variant="h5" color={"#007AFF"} fontWeight={700}>
                    {info.getValue() ?? "-"}
                  </Typography>
                );
              },
            }),

            columnHelper.accessor((row) => row?.status_text, {
              id: "status_text",
              header: () => "Status",
              cell: (info) => {
                const statusInt = info.row.original.status_int;
                let color = "textPrimary";
                if (statusInt === 13) {
                  color = "#999999";
                } else if (statusInt === 4) {
                  color = "#32A852";
                } else if (statusInt === 3) {
                  color = "#FF7F00";
                }

                return (
                  <Typography variant="h5" color={color} fontWeight={700}>
                    {info.getValue() ?? "-"}
                  </Typography>
                );
              },
            }),
          ]
        : []),

      columnHelper.accessor("start_date", {
        id: "start_date",
        header: () => "Start date",
        cell: (info) => {
          const value = info.getValue();
          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="h5" color="textPrimary">
                  {formatDate(value)}
                </Typography>
              </Box>
            </Stack>
          );
        },
      }),

      columnHelper.accessor((row) => row?.end_date, {
        id: "end_date",
        header: () => "End date",
        cell: (info) => {
          const value = info.getValue();
          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="h5" color="textPrimary">
                  {formatDate(value)}
                </Typography>
              </Box>
            </Stack>
          );
        },
      }),
    ];

    return baseColumns;
  }, [value, filteredData, selectedRowIds]);

  // Set up the table
  const table = useReactTable({
    data: filteredData,
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

  if (loading == true) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Render the search and table */}
      <Stack
        mt={1}
        ml={2}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1} alignItems={"center"}>
          <Tabs
            className="project-tabs"
            sx={{
              backgroundColor: "#D8D8D8 !important",
              borderRadius: "12px",
              width: "43%",
              height: "48px",
            }}
            value={value}
            onChange={handleTabChange}
            aria-label="simple tabs example"
          >
            <Tab
              label="Addresses"
              className="address-tab"
              sx={{
                fontWeight: value === 0 ? "bold" : "normal",
                color: value === 0 ? "black" : "gray",
                textTransform: "none",
                borderRadius: "12px",
                marginTop: "2%",
                marginLeft: "2%",
                width: "50%",
                height: "20px",
                backgroundColor: value === 0 ? "white" : "transparent",
                "&.MuiTab-root": {
                  borderRadius: "12px",
                },
              }}
            />
            <Tab
              label="Tasks"
              className="task-tab"
              sx={{
                fontWeight: value === 1 ? "bold" : "normal",
                color: value === 1 ? "black" : "gray",
                textTransform: "none",
                borderRadius: "12px",
                marginTop: "2%",
                marginRight: "2%",
                width: "45%",
                height: "20px",
                backgroundColor: value === 1 ? "white" : "transparent",
                "&.MuiTab-root": {
                  borderRadius: "12px",
                },
              }}
            />
          </Tabs>
          <TextField
            id="search"
            type="text"
            size="small"
            variant="outlined"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <Button variant="contained" onClick={() => setOpen(true)}>
            <IconFilter width={18} />
          </Button>
          {projectId && (
            <>
              <Link href={`/apps/teams/list?project_id=${projectId}`} passHref>
                <Typography variant="h5" color="#007AFF">
                  <Image
                    src={"/images/svgs/teams.svg"}
                    alt="logo"
                    height={30}
                    width={30}
                  />
                </Typography>
              </Link>
              <Link href={`/apps/users/list?project_id=${projectId}`} passHref>
                <Typography variant="h5" color="#FF7F00">
                  <Image
                    src={"/images/svgs/user.svg"}
                    alt="logo"
                    height={30}
                    width={30}
                  />
                </Typography>
              </Link>
            </>
          )}
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle
              sx={{ m: 0, position: "relative", overflow: "visible" }}
            >
              Filters
              <IconButton
                aria-label="close"
                onClick={() => setOpen(false)}
                size="large"
                sx={{
                  position: "absolute",
                  right: 12,
                  top: 8,
                  color: (theme) => theme.palette.grey[900],
                  backgroundColor: "transparent",
                  zIndex: 10,
                  width: 50,
                  height: 50,
                }}
              >
                <IconX size={40} style={{ width: 40, height: 40 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} mt={1}>
                <TextField
                  select
                  label="Status"
                  value={tempFilters.status}
                  onChange={(e) =>
                    setTempFilters({ ...tempFilters, status: e.target.value })
                  }
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueTrades.map((status, i) => (
                    <MenuItem key={i} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Sort A-Z"
                  value={tempFilters.sortOrder}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      sortOrder: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="asc">A-Z</MenuItem>
                  <MenuItem value="desc">Z-A</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => {
                  setTempFilters({
                    status: "",
                    sortOrder: "",
                  });
                  setFilters({
                    status: "",
                    sortOrder: "",
                  });
                  setOpen(false);
                }}
                color="inherit"
              >
                Clear
              </Button>

              <Button
                variant="contained"
                onClick={() => {
                  setFilters(tempFilters);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
        <Stack
          mb={2}
          justifyContent="end"
          direction={{ xs: "column", sm: "row" }}
        >
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
                // href="/apps/teams/create"
                href="#"
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
                  <IconLocation width={18} />
                </ListItemIcon>
                Add Address
              </Link>
            </MenuItem>
            <MenuItem onClick={handleClose}>
              <Link
                color="body1"
                // href="/apps/teams/create"
                href="#"
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
            <MenuItem onClick={handleClose}>
              <Link
                color="body1"
                href="#"
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
                  <IconNotes width={18} />
                </ListItemIcon>
                Project detail
              </Link>
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>
      <Divider />

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
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
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
                  {table.getPageCount()}
                </Typography>
                <Typography color="textSecondary" ml={"3px"}>
                  {" "}
                  | Enteries :{" "}
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
    </Box>
  );
};

export default TablePagination;
