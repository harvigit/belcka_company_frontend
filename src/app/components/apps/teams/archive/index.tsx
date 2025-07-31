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
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
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
  IconSearch,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  name: string;
}

const TablePagination = () => {
  const [data, setData] = useState<TeamList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];

  // Fetch data
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true);
        const res = await api.get(`team/archive-team-list`);

        if (res.data) {
          setData(res.data.info);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [api]);

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const columnHelper = createColumnHelper<TeamList>();
  const columns = [
    columnHelper.accessor((row) => row?.name, {
      id: "name",
      header: () => "Team",
      cell: (info) => (
        <Typography variant="h6" color="textSecondary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
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
      <Box display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid>
      {/* Render the search and table */}
      <Grid>
        <Typography variant="h2">Archived Teams</Typography>
      </Grid>
      <Stack
        mt={1}
        mr={2}
        ml={2}
        mb={1}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1}>
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
        </Grid>
      </Stack>
      <Divider />

      <Grid container spacing={3}>
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
          <Stack
          gap={1}
          p={3}
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
            <Stack direction="row" alignItems="center" >
              <Typography color="textSecondary">Page</Typography>
              <Typography color="textSecondary" fontWeight={600}>
                {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </Typography>
            <Typography color="textSecondary" ml={'3px'}> | Enteries : </Typography>
            </Stack>
            <Stack
            ml={'5px'}
             direction="row"
             alignItems="center"
             color="textSecondary">
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
                sx={{width: "30px"}}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft />
              </IconButton>
              <IconButton
                size="small"
                sx={{width: "30px"}}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft />
              </IconButton>
              <IconButton
                size="small"
                sx={{width: "30px"}}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight />
              </IconButton>
              <IconButton
                size="small"
                sx={{width: "30px"}}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default TablePagination;
