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
  Menu,
  ListItemIcon,
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
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconSearch,
  IconTrash,
  IconUserCheck,
  IconX,
  IconDotsVertical,
  IconUsersMinus,
  IconTableColumn,
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
import { format } from "date-fns";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import IOSSwitch from "@/app/components/common/IOSSwitch";
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
  const user = session.data?.user as User & { id: number } & {
    company_id?: string | null;
  } & {
    user_role_id: number;
  };
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
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);

  const openMenu = Boolean(anchorEl);
  // Permissions drawer state
  const [permissionsDrawerOpen, setPermissionsDrawerOpen] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] =
    useState<UserList | null>(null);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [tempPermissions, setTempPermissions] = useState<Set<number>>(
    new Set()
  );
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const [isPermission, setIsPermission] = useState(true);
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const fetchUsers = async () => {
    try {
      const res: AxiosResponse<any> = await api.get("user/get-user-lists");
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

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${user.company_id}`
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
        console.error("Failed to fetch teams", err);
      }
    };
    fetchTeams();
  }, []);

  const handleInviteUser = (user: any | null = null) => {
    setUserId(user?.id || 0);
    setfirstName(user?.first_name || "");
    setlastName(user?.last_name || "");
    setEmail(user?.email || "");
    setExtension(user?.extension || "+44");
    setPhone(user?.phone || "");
    setNationalPhone(user?.phone || "");
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
        phone: nationalPhone,
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
      // toast.error('Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissionsDrawer = (userPermission: UserList) => {
    setSelectedUserPermissions(userPermission);
    const activePermissions = new Set(
      userPermission.permissions.filter((p) => p.status).map((p) => p.id)
    );
    const permssion =
      user.user_role_id == 1
        ? true
        : false || userPermission.id == user.id
        ? true
        : false;
    setIsPermission(permssion);
    setTempPermissions(activePermissions);
    setPermissionSearch("");
    setPermissionsDrawerOpen(true);
  };

  const handlePermissionToggle = (permissionId: number) => {
    const newSelected = new Set(tempPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setTempPermissions(newSelected);
  };

  const handleSelectAll = () => {
    if (!selectedUserPermissions) return;

    const filteredPermissions = selectedUserPermissions.permissions.filter(
      (p) => p.name.toLowerCase().includes(permissionSearch.toLowerCase())
    );
    const allSelected = filteredPermissions.every((p) =>
      tempPermissions.has(p.id)
    );
    const newSelected = new Set(tempPermissions);

    if (allSelected) {
      filteredPermissions.forEach((p) => newSelected.delete(p.id));
    } else {
      filteredPermissions.forEach((p) => newSelected.add(p.id));
    }
    setTempPermissions(newSelected);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserPermissions || !user.company_id) return;

    try {
      const payload = {
        user_id: selectedUserPermissions.id,
        company_id: user.company_id,
        permissions: selectedUserPermissions.permissions.map((permission) => ({
          permission_id: permission.id,
          status: tempPermissions.has(permission.id) ? 1 : 0,
        })),
      };

      const response = await api.post(
        "dashboard/user/change-bulk-permission-status",
        payload
      );

      if (response.data.IsSuccess === true) {
        toast.success(
          response.data.message || "Permissions updated successfully"
        );

        setData((prevData) => {
          const newData = prevData.map((u) => {
            if (u.id === selectedUserPermissions.id) {
              const updatedPermissions = u.permissions.map((p) => ({
                ...p,
                status: tempPermissions.has(p.id),
              }));
              return {
                ...u,
                permissions: updatedPermissions,
                permission_count: updatedPermissions.filter((p) => p.status)
                  .length,
              };
            }
            return u;
          });
          return newData;
        });
        setTimeout(() => {
          window.location.reload();
        }, 100);
        setPermissionsDrawerOpen(false);
      } else {
        // throw new Error(
        //   response.data.message || "Failed to update permissions"
        // );
      }
    } catch (error: any) {
      console.error("Failed to update permissions", error);
      // toast.error(error.message || "Failed to update permissions");
    }
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

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

  const filteredPermissions = useMemo(() => {
    if (!selectedUserPermissions) return [];
    const uniquePermissions = Array.from(
      new Map(
        selectedUserPermissions.permissions
          .filter((p) =>
            p.name.toLowerCase().includes(permissionSearch.toLowerCase())
          )
          .map((p) => [p.id, p])
      ).values()
    );
    return uniquePermissions;
  }, [selectedUserPermissions, permissionSearch]);

  const allFilteredSelected = useMemo(() => {
    return (
      filteredPermissions.length > 0 &&
      filteredPermissions.every((p) => tempPermissions.has(p.id))
    );
  }, [filteredPermissions, tempPermissions]);

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

          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      enableSorting: true,

      cell: ({ row }) => {
        const user = row.original;
        const defaultImage = "/default-avatar.png";

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
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
      header: () => "Email",
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
      header: () => "Phone",
      cell: (info) => (
        <Typography className="f-14" color="textPrimary">
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),

    columnHelper.accessor((row) => row.permissions, {
      id: "permissions",
      header: () => "Permissions",
      cell: (info) => {
        const user = info.row.original;
        return (
          <Chip
            size="small"
            onClick={() => handleOpenPermissionsDrawer(user)}
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
      header: () => "Login",
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
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
      header: () => "Address",
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.address ? row.address : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row.nin_number, {
      id: "ninNumber",
      header: () => (
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
        <Typography variant="subtitle2" fontWeight="inherit" noWrap>
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
      header: () => "Status",
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
    const allSelected = table
      .getAllLeafColumns()
      .every((col) => col.getIsVisible());
    setSelectAll(allSelected);
  }, [table]);

  const handleSelectAllChange = (e: any) => {
    const checked = e.target.checked;
    setSelectAll(checked);

    const currentVisibility = Cookies.get("columnVisibility")
      ? JSON.parse(Cookies.get("columnVisibility")!)
      : {};

    currentVisibility["selectAll"] = checked;

    Cookies.set("columnVisibility", JSON.stringify(currentVisibility), {
      expires: 365,
    });

    table.getAllLeafColumns().forEach((col) => {
      if (col.id !== "conflicts") {
        handleColumnVisibilityChange(col.id, checked);
      }
    });
  };

  const handleColumnVisibilityChange = (colId: string, value: boolean) => {
    const currentVisibility = Cookies.get("columnVisibility")
      ? JSON.parse(Cookies.get("columnVisibility")!)
      : {};

    currentVisibility[colId] = value;

    Cookies.set("columnVisibility", JSON.stringify(currentVisibility), {
      expires: 365,
    });

    table.setColumnVisibility((prev: any) => ({
      ...prev,
      [colId]: value,
    }));
  };

  useEffect(() => {
    const saved = Cookies.get("columnVisibility")
      ? JSON.parse(Cookies.get("columnVisibility")!)
      : {};

    if (saved.selectAll !== undefined) {
      setSelectAll(saved.selectAll);
    }

    // defaults for role 2
    if (user.user_role_id === 2) {
      saved["email"] = false;
      saved["phone"] = false;
      saved["joiningDate"] = false;
      saved["bankName"] = false;
      saved["accountNo"] = false;
      saved["shortCode"] = false;
      saved["address"] = false;
      saved["utrNumber"] = false;
      saved["ninNumber"] = false;
    }

    table.setColumnVisibility(saved);
  }, [user, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  return (
    <PermissionGuard permission="Users">
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
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueTeams.map((team) => (
                    <MenuItem key={team} value={team}>
                      {team}
                    </MenuItem>
                  ))}
                </TextField>
                {uniqueSupervisors.length > 0 ? (
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
                ) : (
                  <></>
                )}
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => {
                  setTempFilters({ team: "", supervisor: "" });
                  setFilters({ team: "", supervisor: "" });
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

            {user.user_role_id == 1 && (
              <IconButton onClick={handlePopoverOpen} sx={{ ml: 1 }}>
                <IconTableColumn />
              </IconButton>
            )}
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
                  href="/apps/users/archive"
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
                    <IconUsersMinus width={18} />
                  </ListItemIcon>
                  Archived Users
                </Link>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
        <Divider />

        {/* Permissions Drawer */}
        <Drawer
          anchor="right"
          open={permissionsDrawerOpen}
          onClose={() => setPermissionsDrawerOpen(false)}
          sx={{
            width: 400,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 400,
              padding: 2,
              backgroundColor: "#f9f9f9",
            },
          }}
        >
          <Box display="flex" flexDirection="column" height="100%">
            {/* Drawer Header */}
            <Box
              display="flex"
              alignContent="center"
              alignItems="center"
              flexWrap="wrap"
              sx={{ mb: 2 }}
            >
              <IconButton
                onClick={() => setPermissionsDrawerOpen(false)}
                sx={{ p: 0, mr: 1 }}
              >
                <IconArrowLeft size={24} />
              </IconButton>
              <Typography variant="h5" fontWeight={700}>
                Manage Permissions - {selectedUserPermissions?.name}
              </Typography>
              <IconButton
                aria-label="close"
                onClick={() => setPermissionsDrawerOpen(false)}
                size="small"
                sx={{
                  position: "absolute",
                  right: 8,
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

            {/* Drawer Content */}
            <Box height="100%" display="flex" flexDirection="column">
              <Box sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search permissions..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Box>

              {/* Select All Toggle Switch */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                  px: 1,
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
                  cursor: "pointer",
                  pointerEvents: !isPermission ? "none" : "",
                }}
                onClick={handleSelectAll}
              >
                <Typography>Select All</Typography>
                <IOSSwitch
                  checked={allFilteredSelected}
                  onChange={handleSelectAll}
                  size="small"
                  disabled={loading || !isPermission}
                />
              </Box>

              <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                {filteredPermissions.map((permission) => (
                  <Box
                    key={permission.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      px: 1,
                      borderRadius: 1,
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
                      cursor: "pointer",
                      pointerEvents: !isPermission ? "none" : "",
                    }}
                    onClick={() => handlePermissionToggle(permission.id)}
                  >
                    <Typography>{permission.name}</Typography>
                    <IOSSwitch
                      checked={tempPermissions.has(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      size="small"
                      disabled={loading || !isPermission}
                    />
                  </Box>
                ))}
              </Box>

              {/* Drawer Actions */}
              {isPermission && (
                <Box mt={2} display="flex" justifyContent="start" gap={2}>
                  <Button
                    color="primary"
                    variant="contained"
                    size="large"
                    onClick={handleSavePermissions}
                  >
                    Save
                  </Button>
                  <Button
                    color="error"
                    onClick={() => setPermissionsDrawerOpen(false)}
                    variant="outlined"
                    size="large"
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Drawer>

        {/* Remove user dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>
            Confirm Deletion
            <IconButton
              aria-label="close"
              onClick={() => setConfirmOpen(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <IconX />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Typography color="textSecondary" fontWeight={500}>
              This will permanently erase all actions, history, and activity
              associated with the user. Once deleted, the data cannot be
              recovered.
              <br />
              <br />
              To remove the user without losing their information, please select
              the Archive option instead.
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={async () => {
                try {
                  const payload = {
                    user_ids: usersToDelete.join(","),
                    company_id: user.company_id,
                  };
                  const response = await api.post(
                    "user/archive-user-account",
                    payload
                  );
                  toast.success(response.data.message);
                  setSelectedRowIds(new Set());
                  await fetchUsers();
                } catch (error) {
                  console.error("Failed to archive users", error);
                } finally {
                  setConfirmOpen(false);
                }
              }}
              variant="outlined"
              color="primary"
            >
              Archive
            </Button>
            <Button
              onClick={async () => {
                try {
                  const payload = {
                    user_ids: usersToDelete.join(","),
                    company_id: user.company_id,
                  };
                  const response = await api.post(
                    "user/remove-account",
                    payload
                  );
                  toast.success(response.data.message);
                  setSelectedRowIds(new Set());
                  await fetchUsers();
                } catch (error) {
                  console.error("Failed to remove users", error);
                  toast.error("Failed to remove users");
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
                        trade.find((p: any) => p.id === selectedTrade.id) ||
                        null
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
    </PermissionGuard>
  );
};

export default TablePagination;
