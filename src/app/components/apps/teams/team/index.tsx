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
  Chip,
  CircularProgress,
  CardContent,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconFilter,
  IconSearch,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import { useSearchParams } from "next/navigation";
import BlankCard from "@/app/components/shared/BlankCard";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

dayjs.extend(customParseFormat);

export interface TeamList {
  supervisor_id: number;
  supervisor_name: string;
  supervisor_image: string | null;
  supervisor_email: string | null;
  supervisor_phone: string | null;
  team_name: string;
  name: string;
  image: string | null;
  is_active: boolean;
  trade_name: string | null;
  trade_id: number | null;
}

export interface TradeList {
  trade_id: number;
  name: string;
}

const TablePagination = () => {
  const [data, setData] = useState<TeamList[]>([]);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];
  const [user, setUser] = useState([]);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };
  const [filters, setFilters] = useState({
    team: "",
    trade: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  const searchParams = useSearchParams();
  const teamId = searchParams ? searchParams.get("team_id") : "";

  // Fetch data
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${id.company_id}`
        );
        if (res.data) {
          setTrade(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [api]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `team/get-team-member-list?team_id=${teamId}`
        );
        if (res.data?.info) {
          const flattened: TeamList[] = res.data.info.flatMap((team: any) =>
            team.users.map((user: any) => ({
              supervisor_id: team.supervisor_id,
              supervisor_name: team.supervisor_name,
              supervisor_image: team.supervisor_image,
              supervisor_email: team.supervisor_email,
              supervisor_phone: team.supervisor_phone,
              team_name: team.team_name,
              name: user.name,
              image: user.image,
              is_active: user.is_active,
              trade_id: user.trade_id,
              trade_name: user.trade_name,
            }))
          );

          setData(flattened);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch users", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  const uniqueTrades = useMemo(
    () => [...new Set(data.map((item) => item.name).filter(Boolean))],
    [data]
  );

  const trades = useMemo(
    () => [...new Set(trade.map((trade) => trade.name).filter(Boolean))],
    [trade]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesTeam = filters.team ? item.name === filters.team : true;
      const matchesTrade = filters.trade
        ? item.trade_name === filters.trade
        : true;

      const search = searchTerm.toLowerCase();

      const matchesSearch = item.name?.toLowerCase().includes(search);

      return matchesTeam && matchesSearch && matchesTrade;
    });
  }, [data, filters, searchTerm]);

  const columnHelper = createColumnHelper<TeamList>();
  const columns = [
    columnHelper.accessor("name", {
      header: () => "Name",
      cell: (info) => {
        const row = info.row.original;
        const name = info.getValue();
        const image = row.image;
        const defaultImage = "/images/users/user.png";

        return (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              src={image || defaultImage}
              alt={name}
              sx={{ width: 36, height: 36 }}
            />
            <Box>
              <Typography variant="h5" color="textSecondary">
                {name ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.trade_name, {
      id: "trade_name",
      header: () => "Trade",
      cell: (info) => {
        const row = info.row.original;
        const trade = row.trade_name;

        return (
          <Typography variant="h5" color="textSecondary">
            {trade ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.is_active, {
      id: "status",
      header: () => "Status",
      cell: (info) => {
        const value = info.getValue();
        if (value) {
          return (
            <Chip
              size="small"
              label={"Working"}
              sx={{
                backgroundColor: (theme) => theme.palette.success.light,
                color: (theme) => theme.palette.success.main,
                fontWeight: 500,
                borderRadius: "6px",
                px: 1.5,
              }}
            />
          );
        } else {
          return (
            <Chip
              size="small"
              label={"Not Working"}
              sx={{
                backgroundColor: (theme) => theme.palette.error.light,
                color: (theme) => theme.palette.error.main,
                fontWeight: 500,
                borderRadius: "6px",
                px: 1.5,
              }}
            />
          );
        }
      },
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Reset to first page when search term changes
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
    <Grid container spacing={2}>
      {/* Render the search and table */}
      <Grid
        size={{
          xs: 12,
          lg: 4,
        }}
      >
        <BlankCard>
          <CardContent>
            <Box textAlign="center" display="flex" justifyContent="center">
              <Box>
                <Avatar
                  src={
                    data[0].supervisor_image
                      ? data[0].supervisor_image
                      : "/images/users/user.png"
                  }
                  alt={"user1"}
                  sx={{ width: 120, height: 120, margin: "0 auto" }}
                />
                <Typography variant="subtitle1" color="textSecondary" mb={1}>
                  {data[0].supervisor_name ?? null}
                </Typography>
                <Typography variant="h5" mb={1}>
                  Supervisor
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Stack direction="row" spacing={2} py={2} alignItems="center">
              <Box>
                <Typography variant="h6">Email</Typography>
              </Box>
              <Box sx={{ ml: "auto !important" }}>
                <Typography variant="h5" color="textSecondary">
                  {data[0].supervisor_email ?? "-"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Divider />
            <Stack direction="row" spacing={2} py={2} alignItems="center">
              <Box>
                <Typography variant="h6">Phone</Typography>
              </Box>
              <Box sx={{ ml: "auto !important" }}>
                <Typography variant="h5" color="textSecondary">
                  {data[0].supervisor_phone ?? "-"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
          </CardContent>
        </BlankCard>
      </Grid>
      <Grid
        size={{
          xs: 12,
          lg: 8,
        }}
      >
        <BlankCard>
          <Grid display="flex" gap={1} mt={2} ml={2}>
            <Typography variant="h4">{data[0]?.team_name}</Typography>
          </Grid>

          <Stack
            mt={0}
            mr={2}
            ml={2}
            mb={0}
            justifyContent="space-between"
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2, md: 4 }}
          >
            <Grid display="flex" gap={1} alignItems={"center"}>
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
                <DialogTitle>Filters</DialogTitle>
                <DialogContent>
                  <Stack spacing={2} mt={1}>
                    <TextField
                      select
                      label="Team member"
                      value={tempFilters.team}
                      onChange={(e) =>
                        setTempFilters({ ...tempFilters, team: e.target.value })
                      }
                      fullWidth
                    >
                      <MenuItem value="">Users</MenuItem>
                      {uniqueTrades.map((name, i) => (
                        <MenuItem key={i} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </TextField>

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
                        team: "",
                        trade: "",
                      });
                      setFilters({
                        team: "",
                        trade: "",
                      });
                      setOpen(false);
                    }}
                    color="inherit"
                  >
                    Cancel
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
            gap={1}
            p={3}
            alignItems="center"
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1}>
              {/* <Button
                            variant="contained"
                            color="primary"
                            onClick={() => rerender()}
                          >
                            Force Rerender
                          </Button> */}
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
              gap={1}
            >
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography color="textSecondary">Page</Typography>
                <Typography color="textSecondary" fontWeight={600}>
                  {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                color="textSecondary"
              >
                <Typography color="textSecondary">| Enteries :</Typography>
                {/* <CustomTextField
                            type="number"
                            min="1"
                            max={table.getPageCount()}
                            defaultValue={table.getState().pagination.pageIndex + 1}
                            onChange={(e: { target: { value: any } }) => {
                              const page = e.target.value
                                ? Number(e.target.value) - 1
                                : 0;
                              table.setPageIndex(page);
                            }}
                          /> */}
              </Stack>
              <CustomSelect
                value={table.getState().pagination.pageSize}
                onChange={(e: { target: { value: any } }) => {
                  table.setPageSize(Number(e.target.value));
                }}
              >
                {[10, 15, 20, 25].map((pageSize) => (
                  <MenuItem key={pageSize} value={pageSize}>
                    {pageSize}
                  </MenuItem>
                ))}
              </CustomSelect>

              <IconButton
                size="small"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight />
              </IconButton>
            </Box>
          </Stack>
          </Stack>
          <Divider />

          <Grid container>
            <Grid size={12}>
              <Box>
                <TableContainer>
                  <Table
                    sx={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    <TableHead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableCell
                              key={header.id}
                              sx={{
                                width:
                                  header.column.id === "actions" ? 120 : "auto",
                              }}
                            >
                              <Typography
                                variant="h6"
                                mb={1}
                                onClick={header.column.getToggleSortingHandler()}
                                className={
                                  header.column.getCanSort()
                                    ? "cursor-pointer select-none"
                                    : ""
                                }
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                {(() => {
                                  const sort = header.column.getIsSorted();
                                  if (sort === "asc") return " 🔼";
                                  if (sort === "desc") return " 🔽";
                                  return null;
                                })()}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableHead>
                    <TableBody>
                      {table.getRowModel().rows?.length > 0 ? (
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
            </Grid>
          </Grid>
        </BlankCard>
      </Grid>
    </Grid>
  );
};

export default TablePagination;
