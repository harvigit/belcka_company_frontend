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
  CardContent,
  Menu,
  ListItemIcon,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Drawer,
  Badge,
  Tooltip,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import {
  IconDotsVertical,
  IconEye,
  IconFilter,
  IconRotate,
  IconSearch,
  IconTrash,
  IconUserPlus,
  IconArrowLeft,
} from "@tabler/icons-react";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useRouter, useSearchParams } from "next/navigation";
import BlankCard from "@/app/components/shared/BlankCard";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import JoinCompanyDialog from "../../modals/join-company";
import GenerateCodeDialog from "../../modals/generate-code";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import PermissionGuard from "@/app/auth/PermissionGuard";
import Link from "next/link";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  supervisor_id: number;
  supervisor_name: string;
  supervisor_image: string | null;
  supervisor_email: string | null;
  supervisor_phone: string | null;
  extension: string | null;
  company_id: number;
  subcontractor_company_id?: number;
  is_subcontractor: boolean;
  team_name: string;
  name: string;
  image: string | null;
  is_working: boolean;
  is_on_break: boolean;
  trade_name: string | null;
  trade_id: number | null;
  last_worked_date: string | null;
  status_color: string;
  new_member: boolean;
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
  const [trade, setTrade] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchTeam, setFetchTeam] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const rerender = React.useReducer(() => ({}), {})[1];
  const [users, setUsers] = useState<UserList[]>([]);
  const [user, setUser] = useState<UserList[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [totalUsersListCount, setTotalUsersListCount] = useState<
    number | undefined
  >(undefined);
  const [workingUsersListCount, setWorkingUsersListCount] = useState<
    number | undefined
  >(undefined);
  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const searchParams = useSearchParams();
  const teamId = searchParams ? searchParams.get("team_id") : "";

  const [filters, setFilters] = useState({ team: "", trade: "" });
  const [tempFilters, setTempFilters] = useState(filters);

  const [open, setOpen] = useState(false);

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
  const [enabled, setEnabled] = useState<boolean>(false);

  const [geoSettings, setGeoSettings] = useState({ start: false, stop: false });

  const [openTeamHistory, setOpenTeamHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyLimit = 20;
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const handleGeoToggle = (key: string) => async (event: any) => {
    const checked = event.target.checked;

    let updatedSettings = {
      ...geoSettings,
      [key]: checked,
    };

    setGeoSettings(updatedSettings);

    try {
      const payload = {
        team_id: Number(teamId),
        is_start_inside_boundary: updatedSettings.start,
        is_stop_inside_boundary: updatedSettings.stop,
      };

      const res = await api.post("/team/update-geofence-settings", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Settings updated");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update settings");
    }
  };

  const handleSwitchToggle = () => {
    handleToggle(!enabled);
  };

  const handleToggle = async (overrideStatus?: boolean) => {
    const newStatus = overrideStatus ?? !enabled;

    setEnabled(newStatus);

    const payload = {
      company_id: Number(id.company_id),
      teams: [
        {
          id: Number(teamId),
          is_check_in: newStatus,
        },
      ],
    };

    try {
      const res = await api.post("team/change-bulk-checkin", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchData();
      }
    } catch (e) {
      console.error(e, "error");
    }
  };

  // fetch compnay trades
  const fetchTrades = async () => {
    try {
      const res = await api.get(
        `get-company-resources?flag=tradeList&company_id=${id.company_id}`,
      );
      if (res.data) setTrade(res.data.info);
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [api]);

  // fetch team member's
  const fetchData = async (restorePage?: number) => {
    setFetchTeam(true);
    try {
      let url = `team/get-team-member-list?team_id=${teamId}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      if (filters.team && filters.team !== "All") {
        url += `&user_ids=${filters.team}`;
      }
      if (filters.trade && filters.trade !== "All") {
        url += `&trade_ids=${filters.trade}`;
      }

      const res = await api.get(url);
      const teamData =
        res.data?.info?.data || res.data?.info || res.data?.data || [];

      if (teamData && Array.isArray(teamData)) {
        if (teamData.length > 0) {
          const firstTeam = teamData[0];
          setTeamInfo((prev: any) => ({
            ...prev,
            supervisor_image: firstTeam.supervisor_image,
            supervisor_name: firstTeam.supervisor_name,
            extension: firstTeam.extension,
            supervisor_phone: firstTeam.supervisor_phone,
            team_name: firstTeam.team_name,
          }));
        }

        const flattened = teamData.flatMap((team: any) => {
          setEnabled(team.is_check_in ?? false);

          const updatedSettings = {
            start: team.is_start_inside_boundary,
            stop: team.is_stop_inside_boundary,
          };
          setGeoSettings(updatedSettings);

          if (!team.users || team.users.length === 0) {
            return [
              {
                supervisor_id: team.supervisor_id,
                supervisor_name: team.supervisor_name,
                supervisor_image: team.supervisor_image,
                supervisor_email: team.supervisor_email,
                supervisor_phone: team.supervisor_phone,
                extension: team.extension,
                company_id: team.company_id,
                subcontractor_company_id: team.subcontractor_company_id,
                is_subcontractor: team.is_subcontractor,
                team_name: team.team_name,
                name: null,
                image: null,
                is_working: null,
                is_on_break: null,
                trade_id: null,
                trade_name: null,
                last_worked_date: null,
                status_color: null,
                new_member: false,
              },
            ];
          }

          return team.users.map((user: any) => ({
            supervisor_id: team.supervisor_id,
            supervisor_name: team.supervisor_name,
            supervisor_image: team.supervisor_image,
            supervisor_email: team.supervisor_email,
            supervisor_phone: team.supervisor_phone,
            extension: team.extension,
            team_name: team.team_name,
            id: user.id,
            name: user.name,
            image: user.image,
            is_working: user.is_working,
            is_on_break: user.is_on_break,
            status_color: user.status_color,
            trade_id: user.trade_id,
            last_worked_date: user.last_worked_date,
            trade_name: user.trade_name,
            is_subcontractor: team.is_subcontractor,
            company_id: team.company_id,
            subcontractor_company_id: team.subcontractor_company_id,
            new_member: user.new_member,
          }));
        });

        setData(flattened);

        const pagMeta =
          res.data.data?.totalPages !== undefined ||
          res.data.data?.totalItems !== undefined
            ? res.data.data
            : res.data.info && res.data.info.totalPages !== undefined
              ? res.data.info
              : res.data.data || {};

        if (pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
        } else if (pagMeta.total !== undefined) {
          setTotalRows(pagMeta.total);
        } else {
          setTotalRows(flattened.length);
        }

        if (res.data.total_users !== undefined) {
          setTotalUsersListCount(res.data.total_users);
        }
        if (res.data.working_member_count !== undefined) {
          setWorkingUsersListCount(res.data.working_member_count);
        }
        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }

        if (restorePage !== undefined) {
          setTimeout(() => {
            setPagination((prev: any) => ({ ...prev, pageIndex: restorePage }));
          }, 0);
        }
      }

      const isSearchOrFilterActive =
        searchTerm || filters.team || filters.trade;
      if (
        (!teamData || teamData.length <= 0) &&
        teamId !== null &&
        !isSearchOrFilterActive &&
        !teamInfo
      ) {
        router.push("/apps/teams/list");
      } // }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
    setFetchTeam(false);
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
  }, [teamId]);

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

  const fetchTeamHistory = async () => {
    if (!teamId) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(
        `requests/get-history?company_id=${id.company_id}`,
      );
      if (res.data?.info) {
        setHistory(res.data.info || []);
      }
    } catch (err) {
      console.error("Failed to fetch team history:", err);
      toast.error("Failed to load team history");
    }
    setHistoryLoading(false);
  };

  const filteredHistory =
    history?.filter(
      (item) =>
        item.request_type === 109 && String(item.record_id) === String(teamId),
    ) || [];
  const paginatedHistory = filteredHistory.slice(0, historyPage * historyLimit);

  const handleOpenTeamHistory = () => {
    close();
    setOpenTeamHistory(true);
    setHistoryPage(1);
    fetchTeamHistory();
  };

  const handleCloseTeamHistory = () => {
    setOpenTeamHistory(false);
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

  const uniqueUsers = useMemo(() => {
    const map = new Map();
    users.forEach((item) => {
      if (item.name && item.id) {
        map.set(item.id, item.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  const uniqueTrades = useMemo(() => {
    const map = new Map();
    trade.forEach((item) => {
      if (item.name && item.id) {
        map.set(item.id, item.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [trade]);
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
      setOtp("");
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
      // toast.error("Failed to generate code.");
      return null;
    }
  };

  const columnHelper = createColumnHelper<TeamList>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={selectedRowIds.size === data.length && data.length > 0}
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(data.map((row: any) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />
        </Stack>
      ),
      cell: ({ row }: any) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const isHovered = hoveredRow === item.id;
        const showCheckbox = isChecked || isHovered;

        return (
          <Stack
            direction="row"
            alignItems="center"
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
            sx={{ pl: 1 }}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedRowIds(newSelected);
              }}
              sx={{
                opacity: showCheckbox ? 1 : 0,
                pointerEvents: showCheckbox ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            />
          </Stack>
        );
      },
    },
    columnHelper.accessor("name", {
      id: "name",
      enableSorting: true,
      header: ({ column }) => (
        <Stack
          direction="row"
          alignItems="center"
          spacing={4}
          sx={{ cursor: "pointer" }}
          onClick={column.getToggleSortingHandler()}
        >
          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Link href={`/apps/users/${item.id}`} passHref>
              <Stack
                direction="row"
                alignItems="center"
                spacing={4}
                sx={{ cursor: "pointer" }}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  variant="dot"
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: item?.status_color,
                      color: item?.status_color,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      boxShadow: "0 0 0 2px white",
                      cursor: "pointer",
                    },
                  }}
                >
                  <Avatar
                    src={item?.image ? item.image : "/images/users/user.png"}
                    alt={item?.name}
                    sx={{ width: 36, height: 36, cursor: "pointer" }}
                  />
                </Badge>
                <Box display={"block"}>
                  <Typography
                    className="f-14"
                    color="textPrimary"
                    sx={{
                      cursor: "pointer",
                      "&:hover": { color: "#173f98" },
                      width: 190,
                    }}
                  >
                    {item.name ?? "-"}
                  </Typography>
                  {item?.new_member && (
                    <Chip
                      label="New"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Stack>
            </Link>
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
    columnHelper.accessor((row) => row?.is_working, {
      id: "status",
      header: () => "Status",
      cell: (info) => {
        const item = info.row.original;
        const lastWorkedDate = item.last_worked_date;

        if (item.is_on_break) {
          return (
            <Chip
              size="small"
              label="On Break"
              sx={{
                backgroundColor: (theme) => theme.palette.warning.light,
                color: (theme) => theme.palette.warning.dark,
                fontWeight: 500,
                borderRadius: "6px",
                px: 1.5,
              }}
            />
          );
        }

        if (item.is_working) {
          return (
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
          );
        }

        return (
          <Box>
            {lastWorkedDate && (
              <Typography
                variant="caption"
                color="error"
                display="block"
                fontSize={14}
                mt={0.5}
              >
                {dayjs(lastWorkedDate).format("DD/MM/YYYY")}
              </Typography>
            )}
          </Box>
        );
      },
    }),
  ];

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const {
    table,
    pagination,
    setPagination,
    pageCount,
    setPageCount,
    totalRows,
    setTotalRows,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useServerTable({
    data,
    columns,
    fetchData,
    debounceDependencies: [searchTerm, filters],
  });

  const handleCopy = () => {
    const extension = teamInfo?.extension || data[0]?.extension || "";
    const supervisorPhone =
      teamInfo?.supervisor_phone || data[0]?.supervisor_phone || "-";
    const textToCopy = `${extension} ${supervisorPhone}`;

    if (textToCopy) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          toast.success("Copied to clipboard!");
        })
        .catch((err) => {
          toast.error("Failed to copy: ", err);
        });
    }
  };

  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Teams">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 3 }}>
          <BlankCard>
            <CardContent sx={{ pt: 1 }}>
              <Box textAlign="center" display="flex" justifyContent="center">
                <Box>
                  <Avatar
                    src={
                      teamInfo?.supervisor_image ||
                      data[0]?.supervisor_image ||
                      "/images/users/user.png"
                    }
                    alt={
                      teamInfo?.supervisor_name ||
                      data[0]?.supervisor_name ||
                      "user1"
                    }
                    sx={{ width: 120, height: 120, margin: "0 auto" }}
                  />
                  <Typography variant="h5" mb={1}>
                    {teamInfo?.supervisor_name || data[0]?.supervisor_name}
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
                <Box
                  sx={{ ml: "auto !important", cursor: "pointer" }}
                  onClick={handleCopy}
                >
                  <Typography variant="h5" color="textSecondary">
                    {teamInfo?.extension || data[0]?.extension || ""}{" "}
                    {teamInfo?.supervisor_phone ||
                      data[0]?.supervisor_phone ||
                      "-"}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>

          <Box
            sx={{
              mt: 4,
              borderRadius: 3,
              boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
              backgroundColor: "background.paper",
              overflow: "hidden",
            }}
          >
            <BlankCard>
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h6">Check-In</Typography>
                  <IOSSwitch
                    checked={!!enabled}
                    onChange={handleSwitchToggle}
                  />
                </Box>
              </CardContent>
            </BlankCard>
          </Box>

          <Box
            sx={{
              mt: 4,
              borderRadius: 3,
              boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
              backgroundColor: "background.paper",
              overflow: "hidden",
            }}
          >
            <BlankCard>
              <CardContent sx={{ padding: 2 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  px={2}
                  py={1.5}
                  borderBottom="1px solid #eee"
                >
                  <Typography>Start Work: Inside Boundary Only</Typography>
                  <IOSSwitch
                    checked={geoSettings.start}
                    onChange={handleGeoToggle("start")}
                  />
                </Box>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  px={2}
                  py={1.5}
                >
                  <Typography>End Work: Inside Boundary Only</Typography>
                  <IOSSwitch
                    checked={geoSettings.stop}
                    onChange={handleGeoToggle("stop")}
                  />
                </Box>
              </CardContent>
            </BlankCard>
          </Box>
        </Grid>
        <Grid
          size={{
            xs: 12,
            lg: 9,
          }}
        >
          <BlankCard>
            <Grid display="flex" gap={1} mt={2} ml={2}>
              <Typography variant="h3">
                {teamInfo?.team_name || data[0]?.team_name}
              </Typography>
            </Grid>

            <Stack
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
                <Button
                  variant="contained"
                  onClick={() => setOpen(true)}
                  sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
                >
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
                          setTempFilters({
                            ...tempFilters,
                            team: e.target.value,
                          })
                        }
                        fullWidth
                      >
                        <MenuItem value="All">All</MenuItem>
                        {uniqueUsers.map((member) => (
                          <MenuItem key={member.id} value={member.id}>
                            {member.name}
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
                        <MenuItem value="All">All</MenuItem>
                        {uniqueTrades.map((tradeItem) => (
                          <MenuItem key={tradeItem.id} value={tradeItem.id}>
                            {tradeItem.name}
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
                    Create Code
                  </MenuItem>
                </Menu>

                <IconButton
                  onClick={handlePopoverOpen}
                  sx={{ ml: 1 }}
                  color="primary"
                >
                  <IconEye />
                </IconButton>
                <Button
                  color="primary"
                  variant="outlined"
                  size="small"
                  onClick={handleOpenTeamHistory}
                  sx={{
                    whiteSpace: "nowrap",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Activity
                </Button>
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
                        const excludedColumns = ["conflicts", "select"];
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
                                    str.toUpperCase(),
                                  )
                                  .trim())
                          }
                        />
                      ))}
                  </FormGroup>
                </Popover>
                <GenerateCodeDialog
                  title="Create Code"
                  mode="create"
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
                      const selectedIds = Array.from(selectedRowIds);
                      setUsersToDelete(selectedIds.filter(Boolean));
                      setConfirmOpen(true);
                    }}
                  >
                    Remove
                  </Button>
                )}
                <Dialog
                  open={confirmOpen}
                  onClose={() => setConfirmOpen(false)}
                >
                  <DialogTitle>Confirm Deletion</DialogTitle>
                  <DialogContent>
                    <Typography color="textSecondary">
                      Are you sure you want to remove {usersToDelete.length}{" "}
                      user
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
                            payload,
                          );
                          toast.success(
                            response.data.message ||
                              "Users removed successfully",
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
            <Box
              sx={{
                height: "calc(88vh - 100px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                }}
              >
                <TableContainer>
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
                                      : header.column.id === "select"
                                        ? 30
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
                                      header.getContext(),
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
                      {fetchTeam ? (
                        <SkeletonLoader
                          columns={simpleColumns}
                          rowCount={simpleColumns.length}
                          hasAvatar={true}
                        />
                      ) : data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columns.length}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "calc(50vh - 100px)",
                              }}
                            >
                              <Image
                                src="/images/no-data.png"
                                alt="No data"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "100%",
                                }}
                                width={200}
                                height={200}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            hover
                            sx={{ cursor: "pointer" }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} sx={{ padding: "10px" }}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {data.length ? <Divider /> : <></>}
              </Box>
              <Divider />
              <TablePaginationFooter
                selectedCount={
                  typeof selectedRowIds !== "undefined"
                    ? selectedRowIds.size
                    : undefined
                }
                table={table}
                totalRows={table.getPrePaginationRowModel().rows.length}
                totalUsers={totalUsersListCount}
                workingMemberCount={workingUsersListCount}
              />
            </Box>
          </BlankCard>
        </Grid>
      </Grid>

      <Drawer
        anchor="right"
        open={openTeamHistory}
        onClose={handleCloseTeamHistory}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: "100%",
            "& .MuiDrawer-paper": {
              width: 500,
              padding: 2,
              backgroundColor: "#f9f9f9",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <IconButton
            aria-label="close"
            onClick={handleCloseTeamHistory}
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

          <Grid container spacing={2} display="block">
            <Box
              display={"flex"}
              alignContent={"center"}
              alignItems={"center"}
              flexWrap={"wrap"}
            >
              <IconButton onClick={handleCloseTeamHistory}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {data[0]?.team_name
                  ? `${data[0]?.team_name} Activity`
                  : "Team Activity"}
              </Typography>
            </Box>

            {history.length > 0 ? (
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                <Box
                  sx={{
                    maxHeight: paginatedHistory.length > 3 ? "auto" : "auto",
                    overflow: paginatedHistory.length > 3 ? "auto" : "visible",
                    pr: 0,
                  }}
                >
                  {paginatedHistory.map((item: any, index: number) => {
                    return (
                      <Box
                        key={item.id ?? index}
                        mb={index === paginatedHistory.length - 1 ? 0 : 2}
                        pl={2}
                        pr={2}
                        mt={2}
                        position="relative"
                        display="flex"
                        alignItems="center"
                        sx={{
                          width: "100%",
                          lineHeight: "10px",
                          height: "70px",
                          borderRadius: "25px",
                          boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                          border: "1px solid rgb(240 240 240)",
                        }}
                      >
                        <Box
                          position="absolute"
                          top="-10px"
                          left="15px"
                          bgcolor="#FF7F00"
                          px={1.5}
                          borderRadius="10px"
                          zIndex={1}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            fontSize={"12px !important"}
                            color="#fff"
                          >
                            {item.type_name || "Activity"}
                          </Typography>
                        </Box>
                        <Box display="initial" width="100%" textAlign="start">
                          <Typography
                            fontSize="14px"
                            className="multi-ellipsis"
                          >
                            <b>{item.user_name}:</b>{" "}
                            <Tooltip placement="top" title={item.message} arrow>
                              <span>{item.message}</span>
                            </Tooltip>
                          </Typography>
                          <p
                            style={{
                              fontSize: "12px",
                              textAlign: "end",
                              color: "GrayText",
                              margin: "3px",
                            }}
                            color="textSecondary"
                          >
                            {item.date}
                          </p>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {paginatedHistory.length < filteredHistory.length && (
                  <Box display="flex" justifyContent="center" my={2}>
                    <Button
                      variant="outlined"
                      startIcon={
                        historyLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : null
                      }
                      onClick={() => setHistoryPage((prev) => prev + 1)}
                      disabled={historyLoading}
                    >
                      See More
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <>
                <Typography mt={2} ml={2} variant="h5">
                  No activities are found for team!!
                </Typography>
              </>
            )}
          </Grid>
        </Box>
      </Drawer>
    </PermissionGuard>
  );
};

export default TablePagination;
