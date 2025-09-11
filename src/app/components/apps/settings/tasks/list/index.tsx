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
  Menu,
  ListItemIcon,
  Tooltip,
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
  IconFilter,
  IconNotes,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Link from "next/link";
import { IconDotsVertical } from "@tabler/icons-react";
import { IconX } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CreateTask from "../create";
import ArchiveTask from "../archive";
import { IconEdit } from "@tabler/icons-react";
import EditTask from "../edit";

dayjs.extend(customParseFormat);

export interface TradeList {
  id: number;
  name: string;
  trade_id: number;
}

export type TaskList = {
  id: number;
  name: string;
  trade_id?: number;
  trade_name?: string;
  duration: string;
  repeatable_job: boolean;
  is_pricework: boolean;
  rate: string;
  units: string;
};

export type UserList = {
  id: number;
  name: string;
};

const TablePagination = () => {
  const [data, setData] = useState<TaskList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);

  const [filters, setFilters] = useState({
    team: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: 0,
    name: "",
    trade_id: "",
    company_id: id.company_id,
    duration: 0,
    rate: 0,
    units: "",
    is_pricework: false,
    repeatable_job: false,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch data
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`type-works/get?company_id=${id.company_id}`);
      if (res.data) {
        setData(res.data.info);
        setLoading(false);
        setarchiveDrawerOpen(false);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [api]);

  // Fetch data
  const fetchArchiveAddress = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `type-works/archive-works-list?company_id=${id.company_id}`
      );
      // if (res.data?.info) {
      //   setData(res.data.info);
      // }
    } catch (err) {
      console.error("Failed to fetch archive addresses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchiveAddress();
  }, []);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${id.company_id}`
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
      name: "",
      trade_id: null,
      company_id: id.company_id,
      duration: 0,
      rate: 0,
      units: "",
      is_pricework: false,
      repeatable_job: false,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        repeatable_job: formData.is_pricework ? false: true,
        units: formData.is_pricework ? formData.units : null,
        duration: Number(formData.duration),
        rate: Number(formData.rate),
      };

      const result = await api.post("type-works/create", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
          trade_id: 0,
          is_pricework: 0,
          units: "",
          repeatable_job: 0,
        });
        fetchTasks();
        setDrawerOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const editTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        repeatable_job: formData.is_pricework ? false: true,
        duration: Number(formData.duration),
        rate: Number(formData.rate),
      };

      const result = await api.put("type-works/update", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          name: "",
          trade_id: 0,
          is_pricework: false,
          units: "",
          repeatable_job: false,
        });
        fetchTasks();
        setEditDrawerOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueTrades = useMemo(
    () => [...new Set(trade.map((item) => item.name).filter(Boolean))],
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesTeam = filters.team
        ? item.trade_name === filters.team
        : true;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.trade_name?.toLowerCase().includes(search) ||
        item.duration?.toLowerCase().includes(search);

      return matchesTeam && matchesSearch;
    });
  }, [data, filters, searchTerm]);

  // UseCallback to memoize these functions
  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setEditDrawerOpen(true);
  }, []);

  const columnHelper = createColumnHelper<TaskList>();
  const columns = [
    columnHelper.accessor("name", {
      id: "name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <CustomCheckbox
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            // indeterminate={
            //   selectedRowIds.size > 0 &&
            //   selectedRowIds.size < filteredData.length
            // }
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />
          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);

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
                if (isChecked) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedRowIds(newSelected);
              }}
            />
            <Stack direction="row" alignItems="center" spacing={1} >
              <Typography className="f-14" >{item.name ?? "-"}</Typography>
            </Stack>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.trade_name, {
      id: "trade_name",
      header: () => "Trade",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{px: 1.5}}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("repeatable_job", {
      header: () => "Type",
      cell: (info) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box>
              <Typography className="f-14" color="textPrimary" sx={{px: 1.5}}> 
                {info.getValue() ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.duration, {
      id: "duration",
      header: () => "Duration",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" fontWeight={500} sx={{px: 1.5}}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.rate, {
      id: "rate",
      header: () => "Rate",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{px: 1.5}}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.units, {
      id: "units",
      header: () => "Units",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{px: 1.5}}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit">
              <IconButton onClick={() => handleEdit(item.id)} color="primary">
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    }),
  ];

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

  // Reset to first page when search term changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  return (
    <Box>
      {/* Render the search and table */}
      <Stack
        mt={1}
        mr={2}
        ml={2}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1} alignItems={"center"}>
          <Button variant="contained" color="primary">
            TEMPLATES ({table.getPrePaginationRowModel().rows.length}){" "}
          </Button>
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
                  label="Trade"
                  value={tempFilters.team}
                  onChange={(e) =>
                    setTempFilters({ ...tempFilters, team: e.target.value })
                  }
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueTrades.map((trade, i) => (
                    <MenuItem key={i} value={trade}>
                      {trade}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => {
                  setTempFilters({
                    team: "",
                  });
                  setFilters({
                    team: "",
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
          {selectedRowIds.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconTrash width={18} />}
              sx={{ marginRight: "5px" }}
              onClick={() => {
                const selectedIds = Array.from(selectedRowIds);
                setUsersToDelete(selectedIds);
                setConfirmOpen(true);
              }}
            >
              Archive
            </Button>
          )}
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
              <Typography color="textSecondary">
                Are you sure you want to archive {usersToDelete.length} template
                {usersToDelete.length > 1 ? "s" : ""} from the templates?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setConfirmOpen(false)}
                variant="outlined"
                color="primary"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const payload = {
                      work_ids: usersToDelete.join(","),
                    };
                    const response = await api.post(
                      "type-works/archive-works",
                      payload
                    );
                    toast.success(response.data.message);
                    setSelectedRowIds(new Set());
                    await fetchTasks();
                    await fetchArchiveAddress();
                  } catch (error) {
                    toast.error("Failed to remove works");
                  } finally {
                    setConfirmOpen(false);
                  }
                }}
                variant="outlined"
                color="error"
              >
                Archive
              </Button>
            </DialogActions>
          </Dialog>
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
                Add Template
              </Link>
            </MenuItem>
            <MenuItem onClick={handleClose}>
              <Link
                color="body1"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setarchiveDrawerOpen(true);
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
                  <IconNotes width={18} />
                </ListItemIcon>
                Archive List
              </Link>
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>
      <Divider />
      {/* Add task */}
      <CreateTask
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        trade={trade}
        isSaving={isSaving}
      />

      {/* Edit task */}
      <EditTask
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        id={selectedTaskId}
        formData={formData}
        setFormData={setFormData}
        EditTask={editTask}
        trade={trade}
        isSaving={isSaving}
      />

      {/* Archive task list */}
      <ArchiveTask
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchTasks}
      />

      <Grid container spacing={3}>
        <Grid size={12}>
          <Box>
            <TableContainer
              sx={{
                maxHeight: 600,
              }}
            >
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
                                color="#8b939c"
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
                  {table.getPageCount()}
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
    </Box>
  );
};

export default TablePagination;
