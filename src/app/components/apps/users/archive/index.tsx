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
    Dialog, Badge, Tooltip,
} from '@mui/material';
import {
    flexRender,
    getCoreRowModel,
    createColumnHelper,
} from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import {
    IconChevronLeft,
    IconChevronRight,
    IconFilter,
    IconSearch,
    IconUsersPlus,
    IconX,
    IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSearchParams } from "next/navigation";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format } from "date-fns";
import "react-phone-input-2/lib/material.css";
import PermissionGuard from "@/app/auth/PermissionGuard";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Link from 'next/link';
import { getUserDetailsHref } from '@/utils/userDetailsRoute';

dayjs.extend(customParseFormat);

export interface Permission {
    id: number;
    name: string;
    status: boolean;
}

export interface UserList {
    status_color: string;
    permissions: Permission[];
    id: number;
    name: string;
    supervisor_name: string;
    user_image: string;
    trade_name: string;
    team_name: string;
    shifts: string;
    status: number;
    is_invited: boolean;
    archived_at: any;
    created_at: any;
    company_id: number | null;
    permission_count: number;
    action_by: string | null;
    supervisor_team_id: number | null;
    supervisor_team_name: string | null;
}

export interface TradeList {
    id: number;
    name: string;
}

type DialogAction = "unarchive" | "remove" | null;

const ArchiveUserList = () => {
    const [data, setData] = useState<UserList[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
        const allIds = data.map((item: any) => item.id);
        setSelectedRowIds(new Set(allIds));
        } else {
        setSelectedRowIds(new Set());
        }
    };

    const [filters, setFilters] = useState({ team: "", supervisor: "" });
    const [tempFilters, setTempFilters] = useState(filters);
    const [open, setOpen] = useState(false);
    const searchParams = useSearchParams();
    const projectId = searchParams ? searchParams.get("project_id") : "";
    const [usersToAction, setUsersToAction] = useState<number[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [dialogAction, setDialogAction] = useState<DialogAction>(null);
    const session = useSession();
    const user = session.data?.user as User & { company_id?: string | null };
    const [trade, setTrade] = useState<TradeList[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [fetchUser, setFetchUser] = useState<boolean>(false);
    const [supervisorReplacementOpen, setSupervisorReplacementOpen] = useState(false);
    const [newSupervisorId, setNewSupervisorId] = useState<number | ''>('');
    const [supervisorDetails, setSupervisorDetails] = useState<{ team_id: number | null, team_name: string | null } | null>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);

    const fetchActiveUsers = async () => {
        try {
            const res = await api.get("user/get-user-lists");
            if (res.data) {
                setActiveUsers(res.data.info);
            }
        } catch (err) {
            console.error("Failed to fetch active users", err);
        }
    };

    useEffect(() => {
        fetchActiveUsers();
    }, []);

    const fetchUsers = async () => {
        setFetchUser(true);
        try {
            let url = `user/archive-users-list?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
            
            if (searchTerm) url += `&search=${searchTerm}`;
            if (filters.team && filters.team !== "All") url += `&team_ids=${filters.team}`;
            if (filters.supervisor && filters.supervisor !== "All") url += `&supervisor_ids=${filters.supervisor}`;

            const res = await api.get(url);
            if (res.data) {
                const responseData = res.data.info?.data || res.data.info || res.data.data || [];
                setData(responseData);

                const pagMeta =
                    res.data.data?.totalPages !== undefined || res.data.data?.totalItems !== undefined
                        ? res.data.data
                        : res.data.info && res.data.info.totalPages !== undefined
                        ? res.data.info
                        : res.data.data || {};

                if (pagMeta.totalItems !== undefined) {
                    setTotalRows(pagMeta.totalItems);
                } else if (pagMeta.total !== undefined) {
                    setTotalRows(pagMeta.total);
                } else {
                    setTotalRows(responseData.length);
                }

                if (pagMeta.totalPages !== undefined) {
                    setPageCount(pagMeta.totalPages);
                } else if (pagMeta.last_page !== undefined) {
                    setPageCount(pagMeta.last_page);
                }
            }
        } catch (err) {
            console.error("Failed to fetch archive users", err);
        } finally {
            setFetchUser(false);
        }
    };

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const res = await api.get(
                    `get-company-resources?flag=tradeList&company_id=${user.company_id}`,
                );
                if (res.data) setTrade(res.data.info);
            } catch (err) {
                console.error("Failed to fetch trades", err);
            }
        };
        fetchTrades();
    }, [user?.company_id]);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await api.get(
                    `get-company-resources?flag=teamList&company_id=${user.company_id}`,
                );
                if (res.data) setTeams(res.data.info);
            } catch (err) {
                console.error("Failed to fetch teams", err);
            }
        };
        fetchTeams();
    }, [user?.company_id]);

    const uniqueTeams = useMemo(
        () => [...new Set(teams.map((item) => item.name).filter(Boolean))],
        [data, teams],
    );

    const uniqueSupervisors = useMemo(
        () => [
            ...new Set(data.map((item) => item.supervisor_name).filter(Boolean)),
        ],
        [data],
    );

    const formatDate = (date?: Date | string | null) => {
        if (!date) return "-";
        try {
            return format(new Date(date), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const filteredData = data;

    const handleOpenConfirm = (action: DialogAction) => {
        const selectedIds = Array.from(selectedRowIds).filter(Boolean);
        setUsersToAction(selectedIds);
        setDialogAction(action);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setConfirmOpen(false);
        setDialogAction(null);
    };

    const handleUnarchive = async () => {
        try {
            const payload = {
                user_ids: usersToAction.join(","),
                company_id: user.company_id,
            };
            const response = await api.post("user/unarchive-user", payload);
            toast.success(response.data.message);
            setSelectedRowIds(new Set());
            await fetchUsers();
        } catch (error) {
            toast.error("Failed to restore users. Please try again.");
        } finally {
            handleCloseConfirm();
        }
    };

    const handleRemove = async () => {
        const supervisorsToReplace = data.filter((u: any) => usersToAction.includes(u.id) && u.supervisor_team_id);
        if (supervisorsToReplace.length > 0) {
            setSupervisorDetails({
                team_id: supervisorsToReplace[0].supervisor_team_id,
                team_name: supervisorsToReplace[0].supervisor_team_name || 'the team'
            });
            setSupervisorReplacementOpen(true);
            setConfirmOpen(false);
            return;
        }

        try {
            const payload = {
                user_ids: usersToAction.join(","),
                company_id: user.company_id,
            };

            const response = await api.post("user/remove-users", payload);
            toast.success(response.data.message);
            setSelectedRowIds(new Set());
            await fetchUsers();
        } catch (error) {
            console.error("Failed to remove users", error);
            toast.error("Failed to remove users. Please try again.");
        } finally {
            handleCloseConfirm();
        }
    };

    const columnHelper = createColumnHelper<UserList>();
    const columns = [
        columnHelper.accessor("name", {
            id: "name",
            header: () => (
                <Stack direction="row" alignItems="center" spacing={4}>
                    <CustomCheckbox
                        className="header-checkbox"
                        checked={
                            selectedRowIds.size === filteredData.length &&
                            filteredData.length > 0
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); e.preventDefault(); handleSelectAllRows(e.target.checked); }}
                    />
                    <Typography variant="subtitle2" fontWeight="inherit">
                        Name
                    </Typography>
                </Stack>
            ),
            enableSorting: true,
            cell: ({ row }) => {
                const rowUser = row.original;
                const defaultImage = "/default-avatar.png";
                const isChecked = selectedRowIds.has(rowUser.id);

                return (
                    <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
                        <CustomCheckbox
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedRowIds);
                                if (newSelected.has(rowUser.id)) {
                                    newSelected.delete(rowUser.id);
                                } else {
                                    newSelected.add(rowUser.id);
                                }
                                setSelectedRowIds(newSelected);
                            }}
                        />
                        <Stack direction="row" alignItems="center" spacing={4}>
                            <Link href={getUserDetailsHref(rowUser.id, { is_archived_user: true })} passHref>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={4}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <Avatar
                                        src={
                                            rowUser?.user_image
                                                ? rowUser.user_image
                                                : '/images/users/user.png'
                                        }
                                        alt={rowUser?.name}
                                        sx={{ width: 36, height: 36, cursor: 'pointer' }}
                                    />
                                    <Box>
                                        <Typography
                                            className="f-14"
                                            color="textPrimary"
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': { color: '#173f98' },
                                                width: 190,
                                            }}
                                        >
                                            {rowUser.name ?? '-'}
                                        </Typography>
                                        <Tooltip title={rowUser.trade_name ?? '-'} placement="top" arrow>
                                            <Typography
                                                color="textSecondary"
                                                variant="subtitle1"
                                                width={190}
                                                noWrap
                                            >
                                                {rowUser.trade_name}
                                            </Typography>
                                        </Tooltip>
                                    </Box>
                                </Stack>
                            </Link>
                        </Stack>
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
        columnHelper.accessor((row) => row.action_by, {
            id: "action_by",
            header: () => "Archive By",
            cell: (info) => (
                <Typography className="f-14" color="textPrimary">
                    {info.getValue()?.length ? info.getValue() : "-"}
                </Typography>
            ),
        }),
        columnHelper.accessor((row) => row.archived_at, {
            id: "archived_at",
            header: () => "Archive at",
            cell: (info) => {
                const row = info.row.original;
                const notLoggedIn = row.archived_at;
                return (
                    <Typography
                        className="f-14"
                        color="textPrimary"
                        fontWeight={notLoggedIn ? 500 : 400}
                    >
                        {row.archived_at ? formatDate(row.archived_at) : "-"}
                    </Typography>
                );
            },
        }),
    ];

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
        data: filteredData,
        columns,
        fetchData: fetchUsers,
        debounceDependencies: [searchTerm, filters],
    });

    const simpleColumns = columns.map((column) => ({
        name: column.id ?? "Unnamed Column",
        width: "auto",
    }));

    const dialogConfig = {
        unarchive: {
            title: "Confirm Unarchive",
            message: `Are you sure you want to unarchive ${usersToAction.length} user${usersToAction.length > 1 ? "s" : ""} from the archived list?`,
            confirmLabel: "Unarchive",
            confirmColor: "primary" as const,
            onConfirm: handleUnarchive,
        },
        remove: {
            title: "Confirm Remove",
            message: `Are you sure you want to permanently remove ${usersToAction.length} user${usersToAction.length > 1 ? "s" : ""}?`,
            confirmLabel: "Remove",
            confirmColor: "error" as const,
            onConfirm: handleRemove,
        },
    };

    const activeDialog = dialogAction ? dialogConfig[dialogAction] : null;

    return (
        <PermissionGuard permission="Users">
            <Box
                sx={{
                    height: "calc(100vh - 100px)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* ── Toolbar ── */}
                <Stack
                    mr={2}
                    ml={2}
                    mb={2}
                    justifyContent="space-between"
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1, sm: 2, md: 4 }}
                >
                    {/* Left: search + filter */}
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
                        <Button variant="contained" onClick={() => setOpen(true)}  sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}>
                            <IconFilter width={18} />
                        </Button>
                    </Grid>

                    {/* Right: action buttons — only visible when rows are selected */}
                    {selectedRowIds.size > 0 && (
                        <Stack direction="row" alignItems="center" spacing={1} mb={1} mr={1}>
                            {/* Unarchive */}
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<IconUsersPlus width={18} />}
                                onClick={() => handleOpenConfirm("unarchive")}
                            >
                                Unarchive User{selectedRowIds.size > 1 ? "s" : ""} (
                                {selectedRowIds.size})
                            </Button>

                            {/* Remove */}
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<IconTrash width={18} />}
                                onClick={() => handleOpenConfirm("remove")}
                            >
                                Remove User{selectedRowIds.size > 1 ? "s" : ""} (
                                {selectedRowIds.size})
                            </Button>
                        </Stack>
                    )}
                </Stack>

                {/* ── Filter Dialog ── */}
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
                                <MenuItem value="All">All</MenuItem>
                                {uniqueTeams.map((team) => (
                                    <MenuItem key={team} value={team}>
                                        {team}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {uniqueSupervisors.length > 0 && (
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
                                    <MenuItem value="All">All</MenuItem>
                                    {uniqueSupervisors.map((supervisor, i) => (
                                        <MenuItem key={i} value={supervisor}>
                                            {supervisor}
                                        </MenuItem>
                                    ))}
                                </TextField>
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

                {/* ── Confirm Dialog (shared for both actions) ── */}
                <Dialog open={confirmOpen} onClose={handleCloseConfirm}>
                    <DialogTitle>
                        {activeDialog?.title ?? "Confirm"}
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseConfirm}
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
                            {activeDialog?.message}
                        </Typography>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={handleCloseConfirm} variant="outlined" color="inherit">
                            Cancel
                        </Button>
                        <Button
                            onClick={activeDialog?.onConfirm}
                            variant="contained"
                            color={activeDialog?.confirmColor ?? "primary"}
                        >
                            {activeDialog?.confirmLabel}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Supervisor Replacement Dialog */}
                <Dialog
                    open={supervisorReplacementOpen}
                    onClose={() => setSupervisorReplacementOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ m: 0, position: 'relative', overflow: 'visible' }}>
                        Assign New Supervisor
                        <IconButton
                            aria-label="close"
                            onClick={() => setSupervisorReplacementOpen(false)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <IconX />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Typography color="textSecondary" fontWeight={500} mb={2}>
                            The user you are removing is currently the supervisor of <strong>{supervisorDetails?.team_name || 'a team'}</strong>. Please assign a new supervisor for this team before removing.
                        </Typography>
                        <CustomSelect
                            labelId="new-supervisor-label"
                            id="new-supervisor"
                            value={newSupervisorId}
                            onChange={(e: any) => setNewSupervisorId(e.target.value)}
                            fullWidth
                            displayEmpty
                        >
                            <MenuItem value="" disabled>Select new supervisor</MenuItem>
                            {activeUsers.map((u: any) => (
                                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                            ))}
                        </CustomSelect>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => {
                                setSupervisorReplacementOpen(false);
                                setNewSupervisorId('');
                            }}
                            color="inherit"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!newSupervisorId) {
                                    toast.error('Please select a new supervisor');
                                    return;
                                }
                                try {
                                    const payload = {
                                        user_ids: usersToAction.join(','),
                                        company_id: user.company_id,
                                        supervisor_id: newSupervisorId,
                                        supervisor_team_id: supervisorDetails?.team_id,
                                    };
                                    const response = await api.post(
                                        'user/remove-users',
                                        payload,
                                    );
                                    toast.success(response.data.message);
                                    setSelectedRowIds(new Set());
                                    setSupervisorReplacementOpen(false);
                                    setNewSupervisorId('');
                                    await fetchUsers();
                                } catch (error) {
                                    console.error('Failed to remove users with new supervisor', error);
                                }
                            }}
                            variant="contained"
                            color="primary"
                        >
                            Confirm & Remove
                        </Button>
                    </DialogActions>
                </Dialog>

                <Divider />

                {/* ── Table ── */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
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
                                {fetchUser ? (
                                    <SkeletonLoader
                                        columns={simpleColumns}
                                        rowCount={simpleColumns.length}
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
                                                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                                                    width={200}
                                                    height={200}
                                                />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
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

                {/* ── Pagination ── */}
                <Divider />
                <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined}
                    table={table}
                    totalRows={table.getPrePaginationRowModel().rows.length}
                />
            </Box>
        </PermissionGuard>
    );
};

export default ArchiveUserList;
