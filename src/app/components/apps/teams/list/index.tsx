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
  IconRotate,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import Link from "next/link";
import { IconDotsVertical } from "@tabler/icons-react";
import { IconX } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { TradeList } from "../team";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import GenerateCodeDialog from "../../modals/generate-code";
import { IconEdit } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import ArchiveTeam from "../archive";

dayjs.extend(customParseFormat);

export type TeamList = {
  id: number;
  team_id: number;
  team_member_ids: number[];
  supervisor_id: number;
  supervisor_name?: string;
  supervisor_image?: string;
  supervisor_email?: string;
  supervisor_phone?: string;
  team_member_count?: number;
  working_member_count?: number;
  subcontractor_company_name?: string;
  is_subcontractor?: boolean;
  company_id?: number;
  subcontractor_company_id?: number;
  team_name?: string;
  name?: string;
  image?: string;
  is_active?: boolean;
  trade_id?: number;
  trade_name?: string;
};

export type UserList = {
  id: number;
  name: string;
};

const TablePagination = () => {
  const [data, setData] = useState<TeamList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    team: "",
    supervisor: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);

  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const router = useRouter();

  const searchParams = useSearchParams();
  const projectId = searchParams ? searchParams.get("project_id") : "";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch data
  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const url = projectId
        ? `team/get-team-member-list?project_id=${projectId}`
        : "team/get-team-member-list";

      const res = await api.get(url);
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

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

  const handleGenerateCode = async (): Promise<string> => {
    try {
      const response = await api.post(
        `team/company-generate-code?company_id=${id.company_id}`
      );
      toast.success(response.data.message);
      return response.data.info.company_otp;
    } catch (error) {
      toast.error("Failed to generate code.");
      throw error;
    }
  };

  // UseCallback to memoize these functions
  const handleEdit = useCallback(
    (id: number) => {
      router.push(`/apps/teams/edit/${id}`);
    },
    [router]
  );

  const uniqueTrades = useMemo(
    () => [...new Set(data.map((item) => item.name).filter(Boolean))],
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
      const matchesTeam = filters.team ? item.name === filters.team : true;
      const matchesSupervisor = filters.supervisor
        ? item.supervisor_name === filters.supervisor
        : true;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.supervisor_name?.toLocaleLowerCase().includes(search);

      return matchesTeam && matchesSearch && matchesSupervisor;
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
        const item = row.original;
        const isChecked = selectedRowIds.has(item.team_id);
        const shouldHighlight =
          item.is_subcontractor === true &&
          item.company_id !== item.subcontractor_company_id;

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <CustomCheckbox
              checked={isChecked}
              disabled={shouldHighlight}
              onChange={() => {
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.team_id);
                } else {
                  newSelected.add(item.team_id);
                }
                setSelectedRowIds(newSelected);
              }}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Link href={`/apps/teams/team?team_id=${item.team_id}`} passHref>
                <Typography
                  variant="h5"
                  color={shouldHighlight ? "secondary" : "textPrimary"}
                  sx={{ cursor: "pointer", "&:hover": { color: "#173f98" } }}
                >
                  {item.name ?? "-"}
                </Typography>
              </Link>
            </Stack>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.subcontractor_company_name, {
      id: "subcontractor_company_name",
      header: () => "Company",
      cell: (info) => {
        return (
          <Typography variant="h5" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("supervisor_name", {
      header: () => "Supervisor",
      cell: (info) => {
        const row = info.row.original;
        const name = info.getValue();
        const image = row.supervisor_image;
        const defaultImage = "/images/users/user.png";

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              src={image || defaultImage}
              alt={name}
              sx={{ width: 36, height: 36 }}
            />
            <Box>
              <Typography variant="h5" color="textPrimary">
                {name ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.team_member_count, {
      id: "team_member_count",
      header: () => "Users",
      cell: (info) => {
        const row = info.row.original;
        const users = row.working_member_count;

        return (
          <Typography variant="h5" color="textPrimary">
            {users + `/` + info.getValue()}
          </Typography>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const subcontractor =
          item.is_subcontractor === true &&
          item.company_id !== item.subcontractor_company_id;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit">
              <IconButton
                disabled={subcontractor}
                onClick={() => handleEdit(item.team_id)}
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
            TEAMS ({table.getPrePaginationRowModel().rows.length}){" "}
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
                  label="Team"
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
            // <Button variant="contained">Remove User: {selectedRowIdsStr}</Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconTrash width={18} />}
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
                Are you sure you want to archive {usersToDelete.length} team
                {usersToDelete.length > 1 ? "s" : ""} from the teams?
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
                      team_ids: usersToDelete.join(","),
                    };
                    const response = await api.post(
                      "team/archive-teams",
                      payload
                    );
                    toast.success(response.data.message);
                    setSelectedRowIds(new Set());
                    await fetchTrades();
                  } catch (error) {
                    toast.error("Failed to archive teams");
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
                href="/apps/teams/create"
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
                Add Team
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
            <MenuItem
              onClick={() => {
                setOpenGenerateDialog(true);
                handleClose(); // close MUI menu
              }}
            >
              <ListItemIcon>
                <IconRotate width={18} />
              </ListItemIcon>
              Generate Code
            </MenuItem>
          </Menu>

          <GenerateCodeDialog
            open={openGenerateDialog}
            onClose={() => setOpenGenerateDialog(false)}
            onGenerate={handleGenerateCode}
          />
        </Stack>
      </Stack>
      <Divider />

      {/* Archive team list */}
      <ArchiveTeam
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchTrades}
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
