"use client";
import React, { useEffect, useState, useMemo, SetStateAction } from "react";
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
  Drawer,
  Autocomplete,
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
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconSearch,
  IconTrash,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import Link from "next/link";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format, lastDayOfDecade } from "date-fns";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";

dayjs.extend(customParseFormat);

export interface UserList {
  id: number;
  name: string;
  supervisor_name: string;
  user_image: string;
  trade_name: string;
  team_name: string;
  shifts: string;
  status: number;
  is_invited: boolean;
  logged_in_at: any;
  created_at: any;
  company_id: number | null;
}

export interface TradeList {
  id: number;
  name: string;
}

const TablePagination = () => {
  const [data, setData] = useState<UserList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({ team: "", supervisor: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const searchParams = useSearchParams();
  const projectId = searchParams ? searchParams.get("project_id") : "";
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: string | null };
  const [inviteUser, setInviteUser] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setfirstName] = useState("");
  const [lastName, setlastName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<any>(0);
  const [selectedTrade, setSelectedTrade] = useState<any>(0);
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState(0);
  const [extension, setExtension] = useState("+44");
  const [nationalPhone, setNationalPhone] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsers = async () => {
    // setLoading(true);
    try {
      const res = await api.get("user/get-user-lists");
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
    // setLoading(false);
  };
  useEffect(() => {
    fetchUsers();
  }, [projectId]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${user.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user.company_id}`
        );
        if (res.data) setTeams(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTeams();
  }, []);
  const handleInviteUser = (user: any | null = null) => {
    setUserId(user.id);
    setfirstName(user.first_name || "");
    setlastName(user.last_name || "");
    setEmail(user.email || "");
    setExtension(user.extension || "+44");
    setPhone(user.phone || "");
    setNationalPhone(user.phone || "");
    setSelectedUser(user);
    setInviteUser(true);
  };

  const closeInviteDrawer = () => {
    setInviteUser(false);
    setSelectedUser(null);
  };

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

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        company_id: user.company_id,
        team_id: selectedTeam.id,
        trade_id: selectedTrade.id,
        phone: phone,
        extension: extension,
      };

      const response = await api.post("invite-user", payload);

      if (response.data.IsSuccess === true) {
        toast.success(response.data.message);
        setfirstName("");
        setlastName("");
        setEmail("");
        setPhone("");
        setNationalPhone("");
        setSelectedTeam([]);
        setSelectedTrade([]);
        setInviteUser(false);
        fetchUsers();
      }
    } catch (error: any) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

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
        const user = row.original;
        const defaultImage = "/images/users/user.png";
        const isChecked = selectedRowIds.has(user.id);

        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
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
            <Link href={`/apps/users/${user.id}`} passHref>
              <Stack direction="row" alignItems="center" spacing={4}>
                <Avatar
                  src={user.user_image || defaultImage}
                  alt={user.name}
                  sx={{ width: 36, height: 36 }}
                />
                <Box>
                  <Typography
                    className="f-14"
                    color="textPrimary"
                    sx={{ cursor: "pointer", "&:hover": { color: "#173f98" } }}
                  >
                    {user.name ?? "-"}
                  </Typography>
                  <Typography color="textSecondary" variant="subtitle1">
                    {user.trade_name}
                  </Typography>
                </Box>
              </Stack>
            </Link>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row.team_name, {
      id: "team_name",
      header: () => "Team Name",
      cell: (info) => (
        <Typography className="f-14" color="textPrimary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.accessor((row) => row.is_invited, {
      id: "is_invited",
      header: () => "Login",
      cell: (info) => {
        const row = info.row.original;
        const notLoggedIn = row.is_invited;

        return (
          <Typography
            className="f-14"
            color="textPrimary"
            fontWeight={notLoggedIn ? 500 : 400}
          >
            {row.is_invited
              ? "Not logged in"
              : formatDate(row.logged_in_at)
              ? formatDate(row.logged_in_at)
              : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.status, {
      id: "status",
      header: () => "Status",
      cell: (info) => {
        const row = info.row.original;
        const value = info.getValue();
        const hasCompany = row.is_invited;

        if (hasCompany) {
          return (
            <Chip
              size="small"
              label={
                row.is_invited ? `Inited on ${formatDate(row.created_at)}` : ""
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
        }

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
            USERS ({filteredData.length})
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
        </Grid>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
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
              >
                <MenuItem value="">All</MenuItem>
                {uniqueTeams.map((team) => (
                  <MenuItem key={team} value={team}>
                    {team}
                  </MenuItem>
                ))}
              </TextField>
              {uniqueSupervisors.length > 0 ? (
                <>
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
                </>
              ) : (
                <></>
              )}
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
        <Stack direction={"row-reverse"} mb={1} mr={1}>
          {selectedRowIds.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              sx={{ ml: 2 }}
              startIcon={<IconTrash width={18} />}
              onClick={() => {
                const selectedIds = Array.from(selectedRowIds);

                setUsersToDelete(selectedIds.filter(Boolean));
                setConfirmOpen(true);
              }}
            >
              Remove
            </Button>
          )}
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setInviteUser(true)}
            startIcon={<IconUserCheck size={18} />}
          >
            Invite User
          </Button>
        </Stack>
      </Stack>
      <Divider />
      {/* remove user */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to remove {usersToDelete.length} user
            {usersToDelete.length > 1 ? "s" : ""} from the company?
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
                  user_ids: usersToDelete.join(","),
                  company_id: user.company_id,
                };
                const response = await api.post("user/remove-account", payload);
                toast.success(response.data.message);
                setSelectedRowIds(new Set());
                await fetchUsers();
              } catch (error) {
                console.error("Failed to remove users", error);
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

      <Grid container spacing={3}>
        <Grid size={12}>
          <Box>
            {/* Table rendering */}
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
                              paddingTop: "5px",
                              paddingBottom: "5px",
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
                              <Typography variant="subtitle2">
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

      <Drawer
        anchor="right"
        open={inviteUser}
        onClose={() => setInviteUser(false)}
        sx={{
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
            padding: 2,
            backgroundColor: "#f9f9f9",
          },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box
            display={"flex"}
            alignContent={"center"}
            alignItems={"center"}
            flexWrap={"wrap"}
          >
            <IconButton onClick={closeInviteDrawer} sx={{ p: 0 }}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h5" fontWeight={700}>
              Invite User
            </Typography>
            <IconButton
              aria-label="close"
              onClick={closeInviteDrawer}
              size="small"
              sx={{
                position: "absolute",
                right: 0,
                top: 8,
                color: (theme) => theme.palette.grey[900],
                backgroundColor: "transparent",
                zIndex: 10,
                width: 50,
                height: 50,
              }}
            >
              <IconX size={18} />
            </IconButton>
          </Box>
          <Box height={"100%"}>
            <form onSubmit={handleRegister} className="address-form">
              <Grid container spacing={2} mt={1}>
                <Grid size={{ lg: 12, xs: 12 }}>
                  <Typography variant="caption" mt={2}>
                    First Name
                  </Typography>
                  <CustomTextField
                    id="first_name"
                    variant="outlined"
                    fullWidth
                    value={firstName}
                    sx={{ mb: 1 }}
                    onChange={(e: {
                      target: { value: SetStateAction<string> };
                    }) => setfirstName(e.target.value)}
                  />
                  <Typography variant="caption" mt={2}>
                    Last Name
                  </Typography>
                  <CustomTextField
                    id="last_name"
                    variant="outlined"
                    fullWidth
                    value={lastName}
                    sx={{ mb: 1 }}
                    onChange={(e: {
                      target: { value: SetStateAction<string> };
                    }) => setlastName(e.target.value)}
                  />
                  <Typography variant="caption" mt={2}>
                    Email Address
                  </Typography>
                  <CustomTextField
                    id="email"
                    variant="outlined"
                    fullWidth
                    value={email}
                    sx={{ mb: 2 }}
                    onChange={(e: {
                      target: { value: SetStateAction<string> };
                    }) => setEmail(e.target.value)}
                  />
                  <PhoneInput
                    country={"gb"}
                    value={phone}
                    inputClass="form_inputs"
                    onChange={(value, country: any) => {
                      setPhone(value);
                      setExtension("+" + country.dialCode);

                      const numberOnly = value.replace(country.dialCode, "");
                      setNationalPhone(numberOnly);
                    }}
                    inputStyle={{ width: "100%", marginBottom: 4 }}
                    enableSearch
                    inputProps={{ required: true }}
                  />
                  <Typography variant="caption" mt={6}>
                    Select Teams
                  </Typography>
                  <Autocomplete
                    fullWidth
                    id="team_id"
                    sx={{ mb: 2 }}
                    options={teams}
                    value={
                      teams.find((p: any) => p.id === selectedTeam.id) || null
                    }
                    onChange={(event, newValue) => {
                      setSelectedTeam(newValue);
                    }}
                    getOptionLabel={(option) => option?.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Select Team"
                        onClick={() => setDialogOpen(true)}
                      />
                    )}
                  />
                  <Typography variant="caption" mt={2}>
                    Select Trades
                  </Typography>
                  <Autocomplete
                    fullWidth
                    id="trade_id"
                    sx={{ mb: 2 }}
                    options={trade}
                    value={
                      trade.find((p: any) => p.id === selectedTrade.id) || null
                    }
                    onChange={(event, newValue) => {
                      setSelectedTrade(newValue);
                    }}
                    getOptionLabel={(option) => option?.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Select Trade"
                        onClick={() => setDialogOpen(true)}
                      />
                    )}
                  />
                </Grid>
              </Grid>
              <Box>
                <Box mt={2} display="flex" justifyContent="start" gap={2}>
                  <Button
                    color="primary"
                    variant="contained"
                    size="large"
                    type="submit"
                    sx={{ borderRadius: 3 }}
                    className="drawer_buttons"
                    disabled={loading}
                  >
                    Save
                  </Button>
                  <Button
                    color="inherit"
                    onClick={() => setInviteUser(false)}
                    variant="contained"
                    size="large"
                    sx={{
                      backgroundColor: "transparent",
                      borderRadius: 3,
                      color: "GrayText",
                    }}
                  >
                    Close
                  </Button>
                </Box>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default TablePagination;
