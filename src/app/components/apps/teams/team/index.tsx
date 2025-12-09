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
  Menu,
  ListItemIcon,
  Popover,
  FormGroup,
  FormControlLabel,
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
  SortingState,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconFilter,
  IconPlus,
  IconRotate,
  IconSearch,
  IconTableColumn,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import BlankCard from "@/app/components/shared/BlankCard";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import Link from "next/link";
import JoinCompanyDialog from "../../modals/join-company";
import GenerateCodeDialog from "../../modals/generate-code";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  supervisor_id: number;
  supervisor_name: string;
  supervisor_image: string | null;
  supervisor_email: string | null;
  supervisor_phone: string | null;
  company_id: number;
  subcontractor_company_id?: number;
  is_subcontractor: boolean;
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
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const rerender = React.useReducer(() => ({}), {})[1];
  const [users, setUsers] = useState<UserList[]>([]);
  const [user, setUser] = useState<UserList[]>([]);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const searchParams = useSearchParams();
  const teamId = searchParams ? searchParams.get("team_id") : "";

  const [filters, setFilters] = useState({ team: "", trade: "" });
  const [tempFilters, setTempFilters] = useState(filters);

  const [open, setOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [modelopen, setModelOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);

  const [openOtpDialog, setOpenOtpDialog] = useState(false);
  const [otp, setOtp] = useState("");
  const router = useRouter();
  // fetch compnay trades
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${id.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [id?.company_id]);

  // fetch team member's
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`team/get-team-member-list?team_id=${teamId}`);
      if (res.data?.info) {
        const flattened = res.data.info.flatMap((team: any) => {
          if (team.users.length === 0) {
            return [
              {
                supervisor_id: team.supervisor_id,
                supervisor_name: team.supervisor_name,
                supervisor_image: team.supervisor_image,
                supervisor_email: team.supervisor_email,
                supervisor_phone: team.supervisor_phone,
                company_id: team.company_id,
                subcontractor_company_id: team.subcontractor_company_id,
                is_subcontractor: team.is_subcontractor,
                team_name: team.team_name,
                name: null,
                image: null,
                is_active: null,
                trade_id: null,
                trade_name: null,
              },
            ];
          }

          return team.users.map((user: any) => ({
            supervisor_id: team.supervisor_id,
            supervisor_name: team.supervisor_name,
            supervisor_image: team.supervisor_image,
            supervisor_email: team.supervisor_email,
            supervisor_phone: team.supervisor_phone,
            team_name: team.team_name,
            id: user.id,
            name: user.name,
            image: user.image,
            is_active: user.is_active,
            trade_id: user.trade_id,
            trade_name: user.trade_name,
            is_subcontractor: team.is_subcontractor,
            company_id: team.company_id,
            subcontractor_company_id: team.subcontractor_company_id,
          }));
        });

        setData(flattened);
      }
      if (res.data?.info.length <= 0 && teamId !== null) {
        router.push("/apps/teams/list");
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setLoading(false);
    }
  };

  const fetchUniqueUsers = async () => {
    try {
      const res = await api.get(`team/user-list?company_id=${id.company_id}`);
      if (res.data) {
        setUser(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
    }
  };

  useEffect(() => {
    fetchUniqueUsers();
    fetchData();
    if (teamId == "null") {
      router.push("/apps/teams/list");
    }
  }, [teamId,fetchUniqueUsers,fetchData,router]);

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

  const handleClose = () => {
    setModelOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      team_id: Number(teamId),
      user_id: Number(selectedUserId),
    };

    try {
      const response = await api.post(`team/add-user-to-team`, payload);
      toast.success(response.data.message);
      setSelectedUserId("");
      handleClose();
    } catch (error: any) {
      // toast.error(error?.response?.data?.message || "Something went wrong.");
    } finally {
      await fetchData();
    }
  };
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const close = () => {
    setAnchorEl(null);
  };

  const members = useMemo(
    () => [...new Set(users.map((item) => item.name).filter(Boolean))],
    [users]
  );
  const trades = useMemo(
    () => [...new Set(trade.map((trade) => trade.name).filter(Boolean))],
    [trade]
  );
  //Add team to company
  const joinCompany = async () => {
    try {
      const payload = {
        code: String(otp),
        team_id: Number(teamId),
        company_id: Number(id.company_id),
      };
      const response = await api.post(`company/add-team-to-company`, payload);
      toast.success(response.data.message);
      setOpenOtpDialog(false);
    } catch (error: any) {
      // toast.error(error?.response?.data?.message || "Something went wrong.");
    } finally {
      await fetchData();
    }
  };
  const handleGenerateCode = async (): Promise<string | null> => {
    try {
      const payload = { team_id: teamId, company_id: id.company_id };
      const response = await api.post("team/generate-otp", payload);

      if (!response.data.IsSuccess || !response.data.info?.company_otp) {
        toast.error("Failed to generate code");
        return null;
      }

      toast.success(response.data.message);
      return response.data.info.company_otp;
    } catch (error) {
      toast.error("Failed to generate code.");
      return null;
    }
  };

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
      id: "name",
      enableSorting: true, // allow sorting
      header: ({ column }) => (
        <Stack
          direction="row"
          alignItems="center"
          spacing={4}
          sx={{ cursor: "pointer" }}
          onClick={column.getToggleSortingHandler()}
        >
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
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((row, i) => i)));
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
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(row.index);

        const showCheckbox = isChecked || hoveredRow === row.index;
        const shouldHighlight =
          item.is_subcontractor === true &&
          item.company_id !== item.subcontractor_company_id;
        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 1 }}
            onMouseEnter={() => setHoveredRow(row.index)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <CustomCheckbox
              checked={isChecked}
              disabled={shouldHighlight}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(row.index);
                } else {
                  newSelected.add(row.index);
                }
                setSelectedRowIds(newSelected);
              }}
              sx={{
                opacity: showCheckbox ? 1 : 0,
                pointerEvents: showCheckbox ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar
                src={item.image || "/images/users/user.png"}
                alt={item.name}
                sx={{ width: 36, height: 36 }}
              />
              <Box>
                <Typography className="f-14" color="body2">
                  {item.name ?? "-"}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.trade_name, {
      id: "tradeName",
      header: () => "Trade",
      cell: (info) => (
        <Typography className="f-14" color="body2" sx={{ px: 1.5 }}>
          {info.row.original.trade_name ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor((row) => row?.is_active, {
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

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

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
    <Grid container spacing={2}>
      {/* Render the search and table */}
      <Grid
        size={{
          xs: 12,
          lg: 3,
        }}
      >
        <BlankCard>
          <CardContent>
            <Box textAlign="center" display="flex" justifyContent="center">
              <Box>
                <Avatar
                  src={data[0]?.supervisor_image || "/images/users/user.png"}
                  alt={data[0]?.supervisor_name || "user1"}
                  sx={{ width: 120, height: 120, margin: "0 auto" }}
                />
                <Typography variant="h5" mb={1}>
                  {data[0]?.supervisor_name}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" mb={1}>
                  Supervisor
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Stack direction="row" spacing={2} py={2} alignItems="center">
              <Box>
                <Typography variant="h6">Phone</Typography>
              </Box>
              <Box sx={{ ml: "auto !important" }}>
                <Typography variant="h5" color="textSecondary">
                  {data[0]?.supervisor_phone || "-"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </BlankCard>
      </Grid>
      <Grid
        size={{
          xs: 12,
          lg: 9,
        }}
      >
        <BlankCard>
          <Grid display="flex" gap={1} mt={2} ml={2}>
            <Typography variant="h3">{data[0]?.team_name}</Typography>
          </Grid>

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
                      label="Team member"
                      value={tempFilters.team}
                      onChange={(e) =>
                        setTempFilters({ ...tempFilters, team: e.target.value })
                      }
                      fullWidth
                    >
                      <MenuItem value="">Users</MenuItem>
                      {members.map((name, i) => (
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
                onClose={close}
                slotProps={{ list: { "aria-labelledby": "basic-button" } }}
              >
                <MenuItem
                  onClick={() => {
                    setOpenOtpDialog(true);
                    close();
                  }}
                >
                  <ListItemIcon>
                    <IconUserPlus width={18} />
                  </ListItemIcon>
                  Join Company
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setOpenGenerateDialog(true);
                    handleClose();
                  }}
                >
                  <ListItemIcon>
                    <IconRotate width={18} />
                  </ListItemIcon>
                  Generate Code
                </MenuItem>
              </Menu>
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
                  {table
                    .getAllLeafColumns()
                    .filter((col: any) => {
                      const excludedColumns = ["conflicts"];
                      if (excludedColumns.includes(col.id)) return false;

                      return col.id
                        .toLowerCase()
                        .includes(search.toLowerCase());
                    })
                    .map((col: any) => (
                      <FormControlLabel
                        key={col.id}
                        control={
                          <Checkbox
                            checked={col.getIsVisible()}
                            onChange={col.getToggleVisibilityHandler()}
                            disabled={col.id === "conflicts"}
                          />
                        }
                        sx={{ textTransform: "none" }}
                        label={
                          col.columnDef.meta?.label ||
                          (typeof col.columnDef.header === "string" &&
                          col.columnDef.header.trim() !== ""
                            ? col.columnDef.header
                            : col.id
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str: string) =>
                                  str.toUpperCase()
                                )
                                .trim())
                        }
                      />
                    ))}
                </FormGroup>
              </Popover>
              <GenerateCodeDialog
                open={openGenerateDialog}
                onClose={() => setOpenGenerateDialog(false)}
                onGenerate={handleGenerateCode}
              />
              <JoinCompanyDialog
                open={openOtpDialog}
                onClose={() => setOpenOtpDialog(false)}
                onSubmit={joinCompany}
                otp={otp}
                setOtp={setOtp}
              />
              {/* add User to team */}
              <Dialog
                open={modelopen}
                onClose={handleClose}
                keepMounted
                fullWidth
                maxWidth="sm"
              >
                <form onSubmit={handleSubmit}>
                  <DialogTitle>Add User To Team</DialogTitle>
                  <DialogContent dividers>
                    <TextField
                      select
                      label="User"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">Select User</MenuItem>
                      {user.map((user, i) => (
                        <MenuItem key={i} value={user.id}>
                          {user.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleClose} color="error">
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary">
                      Submit
                    </Button>
                  </DialogActions>
                </form>
              </Dialog>

              {selectedRowIds.size > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash width={18} />}
                  sx={{ marginRight: "5px" }}
                  onClick={() => {
                    const selectedIds = Array.from(selectedRowIds).map(
                      (index) => filteredData[index]?.id
                    );
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
                    Are you sure you want to remove {usersToDelete.length} user
                    {usersToDelete.length > 1 ? "s" : ""} from the team?
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
                          team_id: Number(teamId),
                          user_ids: usersToDelete.join(","),
                        };
                        const response = await api.post(
                          "team/remove-users-to-team",
                          payload
                        );
                        toast.success(
                          response.data.message || "Users removed successfully"
                        );
                        setSelectedRowIds(new Set());
                        await fetchData(); // Refresh the table
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
            </Stack>
          </Stack>
          <Divider />

          <Grid container>
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
                                    header.column.id === "actions"
                                      ? 120
                                      : "auto",
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
                      {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow key={row.id} hover>
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
                  gap={1}
                >
                  <Stack direction="row" alignItems="center">
                    <Typography color="textSecondary">Page </Typography>
                    <Typography color="textSecondary" fontWeight={600} ml={1}>
                      {table.getState().pagination.pageIndex + 1} of{" "}
                      {table.getPageCount()}
                    </Typography>
                    <Typography color="textSecondary" ml={"3px"}>
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
        </BlankCard>
      </Grid>
    </Grid>
  );
};

export default TablePagination;
