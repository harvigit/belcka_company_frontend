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
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
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
  IconEdit,
  IconNotes,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Link from "next/link";
import ArchiveClient from "../archive";
import AuthRegister from "../../settings/auth";
import EditClient from "@/app/components/apps/clients/edit";
import { number } from "prop-types";

dayjs.extend(customParseFormat);

export type ClientList = {
  id: number;
  company_id?: number;
  name?: string;
  email: string;
  status: string;
  invite_date: string;
  expired_on: string;
  projects: string;
  company_name: string;
  phone: number;
  invite_link: string;
};

const TablePagination = () => {
  const [data, setData] = useState<ClientList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openActiveDialog, setOpenActiveDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>();
  const [selectedTaskId, setSelectedTaskId] = useState<number>(0);
  const [filters, setFilters] = useState({
    team: "",
    supervisor: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  // Fetch data
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `company-clients/get?company_id=${id.company_id}`
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    } finally {
      setLoading(false);
    }
  }, [id.company_id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setOpenEdit(true);
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesTeam = filters.team ? item.name === filters.team : true;
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.email?.toLocaleLowerCase().includes(search);

      return matchesTeam && matchesSearch;
    });
  }, [data, filters, searchTerm]);

  const columnHelper = createColumnHelper<ClientList>();
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
            sx={{ pl: 0.2 }}
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
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h5">{item.name ?? "-"}</Typography>
            </Stack>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.email, {
      id: "email",
      header: () => "Email",
      cell: (info) => {
        return (
          <Typography variant="h5" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.phone, {
      id: "phone",
      header: () => "Phone",
      cell: (info) => {
        return (
          <Typography variant="h5" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.invite_link, {
      id: "invite_link",
      header: () => "Invite Link",
      cell: (info) => {
        return <Typography variant="h5"> {info.getValue() ?? "-"} </Typography>;
      },
    }),

    columnHelper.accessor("status", {
      header: () => "Status",
      cell: (info) => {
        return (
          <Typography variant="h5" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor(() => "projects", {
      id: "projects",
      header: () => (
        <Stack direction="row" alignItems="center">
          <Typography variant="subtitle2" fontWeight="inherit">
            Project
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;

        const value = item.projects;
        return (
          <Typography variant="h5" color="textPrimary">
            {value.length <= 0 ? "-" : value}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.invite_date, {
      id: "invite_date",
      header: () => "Invite Date",
      cell: (info) => {
        return (
          <Typography variant="h5" color="textPrimary">
            {formatDate(info.getValue())}
          </Typography>
        );
      },
    }),

    columnHelper.accessor(() => "expired_on", {
      id: "expired_on",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Expires In
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;

        const value = item.expired_on;
        return (
          <Typography variant="h5" color="textPrimary">
            {value == "expired" ? "-" : value}
          </Typography>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const { expired_on } = item;

        return (
          <Box display={"flex"} gap={1}>
            <Box>
              <Tooltip title="Edit">
                <IconButton onClick={() => handleEdit(item.id)} color="primary">
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box>
              {expired_on !== "expired" ? (
                <Tooltip title="Reactivate">
                  <Button
                    color="primary"
                    onClick={() => {
                      setSelectedClientId(item.id);
                      setOpenActiveDialog(true);
                    }}
                  >
                    Re-Activate
                  </Button>
                </Tooltip>
              ) : expired_on === "expired" ? (
                <Tooltip title="Archive">
                  <Button
                    color="error"
                    onClick={() => {
                      setSelectedClientId(item.id);
                      setOpenDialog(true);
                    }}
                  >
                    Archive
                  </Button>
                </Tooltip>
              ) : null}
            </Box>
          </Box>
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
            CLIENTS ({table.getPrePaginationRowModel().rows.length}){" "}
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
        <Stack
          mb={2}
          justifyContent="end"
          direction={{ xs: "column", sm: "row" }}
        >
          <Button
            variant="outlined"
            color="primary"
            sx={{ display: "flex", justifyItems: "center" }}
            onClick={() => setOpen(true)}
          >
            <IconPlus width={18} />
            Add Client
          </Button>
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

      {/* Archive task list */}
      <ArchiveClient
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchClients}
      />

      <Divider />
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
                                header.column.id === "actions" ? 210 : "auto",
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

          {/* add client */}
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle>
              <Typography color="GrayText" fontWeight={700}>
                Add Client
              </Typography>
              <IconButton
                onClick={() => setOpen(false)}
                sx={{
                  position: "absolute",
                  right: 12,
                  top: 8,
                  backgroundColor: "transparent",
                }}
              >
                <IconX size={40} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <AuthRegister
                onWorkUpdated={fetchClients}
                open={open}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* edit client */}
          <Dialog
            open={openEdit}
            onClose={() => setOpenEdit(false)}
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle>
              <Typography color="GrayText" fontWeight={700}>
                Edit Client
              </Typography>
              <IconButton
                onClick={() => setOpenEdit(false)}
                sx={{
                  position: "absolute",
                  right: 12,
                  top: 8,
                  backgroundColor: "transparent",
                }}
              >
                <IconX size={40} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <EditClient
                id={selectedTaskId}
                onWorkUpdated={fetchClients}
                open={open}
                onClose={() => setOpenEdit(false)}
              />
            </DialogContent>
          </Dialog>

          {/* archive client */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
            <DialogTitle>Confirm Archive</DialogTitle>
            <DialogContent>
              <Typography color="textSecondary">
                Are you sure you want to archive client from company?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setOpenDialog(false)}
                variant="outlined"
                color="primary"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const payload = {
                      id: selectedClientId,
                    };
                    const response = await api.post(
                      "company-clients/archive",
                      payload
                    );
                    toast.success(response.data.message);
                    setSelectedClientId(null);
                    await fetchClients();
                  } catch (error) {
                    toast.error("Failed to archive client");
                  } finally {
                    setOpenDialog(false);
                  }
                }}
                variant="outlined"
                color="error"
              >
                Archive
              </Button>
            </DialogActions>
          </Dialog>

          {/* Re-active invitation link */}
          <Dialog
            open={openActiveDialog}
            onClose={() => setOpenActiveDialog(false)}
          >
            <DialogTitle>Confirm Re-activation</DialogTitle>
            <DialogContent>
              <Typography color="textSecondary">
                Are you sure you want to Re-activation invitation for this
                client?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setOpenActiveDialog(false)}
                variant="outlined"
                color="primary"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const payload = {
                      id: selectedClientId,
                    };
                    const response = await api.post(
                      "company-clients/reactivate-invitation",
                      payload
                    );
                    toast.success(response.data.message);
                    setSelectedClientId(null);
                    await fetchClients();
                  } catch (error) {
                    toast.error("Failed to re-activate invitation");
                  } finally {
                    setOpenActiveDialog(false);
                  }
                }}
                variant="outlined"
                color="error"
              >
                Confirm
              </Button>
            </DialogActions>
          </Dialog>

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
