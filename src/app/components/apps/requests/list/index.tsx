"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Tooltip,
  Chip,
  FormControlLabel,
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
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

dayjs.extend(customParseFormat);

export interface CompanyList {
  id: number;
  table_name: string;
  requested_user: string;
  message: string;
  status: string;
  date: string;
  action: string;
  note: string;
  company: string;
}

const TablePagination = () => {
  const [data, setData] = useState<CompanyList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];

  const router = useRouter();
  // Fetch data
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(`admin/get-all-request`);
        if (res.data) {
          setData(res.data.requests);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [api]);

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.requested_user?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  type AllowedPaletteColor =
    | "primary"
    | "secondary"
    | "error"
    | "warning"
    | "success"
    | "info";

  const STATUS_MAP: Record<
    string,
    { label: string; color: AllowedPaletteColor }
  > = {
    pending: { label: "Pending", color: "secondary" },
    approved: { label: "Approved", color: "success" },
    rejected: { label: "Rejected", color: "error" },
  };

  const columnHelper = createColumnHelper<CompanyList>();
  const columns = [
    columnHelper.accessor("table_name", {
      header: () => "Module",
      cell: (info) => (
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h6" color="textSecondary">
              {info.getValue() ?? "-"}
            </Typography>
          </Box>
        </Stack>
      ),
    }),

    columnHelper.accessor("action", {
      header: () => "Action",
      cell: (info) => (
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box>
            <Typography
              variant="h6"
              color="textSecondary"
              sx={{ textTransform: "capitalize" }}
            >
              {info.getValue() ?? "-"}
            </Typography>
          </Box>
        </Stack>
      ),
    }),

    columnHelper.accessor((row) => row?.requested_user, {
      id: "requested_user",
      header: () => "Requested User",
      cell: (info) => (
        <Typography variant="h6" color="textSecondary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.accessor((row) => row?.company, {
      id: "company",
      header: () => "Company",
      cell: (info) => (
        <Typography variant="h6" color="textSecondary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.accessor((row) => row?.date, {
      id: "date",
      header: () => "Date",
      cell: (info) => {
        const rawDate = info.getValue();

        let date = null;
        if (typeof rawDate === "string") {
          if (rawDate.includes("/")) {
            date = dayjs(rawDate, "DD/MM/YYYY");
          } else {
            date = dayjs(rawDate);
          }
        }

        const formattedDate = date?.isValid()
          ? date.format("DD MMMM, YYYY")
          : "-";
        return (
          <Typography variant="h6" color="textSecondary">
            {formattedDate}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.note, {
      id: "note",
      header: () => "Note",
      cell: (info) => (
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box>
            <Typography
              variant="h6"
              color="textSecondary"
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 150,
              }}
            >
              <Tooltip title={info.getValue()} placement="top-start">
                <span>{info.getValue() ?? "-"}</span>
              </Tooltip>
            </Typography>
          </Box>
        </Stack>
      ),
    }),

    columnHelper.accessor("message", {
      header: () => "Message",
      cell: (info) => (
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box>
            <Typography
              variant="h6"
              color="textSecondary"
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 150,
              }}
            >
              <Tooltip title={info.getValue()} placement="top-start">
                <span>{info.getValue() ?? "-"}</span>
              </Tooltip>
            </Typography>
          </Box>
        </Stack>
      ),
    }),

    columnHelper.accessor((row) => row?.status, {
      id: "status",
      header: () => "Status",
      cell: (info) => {
        const value = info.getValue();
        const status = STATUS_MAP[value] || {
          label: "Unknown",
          color: "secondary",
        };

        return (
          <Chip
            size="small"
            label={status.label}
            sx={{
              backgroundColor: (theme) =>
                theme.palette[status.color as AllowedPaletteColor].light,
              color: (theme) =>
                theme.palette[status.color as AllowedPaletteColor].main,
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

  return (
    <Box>
      {/* Render the search and table */}
      <Stack
        mt={1}
        mr={2}
        ml={2}
        mb={1}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
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
                  {table.getRowModel().rows.map((row) => (
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
                  ))}
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
                <Typography color="textSecondary">| Go to page :</Typography>
                <CustomTextField
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
                />
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default TablePagination;
