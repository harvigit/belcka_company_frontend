'use client';
import React, {
    useEffect,
    useState,
    useMemo,
    SetStateAction,
    useRef,
} from 'react';
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
    Badge,
} from '@mui/material';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    createColumnHelper,
    SortingState,
} from '@tanstack/react-table';
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
    IconEye,
    IconChevronUp,
    IconChevronDown,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { Avatar } from '@mui/material';
import Link from 'next/link';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import { format } from 'date-fns';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/material.css';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import PermissionGuard from '@/app/auth/PermissionGuard';
import { AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import Image from 'next/image';
import SkeletonLoader from '@/app/components/SkeletonLoader';

dayjs.extend(customParseFormat);

export interface Permission {
    id: number;
    name: string;
    status: number;
    is_web?: boolean;
    is_app?: boolean;
}

export interface UserList {
    is_working: boolean;
    is_on_break: boolean;
    last_worked_date: string;
    cis: string;
    permissions: Permission[];
    id: number;
    name: string;
    supervisor_name: string;
    user_image: string;
    trade_name: string;
    email: string;
    phone: number;
    extension: string;
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
    user_code: string | null;
    status_color: string;
    account_id: string;
    supervisor_team_id: number | null;
    supervisor_team_name: string | null;
}

export interface TradeList {
    id: number;
    name: string;
}

const TablePagination = () => {
    const [data, setData] = useState<UserList[]>([]);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [columnFilters, setColumnFilters] = useState<any>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchUser, setFetchUser] = useState<boolean>(false);
    const [visibleColumnsCount, setVisibleColumnsCount] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [filters, setFilters] = useState({
        team: '',
        supervisor: '',
        trade: '',
    });
    const [tempFilters, setTempFilters] = useState(filters);
    const [open, setOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [supervisorReplacementOpen, setSupervisorReplacementOpen] = useState(false);
    const [newSupervisorId, setNewSupervisorId] = useState<number | ''>('');
    const [supervisorDetails, setSupervisorDetails] = useState<{ team_id: number | null, team_name: string | null } | null>(null);
    const session = useSession();
    const user = session.data?.user as User & { id: number } & { company_id?: string | null; } & { user_role_id: number; };
    const [inviteUser, setInviteUser] = useState(false);
    const [trade, setTrade] = useState<TradeList[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [firstName, setfirstName] = useState('');
    const [lastName, setlastName] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<any>(0);
    const [selectedTrade, setSelectedTrade] = useState<any>(0);
    const [phone, setPhone] = useState('');
    const [extension, setExtension] = useState('+44');
    const [nationalPhone, setNationalPhone] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
    const [anchorEl3, setAnchorEl3] = React.useState<null | HTMLElement>(null);
    const openModel = Boolean(anchorEl3);

    const tableContainerRef = useRef<HTMLDivElement | null>(null);
    const [hasHorizontalScrollbar, setHasHorizontalScrollbar] = useState(false);
    const openMenu = Boolean(anchorEl);
    // Permissions drawer state
    const [permissionsDrawerOpen, setPermissionsDrawerOpen] = useState(false);
    const [selectedUserPermissions, setSelectedUserPermissions] =
        useState<UserList | null>(null);
    const [permissionSearch, setPermissionSearch] = useState('');
    const [tempPermissions, setTempPermissions] = useState<{
        web: Set<number>;
        app: Set<number>;
    }>({
        web: new Set(),
        app: new Set(),
    });

    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [isPermission, setIsPermission] = useState(true);
    const [search, setSearch] = useState('');
    const [selectAll, setSelectAll] = useState(false);

    const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl3(event.currentTarget);
    };

    const handleExportClose = (option: string) => {
        if (option) {
            handleExportData(option);
        }
        setAnchorEl3(null);
    };
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    interface ExportResponse {
        IsSuccess: boolean;
        message: string;
        data: {
            file: string;
            filename: string;
            contentType: string;
        };
    }

    const fetchUsers = async () => {
        setFetchUser(true);
        try {
            const res: AxiosResponse<any> = await api.get('user/get-user-lists');
            if (res.data) {
                setData(res.data.info);
                setIsAdmin(res.data.is_admin);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
        setFetchUser(false);
    };

    const handleExportData = async (option: string) => {
        try {
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid or missing data');
            }
            const ids = Array.from(selectedRowIds).join(',');

            if (ids.length === 0) {
                throw new Error('No user IDs selected for export');
            }

            const response: AxiosResponse<ExportResponse> = await api.post(
                'user/export-details',
                {
                    ids,
                    format: option,
                },
            );

            if (response.data.IsSuccess) {
                const { file, filename, contentType } = response.data.data;

                const binaryString = atob(file);
                const binaryLen = binaryString.length;
                const bytes = new Uint8Array(binaryLen);
                for (let i = 0; i < binaryLen; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: contentType });

                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = filename || `timeclock_details_export_${new Date().toISOString()}.${option}`;
                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                fetchUsers();
                setSelectedRowIds(new Set());
            } else {
                throw new Error(response.data.message || 'Export request failed');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [user.company_id, user.id]);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const res = await api.get(
                    `get-company-resources?flag=tradeList&company_id=${user.company_id}`,
                );
                if (res.data) setTrade(res.data.info);
            } catch (err) {
                console.error('Failed to fetch trades', err);
            }
        };
        
        const fetchTeams = async () => {
            try {
                const res = await api.get(
                    `get-company-resources?flag=teamList&company_id=${user.company_id}`,
                );
                if (res.data) setTeams(res.data.info);
            } catch (err) {
                console.error('Failed to fetch teams', err);
            }
        };
        fetchTeams();
        fetchTrades();
    }, [user?.company_id]);

    const closeInviteDrawer = () => {
        setInviteUser(false);
        setSelectedUser(null);
    };

    const uniqueTeams = useMemo(
        () => [...new Set(data.map((item) => item.team_name).filter(Boolean))],
        [data],
    );

    const uniqueTrades = useMemo(
        () => [...new Set(trade.map((item) => item.name).filter(Boolean))],
        [trade],
    );

    const uniqueSupervisors = useMemo(
        () => [
            ...new Set(data.map((item) => item.supervisor_name).filter(Boolean)),
        ],
        [data],
    );

    const formatDate = (date?: Date | string | null) => {
        if (!date) return '-';
        try {
            return format(new Date(date), 'dd/MM/yyyy');
        } catch {
            return '-';
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

            const response = await api.post('invite-user', payload);

            if (response.data.IsSuccess === true) {
                toast.success(response.data.message);
                setfirstName('');
                setlastName('');
                setEmail('');
                setPhone('');
                setNationalPhone('');
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
        const web = new Set<number>();
        const app = new Set<number>();

        userPermission.permissions.forEach((p) => {
            // status: 1 = web+app, 2 = web, 3 = app
            if (p.status === 1 || p.status === 2) web.add(p.id);
            if (p.status === 1 || p.status === 3) app.add(p.id);
        });

        setTempPermissions({ web, app });
        const permission = user.user_role_id == 1 ? true : false || userPermission.id == user.id ? true : false;
        setIsPermission(permission);
        setPermissionSearch('');
        setPermissionsDrawerOpen(true);
    };

    const handlePermissionToggle = (permissionId: number, type: 'web' | 'app') => {
        setTempPermissions((prev) => {
            const updated = new Set(prev[type]);
            updated.has(permissionId) ? updated.delete(permissionId) : updated.add(permissionId);

            return { ...prev, [type]: updated };
        });
    };

    const handleSelectAll = (type: 'web' | 'app') => {
        const allSelected = filteredPermissions.every((p) =>
            tempPermissions[type].has(p.id),
        );

        setTempPermissions((prev) => {
            const updated = new Set(prev[type]);

            if (allSelected) {
                filteredPermissions.forEach((p) => updated.delete(p.id));
            } else {
                filteredPermissions.forEach((p) => updated.add(p.id));
            }

            return { ...prev, [type]: updated };
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedUserPermissions || !user.company_id) return;

        try {
            const payload = {
                user_id: selectedUserPermissions.id,
                company_id: user.company_id,
                permissions: selectedUserPermissions.permissions.map((permission) => {
                    const hasWeb = tempPermissions.web.has(permission.id);
                    const hasApp = tempPermissions.app.has(permission.id);

                    let status = 0;
                    if (hasWeb && hasApp) status = 1;
                    else if (hasWeb) status = 2;
                    else if (hasApp) status = 3;

                    return {
                        permission_id: permission.id,
                        status: status,
                    };
                }),
            };

            const response = await api.post(
                'dashboard/company/change-user-permissions-status',
                payload,
            );

            if (response.data.IsSuccess === true) {
                toast.success(
                    response.data.message || 'Permissions updated successfully',
                );

                const newPermissionCount = selectedUserPermissions.permissions.filter((p) => {
                    return tempPermissions.web.has(p.id) || tempPermissions.app.has(p.id);
                }).length;

                setData((prevData) =>
                    prevData.map((u) => {
                        if (u.id !== selectedUserPermissions.id) return u;

                        const updatedPermissions = u.permissions.map((p) => {
                            const hasWeb = tempPermissions.web.has(p.id);
                            const hasApp = tempPermissions.app.has(p.id);
                            let status = 0;
                            if (hasWeb && hasApp) status = 1;
                            else if (hasWeb) status = 2;
                            else if (hasApp) status = 3;
                            return { ...p, status };
                        });

                        return {
                            ...u,
                            permissions: updatedPermissions,
                            permission_count: newPermissionCount,
                        };
                    }),
                );

                setPermissionsDrawerOpen(false);

                await fetchUsers();
            }
        } catch (error: any) {
            console.error('Failed to update permissions', error);
        }
    };

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl2(event.currentTarget);
    };
    const handlePopoverClose = () => setAnchorEl2(null);

    useEffect(() => {
        const handleResize = () => {
            if (tableContainerRef.current) {
                setHasHorizontalScrollbar(
                    tableContainerRef.current.scrollWidth >
                    tableContainerRef.current.clientWidth,
                );
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (filters.team == "All" || filters.trade == "All" || filters.supervisor == "All") return data;
            const matchesTeam = filters.team ? item.team_name === filters.team : true;
            const matchesTrade = filters.trade ? item.trade_name === filters.trade : true;
            const matchesSupervisor = filters.supervisor ? item.supervisor_name === filters.supervisor : true;

            const search = searchTerm.toLowerCase();
            const matchesSearch =
                item.name?.toLowerCase().includes(search) ||
                item.trade_name?.toLowerCase().includes(search) ||
                item.supervisor_name?.toLowerCase().includes(search) ||
                item.team_name?.toLowerCase().includes(search);
            return matchesTeam && matchesSupervisor && matchesSearch && matchesTrade;
        });
    }, [data, filters, searchTerm]);

    const filteredPermissions = useMemo(() => {
        if (!selectedUserPermissions) return [];
        const uniquePermissions = Array.from(
            new Map(
                selectedUserPermissions.permissions.filter((p) => p.name.toLowerCase().includes(permissionSearch.toLowerCase()),)
                    .map((p) => [p.id, p]),
            ).values(),
        );
        return uniquePermissions;
    }, [selectedUserPermissions, permissionSearch]);

    const userId = user.id;
    const getColumnVisibilityKey = (userId?: number | string) =>
        userId ? `columnVisibility_${userId}` : 'columnVisibility';

    const columnVisibilityKey = getColumnVisibilityKey(userId);

    const columnHelper = createColumnHelper<UserList>();

    const allWebSelected = filteredPermissions.length > 0 && filteredPermissions.every((p) => tempPermissions.web.has(p.id));

    const allAppSelected = filteredPermissions.length > 0 && filteredPermissions.every((p) => tempPermissions.app.has(p.id));

    const columns = [
        {
            id: 'select',
            header: ({ table }: any) => (
                <Stack direction="row" alignItems="center">
                    <CustomCheckbox
                        className="header-checkbox"
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
                                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
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
                                pointerEvents: showCheckbox ? 'auto' : 'none',
                                transition: 'opacity 0.2s ease',
                            }}
                        />
                    </Stack>
                );
            },
        },
        columnHelper.accessor('name', {
            id: 'name',
            header: () => (
                <Stack direction="row" alignItems="center" spacing={4}>
                    <Typography variant="subtitle2">Name</Typography>
                </Stack>
            ),
            enableSorting: true,

            cell: ({ row }) => {
                const user = row.original;

                return (
                    <Stack direction="row" alignItems="center" spacing={4}>
                        <Link href={`/apps/users/${user.id}`} passHref>
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={4}
                                sx={{ cursor: 'pointer' }}
                            >
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    variant="dot"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            backgroundColor: user?.status_color,
                                            color: user?.status_color,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            boxShadow: '0 0 0 2px white',
                                            cursor: 'pointer',
                                        },
                                    }}
                                >
                                    <Avatar
                                        src={
                                            user?.user_image
                                                ? user.user_image
                                                : '/images/users/user.png'
                                        }
                                        alt={user?.name}
                                        sx={{ width: 36, height: 36, cursor: 'pointer' }}
                                    />
                                </Badge>
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
                                        {user.name ?? '-'}
                                    </Typography>
                                    <Tooltip title={user.trade_name ?? '-'} placement="top" arrow>
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
            id: 'teamName',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Team Name
                </Typography>
            ),
            cell: (info) => (
                <Typography
                    className="f-14"
                    color="textPrimary"
                    sx={{ width: 100, ml: 2 }}
                >
                    {info.getValue() ?? '-'}
                </Typography>
            ),
        }),

        columnHelper.accessor((row) => row.email, {
            id: 'email',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Email
                </Typography>
            ),
            cell: (info) => (
                <Tooltip title={info.getValue() ?? ''} placement="top" arrow>
                    <Typography
                        className="f-14"
                        color="textPrimary"
                        sx={{ width: 100, ml: 2 }}
                        noWrap
                    >
                        {info.getValue() ?? '-'}
                    </Typography>
                </Tooltip>
            ),
        }),

        columnHelper.accessor((row) => row.user_code, {
            id: 'companyCode',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Company Code
                </Typography>
            ),
            cell: (info) => (
                <Tooltip title={info.getValue() ?? ''} placement="top" arrow>
                    <Typography
                        className="f-14"
                        color="textPrimary"
                        sx={{ width: 100, ml: 2 }}
                        noWrap
                    >
                        {info.getValue() ? info.getValue() : '-'}
                    </Typography>
                </Tooltip>
            ),
        }),

        columnHelper.accessor((row) => row.account_id, {
            id: 'accountId',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Account Id
                </Typography>
            ),
            cell: (info) => (
                <Tooltip title={info.getValue() ?? ''} placement="top" arrow>
                    <Typography
                        className="f-14"
                        color="textPrimary"
                        sx={{ width: 100, ml: 2 }}
                        noWrap
                    >
                        {info.getValue() ? info.getValue() : '-'}
                    </Typography>
                </Tooltip>
            ),
        }),

        columnHelper.accessor((row) => row.phone, {
            id: 'phone',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Phone
                </Typography>
            ),
            cell: (info) => {
                const user = info.row.original;

                return (
                    <Typography className="f-14" color="textPrimary">
                        {user.extension ?? '0'}{info.getValue() ?? '-'}
                    </Typography>
                )
            },
        }),

        columnHelper.accessor((row) => row.permissions, {
            id: 'permissions',
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
                        onClick={isAdmin ? () => handleOpenPermissionsDrawer(user) : undefined}
                        label={user.permission_count === 0 ? 'Select' : `${user.permission_count} Permissions`}
                        sx={{
                            backgroundColor: (theme) => theme.palette.primary.light,
                            color: (theme) => theme.palette.primary.main,
                            fontWeight: 500,
                            borderRadius: '10px',
                            px: 1.5,
                            cursor: isAdmin ? 'pointer' : 'not-allowed',
                            opacity: isAdmin ? 1 : 0.6,
                        }}
                        {...(!isAdmin && {
                            onMouseEnter: undefined,
                            onMouseLeave: undefined,
                        })}
                    />
                );
            },
        }),

        columnHelper.accessor((row) => row.is_invited, {
            id: 'isInvited',
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
                            ? 'Not logged in'
                            : (formatDate(row.logged_in_at) ?? '-')}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.joining_date, {
            id: 'joiningDate',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Joining on
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography className="f-14" color="textPrimary">
                        {row.joining_date ? formatDate(row.joining_date) : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.cis, {
            id: 'cis',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    CIS
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography className="f-14" color="textPrimary" sx={{ ml: 2 }}>
                        {row.cis ? row.cis : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.bank_name, {
            id: 'bankName',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Bank Name
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography className="f-14" color="textPrimary" sx={{ ml: 2 }}>
                        {row.bank_name ? row.bank_name : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.account_no, {
            id: 'accountNo',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Account No
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography
                        className="f-14"
                        color="textPrimary"
                        sx={{ width: 100, ml: 2 }}
                        noWrap
                    >
                        {row.account_no ? row.account_no : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.short_code, {
            id: 'shortCode',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Short Code
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography className="f-14" color="textPrimary" sx={{ ml: 2 }}>
                        {row.short_code ? row.short_code : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.address, {
            id: 'address',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Address
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Tooltip title={info.getValue() ?? ''} placement="top" arrow>
                        <Typography
                            className="f-14"
                            color="textPrimary"
                            sx={{ width: 150, ml: 2 }}
                            noWrap
                        >
                            {info.getValue() ?? '-'}
                        </Typography>
                    </Tooltip>
                );
            },
        }),

        columnHelper.accessor((row) => row.nin_number, {
            id: 'ninNumber',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Nin Number
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography className="f-14" color="textPrimary" sx={{ ml: 2 }}>
                        {row.nin_number ? row.nin_number : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row.utr_number, {
            id: 'utrNumber',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    Utr Number
                </Typography>
            ),
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Typography className="f-14" color="textPrimary" sx={{ ml: 2 }}>
                        {row.utr_number ? row.utr_number : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row?.is_working, {
            id: 'status',
            header: () => 'Status',
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
                                borderRadius: '6px',
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
                                borderRadius: '6px',
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
                                {dayjs(lastWorkedDate).format('DD/MM/YYYY')}
                            </Typography>
                        )}
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

    useEffect(() => {
        const savedVisibility = Cookies.get('columnVisibility')
            ? JSON.parse(Cookies.get('columnVisibility')!)
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
        const eligibleColumns = table
            .getAllLeafColumns()
            .filter((col) => col.id !== 'conflicts');

        const allSelected = eligibleColumns.every((col) => col.getIsVisible());

        const visibleCount = eligibleColumns.filter((col) =>
            col.getIsVisible(),
        ).length;

        setSelectAll(allSelected);
        setVisibleColumnsCount(visibleCount);
    }, [table.getState().columnVisibility]);

    const handleSelectAllChange = (e: any) => {
        const checked = e.target.checked;
        setSelectAll(checked);

        const newVisibility: Record<string, boolean> = {};

        table.getAllLeafColumns().forEach((col) => {
            if (col.id !== 'conflicts') {
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
            },
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

    const visibleColumns = table
        .getAllLeafColumns()
        .filter((col) => col.id !== 'conflicts' && col.getIsVisible());
    const columnData = visibleColumns.length ? visibleColumns : columns;
    const simpleColumns = columnData.map((column: any) => ({
        name: column.id ?? 'Unnamed Column',
        width: 'auto',
    }));

    return (
        <PermissionGuard permission="Users">
            <Box
                sx={{
                    height: 'calc(100vh - 100px)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Stack
                    mr={2}
                    ml={2}
                    mb={2}
                    justifyContent="space-between"
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1, sm: 2, md: 4 }}
                >
                    <Grid display="flex" gap={1} alignItems={'center'}>
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
                                            <IconSearch size={'16'} />
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
                            sx={{ m: 0, position: 'relative', overflow: 'visible' }}
                        >
                            Filters
                            <IconButton
                                aria-label="close"
                                onClick={() => setOpen(false)}
                                size="large"
                                sx={{
                                    position: 'absolute',
                                    right: 12,
                                    top: 8,
                                    color: (theme) => theme.palette.grey[900],
                                    backgroundColor: 'transparent',
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
                                <TextField
                                    select
                                    label="Trade"
                                    value={tempFilters.trade}
                                    onChange={(e) =>
                                        setTempFilters({ ...tempFilters, trade: e.target.value })
                                    }
                                >
                                    <MenuItem value="All">All</MenuItem>
                                    {uniqueTrades.map((team) => (
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
                                        <MenuItem value="All">All</MenuItem>
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
                                    setTempFilters({ team: '', supervisor: '', trade: '' });
                                    setFilters({ team: '', supervisor: '', trade: '' });
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
                    <Stack direction={'row-reverse'} mb={1} mr={1}>
                        <IconButton
                            sx={{ margin: '0px' }}
                            id="basic-button"
                            aria-controls={openMenu ? 'basic-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={openMenu ? 'true' : undefined}
                            onClick={handleClick}
                        >
                            <IconDotsVertical width={18} />
                        </IconButton>

                        <IconButton
                            onClick={handlePopoverOpen}
                            sx={{ ml: 1 }}
                            color="primary"
                        >
                            <IconEye />
                        </IconButton>
                        <Popover
                            open={Boolean(anchorEl2)}
                            anchorEl={anchorEl2}
                            onClose={handlePopoverClose}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
                                            sx={{ textTransform: 'none' }}
                                        />
                                    }
                                    label="Select All"
                                />
                                {table
                                    .getAllLeafColumns()
                                    .filter((col) => {
                                        const excludedColumns = ['conflicts', 'select'];
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
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                            }
                                            sx={{ textTransform: 'none' }}
                                            label={
                                                typeof col.columnDef.header === 'string' &&
                                                    col.columnDef.header.trim() !== ''
                                                    ? col.columnDef.header
                                                    : col.id
                                                        .replace(/([A-Z])/g, ' $1')
                                                        .replace(/^./, (str) => str.toUpperCase())
                                                        .trim()
                                            }
                                        />
                                    ))}
                            </FormGroup>
                        </Popover>
                        {isAdmin && selectedRowIds.size > 0 && (
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

                        {selectedRowIds.size > 0 && (
                            <>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{
                                        px: 2,
                                        ml: 2,
                                        '&:hover': {
                                            backgroundColor: 'transparent',
                                            borderColor: 'inherit',
                                            boxShadow: 'none',
                                            color: '#1e4db7',
                                        },
                                    }}
                                    onClick={handleExportClick}
                                    endIcon={
                                        openModel ? (
                                            <IconChevronUp size={20} />
                                        ) : (
                                            <IconChevronDown size={20} />
                                        )
                                    }
                                >
                                    <Typography sx={{ fontWeight: 600 }}>Export</Typography>
                                </Button>
                                <Menu
                                    anchorEl={anchorEl3}
                                    open={openModel}
                                    onClose={() => handleExportClose('')}
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'right',
                                    }}
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                >
                                    <MenuItem onClick={() => handleExportClose('excel')}>
                                        Excel
                                    </MenuItem>
                                    <MenuItem onClick={() => handleExportClose('pdf')}>
                                        PDF
                                    </MenuItem>
                                </Menu>
                            </>
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
                                    'aria-labelledby': 'basic-button',
                                },
                            }}
                        >
                            <MenuItem onClick={handleClose}>
                                <Link
                                    color="body1"
                                    href="/apps/users/archive"
                                    style={{
                                        width: '100%',
                                        color: '#11142D',
                                        textTransform: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyItems: 'center',
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
                        width: 450,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: 450,
                            padding: 2,
                            backgroundColor: '#f9f9f9',
                            display: 'flex',
                            flexDirection: 'column',
                        },
                    }}
                >
                    <Box display="flex" flexDirection="column" height="100%" sx={{ overflow: 'hidden' }}>
                        {/* Drawer Header */}
                        <Box
                            display="flex"
                            alignContent="center"
                            alignItems="center"
                            flexWrap="wrap"
                            sx={{ mb: 2, flexShrink: 0 }}
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
                                    position: 'absolute',
                                    right: 8,
                                    top: 8,
                                    color: (theme) => theme.palette.grey[900],
                                    backgroundColor: 'transparent',
                                    zIndex: 10,
                                    width: 50,
                                    height: 50,
                                }}
                            >
                                <IconX size={18} />
                            </IconButton>
                        </Box>

                        {/* Search */}
                        <Box sx={{ mb: 2, flexShrink: 0 }}>
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

                        {/* Scrollable Content */}
                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                width: '100%',
                                pr: 1.5,
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: 'transparent',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: '#ccc',
                                    borderRadius: '4px',
                                    '&:hover': {
                                        background: '#999',
                                    },
                                },
                            }}
                        >
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    tableLayout: 'fixed',
                                }}
                            >
                                <colgroup>
                                    <col style={{ width: 'auto' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '120px' }} />
                                </colgroup>

                                <thead>
                                {/* ── Header row ── */}
                                <tr style={{ position: 'sticky', top: 0, backgroundColor: '#f9f9f9', zIndex: 1 }}>
                                    <th style={{ padding: '6px 8px', textAlign: 'left' }} />
                                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Web
                                        </Typography>
                                    </th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            App
                                        </Typography>
                                    </th>
                                </tr>

                                <tr
                                    style={{borderRadius: 4}}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f9f9f9')}
                                >
                                    <td style={{ padding: '8px 8px' }}>
                                        <Typography fontWeight={500}>Select All</Typography>
                                    </td>
                                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                        <IOSSwitch
                                            checked={allWebSelected}
                                            onChange={() => handleSelectAll('web')}
                                            disabled={loading || !isPermission}
                                        />
                                    </td>
                                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                        <IOSSwitch
                                            checked={allAppSelected}
                                            onChange={() => handleSelectAll('app')}
                                            disabled={loading || !isPermission}
                                        />
                                    </td>
                                </tr>
                                </thead>

                                {/* ── Permission rows ── */}
                                <tbody>
                                {filteredPermissions.map((permission) => (
                                    <tr
                                        key={permission.id}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        {/* Name cell */}
                                        <td style={{ padding: '8px 8px' }}>
                                            <Typography>{permission.name}</Typography>
                                        </td>

                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                            {permission.is_web !== false && (
                                                <IOSSwitch
                                                    checked={tempPermissions.web.has(permission.id)}
                                                    onChange={() =>
                                                        handlePermissionToggle(permission.id, 'web')
                                                    }
                                                    disabled={loading || !isPermission}
                                                />
                                            )}
                                        </td>

                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                            {permission.is_app !== false && (
                                                <IOSSwitch
                                                    checked={tempPermissions.app.has(permission.id)}
                                                    onChange={() =>
                                                        handlePermissionToggle(permission.id, 'app')
                                                    }
                                                    disabled={loading || !isPermission}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </Box>

                        {/* Save/Cancel Buttons */}
                        {isPermission && (
                            <Box
                                mb={1}
                                display="flex"
                                justifyContent="flex-start"
                                gap={2}
                                sx={{
                                    flexShrink: 0,
                                    paddingTop: 2,
                                }}
                            >
                                <Button
                                    color="primary"
                                    variant="contained"
                                    size="large"
                                    onClick={handleSavePermissions}
                                    className='drawer_buttons'
                                    sx={{ borderRadius: 3 }}
                                >
                                    Save
                                </Button>
                                <Button
                                    color="inherit"
                                    onClick={() => setPermissionsDrawerOpen(false)}
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        backgroundColor: "transparent",
                                        borderRadius: 3,
                                        color: "GrayText",
                                    }}
                                >
                                    Cancel
                                </Button>
                            </Box>
                        )}
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
                                const supervisorsToReplace = data.filter((u: any) => usersToDelete.includes(u.id) && u.supervisor_team_id);
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
                                        user_ids: usersToDelete.join(','),
                                        company_id: user.company_id,
                                    };
                                    const response = await api.post(
                                        'user/archive-user',
                                        payload,
                                    );
                                    toast.success(response.data.message);
                                    setSelectedRowIds(new Set());
                                    await fetchUsers();
                                } catch (error) {
                                    console.error('Failed to archive users', error);
                                } finally {
                                    setConfirmOpen(false);
                                }
                            }}
                            variant="outlined"
                            color="primary"
                        >
                            Archive
                        </Button>
                        {/*<Button*/}
                        {/*    onClick={async () => {*/}
                        {/*        try {*/}
                        {/*            const payload = {*/}
                        {/*                user_ids: usersToDelete.join(','),*/}
                        {/*                company_id: user.company_id,*/}
                        {/*            };*/}
                        {/*            const response = await api.post(*/}
                        {/*                'user/remove-account',*/}
                        {/*                payload,*/}
                        {/*            );*/}
                        {/*            toast.success(response.data.message);*/}
                        {/*            setSelectedRowIds(new Set());*/}
                        {/*            await fetchUsers();*/}
                        {/*        } catch (error) {*/}
                        {/*            console.error('Failed to remove users', error);*/}
                        {/*        } finally {*/}
                        {/*            setConfirmOpen(false);*/}
                        {/*        }*/}
                        {/*    }}*/}
                        {/*    variant="outlined"*/}
                        {/*    color="error"*/}
                        {/*>*/}
                        {/*    Delete User*/}
                        {/*</Button>*/}
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
                            The user you are archiving is currently the supervisor of <strong>{supervisorDetails?.team_name || 'a team'}</strong>. Please assign a new supervisor for this team before archiving.
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
                            {data.filter((u: any) => !usersToDelete.includes(u.id) && u.is_archive !== 1).map((u: any) => (
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
                                        user_ids: usersToDelete.join(','),
                                        company_id: user.company_id,
                                        supervisor_id: newSupervisorId,
                                        supervisor_team_id: supervisorDetails?.team_id,
                                    };
                                    const response = await api.post(
                                        'user/archive-user',
                                        payload,
                                    );
                                    toast.success(response.data.message);
                                    setSelectedRowIds(new Set());
                                    setSupervisorReplacementOpen(false);
                                    setNewSupervisorId('');
                                    await fetchUsers();
                                } catch (error) {
                                    console.error('Failed to archive users with new supervisor', error);
                                }
                            }}
                            variant="contained"
                            color="primary"
                        >
                            Confirm & Archive
                        </Button>
                    </DialogActions>
                </Dialog>

                <TableContainer
                    ref={tableContainerRef}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'auto',
                        overflowY: 'auto',
                    }}
                >
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const isActive = header.column.getIsSorted();
                                        const isAsc = header.column.getIsSorted() === 'asc';
                                        const isSortable = header.column.getCanSort();

                                        return (
                                            <TableCell
                                                key={header.id}
                                                align="center"
                                                sx={{
                                                    paddingTop: '10px',
                                                    paddingBottom: '10px',
                                                    width:
                                                        header.column.id === 'actions'
                                                            ? 120
                                                            : header.column.id === 'select'
                                                                ? 30
                                                                : 'auto',
                                                }}
                                            >
                                                <Box
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    p={0}
                                                    sx={{
                                                        cursor: isSortable ? 'pointer' : 'default',
                                                        border: '2px solid transparent',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        justifyContent: 'flex-start',
                                                        '&:hover': { color: '#888' },
                                                        '&:hover .hoverIcon': { opacity: 1 },
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {isSortable && (
                                                        <Box
                                                            component="span"
                                                            className="hoverIcon"
                                                            ml={0.5}
                                                            sx={{
                                                                transition: 'opacity 0.2s',
                                                                opacity: isActive ? 1 : 0,
                                                                fontSize: '0.9rem',
                                                                color: isActive ? '#000' : '#888',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                            }}
                                                        >
                                                            {isActive ? (isAsc ? '↑' : '↓') : '↑'}
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
                                    rowCount={visibleColumnsCount}
                                />
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: 'calc(50vh - 100px)',
                                            }}
                                        >
                                            <Image
                                                src="/images/no-data.png"
                                                alt="No data"
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100%',
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
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                        }}
                                        key={row.id}
                                        onMouseEnter={() => setHoveredRow(row.original.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} sx={{ padding: '10px' }}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                            {data.length ? <><Divider /></> : <></>}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider />
                <Box
                    sx={{
                        position: hasHorizontalScrollbar ? 'sticky' : 'static',
                        bottom: hasHorizontalScrollbar ? 0 : 'auto',
                        zIndex: 1,
                        padding: '10px',
                    }}
                >
                    <Stack
                        gap={1}
                        pr={3}
                        pl={3}
                        alignItems="center"
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography color="textSecondary" className="f-14">
                                {table.getPrePaginationRowModel().rows.length} Rows
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                display: { xs: 'block', sm: 'flex' },
                                alignItems: 'center',
                            }}
                        >
                            <Stack direction="row" alignItems="center">
                                <Typography color="textSecondary" className="f-14">
                                    Page
                                </Typography>
                                <Typography
                                    color="textSecondary"
                                    className="f-14"
                                    fontWeight={600}
                                    ml={1}
                                >
                                    {table.getState().pagination.pageIndex + 1} of{' '}
                                    {table.getPageCount()}
                                </Typography>
                                <Typography color="textSecondary" ml={'3px'} className="f-14">
                                    {' '}
                                    | Entries :{' '}
                                </Typography>
                            </Stack>
                            <Stack
                                ml={'5px'}
                                direction="row"
                                alignItems="center"
                                color="textSecondary"
                            >
                                <CustomSelect
                                    className="custom-select"
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
                                    sx={{ width: '30px' }}
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    <IconChevronLeft />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{ width: '30px' }}
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    <IconChevronRight />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
                <Divider />

                <Drawer
                    anchor="right"
                    open={inviteUser}
                    onClose={() => setInviteUser(false)}
                    sx={{
                        width: 500,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: 500,
                            padding: 2,
                            backgroundColor: '#f9f9f9',
                        },
                    }}
                >
                    <Box display="flex" flexDirection="column" height="100%">
                        <Box
                            display={'flex'}
                            alignContent={'center'}
                            alignItems={'center'}
                            flexWrap={'wrap'}
                        >
                            <IconButton onClick={closeInviteDrawer} sx={{ p: 0 }}>
                                <IconArrowLeft />
                            </IconButton>
                            <Typography variant="h6" fontWeight={700}>
                                Invite User
                            </Typography>
                            <IconButton
                                aria-label="close"
                                onClick={closeInviteDrawer}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 8,
                                    color: (theme) => theme.palette.grey[900],
                                    backgroundColor: 'transparent',
                                    zIndex: 10,
                                    width: 50,
                                    height: 50,
                                }}
                            >
                                <IconX size={18} />
                            </IconButton>
                        </Box>
                        <Box height={'100%'}>
                            <form onSubmit={handleRegister} className="address-form">
                                <Grid container spacing={2} mt={1}>
                                    <Grid size={{ lg: 12, xs: 12 }}>
                                        <Typography variant="body2" mt={2}>
                                            First Name
                                        </Typography>
                                        <CustomTextField
                                            id="first_name"
                                            variant="outlined"
                                            className="custom_input"
                                            fullWidth
                                            value={firstName}
                                            onChange={(e: {
                                                target: { value: SetStateAction<string> };
                                            }) => setfirstName(e.target.value)}
                                        />
                                        <Typography variant="body2" mt={2}>
                                            Last Name
                                        </Typography>
                                        <CustomTextField
                                            id="last_name"
                                            variant="outlined"
                                            className="custom_input"
                                            fullWidth
                                            value={lastName}
                                            onChange={(e: {
                                                target: { value: SetStateAction<string> };
                                            }) => setlastName(e.target.value)}
                                        />
                                        <Typography variant="body2" mt={2}>
                                            Email Address
                                        </Typography>
                                        <CustomTextField
                                            id="email"
                                            variant="outlined"
                                            className="custom_input"
                                            fullWidth
                                            value={email}
                                            sx={{ mb: 2 }}
                                            onChange={(e: {
                                                target: { value: SetStateAction<string> };
                                            }) => setEmail(e.target.value)}
                                        />
                                        <PhoneInput
                                            country={'gb'}
                                            value={phone}
                                            // inputClass="form_inputs"
                                            onChange={(value, country: any) => {
                                                setPhone(value);
                                                setExtension('+' + country.dialCode);
                                                const numberOnly = value.replace(country.dialCode, '');
                                                setNationalPhone(numberOnly);
                                            }}
                                            inputStyle={{ width: '100%', height: '47px', backgroundColor: 'transparent', borderColor: "#c0d1dc9c", }}
                                            enableSearch
                                            inputProps={{ required: true }}
                                        />
                                        <Typography variant="body2" mt={2}>
                                            Select Teams
                                        </Typography>
                                        <Autocomplete
                                            fullWidth
                                            id="team_id"
                                            options={teams}
                                            value={
                                                teams.find((p: any) => p.id === selectedTeam.id) || null
                                            }
                                            onChange={(event, newValue) => {
                                                setSelectedTeam(newValue);
                                            }}
                                            getOptionLabel={(option) => option?.name || ''}
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
                                        <Typography variant="body2" mt={2}>
                                            Select Trades
                                        </Typography>
                                        <Autocomplete
                                            fullWidth
                                            id="trade_id"
                                            options={trade}
                                            value={
                                                trade.find((p: any) => p.id === selectedTrade.id) ||
                                                null
                                            }
                                            onChange={(event, newValue) => {
                                                setSelectedTrade(newValue);
                                            }}
                                            getOptionLabel={(option) => option?.name || ''}
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
                                                backgroundColor: 'transparent',
                                                borderRadius: 3,
                                                color: 'GrayText',
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
