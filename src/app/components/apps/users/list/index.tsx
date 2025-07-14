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
  Chip,
  DialogActions,
  DialogTitle,
  DialogContent,
  Dialog,
  Checkbox,
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
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);
import { Avatar } from "@mui/material";
import Link from "next/link";

export interface UserList {
  id: number;
  name: string;
  supervisor_name: string;
  user_image: string;
  trade_name: string;
  team_name: string;
  shifts: string;
  status: number;
}

const TablePagination = () => {
  const [data, setData] = useState<UserList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({ team: "", supervisor: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(`user/get-user-lists`);
        if (res.data) {
          setData(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);

  const uniqueTeams = useMemo(
    () => [...new Set(data.map((item) => item.team_name).filter(Boolean))],
    [data]
  );

  const uniqueSupervisors = useMemo(
    () => [
      ...new Set(data.map((item) => item.supervisor_name).filter(Boolean)),
    ],
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesTeam = filters.team ? item.team_name === filters.team : true;
      const matchesSupervisor = filters.supervisor
        ? item.supervisor_name === filters.supervisor
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.trade_name?.toLowerCase().includes(search) ||
        item.supervisor_name?.toLowerCase().includes(search) ||
        item.team_name?.toLowerCase().includes(search);
      return matchesTeam && matchesSupervisor && matchesSearch;
    });
  }, [data, filters, searchTerm]);

  const columnHelper = createColumnHelper<UserList>();
  const columns = [
    {
      id: "select-name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={6}>
          <Checkbox
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
          <Typography variant="h4">Name</Typography>
        </Stack>
      ),
      cell: ({ row }: any) => {
        const user = row.original;
        const defaultImage = "/images/users/user.png";
        return (
          <Stack direction="row" alignItems="center" spacing={6}>
            <Checkbox
              checked={selectedRowIds.has(user.id)}
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
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                src={user.user_image || defaultImage}
                alt={user.name}
                sx={{ width: 36, height: 36 }}
              />
              <Box>
                <Link href={`/apps/users/user?user_id=${user.id}`} passHref>
                  <Typography
                    variant="h5"
                    color="primary"
                    sx={{ cursor: "pointer" }}
                  >
                    {user.name ?? "-"}
                  </Typography>
                </Link>
                <Typography variant="body2" color="textSecondary">
                  {user.trade_name}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        );
      },
    },
    columnHelper.accessor((row) => row.supervisor_name, {
      id: "supervisor_name",
      header: () => "Supervisor",
      cell: (info) => (
        <Typography variant="h6" color="textSecondary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor((row) => row.team_name, {
      id: "team_name",
      header: () => "Team Name",
      cell: (info) => (
        <Typography variant="h6" color="textSecondary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor((row) => row.status, {
      id: "status",
      header: () => "Status",
      cell: (info) => {
        const value = info.getValue();
        return value ? (
          <Chip
            size="small"
            label="Working"
            sx={{
              backgroundColor: (theme) => theme.palette.success.light,
              color: (theme) => theme.palette.success.main,
              fontWeight: 500,
              borderRadius: "6px",
              px: 1.5,
            }}
          />
        ) : (
          <Chip
            size="small"
            label="Not Working"
            sx={{
              backgroundColor: (theme) => theme.palette.error.light,
              color: (theme) => theme.palette.error.main,
              fontWeight: 500,
              borderRadius: "6px",
              px: 1.5,
            }}
          />
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  const selectedRowIdsStr = [...selectedRowIds].join(", ");

  return (
    <Box>
      {/* Render the search and table */}
      <Stack
        mt={3}
        mr={2}
        ml={2}
        mb={1}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1} alignItems={"center"}>
          <Button variant="contained" color="primary">
            USERS ({table.getPrePaginationRowModel().rows.length})
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
            <DialogTitle>Filters</DialogTitle>
            <DialogContent>
              <Stack spacing={2} mt={1}>
                <TextField
                  select
                  label="Team"
                  value={tempFilters.team}
                  onChange={(e) =>
                    setTempFilters({ ...tempFilters, team: e.target.value })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueTeams.map((team) => (
                    <MenuItem key={team} value={team}>
                      {team}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Supervisor"
                  value={tempFilters.supervisor}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      supervisor: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueSupervisors.map((supervisor, i) => (
                    <MenuItem key={i} value={supervisor}>
                      {supervisor}
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
                    supervisor: "",
                  });
                  setFilters({
                    team: "",
                    supervisor: "",
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
          pr={3}
          pt={1}
          pl={3}
          pb={1}
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
                {[10, 50, 100, 250, 500].map((pageSize) => (
                  <MenuItem key={pageSize} value={pageSize}>
                    {pageSize}
                  </MenuItem>
                ))}
              </CustomSelect>

              <IconButton
                size="small"
                sx={{ width: "30px" }}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft />
              </IconButton>
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
              <IconButton
                size="small"
                sx={{ width: "30px" }}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </Stack>
      <Stack direction={"row-reverse"} mb={1} mr={1}>
        {selectedRowIds.size > 0 && (
          // <Button variant="contained">Remove User: {selectedRowIdsStr}</Button>
          <Button variant="contained" color="error">
            <IconTrash width={18}></IconTrash>
            Remove
          </Button>
        )}
      </Stack>
      <Divider />

      <Grid container spacing={3}>
        <Grid size={12}>
          <Box>
            <TableContainer>
              <Table
                stickyHeader
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
                            variant="h4"
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
    </Box>
  );
};

export default TablePagination;
