'use client';

import React, {Fragment, useEffect, useMemo, useState} from 'react';
import {
    Autocomplete,
    Badge,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    Drawer,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconChevronDown,
    IconChevronRight,
    IconFilter,
    IconInfoCircle,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import {format} from 'date-fns';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import Image from 'next/image';
import api from '@/utils/axios';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

interface Amounts {
    net_amount: number;
    gross_amount: number;
    daywork: number;
    pricework: number;
    expense: number;
    adjustment: number;
    paid_leave: number;
}

interface ProjectSpend extends Amounts {
    project_id: number | null;
    project_name: string;
}

interface UserSpend extends Amounts {
    user_id: number;
    user_name: string;
    user_image: string | null;
    projects: ProjectSpend[];
}

interface GroupSpend extends Amounts {
    group_id: number | null;
    group_name: string;
    users_count: number;
    projects: ProjectSpend[];
    users: UserSpend[];
}

interface AnalyticsData {
    currency: string;
    totals: Amounts;
    groups: GroupSpend[];
}

interface GroupOption {
    id: number;
    name: string;
}

interface ProjectOption {
    id: number | null;
    name: string;
}

// Labour amounts are shown net; gross adds CIS on labour (expenses have no CIS).
const amountColumns: { key: keyof Amounts; label: string }[] = [
    {key: 'daywork', label: 'Daywork'},
    {key: 'pricework', label: 'Pricework'},
    {key: 'paid_leave', label: 'Paid leave'},
    {key: 'adjustment', label: 'Adjustments'},
    {key: 'expense', label: 'Expenses'},
    {key: 'net_amount', label: 'Net total'},
    {key: 'gross_amount', label: 'Gross total'},
];

const emptyAmounts = (): Amounts => ({
    net_amount: 0,
    gross_amount: 0,
    daywork: 0,
    pricework: 0,
    expense: 0,
    adjustment: 0,
    paid_leave: 0,
});

// Sums amounts of rows, rounded to pence like the API does.
const sumAmounts = (rows: Amounts[]): Amounts => {
    const total = emptyAmounts();
    for (const row of rows) {
        for (const key of Object.keys(total) as (keyof Amounts)[]) total[key] += row[key] ?? 0;
    }
    for (const key of Object.keys(total) as (keyof Amounts)[]) {
        total[key] = Math.round(total[key] * 100) / 100;
    }
    return total;
};

const byGross = (a: Amounts, b: Amounts) => b.gross_amount - a.gross_amount;

type StatusFilter = 'all' | 'paid' | 'locked';

interface UserOption {
    id: number;
    name: string;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    {value: 'paid', label: 'Paid'},
    {value: 'locked', label: 'Locked'},
];

// embedded: shown inside the Bookkeeper drawer, which already has its own title.
export default function GroupAnalytics({embedded = false}: { embedded?: boolean }) {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    // No dates = all time.
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<GroupOption[]>([]);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<number | null>>(new Set());
    // undefined = drawer closed; group_id can itself be null ("Unknown group").
    const [usersGroupId, setUsersGroupId] = useState<number | null | undefined>(undefined);
    const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
    const [userSearch, setUserSearch] = useState('');
    const [search, setSearch] = useState('');
    const [selectedProjects, setSelectedProjects] = useState<ProjectOption[]>([]);
    // "all" = locked + paid.
    const [status, setStatus] = useState<StatusFilter>('all');
    // Filters dialog edits a draft; Apply copies it to the real filters (same as Bookkeeper).
    const [filterOpen, setFilterOpen] = useState(false);
    // "drawer": opened from the users drawer, so options are limited to that group and
    // the Groups field is hidden.
    const [filterScope, setFilterScope] = useState<'main' | 'drawer'>('main');
    const [draftStatus, setDraftStatus] = useState<StatusFilter>('all');
    const [draftProjects, setDraftProjects] = useState<ProjectOption[]>([]);
    const [draftGroups, setDraftGroups] = useState<GroupOption[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
    const [draftUsers, setDraftUsers] = useState<UserOption[]>([]);
    const activeFilterCount =
        (status !== 'all' ? 1 : 0) +
        (selectedProjects.length ? 1 : 0) +
        (selectedGroups.length ? 1 : 0) +
        (selectedUsers.length ? 1 : 0);

    const openFilters = (scope: 'main' | 'drawer' = 'main') => {
        setFilterScope(scope);
        setDraftStatus(status);
        setDraftProjects(selectedProjects);
        setDraftGroups(selectedGroups);
        setDraftUsers(selectedUsers);
        setFilterOpen(true);
    };
    const applyFilters = () => {
        setStatus(draftStatus);
        setSelectedProjects(draftProjects);
        setSelectedGroups(draftGroups);
        setSelectedUsers(draftUsers);
        setFilterOpen(false);
    };
    const clearFilters = () => {
        setDraftStatus('all');
        setDraftProjects([]);
        setDraftUsers([]);
        setSelectedUsers([]);
        setStatus('all');
        setSelectedProjects([]);
        // The drawer belongs to one group, so its Clear keeps the group filter.
        if (filterScope === 'main') {
            setDraftGroups([]);
            setSelectedGroups([]);
        }
        setFilterOpen(false);
    };

    const money = (value: number) =>
        `${data?.currency ?? ''}${(value ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    // Table cells show "-" for zero amounts so the real values stand out.
    const cellMoney = (value: number) => (value ? money(value) : '-');

    useEffect(() => {
        if (!user?.company_id) return;
        api
            .get(`user-groups/list?company_id=${user.company_id}`)
            .then((res) => {
                const groups = (res.data?.info ?? []).map((g: any) => ({id: g.id, name: g.name}));
                setGroupOptions(groups);
            })
            .catch((err) => console.error('Failed to fetch groups', err));
    }, [user?.company_id]);

    useEffect(() => {
        if (!user?.company_id) return;
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({company_id: String(user.company_id)});
                if (startDate) params.set('start_date', format(startDate, 'yyyy-MM-dd'));
                if (endDate) params.set('end_date', format(endDate, 'yyyy-MM-dd'));
                if (selectedGroups.length) {
                    params.set('group_ids', selectedGroups.map((g) => g.id).join(','));
                }
                params.set('statuses', status === 'all' ? 'paid,locked' : status);
                const res = await api.get(`user-groups/analytics?${params.toString()}`);
                if (res.data?.info) setData(res.data.info);
            } catch (err) {
                console.error('Failed to fetch group analytics', err);
            }
            setLoading(false);
        };
        fetchAnalytics();
    }, [user?.company_id, startDate, endDate, selectedGroups, status]);

    // Projects that have paid amounts in the loaded period.
    const projectOptions = useMemo(() => {
        const map = new Map<number | null, ProjectOption>();
        for (const group of data?.groups ?? []) {
            for (const project of group.projects) {
                map.set(project.project_id, {id: project.project_id, name: project.project_name});
            }
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);

    // Users that have amounts in the loaded period.
    const userOptions = useMemo(() => {
        const map = new Map<number, UserOption>();
        for (const group of data?.groups ?? []) {
            for (const u of group.users) map.set(u.user_id, {id: u.user_id, name: u.user_name});
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);

    // Drop selected users that are not in the newly loaded period.
    useEffect(() => {
        setSelectedUsers((prev) => prev.filter((u) => userOptions.some((o) => o.id === u.id)));
    }, [userOptions]);

    // Drop selected projects that are not in the newly loaded period.
    useEffect(() => {
        setSelectedProjects((prev) => prev.filter((p) => projectOptions.some((o) => o.id === p.id)));
    }, [projectOptions]);

    // Groups, users and totals recomputed from per-user project rows for the user/project filters.
    const view = useMemo(() => {
        if (!data) return null;
        const query = search.trim().toLowerCase();
        if (!query && !selectedProjects.length && !selectedUsers.length) {
            return {totals: data.totals, groups: data.groups};
        }
        const userIds = new Set(selectedUsers.map((u) => u.id));

        const projectIds = new Set(selectedProjects.map((p) => p.id));
        const groups: GroupSpend[] = [];
        for (const group of data.groups) {
            const users: UserSpend[] = [];
            for (const u of group.users) {
                if (query && !(u.user_name ?? '').toLowerCase().includes(query)) continue;
                if (userIds.size && !userIds.has(u.user_id)) continue;
                // Search / user filter only: keep the user's full totals, which include adjustments and paid leave
                // (those have no project, so they are not in the project rows).
                if (!projectIds.size) {
                    users.push(u);
                    continue;
                }
                // Project filter: only the selected projects' spend counts.
                const projects = u.projects.filter((p) => projectIds.has(p.project_id));
                if (!projects.length) continue;
                users.push({...u, ...sumAmounts(projects), projects});
            }
            if (!users.length) continue;

            const projectRows = new Map<number | null, ProjectSpend[]>();
            for (const u of users) {
                for (const p of u.projects) {
                    if (!projectRows.has(p.project_id)) projectRows.set(p.project_id, []);
                    projectRows.get(p.project_id)!.push(p);
                }
            }
            const projects = [...projectRows.values()]
                .map((rows) => ({
                    project_id: rows[0].project_id,
                    project_name: rows[0].project_name,
                    ...sumAmounts(rows),
                }))
                .sort(byGross);

            groups.push({
                ...group,
                ...sumAmounts(users),
                users_count: users.length,
                users: users.sort(byGross),
                projects,
            });
        }
        groups.sort(byGross);
        return {totals: sumAmounts(groups), groups};
    }, [data, search, selectedProjects, selectedUsers]);

    const usersGroup =
        usersGroupId === undefined
            ? null
            : view?.groups.find((g) => g.group_id === usersGroupId) ?? null;

    // Drawer project filter lists the projects of the open group (before filtering).
    const drawerProjectOptions = useMemo(() => {
        const group = data?.groups.find((g) => g.group_id === usersGroupId);
        return (group?.projects ?? [])
            .map((p) => ({id: p.project_id, name: p.project_name}))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data, usersGroupId]);

    // Drawer user filter lists the users of the open group (before filtering).
    const drawerUserOptions = useMemo(() => {
        const group = data?.groups.find((g) => g.group_id === usersGroupId);
        return (group?.users ?? [])
            .map((u) => ({id: u.user_id, name: u.user_name}))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data, usersGroupId]);
    const drawerFilterCount =
        (status !== 'all' ? 1 : 0) + (selectedProjects.length ? 1 : 0) + (selectedUsers.length ? 1 : 0);

    const userQuery = userSearch.trim().toLowerCase();
    const filteredUsers = (usersGroup?.users ?? []).filter((u) =>
        (u.user_name ?? '').toLowerCase().includes(userQuery)
    );

    const openUsers = (group: GroupSpend) => {
        setExpandedUsers(new Set());
        setUserSearch('');
        setUsersGroupId(group.group_id);
    };

    const toggleUser = (userId: number) => {
        setExpandedUsers((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleGroup = (groupId: number | null) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const totals = view?.totals;
    const cards = totals
        ? [
            {label: 'Gross spend', value: totals.gross_amount, hint: 'Net labour + CIS, plus expenses'},
            {label: 'Net spend', value: totals.net_amount, hint: 'Paid to users before CIS'},
            {label: 'Daywork', value: totals.daywork},
            {label: 'Pricework', value: totals.pricework},
            {label: 'Expenses', value: totals.expense},
            {label: 'Leave & adjustments', value: totals.paid_leave + totals.adjustment},
        ]
        : [];

    return (
        <Box>
            <Stack
                direction={{xs: 'column', md: 'row'}}
                spacing={2}
                alignItems={{xs: 'stretch', md: 'center'}}
                justifyContent="space-between"
                mb={2}
            >
                <Box>
                    {!embedded && (
                        <Typography variant="h5" fontWeight={700}>
                            Group Report
                        </Typography>
                    )}
                    <Typography variant="body2" color="textSecondary">
                        Locked and paid amounts per group and project. Paid uses the group the user was in
                        when marked as paid; locked uses the user&apos;s current group.
                    </Typography>
                </Box>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems="center">
                    <CustomTextField
                        size="small"
                        placeholder="Search user..."
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={16}/>
                                </InputAdornment>
                            ),
                        }}
                        sx={{width: 200}}
                    />
                    <Tooltip title="Filters" arrow>
                        <Badge color="error" badgeContent={activeFilterCount} invisible={!activeFilterCount}>
                            <Button
                                color="primary"
                                variant="contained"
                                size="small"
                                onClick={() => openFilters('main')}
                                aria-label="Open filters"
                                sx={{minWidth: 40, height: 38, px: 1.5}}
                            >
                                <IconFilter size={18}/>
                            </Button>
                        </Badge>
                    </Tooltip>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <DateRangePickerBox
                            from={startDate}
                            to={endDate}
                            placeholder="All time"
                            onChange={({from, to}) => {
                                setStartDate(from);
                                setEndDate(to);
                            }}
                        />
                        {(startDate || endDate) && (
                            <Tooltip title="Show all time" arrow>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setStartDate(null);
                                        setEndDate(null);
                                    }}
                                >
                                    <IconX size={16}/>
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Stack>

            {loading ? (
                <Stack spacing={2}>
                    <Skeleton variant="rounded" height={88}/>
                    <Skeleton variant="rounded" height={240}/>
                </Stack>
            ) : (
                <>
                    <Grid container spacing={2} mb={3}>
                        {cards.map((card) => (
                            <Grid key={card.label} size={{xs: 6, sm: 4, md: 2}}>
                                <Card variant="outlined" sx={{height: '100%'}}>
                                    <CardContent sx={{p: 2, '&:last-child': {pb: 2}}}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <Typography variant="body2" color="textSecondary">
                                                {card.label}
                                            </Typography>
                                            {card.hint && (
                                                <Tooltip title={card.hint} arrow>
                                                    <Box component="span" display="flex">
                                                        <IconInfoCircle size={14}/>
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                        <Typography variant="h5" fontWeight={700} mt={0.5}>
                                            {money(card.value)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {!view?.groups.length ? (
                        <Box textAlign="center" py={6}>
                            <Image src="/images/no-data.png" alt="No data" width={120} height={120}/>
                            <Typography variant="body1" color="textSecondary" mt={1}>
                                {data?.groups.length
                                    ? 'No results match the filters'
                                    : 'No locked or paid amounts in this period'}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{overflowX: 'auto'}}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{width: 40}}/>
                                        <TableCell>Group / Project</TableCell>
                                        <TableCell align="right">Users</TableCell>
                                        {amountColumns.map((col) => (
                                            <TableCell key={col.key} align="right" sx={{whiteSpace: 'nowrap'}}>
                                                {col.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {view.groups.map((group) => {
                                        const isOpen = expanded.has(group.group_id);
                                        return (
                                            <Fragment key={group.group_id ?? 'none'}>
                                                <TableRow
                                                    hover
                                                    onClick={() => toggleGroup(group.group_id)}
                                                    sx={{cursor: 'pointer', '& td': {fontWeight: 600}}}
                                                >
                                                    <TableCell>
                                                        <IconButton size="small">
                                                            {isOpen ? <IconChevronDown size={16}/> :
                                                                <IconChevronRight size={16}/>}
                                                        </IconButton>
                                                    </TableCell>
                                                    <TableCell>
                                                        {group.group_name}{' '}
                                                        <Chip
                                                            size="small"
                                                            label={`${group.projects.length} project${group.projects.length === 1 ? '' : 's'}`}
                                                            sx={{ml: 1, fontWeight: 400}}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Tooltip title="View users" arrow>
                                                            <Box
                                                                component="span"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openUsers(group);
                                                                }}
                                                                sx={{
                                                                    color: 'primary.main',
                                                                    textDecoration: 'underline',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                {group.users_count}
                                                            </Box>
                                                        </Tooltip>
                                                    </TableCell>
                                                    {amountColumns.map((col) => (
                                                        <TableCell key={col.key} align="right"
                                                                   sx={{whiteSpace: 'nowrap'}}>
                                                            {cellMoney(group[col.key])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                                {isOpen &&
                                                    group.projects.map((project) => (
                                                        <TableRow
                                                            key={`${group.group_id}-${project.project_id ?? 'none'}`}>
                                                            <TableCell/>
                                                            <TableCell sx={{pl: 4, color: 'text.secondary'}}>
                                                                {project.project_name}
                                                            </TableCell>
                                                            <TableCell/>
                                                            {amountColumns.map((col) => (
                                                                <TableCell
                                                                    key={col.key}
                                                                    align="right"
                                                                    sx={{whiteSpace: 'nowrap', color: 'text.secondary'}}
                                                                >
                                                                    {cellMoney(project[col.key])}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )}

            <Dialog
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        width: {xs: 'calc(100vw - 24px)', sm: '100%'},
                        maxWidth: 600,
                        m: {xs: 1.5, sm: 4},
                    },
                }}
            >
                <DialogTitle sx={{m: 0, position: 'relative'}}>
                    Filters
                    <IconButton
                        aria-label="Close"
                        onClick={() => setFilterOpen(false)}
                        sx={{position: 'absolute', right: 12, top: 8}}
                    >
                        <IconX size={24}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{overflowX: 'hidden'}}>
                    <Stack spacing={2} mt={1}>
                        <Box>
                            <Typography variant="body2" fontWeight={600} mb={0.5}>
                                Projects
                            </Typography>
                            <Autocomplete
                                multiple
                                options={filterScope === 'drawer' ? drawerProjectOptions : projectOptions}
                                value={draftProjects}
                                onChange={(_, value) => setDraftProjects(value)}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <CustomTextField
                                        {...params}
                                        placeholder={draftProjects.length ? '' : 'All projects'}
                                    />
                                )}
                            />
                        </Box>
                        <Box>
                            <Typography variant="body2" fontWeight={600} mb={0.5}>
                                Status
                            </Typography>
                            {/* "all" shows as an "All" placeholder, like the other two fields. */}
                            <CustomTextField
                                select
                                fullWidth
                                value={draftStatus === 'all' ? '' : draftStatus}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setDraftStatus((e.target.value || 'all') as StatusFilter)
                                }
                                SelectProps={{
                                    displayEmpty: true,
                                    renderValue: (value: unknown) =>
                                        value ? (
                                            STATUS_OPTIONS.find((o) => o.value === value)?.label
                                        ) : (
                                            <Box component="span" sx={{color: 'text.disabled'}}>
                                                All
                                            </Box>
                                        ),
                                }}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </CustomTextField>
                        </Box>
                        {filterScope === 'main' && (
                            <Box>
                                <Typography variant="body2" fontWeight={600} mb={0.5}>
                                    Groups
                                </Typography>
                                <Autocomplete
                                    multiple
                                    options={groupOptions}
                                    value={draftGroups}
                                    onChange={(_, value) => setDraftGroups(value)}
                                    getOptionLabel={(option) => option.name}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <CustomTextField
                                            {...params}
                                            placeholder={draftGroups.length ? '' : 'All groups'}
                                        />
                                    )}
                                />
                            </Box>
                        )}
                        <Box>
                            <Typography variant="body2" fontWeight={600} mb={0.5}>
                                Users
                            </Typography>
                            <Autocomplete
                                multiple
                                options={filterScope === 'drawer' ? drawerUserOptions : userOptions}
                                value={draftUsers}
                                onChange={(_, value) => setDraftUsers(value)}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <CustomTextField
                                        {...params}
                                        placeholder={draftUsers.length ? '' : 'All users'}
                                    />
                                )}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={clearFilters} color="inherit">
                        Clear
                    </Button>
                    <Button variant="contained" onClick={applyFilters}>
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            <Drawer
                anchor="right"
                open={Boolean(usersGroup)}
                onClose={() => setUsersGroupId(undefined)}
                PaperProps={{sx: {width: {xs: '100%', md: '70vw'}, maxWidth: 1100}}}
            >
                {usersGroup && (
                    <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider'}}
                        >
                            <Box>
                                <Typography fontWeight={700}>{usersGroup.group_name}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {usersGroup.users_count} user{usersGroup.users_count === 1 ? '' : 's'} ·{' '}
                                    {money(usersGroup.gross_amount)} gross
                                </Typography>
                            </Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CustomTextField
                                    size="small"
                                    placeholder="Search user..."
                                    value={userSearch}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <IconSearch size={16}/>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{width: 220}}
                                />
                                <Tooltip title="Filters" arrow>
                                    <Badge color="error" badgeContent={drawerFilterCount}
                                           invisible={!drawerFilterCount}>
                                        <Button
                                            color="primary"
                                            variant="contained"
                                            size="small"
                                            onClick={() => openFilters('drawer')}
                                            aria-label="Open filters"
                                            sx={{minWidth: 40, height: 38, px: 1.5}}
                                        >
                                            <IconFilter size={18}/>
                                        </Button>
                                    </Badge>
                                </Tooltip>
                                <IconButton size="small" onClick={() => setUsersGroupId(undefined)}>
                                    <IconX size={18}/>
                                </IconButton>
                            </Stack>
                        </Stack>
                        <TableContainer sx={{flex: 1, overflow: 'auto'}}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{width: 40}}/>
                                        <TableCell>User / Project</TableCell>
                                        {amountColumns.map((col) => (
                                            <TableCell key={col.key} align="right" sx={{whiteSpace: 'nowrap'}}>
                                                {col.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={amountColumns.length + 2} align="center"
                                                       sx={{py: 4, color: 'text.secondary'}}>
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {filteredUsers.map((u) => {
                                        const isOpen = expandedUsers.has(u.user_id);
                                        return (
                                            <Fragment key={u.user_id}>
                                                <TableRow
                                                    hover
                                                    onClick={() => toggleUser(u.user_id)}
                                                    sx={{cursor: 'pointer', '& td': {fontWeight: 600}}}
                                                >
                                                    <TableCell>
                                                        <IconButton size="small">
                                                            {isOpen ? <IconChevronDown size={16}/> :
                                                                <IconChevronRight size={16}/>}
                                                        </IconButton>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Avatar
                                                                src={u.user_image ?? ''}
                                                                alt={u.user_name}
                                                                sx={{width: 28, height: 28}}
                                                            />
                                                            <span>{u.user_name}</span>
                                                        </Stack>
                                                    </TableCell>
                                                    {amountColumns.map((col) => (
                                                        <TableCell key={col.key} align="right"
                                                                   sx={{whiteSpace: 'nowrap'}}>
                                                            {cellMoney(u[col.key])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                                {isOpen &&
                                                    u.projects.map((project) => (
                                                        <TableRow key={`${u.user_id}-${project.project_id ?? 'none'}`}>
                                                            <TableCell/>
                                                            <TableCell sx={{pl: 6, color: 'text.secondary'}}>
                                                                {project.project_name}
                                                            </TableCell>
                                                            {amountColumns.map((col) => (
                                                                <TableCell
                                                                    key={col.key}
                                                                    align="right"
                                                                    sx={{whiteSpace: 'nowrap', color: 'text.secondary'}}
                                                                >
                                                                    {cellMoney(project[col.key])}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
}
