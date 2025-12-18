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
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
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
  IconSearch,
  IconTableColumn,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import Link from "next/link";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format } from "date-fns";
import "react-phone-input-2/lib/material.css";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { AxiosResponse } from "axios";
import Cookies from "js-cookie";

dayjs.extend(customParseFormat);

export interface Permission {
  id: number;
  name: string;
  status: boolean;
}

export interface UserList {
  permissions: Permission[];
  id: number;
  name: string;
  supervisor_name: string;
  user_image: string;
  trade_name: string;
  email: string;
  phone: number;
  team_name: string;
  shifts: string;
  status: number;
  is_invited: boolean;
  logged_in_at: any;
  created_at: any;
  company_id: number | null;
  user_role_id: number;
  permission_count: number;
  joining_date: string;
  bank_name: string;
  account_no: any;
  short_code: string;
  address: string;
  nin_number: string;
  utr_number: string;
}

export interface TradeList {
  id: number;
  name: string;
}

const UserIndex = () => {
  const [data, setData] = useState<UserList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const session = useSession();
  const user = session.data?.user as User & { id: number } & {
    company_id?: string | null;
  } & {
    user_role_id: number;
  };
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const fetchUsers = async () => {
    try {
      const res: AxiosResponse<any> = await api.get(
        `user/get-user-lists?user_id=${user.id}`
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user.company_id, user.id]);

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.trade_name?.toLowerCase().includes(search) ||
        item.supervisor_name?.toLowerCase().includes(search) ||
        item.team_name?.toLowerCase().includes(search);
      return matchesSearch;
    });
  }, [data, searchTerm]);

  const userId = user.id;
  const getColumnVisibilityKey = (userId?: number | string) =>
    userId ? `visibility_${userId}` : "visibility";

  const columnVisibilityKey = getColumnVisibilityKey(userId);

  const columnHelper = createColumnHelper<UserList>();

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
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const isChecked = e.target.checked;

              setShowAllCheckboxes(isChecked);

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((r) => r.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />

          <Typography variant="subtitle2">Name</Typography>
        </Stack>
      ),
      enableSorting: true,

      cell: ({ row }) => {
        const user = row.original;

        const isChecked = selectedRowIds.has(user.id);

        const showCheckbox =
          showAllCheckboxes || hoveredRow === user.id || isChecked;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ width: 34, display: "flex", justifyContent: "center" }}>
              <CustomCheckbox
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => {
                  const newSet = new Set(selectedRowIds);
                  if (newSet.has(user.id)) newSet.delete(user.id);
                  else newSet.add(user.id);
                  setSelectedRowIds(newSet);
                }}
                sx={{
                  opacity: showCheckbox ? 1 : 0,
                  pointerEvents: showCheckbox ? "auto" : "none",
                  transition: "opacity 0.2s ease",
                }}
              />
            </Box>

            <Link href={`/apps/users/${user.id}`} passHref>
              <Stack
                direction="row"
                alignItems="center"
                spacing={4}
                sx={{ cursor: "pointer" }}
              >
                <Avatar
                  src={user.user_image ? user.user_image : ""}
                  alt={user.name}
                  sx={{ width: 36, height: 36 }}
                />
                <Box>
                  <Typography
                    className="f-14"
                    color="textPrimary"
                    sx={{
                      cursor: "pointer",
                      "&:hover": { color: "#173f98" },
                      width: 190,
                    }}
                  >
                    {user.name ?? "-"}
                  </Typography>
                  <Tooltip title={user.trade_name ?? "-"} placement="top" arrow>
                    <Typography
                      color="textSecondary"
                      variant="subtitle1"
                      width={190}
                      noWrap
                    >
                      {user.trade_name}
                    </Typography>
                  </Tooltip>
                </Box>
              </Stack>
            </Link>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row.team_name, {
      id: "teamName",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Team Name
        </Typography>
      ),
      cell: (info) => (
        <Typography className="f-14" color="textPrimary" sx={{ width: 100 }}>
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.accessor((row) => row.email, {
      id: "email",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Email
        </Typography>
      ),
      cell: (info) => (
        <Tooltip title={info.getValue() ?? "-"} placement="top" arrow>
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ width: 100 }}
            noWrap
          >
            {info.getValue() ?? "-"}
          </Typography>
        </Tooltip>
      ),
    }),

    columnHelper.accessor((row) => row.phone, {
      id: "phone",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Phone
        </Typography>
      ),
      cell: (info) => (
        <Typography className="f-14" color="textPrimary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.accessor((row) => row.permissions, {
      id: "permissions",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Permissions
        </Typography>
      ),
      cell: (info) => {
        const user = info.row.original;
        return (
          <Chip
            size="small"
            label={
              user.permission_count === 0
                ? "Select"
                : `${user.permission_count} Permissions`
            }
            sx={{
              backgroundColor: (theme) => theme.palette.primary.light,
              color: (theme) => theme.palette.primary.main,
              fontWeight: 500,
              borderRadius: "10px",
              px: 1.5,
            }}
          />
        );
      },
    }),

    columnHelper.accessor((row) => row.is_invited, {
      id: "isInvited",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Login
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography
            className="f-14"
            color="textPrimary"
            fontWeight={row.is_invited ? 500 : 400}
            width={90}
          >
            {row.is_invited
              ? "Not logged in"
              : formatDate(row.logged_in_at) ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.joining_date, {
      id: "joiningDate",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Joining on
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.joining_date ? formatDate(row.joining_date) : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.bank_name, {
      id: "bankName",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Bank Name
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.bank_name ? row.bank_name : "-"}
          </Typography>
        );
      },
    }),
    columnHelper.accessor((row) => row.account_no, {
      id: "accountNo",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Account No
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.account_no ? row.account_no : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.short_code, {
      id: "shortCode",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Short Code
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.short_code ? row.short_code : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.address, {
      id: "address",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Address
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Tooltip title={info.getValue() ?? "-"} placement="top" arrow>
            <Typography
              className="f-14"
              color="textPrimary"
              sx={{ width: 150 }}
              noWrap
            >
              {info.getValue() ?? "-"}
            </Typography>
          </Tooltip>
        );
      },
    }),

    columnHelper.accessor((row) => row.nin_number, {
      id: "ninNumber",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Nin Number
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.nin_number ? row.nin_number : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.utr_number, {
      id: "utrNumber",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Utr Number
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.utr_number ? row.utr_number : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.status, {
      id: "status",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Status
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;

        if (row.is_invited) {
          return (
            <Chip
              size="small"
              label={`Invited on ${formatDate(row.created_at)}`}
              sx={{
                backgroundColor: (theme) => theme.palette.primary.light,
                color: (theme) => theme.palette.primary.main,
                fontWeight: 500,
                borderRadius: "10px",
                px: 1.5,
              }}
            />
          );
        }

        return info.getValue() ? (
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
    const savedVisibility = Cookies.get("visibility")
      ? JSON.parse(Cookies.get("visibility")!)
      : {};

    table.setColumnVisibility(savedVisibility);
  }, [table]);

  useEffect(() => {
    if (!userId) return;

    const savedVisibility = Cookies.get(columnVisibilityKey)
      ? JSON.parse(Cookies.get(columnVisibilityKey)!)
      : {};

    table.setColumnVisibility(savedVisibility);
  }, [table, userId]);

  useEffect(() => {
    const visibleColumns = table
      .getAllLeafColumns()
      .filter((col) => col.id !== "conflicts");

    const allSelected = visibleColumns.every((col) => col.getIsVisible());
    setSelectAll(allSelected);
  }, [table.getState().columnVisibility]);

  const handleSelectAllChange = (e: any) => {
    const checked = e.target.checked;
    setSelectAll(checked);

    const newVisibility: Record<string, boolean> = {};

    table.getAllLeafColumns().forEach((col) => {
      if (col.id !== "conflicts") {
        newVisibility[col.id] = checked;
      }
    });

    Cookies.set(
      columnVisibilityKey,
      JSON.stringify({
        ...newVisibility,
        selectAll: checked,
      }),
      {
        expires: 365,
      }
    );

    table.setColumnVisibility(newVisibility);
  };

  const handleColumnVisibilityChange = (colId: string, value: boolean) => {
    const currentVisibility = Cookies.get(columnVisibilityKey)
      ? JSON.parse(Cookies.get(columnVisibilityKey)!)
      : {};

    const updatedVisibility = {
      ...currentVisibility,
      [colId]: value,
    };

    Cookies.set(columnVisibilityKey, JSON.stringify(updatedVisibility), {
      expires: 365,
    });

    table.setColumnVisibility((prev: any) => ({
      ...prev,
      [colId]: value,
    }));
  };

  useEffect(() => {
    if (!userId) return;

    const saved = Cookies.get(columnVisibilityKey)
      ? JSON.parse(Cookies.get(columnVisibilityKey)!)
      : {};

    if (saved.selectAll !== undefined) {
      setSelectAll(saved.selectAll);
    }

    table.setColumnVisibility(saved);
  }, [userId, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  return (
    <PermissionGuard permission="User">
      <Box>
        <Stack
          mt={3}
          mr={2}
          ml={2}
          mb={2}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2, md: 4 }}
        >
          <Grid display="flex" gap={1} alignItems={"center"}>
            <Button variant="contained" color="primary">
              USER ({filteredData.length})
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
          </Grid>

          <Stack direction={"row-reverse"} mb={1} mr={1}>
            <IconButton onClick={handlePopoverOpen} sx={{ ml: 1 }}>
              <IconTableColumn />
            </IconButton>
            <Popover
              open={Boolean(anchorEl2)}
              anchorEl={anchorEl2}
              onClose={handlePopoverClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
            >
              <TextField
                size="small"
                placeholder="Search"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="select all"
                      checked={selectAll}
                      onChange={handleSelectAllChange}
                      sx={{ textTransform: "none" }}
                    />
                  }
                  label="Select All"
                />
                {table
                  .getAllLeafColumns()
                  .filter((col) => {
                    const excludedColumns = ["conflicts"];
                    if (excludedColumns.includes(col.id)) return false;
                    return col.id.toLowerCase().includes(search.toLowerCase());
                  })
                  .map((col) => (
                    <FormControlLabel
                      key={col.id}
                      control={
                        <Checkbox
                          checked={col.getIsVisible()}
                          onChange={(e) =>
                            handleColumnVisibilityChange(
                              col.id,
                              e.target.checked
                            )
                          }
                        />
                      }
                      sx={{ textTransform: "none" }}
                      label={
                        typeof col.columnDef.header === "string" &&
                        col.columnDef.header.trim() !== ""
                          ? col.columnDef.header
                          : col.id
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (str) => str.toUpperCase())
                              .trim()
                      }
                    />
                  ))}
              </FormGroup>
            </Popover>
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
                                {/* <Typography variant="subtitle2"> */}
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {/* </Typography> */}
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
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        hover
                        sx={{
                          cursor: "pointer",
                        }}
                        key={row.id}
                        onMouseEnter={() => setHoveredRow(row.original.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} sx={{ padding: "10px" }}>
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
          </Grid>
        </Grid>

        <Divider />
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
              display: { xs: "block", sm: "flex" },
              alignItems: "center",
            }}
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
      </Box>
    </PermissionGuard>
  );
};

export default UserIndex;
