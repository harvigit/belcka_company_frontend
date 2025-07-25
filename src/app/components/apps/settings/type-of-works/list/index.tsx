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
  Tooltip,
  Divider,
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
  IconEdit,
  IconFilter,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconX } from "@tabler/icons-react";
import CreateWork from "../create";
import EditWork from "../edit";
import { IconChevronRight } from "@tabler/icons-react";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import toast from "react-hot-toast";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  name: string;
  trade_name: string | null;
  trade_id: number | null;
}

export interface TradeList {
  trade_id: number;
  name: string;
}

export interface UserList {
  id: number;
  name: string;
}

const TablePagination = () => {
  const [data, setData] = useState<TeamList[]>([]);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserList[]>([]);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const [filters, setFilters] = useState({ trade: "" });
  const [tempFilters, setTempFilters] = useState(filters);

  const [open, setOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [editWorkOpen, setEditWorkOpen] = useState(false);
  const [editWorkData, setEditWorkData] = useState<{
    id: number;
    name: string;
    trade_id: number;
  } | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);

  // fetch company trades
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
  }, [id.company_id]);

  // fetch team member's
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`type-works/get?company_id=${id.company_id}`);
      setData(res.data.info);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // fetch user list
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get(`user/get-user-lists`);
        if (res.data) {
          setUsers(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleEdit = (work: { id: number; name: string; trade_id: number }) => {
    setEditWorkData(work);
    setEditWorkOpen(true);
  };

  const handleOpen = () => {
    setWorkOpen(true);
  };

  const handleClose = () => {
    setWorkOpen(false);
    fetchData();
  };

  const trades = useMemo(
    () => [...new Set(trade.map((trade) => trade.name).filter(Boolean))],
    [trade]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesTrade = filters.trade
        ? item.trade_name === filters.trade
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch = item.name?.toLowerCase().includes(search);
      return matchesSearch && matchesTrade;
    });
  }, [data, filters, searchTerm]);

  const columnHelper = createColumnHelper<TeamList>();
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
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
            }
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
        const user = row.original;
        const defaultImage = "/images/users/user.png";
        const isChecked = selectedRowIds.has(user.id);

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <CustomCheckbox
              checked={isChecked}
              onChange={() => {
                const newSelected = new Set(selectedRowIds);
                if (newSelected.has(user.id)) {
                  newSelected.delete(user.id);
                } else {
                  newSelected.add(user.id);
                }
                setSelectedRowIds(newSelected);
              }}
            />
            <Stack direction="row" alignItems="center" spacing={4}>
              <Typography variant="h5" color="textPrimary">
                {user.name ?? "-"}
              </Typography>
            </Stack>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.trade_name, {
      id: "trade_name",
      header: () => "Trade",
      cell: (info) => (
        <Typography variant="h5" color="body2">
          {info.row.original.trade_name ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit">
              <IconButton
                onClick={() =>
                  handleEdit({
                    id: item.id,
                    name: item.name,
                    trade_id: item.trade_id ?? 0,
                  })
                }
                color="primary"
              >
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

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  if (loading) {
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
      <Stack
        mt={1}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1} alignItems={"center"}>
          <Button variant="contained" color="primary">
            WORKS ({filteredData.length})
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
                  value={tempFilters.trade}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      trade: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">Trades</MenuItem>
                  {trades.map((name, i) => (
                    <MenuItem key={i} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => {
                  setTempFilters({
                    trade: "",
                  });
                  setFilters({
                    trade: "",
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
        <Stack direction={"row-reverse"} mb={1} mr={1}>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleOpen()}
            >
              New Work
            </Button>
          </Box>
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
              Remove
            </Button>
          )}
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
              <Typography color="textSecondary">
                Are you sure you want to remove {usersToDelete.length} work
                {usersToDelete.length > 1 ? "s" : ""} from the works?
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
                      "type-works/remove-works",
                      payload
                    );
                    toast.success(response.data.message);
                    setSelectedRowIds(new Set());
                    await fetchData();
                  } catch (error) {
                    toast.error("Failed to remove works");
                  } finally {
                    setConfirmOpen(false);
                  }
                }}
                variant="outlined"
                color="error"
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Stack>
      <Divider />

      <Grid container spacing={3}>
        <Grid
          size={{
            xs: 12,
            lg: 12,
          }}
        >
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
      <Dialog
        open={workOpen}
        onClose={() => setWorkOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <CreateWork onCloseDialog={() => handleClose()} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editWorkOpen}
        onClose={() => setEditWorkOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {editWorkData && (
            <EditWork
              id={editWorkData.id}
              name={editWorkData.name}
              trade_id={editWorkData.trade_id}
              onCloseDialog={() => {
                setEditWorkOpen(false);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TablePagination;
