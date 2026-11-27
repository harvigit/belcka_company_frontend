'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Skeleton,
    Stack,
    Typography,
    TextField,
    Tooltip,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';

import {
    IconAlertTriangle,
    IconBeach,
    IconCircleCheck,
    IconLayoutList,
    IconBriefcase,
    IconCalendarEvent,
    IconClockPlus,
    IconCoin,
    IconCreditCard,
    IconEdit,
    IconEye,
    IconInfoCircle,
    IconLink,
    IconSearch,
    IconShieldCheck,
    IconUser,
    IconUsersGroup,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import { useSession } from 'next-auth/react';
import { User } from "next-auth";
import PermissionGuard from '@/app/auth/PermissionGuard';
import { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Every request type an admin can give view / approve permission for.
// `name` is what admins see; `slug` is the key the backend and mobile app use, so it never changes.
const REQUEST_TYPES = [
    {
        name: 'Timesheet changes',
        description: 'A user adds or edits hours, pricework or adjustments on a timesheet',
        slug: 'timesheet_request',
        group: 'time',
        icon: IconClockPlus,
    },
    // Editing hours directly (no request), Lock, Unlock, Paid and Delete on Time Clock are managed in
    // Time Clock → Settings → Bookkeeper Setting.
    {
        name: 'Leave',
        description: 'A user applies for leave or changes a leave',
        slug: 'leave_request',
        group: 'time',
        icon: IconBeach,
    },
    {
        name: 'Bank & billing details',
        description: 'A user changes their bank or billing details',
        slug: 'billing_info_request',
        group: 'user',
        icon: IconCreditCard,
    },
    {
        name: 'Pay rate change',
        description: "A change to a user's pay rate",
        slug: 'rate_request',
        group: 'user',
        icon: IconCoin,
    },
    // Penalties and penalty appeals are one type; the old `penalty_request` setting is no longer offered.
    {
        name: 'Penalties & appeals',
        description: 'Penalties on timesheets and appeals against them',
        slug: 'penalty_appeal_request',
        group: 'penalty',
        icon: IconAlertTriangle,
    },
    {
        name: 'Team size increase',
        description: "A request to raise a team's member limit",
        slug: 'team_cap_request',
        group: 'limits',
        icon: IconUsersGroup,
    },
    {
        name: 'Project capacity change',
        description: "A request to change a project's capacity limit",
        slug: 'project_cap_request',
        group: 'limits',
        icon: IconBriefcase,
    },
    {
        name: 'Weekend work',
        description: 'A request to let workers work on a project on Saturday or Sunday',
        slug: 'project_weekend_work_request',
        group: 'limits',
        icon: IconCalendarEvent,
    },
];

// Sections on the "By request type" view, in this order.
const REQUEST_GROUPS = [
    { key: 'time', label: 'Time & leave' },
    { key: 'user', label: 'User details' },
    { key: 'penalty', label: 'Penalties' },
    { key: 'limits', label: 'Limits' },
];

const LIST_COLUMNS = { xs: '1fr', md: 'minmax(260px, 1.3fr) minmax(200px, 1fr) minmax(160px, 0.8fr) 48px' };

// Avatars shown before "+N" in the Approvers / Viewers columns.
const MAX_AVATARS = 4;

const getInitials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

export interface RequestAction {
    id: number;
    request_name: string;
    slug: string;
    /** Users who can approve / reject (they can view too) */
    selected_users: string;
    /** Users who can only view */
    view_users: string;
    /** Set when the type still uses another type's users (no setting of its own yet) */
    inherited_from: string | null;
    created_at: string;
    updated_at: string;
    company_id: number | null;
}

interface RequestRow {
    request_name: string;
    slug: string;
    saved: RequestAction | null;
}

export interface UserData {
    id: number;
    name: string;
    email: string;
    user_image: string;
    can_approve: boolean;
    can_reject: boolean;
}

const toNumber = (value: unknown): number | null => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const parseSelectedUserIds = (selectedUsers: unknown): number[] => {
    if (Array.isArray(selectedUsers)) {
        return selectedUsers
            .map((value) => toNumber(value))
            .filter((id): id is number => id !== null);
    }

    if (selectedUsers === null || selectedUsers === undefined) return [];

    if (typeof selectedUsers === 'number') {
        return Number.isFinite(selectedUsers) ? [selectedUsers] : [];
    }

    if (typeof selectedUsers !== 'string') return [];

    const trimmed = selectedUsers.trim();
    if (!trimmed) return [];

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed
                .map((value) => toNumber(value))
                .filter((id): id is number => id !== null);
        }
        const parsedNumber = toNumber(parsed);
        return parsedNumber === null ? [] : [parsedNumber];
    } catch {
        return trimmed
            .split(',')
            .map((id) => toNumber(id.trim()))
            .filter((id): id is number => id !== null);
    }
};

const RequestActionList = () => {
    const [savedData, setSavedData] = useState<RequestAction[]>([]);
    const [fetchLoading, setFetchLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    // "type" lists request types with their users; "user" lists users with their access per type.
    const [viewMode, setViewMode] = useState<'type' | 'user'>('type');

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<RequestRow | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    // view_users = everyone who can view (approve users included); selected_users = who can approve / reject
    const [editFormData, setEditFormData] = useState({
        request_name: '',
        slug: '',
        view_users: [] as number[],
        selected_users: [] as number[],
    });
    const [searchFilter, setSearchFilter] = useState('');
    // Users when the dialog opened, to know whether anything changed.
    const [initialFormUsers, setInitialFormUsers] = useState({ view_users: [] as number[], selected_users: [] as number[] });

    const [users, setUsers] = useState<UserData[]>([]);

    const session = useSession();
    const user = session.data?.user as User & { id: number } & { company_id?: string | null } & { user_role_id: number };

    // Fetch saved request actions
    const fetchSavedData = async () => {
        setFetchLoading(true);
        try {
            const res: AxiosResponse<any> = await api.get('request-action/list');
            if (res.data) {
                const data = res.data.info || res.data;
                // Normalize API response variants (`request_slug`, `user_ids`, legacy fields)
                const normalizedData: RequestAction[] = Array.isArray(data)
                    ? data.map((item: any) => {
                        const slug = String(item.slug ?? item.request_slug ?? '').trim();
                        const requestType = REQUEST_TYPES.find((type) => type.slug === slug);
                        const selectedUsers = item.selected_users ?? item.user_ids ?? '';
                        const selectedUsersString = Array.isArray(selectedUsers)
                            ? selectedUsers.join(',')
                            : String(selectedUsers);
                        const viewUsers = item.view_user_ids ?? '';

                        return {
                            ...item,
                            id: toNumber(item.id) ?? 0,
                            company_id: toNumber(item.company_id),
                            slug,
                            request_name: item.request_name ?? requestType?.name ?? slug,
                            selected_users: selectedUsersString,
                            view_users: Array.isArray(viewUsers) ? viewUsers.join(',') : String(viewUsers),
                            inherited_from: item.inherited_from ?? null,
                        };
                    })
                    : [];
                setSavedData(normalizedData);
            }
        } catch (err) {
            console.error('Failed to fetch request actions', err);
            toast.error('Failed to load request actions');
        }
        setFetchLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get(`user/list`, {
                params: { company_id: user.company_id },
            });
            if (res.data?.IsSuccess) {
                const rawUsers = res.data.info || [];
                const normalized: UserData[] = rawUsers
                    .map((u: any) => {
                        const userId = toNumber(u.id);
                        if (userId === null) return null;

                        return {
                            ...u,
                            id: userId,
                            name: u.name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
                        };
                    })
                    .filter((u: UserData | null): u is UserData => u !== null);
                setUsers(normalized);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    useEffect(() => {
        fetchSavedData();
        fetchUsers();
    }, [user?.company_id, user?.id]);

    const usersById = useMemo(() => {
        return new Map(users.map((u) => [u.id, u.name]));
    }, [users]);

    const userDetailsById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

    // Get display names for selected users
    const getSelectedUserNames = (selectedIds: number[] | string) => {
        const ids = Array.isArray(selectedIds) ? selectedIds : parseSelectedUserIds(selectedIds);
        return ids
            .map((id) => usersById.get(id))
            .filter(Boolean)
            .join(', ');
    };

    const mergedRows = useMemo((): RequestRow[] => {
        return REQUEST_TYPES.map((type) => ({
            request_name: type.name,
            slug: type.slug,
            saved: savedData.find(
                (d) =>
                    d?.slug?.trim().toLowerCase() === type.slug.trim().toLowerCase() ||
                    d?.request_name?.trim().toLowerCase() === type.name.trim().toLowerCase(),
            ) ?? null,
        }));
    }, [savedData]);

    const filteredRows = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return mergedRows;
        return mergedRows.filter(
            (row) =>
                row.request_name.toLowerCase().includes(s) ||
                getSelectedUserNames(row.saved?.selected_users ?? '').toLowerCase().includes(s) ||
                getSelectedUserNames(row.saved?.view_users ?? '').toLowerCase().includes(s)
        );
    }, [mergedRows, searchTerm, usersById]);


    const handleEditClick = (row: RequestRow) => {
        setEditingRow(row);
        setSearchFilter('');
        const approveUserIds = parseSelectedUserIds(row.saved?.selected_users);
        const viewOnlyUserIds = parseSelectedUserIds(row.saved?.view_users);

        const viewUsers = [...new Set([...approveUserIds, ...viewOnlyUserIds])];
        setEditFormData({
            request_name: row.request_name,
            slug: row.slug,
            view_users: viewUsers,
            selected_users: approveUserIds,
        });
        setInitialFormUsers({ view_users: viewUsers, selected_users: approveUserIds });
        setEditDialogOpen(true);
    };

    // Approve / Reject always comes with View; removing View removes Approve / Reject too.
    const toggleView = (userId: number) => {
        setEditFormData((prev) => {
            const canView = prev.view_users.includes(userId);
            return {
                ...prev,
                view_users: canView ? prev.view_users.filter((id) => id !== userId) : [...prev.view_users, userId],
                selected_users: canView ? prev.selected_users.filter((id) => id !== userId) : prev.selected_users,
            };
        });
    };

    const toggleApprove = (userId: number) => {
        setEditFormData((prev) => {
            const canApprove = prev.selected_users.includes(userId);
            return {
                ...prev,
                selected_users: canApprove
                    ? prev.selected_users.filter((id) => id !== userId)
                    : [...prev.selected_users, userId],
                view_users: canApprove || prev.view_users.includes(userId) ? prev.view_users : [...prev.view_users, userId],
            };
        });
    };

    const savedId = editingRow?.saved?.inherited_from ? 0 : editingRow?.saved?.id ?? 0;
    const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((id) => b.includes(id));
    // Saving without a change would only turn an inherited type into its own setting, so it is not allowed.
    const hasChanges =
        !sameIds(editFormData.view_users, initialFormUsers.view_users) ||
        !sameIds(editFormData.selected_users, initialFormUsers.selected_users);
    // A type without its own setting needs at least one user; a saved setting can be cleared.
    const canSave = hasChanges && (editFormData.view_users.length > 0 || savedId > 0);

    // (b) Inheritance notes for the dialog.
    const editingInheritedFrom = editingRow?.saved?.inherited_from
        ? REQUEST_TYPES.find((type) => type.slug === editingRow.saved?.inherited_from)?.name ?? null
        : null;
    const editingFollowers = editingRow
        ? REQUEST_TYPES.filter((type) =>
              savedData.some((d) => d.slug === type.slug && d.inherited_from === editingRow.slug),
          ).map((type) => type.name)
        : [];

    const handleSaveEdit = async () => {
        if (!canSave) {
            toast.error('Please select at least one user');
            return;
        }

        setEditLoading(true);
        try {
            if (editFormData.view_users.length === 0) {
                // No users left: only admins handle this request type.
                await api.delete(`request-action/${savedId}`);
            } else {
                const payload = {
                    request_slug: editFormData.slug,
                    selected_users: editFormData.selected_users.join(','),
                    view_users: editFormData.view_users.join(','),
                };

                if (savedId) {
                    await api.put(`request-action/edit/${savedId}`, payload);
                } else {
                    await api.post('request-action/create', payload);
                }
            }

            toast.success('Request settings updated successfully!');
            setEditDialogOpen(false);
            setSearchFilter('');
            fetchSavedData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
        }
        setEditLoading(false);
    };

    // Filter users based on search input
    const filteredUsers = useMemo(() => {
        if (!searchFilter.trim()) return users;

        const query = searchFilter.toLowerCase();
        return users.filter((user) =>
            user.name.toLowerCase().includes(query)
        );
    }, [users, searchFilter]);

    // Avatars (up to MAX_AVATARS, then "+N"); hover shows every name. `dim` marks users
    // that come from another request type (not saved for this one yet).
    const renderUsers = (ids: number[], tone: 'approve' | 'view', dim = false) => {
        const people = ids
            .map((id) => userDetailsById.get(id))
            .filter((u): u is UserData => Boolean(u));

        if (people.length === 0) {
            return tone === 'approve' ? (
                <Tooltip arrow title="No approvers picked, so only admins can see and approve these requests.">
                    <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        sx={{
                            width: 'fit-content',
                            px: 1,
                            py: 0.25,
                            borderRadius: 5,
                            bgcolor: 'grey.100',
                            color: 'text.secondary',
                        }}
                    >
                        <IconShieldCheck size={14} />
                        <Typography variant="caption" fontWeight={600} color="inherit">
                            Only admins
                        </Typography>
                    </Stack>
                </Tooltip>
            ) : (
                <Tooltip arrow title="No viewers. Approvers can already see these requests, so add viewers only for people who should just watch.">
                    <Typography variant="body2" color="text.disabled" sx={{ width: 'fit-content' }}>
                        —
                    </Typography>
                </Tooltip>
            );
        }

        const shown = people.slice(0, MAX_AVATARS);
        const extra = people.length - shown.length;
        return (
            <Tooltip
                arrow
                placement="top-start"
                title={
                    <Box sx={{ py: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                            {tone === 'approve' ? 'Approvers' : 'Viewers'} ({people.length})
                        </Typography>
                        {people.map((person) => (
                            <Typography key={person.id} variant="caption" display="block">
                                {person.name}
                            </Typography>
                        ))}
                    </Box>
                }
            >
                <Stack direction="row" alignItems="center" sx={{ width: 'fit-content', opacity: dim ? 0.55 : 1 }}>
                    {shown.map((person, index) => (
                        <Avatar
                            key={person.id}
                            src={person.user_image || undefined}
                            alt={person.name}
                            sx={{
                                width: 30,
                                height: 30,
                                fontSize: 12,
                                fontWeight: 600,
                                ml: index === 0 ? 0 : -0.75,
                                border: '2px solid',
                                borderColor: 'background.paper',
                                bgcolor: 'primary.light',
                                color: 'primary.main',
                            }}
                        >
                            {getInitials(person.name)}
                        </Avatar>
                    ))}
                    {extra > 0 && (
                        <Avatar
                            sx={{
                                width: 30,
                                height: 30,
                                fontSize: 11,
                                fontWeight: 700,
                                ml: -0.75,
                                border: '2px solid',
                                borderColor: 'background.paper',
                                bgcolor: 'grey.100',
                                color: 'text.secondary',
                            }}
                        >
                            +{extra}
                        </Avatar>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1.25 }} noWrap>
                        {people.length === 1 ? people[0].name : `${people.length} users`}
                    </Typography>
                </Stack>
            </Tooltip>
        );
    };

    // "By user": every user with access to at least one request type, and their access per type.
    const userAccessRows = useMemo(() => {
        const access = new Map<number, Record<string, 'approve' | 'view'>>();
        for (const row of mergedRows) {
            const approveIds = parseSelectedUserIds(row.saved?.selected_users);
            const viewIds = parseSelectedUserIds(row.saved?.view_users);
            for (const id of viewIds) {
                if (!access.has(id)) access.set(id, {});
                access.get(id)![row.slug] = 'view';
            }
            for (const id of approveIds) {
                if (!access.has(id)) access.set(id, {});
                access.get(id)![row.slug] = 'approve';
            }
        }
        const s = searchTerm.trim().toLowerCase();
        return [...access.entries()]
            .map(([id, perType]) => ({ user: userDetailsById.get(id), perType }))
            .filter((item): item is { user: UserData; perType: Record<string, 'approve' | 'view'> } => Boolean(item.user))
            .filter((item) => !s || item.user.name.toLowerCase().includes(s))
            .sort((x, y) => x.user.name.localeCompare(y.user.name));
    }, [mergedRows, userDetailsById, searchTerm]);

    const renderTypeRow = (row: RequestRow) => {
        const approveIds = parseSelectedUserIds(row.saved?.selected_users);
        const viewOnlyIds = parseSelectedUserIds(row.saved?.view_users).filter((id) => !approveIds.includes(id));
        const inheritedFrom = row.saved?.inherited_from
            ? REQUEST_TYPES.find((type) => type.slug === row.saved?.inherited_from)?.name
            : null;
        const requestType = REQUEST_TYPES.find((type) => type.slug === row.slug);
        const TypeIcon = requestType?.icon ?? IconInfoCircle;
        return (
            <Box
                key={row.slug}
                role="button"
                tabIndex={0}
                onClick={() => handleEditClick(row)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEditClick(row);
                    }
                }}
                sx={{
                    display: 'grid',
                    gridTemplateColumns: LIST_COLUMNS,
                    columnGap: 2,
                    rowGap: 1,
                    alignItems: 'center',
                    px: 2.5,
                    py: 1.25,
                    minHeight: 64,
                    cursor: 'pointer',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    transition: 'background-color 120ms',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                        }}
                    >
                        <TypeIcon size={18} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>
                            {row.request_name}
                        </Typography>
                        {requestType?.description && (
                            <Typography variant="caption" color="text.secondary" component="div">
                                {requestType.description}
                            </Typography>
                        )}
                        {inheritedFrom && (
                            <Tooltip arrow title={`Uses the ${inheritedFrom} users until you save this request type.`}>
                                <Stack
                                    direction="row"
                                    spacing={0.5}
                                    alignItems="center"
                                    sx={{
                                        mt: 0.5,
                                        px: 0.75,
                                        py: 0.125,
                                        borderRadius: 1,
                                        width: 'fit-content',
                                        bgcolor: 'grey.100',
                                        color: 'text.secondary',
                                    }}
                                >
                                    <IconLink size={12} />
                                    <Typography variant="caption" color="inherit" noWrap>
                                        Same users as {inheritedFrom}
                                    </Typography>
                                </Stack>
                            </Tooltip>
                        )}
                    </Box>
                </Stack>

                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
                        Approvers
                    </Typography>
                    {renderUsers(approveIds, 'approve', Boolean(inheritedFrom))}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
                        Viewers
                    </Typography>
                    {renderUsers(viewOnlyIds, 'view', Boolean(inheritedFrom))}
                </Box>

                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Tooltip arrow title={`Edit ${row.request_name}`}>
                        <IconButton
                            size="small"
                            color="primary"
                            aria-label={`Edit ${row.request_name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(row);
                            }}
                        >
                            <IconEdit size={18} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        );
    };

    const renderColumnHeader = (icon: React.ReactNode, label: string, help: string) => (
        <Tooltip arrow title={help}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: 'fit-content', cursor: 'help' }}>
                {icon}
                <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
                <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
            </Stack>
        </Tooltip>
    );

    // One cell on the "By user" view: approve, view or nothing. Clicking opens that type's editor.
    const renderAccessCell = (row: RequestRow, level: 'approve' | 'view' | undefined) => (
        <Tooltip
            key={row.slug}
            arrow
            title={`${row.request_name}: ${level === 'approve' ? 'can approve or reject' : level === 'view' ? 'can view only' : 'no access'}. Click to edit.`}
        >
            <Box
                role="button"
                tabIndex={0}
                onClick={() => handleEditClick(row)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEditClick(row);
                    }
                }}
                sx={{
                    height: '100%',
                    minHeight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    color: level === 'approve' ? 'primary.main' : level === 'view' ? 'text.secondary' : 'text.disabled',
                }}
            >
                {level === 'approve' ? <IconCircleCheck size={20} /> : level === 'view' ? <IconEye size={20} /> : '—'}
            </Box>
        </Tooltip>
    );

    return (
        <PermissionGuard permission="RequestActions">
            <Box px={1} sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* View switch + search */}
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    justifyContent="space-between"
                    sx={{ pt: 1 }}
                >
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={viewMode}
                        onChange={(_, value) => value && setViewMode(value)}
                        aria-label="View"
                        sx={{
                            '& .MuiToggleButton-root': { textTransform: 'none', gap: 0.75, px: 2, color: 'text.secondary' },
                            '& .Mui-selected': { bgcolor: 'primary.light', color: 'primary.main', fontWeight: 600 },
                            '& .Mui-selected:hover': { bgcolor: 'primary.light' },
                        }}
                    >
                        <ToggleButton value="type">
                            <IconLayoutList size={16} />
                            By request type
                        </ToggleButton>
                        <ToggleButton value="user">
                            <IconUser size={16} />
                            By user
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <TextField
                        size="small"
                        placeholder={viewMode === 'type' ? 'Search request or user' : 'Search user'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ minWidth: { md: 280 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={16} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Stack>

                <Paper
                    variant="outlined"
                    sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}
                >
                    {/* Who can do what */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={{ xs: 0.5, md: 3 }}
                        sx={{
                            px: 2.5,
                            py: 1,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            color: 'text.secondary',
                        }}
                    >
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <IconShieldCheck size={15} />
                            <Typography variant="caption"><b>Admin</b> always sees and approves everything</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <IconCircleCheck size={15} />
                            <Typography variant="caption"><b>Approver</b> sees, approves or rejects, and gets notified</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <IconEye size={15} />
                            <Typography variant="caption"><b>Viewer</b> sees and gets notified, but can&apos;t approve</Typography>
                        </Stack>
                    </Stack>

                    {viewMode === 'type' ? (
                        <>
                            {/* Column header */}
                            <Box
                                sx={{
                                    display: { xs: 'none', md: 'grid' },
                                    gridTemplateColumns: LIST_COLUMNS.md,
                                    columnGap: 2,
                                    px: 2.5,
                                    py: 1.25,
                                    bgcolor: 'grey.100',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={600}>Request type</Typography>
                                {renderColumnHeader(
                                    <Box sx={{ color: 'text.secondary', display: 'flex' }}><IconCircleCheck size={16} /></Box>,
                                    'Approvers',
                                    'See these requests, approve or reject them, and get notified.',
                                )}
                                {renderColumnHeader(
                                    <Box sx={{ color: 'text.secondary', display: 'flex' }}><IconEye size={16} /></Box>,
                                    'Viewers',
                                    'See these requests and get notified, but can’t approve or reject. Approvers don’t need to be added here.',
                                )}
                                <Box />
                            </Box>

                            {/* List body */}
                            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                                {fetchLoading ? (
                                    Array.from({ length: 6 }).map((_, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: LIST_COLUMNS,
                                                columnGap: 2,
                                                rowGap: 1,
                                                alignItems: 'center',
                                                px: 2.5,
                                                py: 1.5,
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Skeleton variant="rounded" width={36} height={36} />
                                                <Skeleton variant="text" width="60%" />
                                            </Stack>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Skeleton variant="circular" width={30} height={30} />
                                                <Skeleton variant="circular" width={30} height={30} />
                                                <Skeleton variant="circular" width={30} height={30} />
                                            </Stack>
                                            <Skeleton variant="text" width="30%" />
                                            <Box />
                                        </Box>
                                    ))
                                ) : filteredRows.length === 0 ? (
                                    <Box sx={{ p: 6, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No request types or users match &ldquo;{searchTerm}&rdquo;
                                        </Typography>
                                    </Box>
                                ) : (
                                    REQUEST_GROUPS.map((group) => {
                                        const rows = filteredRows.filter(
                                            (row) => REQUEST_TYPES.find((type) => type.slug === row.slug)?.group === group.key,
                                        );
                                        if (rows.length === 0) return null;
                                        return (
                                            <Box key={group.key}>
                                                <Box
                                                    sx={{
                                                        px: 2.5,
                                                        py: 0.75,
                                                        bgcolor: 'grey.50',
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider',
                                                        position: 'sticky',
                                                        top: 0,
                                                        zIndex: 1,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="text.secondary"
                                                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                                                    >
                                                        {group.label}
                                                    </Typography>
                                                </Box>
                                                {rows.map(renderTypeRow)}
                                            </Box>
                                        );
                                    })
                                )}
                            </Box>
                        </>
                    ) : (
                        // By user: one row per user, one column per request type.
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            <Box sx={{ minWidth: 200 + REQUEST_TYPES.length * 72 }}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${REQUEST_TYPES.length}, minmax(64px, 1fr))`,
                                        alignItems: 'end',
                                        px: 2,
                                        py: 1,
                                        bgcolor: 'grey.100',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 2,
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight={600}>User</Typography>
                                    {mergedRows.map((row) => {
                                        const type = REQUEST_TYPES.find((t) => t.slug === row.slug);
                                        const Icon = type?.icon ?? IconInfoCircle;
                                        return (
                                            <Tooltip key={row.slug} arrow title={type?.description ?? row.request_name}>
                                                <Stack alignItems="center" spacing={0.25} sx={{ px: 0.5, textAlign: 'center' }}>
                                                    <Icon size={16} />
                                                    <Typography variant="caption" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                                                        {row.request_name}
                                                    </Typography>
                                                </Stack>
                                            </Tooltip>
                                        );
                                    })}
                                </Box>

                                {/* Admins: always every request type */}
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${REQUEST_TYPES.length}, minmax(64px, 1fr))`,
                                        alignItems: 'center',
                                        px: 2,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'grey.50',
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', color: 'primary.main' }}>
                                            <IconShieldCheck size={18} />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>All admins</Typography>
                                            <Typography variant="caption" color="text.secondary">Always every request type</Typography>
                                        </Box>
                                    </Stack>
                                    {mergedRows.map((row) => (
                                        <Box key={row.slug} sx={{ display: 'flex', justifyContent: 'center', color: 'primary.main', opacity: 0.5 }}>
                                            <IconCircleCheck size={20} />
                                        </Box>
                                    ))}
                                </Box>

                                {fetchLoading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <Box key={index} sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                            <Skeleton variant="text" width="40%" />
                                        </Box>
                                    ))
                                ) : userAccessRows.length === 0 ? (
                                    <Box sx={{ p: 6, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {searchTerm
                                                ? <>No users match &ldquo;{searchTerm}&rdquo;</>
                                                : 'No users have been given access yet. Only admins handle requests.'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    userAccessRows.map(({ user: person, perType }) => (
                                        <Box
                                            key={person.id}
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${REQUEST_TYPES.length}, minmax(64px, 1fr))`,
                                                alignItems: 'center',
                                                px: 2,
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                '&:hover': { bgcolor: 'grey.50' },
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, minWidth: 0 }}>
                                                <Avatar src={person.user_image || undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
                                                    {getInitials(person.name)}
                                                </Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={500} noWrap>{person.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                                        {Object.values(perType).filter((v) => v === 'approve').length} approve ·{' '}
                                                        {Object.values(perType).filter((v) => v === 'view').length} view
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            {mergedRows.map((row) => renderAccessCell(row, perType[row.slug]))}
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Box>
                    )}
                </Paper>

                {/* Edit Dialog */}
                <Dialog
                    open={editDialogOpen}
                    onClose={() => !editLoading && setEditDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 600, fontSize: '1.2rem', pb: 1 }}>
                        {editingRow?.request_name}
                        {REQUEST_TYPES.find((type) => type.slug === editingRow?.slug)?.description && (
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5, fontWeight: 400 }}>
                                {REQUEST_TYPES.find((type) => type.slug === editingRow?.slug)?.description}
                            </Typography>
                        )}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        <Stack spacing={2}>
                            <Typography variant="body2" color="textSecondary">
                                <b>Viewer</b>: sees these requests and gets notified. <b>Approver</b>: also approves or
                                rejects them. Admins can always see and approve every request.
                            </Typography>

                            {editingInheritedFrom && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    {editingRow?.request_name} uses the <b>{editingInheritedFrom}</b> users right now. When you
                                    save, it gets its own users and will no longer change when {editingInheritedFrom} changes.
                                </Alert>
                            )}
                            {editingFollowers.length > 0 && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    Changes here also apply to <b>{editingFollowers.join(', ')}</b>, because they use these
                                    users until they are saved separately.
                                </Alert>
                            )}

                            {/* Search Box */}
                            <Box>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search users by name..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    InputProps={{
                                        startAdornment: <IconSearch size={18} style={{ marginRight: 8, color: '#999' }} />,
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#f5f7fa',
                                            '&:hover fieldset': {
                                                borderColor: '#d0d7eb',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#4f46e5',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Users List */}
                            <Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 1,
                                        pr: 1.5,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color: '#666' }}>
                                        Users ({filteredUsers.length}) · {editFormData.selected_users.length} approvers ·{' '}
                                        {editFormData.view_users.length - editFormData.selected_users.length} viewers
                                    </Typography>
                                    <Typography variant="caption" sx={{ width: 64, textAlign: 'center', fontWeight: 600, color: '#666' }}>
                                        View
                                    </Typography>
                                    <Typography variant="caption" sx={{ width: 96, textAlign: 'center', fontWeight: 600, color: '#666' }}>
                                        Approve
                                    </Typography>
                                </Box>
                                <Paper
                                    sx={{
                                        maxHeight: '360px',
                                        overflowY: 'auto',
                                        backgroundColor: '#fff',
                                        border: '1px solid #e0e7ff',
                                    }}
                                >
                                    {filteredUsers.length > 0 ? (
                                        <Box>
                                            {filteredUsers.map((user) => {
                                                const canView = editFormData.view_users.includes(user.id);
                                                const canApprove = editFormData.selected_users.includes(user.id);
                                                return (
                                                    <Box
                                                        key={user.id}
                                                        sx={{
                                                            px: 1.5,
                                                            py: 1,
                                                            borderBottom: '1px solid #f0f0f0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            backgroundColor: canView ? '#f0f4ff' : 'transparent',
                                                            '&:last-child': {
                                                                borderBottom: 'none',
                                                            },
                                                        }}
                                                    >
                                                        <Avatar
                                                            src={user.user_image ?? ''}
                                                            alt={user.name}
                                                            sx={{ width: 36, height: 36, flexShrink: 0 }}
                                                        />
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    color: '#1a1a1a',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}
                                                            >
                                                                {user.name}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: '#666',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    display: 'block',
                                                                }}
                                                            >
                                                                {user.email}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ width: 64, textAlign: 'center' }}>
                                                            <Checkbox
                                                                checked={canView}
                                                                onChange={() => toggleView(user.id)}
                                                                inputProps={{ 'aria-label': `${user.name} can view` }}
                                                            />
                                                        </Box>
                                                        <Box sx={{ width: 96, textAlign: 'center' }}>
                                                            <Checkbox
                                                                checked={canApprove}
                                                                onChange={() => toggleApprove(user.id)}
                                                                inputProps={{ 'aria-label': `${user.name} can approve or reject` }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 3, textAlign: 'center' }}>
                                            <Typography variant="body2" color="textSecondary">
                                                {searchFilter ? 'No users found matching your search' : 'No users available'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                        <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading} color="inherit">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={editLoading || !canSave}
                            variant="contained"
                            color="primary"
                        >
                            {editLoading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No changes'}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </PermissionGuard>
    );
};

export default RequestActionList;
