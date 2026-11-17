'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Drawer,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {alpha, useTheme} from '@mui/material/styles';
import {
    IconArrowLeft,
    IconChevronDown,
    IconChevronUp,
    IconDeviceMobile,
    IconSearch,
    IconUsers,
    IconWorld,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Image from 'next/image';
import {User} from 'next-auth';
import {useSession} from 'next-auth/react';
import {useTranslation} from 'react-i18next';
import api from '@/utils/axios';

dayjs.extend(customParseFormat);

// histories.request_type for user / company permission changes (TableEnumNumber.USER_PERMISSION)
const USER_PERMISSION_HISTORY_TYPE = 139;
const PAGE_SIZE = 20;
const COLLAPSED_CHANGE_COUNT = 8;
const META_KEYS = new Set(['affected_user_id', 'affected_user_name', 'changed_by']);
const ALL_USERS = 'all users';

interface HistoryItem {
    id: number;
    user_name: string | null;
    user_image: string | null;
    affected_user_image?: string | null;
    action_by: string | null;
    message: string | null;
    date: string;
    time: string;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
}

// on = every toggled switch was turned on, off = every toggled switch was turned off, mixed = both
type ChangeKind = 'on' | 'off' | 'mixed';
type Channel = 'web' | 'app';

interface SwitchState {
    old: boolean;
    new: boolean;
}

interface PermissionChange {
    name: string;
    web: SwitchState;
    app: SwitchState;
    kind: ChangeKind;
}

const CHANNELS: Channel[] = ['web', 'app'];
const KIND_ORDER: Record<ChangeKind, number> = {on: 0, mixed: 1, off: 2};

// Status labels saved by the backend map back to the Web / App switches on the settings screens.
const toSwitches = (label: string) => ({
    web: label === 'Web' || label === 'Web & App',
    app: label === 'App' || label === 'Web & App',
});

const getChanges = (item: HistoryItem): PermissionChange[] => {
    const oldData = item.old_data ?? {};
    const newData = item.new_data ?? {};
    return Object.keys(newData)
        .filter((key) => !META_KEYS.has(key) && typeof newData[key] === 'string')
        .map((key) => {
            const before = toSwitches(typeof oldData[key] === 'string' ? oldData[key] : 'Off');
            const after = toSwitches(newData[key]);
            const web = {old: before.web, new: after.web};
            const app = {old: before.app, new: after.app};
            const toggled = [web, app].filter((state) => state.old !== state.new);
            const kind: ChangeKind = toggled.every((state) => state.new)
                ? 'on'
                : toggled.every((state) => !state.new)
                    ? 'off'
                    : 'mixed';
            return {name: key, web, app, kind};
        })
        .filter((change) => change.web.old !== change.web.new || change.app.old !== change.app.new)
        .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name));
};

const initials = (name?: string | null) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?';

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function PermissionHistoryDrawer({open, onClose}: Props) {
    const {t} = useTranslation();
    const theme = useTheme();
    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null};

    const [items, setItems] = useState<HistoryItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const kindColor: Record<ChangeKind, string> = {
        on: theme.palette.success.main,
        off: theme.palette.error.main,
        mixed: theme.palette.primary.main,
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchHistory = useCallback(
        async (pageToLoad: number) => {
            if (!user?.company_id) return;
            setLoading(true);
            try {
                const res = await api.get('requests/get-history', {
                    params: {
                        company_id: user.company_id,
                        type: USER_PERMISSION_HISTORY_TYPE,
                        page: pageToLoad,
                        limit: PAGE_SIZE,
                        ...(debouncedSearch ? {search: debouncedSearch} : {}),
                    },
                });
                const rows: HistoryItem[] = res.data?.info ?? [];
                setItems((prev) => (pageToLoad === 1 ? rows : [...prev, ...rows]));
                setTotalPages(res.data?.data?.totalPages ?? 0);
                setTotalItems(res.data?.data?.totalItems ?? 0);
                setPage(pageToLoad);
            } catch (err) {
                console.error('Failed to fetch permission history', err);
            } finally {
                setLoading(false);
            }
        },
        [user?.company_id, debouncedSearch],
    );

    useEffect(() => {
        if (open) fetchHistory(1);
    }, [open, fetchHistory]);

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
            setDebouncedSearch('');
            setExpanded(new Set());
        }
    }, [open]);

    const groups = useMemo(() => {
        const today = dayjs().format('DD/MM/YYYY');
        const yesterday = dayjs().subtract(1, 'day').format('DD/MM/YYYY');
        const result: Array<{date: string; label: string; items: HistoryItem[]}> = [];
        for (const item of items) {
            let group = result[result.length - 1];
            if (!group || group.date !== item.date) {
                const label =
                    item.date === today
                        ? t('Today')
                        : item.date === yesterday
                            ? t('Yesterday')
                            : dayjs(item.date, 'DD/MM/YYYY').format('ddd, DD MMM YYYY');
                group = {date: item.date, label, items: []};
                result.push(group);
            }
            group.items.push(item);
        }
        return result;
    }, [items, t]);

    const toggleExpanded = (id: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const MiniSwitch = ({checked, muted}: {checked: boolean; muted?: boolean}) => (
        <Box
            component="span"
            sx={{
                position: 'relative',
                display: 'inline-block',
                flexShrink: 0,
                width: 30,
                height: 17,
                borderRadius: 9,
                bgcolor: checked ? 'primary.main' : theme.palette.grey[300],
                opacity: muted ? 0.4 : 1,
                transition: 'background-color .2s',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 2,
                    left: checked ? 15 : 2,
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    bgcolor: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,.25)',
                },
            }}
        />
    );

    const SwitchCell = ({channel, state}: {channel: Channel; state: SwitchState}) => {
        const changed = state.old !== state.new;
        const color = state.new ? theme.palette.success.main : theme.palette.error.main;
        const Icon = channel === 'web' ? IconWorld : IconDeviceMobile;
        return (
            <Stack
                direction="row"
                alignItems="center"
                gap={0.75}
                sx={{
                    width: 112,
                    px: 0.75,
                    py: 0.5,
                    borderRadius: 1.5,
                    bgcolor: changed ? alpha(color, 0.08) : 'transparent',
                    border: '1px solid',
                    borderColor: changed ? alpha(color, 0.35) : 'transparent',
                }}
                title={`${channel === 'web' ? 'Web' : 'App'}: ${state.old ? 'On' : 'Off'} → ${state.new ? 'On' : 'Off'}`}
            >
                <Icon size={14} color={changed ? color : theme.palette.text.disabled}/>
                <MiniSwitch checked={state.new} muted={!changed}/>
                <Typography
                    fontSize={11}
                    fontWeight={700}
                    color={changed ? color : 'text.disabled'}
                    noWrap
                >
                    {changed ? (state.new ? t('Turned on') : t('Turned off')) : state.new ? t('On') : t('Off')}
                </Typography>
            </Stack>
        );
    };

    const SummaryPill = ({kind, count}: {kind: 'on' | 'off'; count: number}) => {
        if (!count) return null;
        return (
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    height: 22,
                    borderRadius: 11,
                    fontSize: 12,
                    fontWeight: 600,
                    color: kindColor[kind],
                    bgcolor: alpha(kindColor[kind], 0.1),
                }}
            >
                {count} {kind === 'on' ? t('switched on') : t('switched off')}
            </Box>
        );
    };

    const renderEntry = (item: HistoryItem, isLast: boolean) => {
        const changes = getChanges(item);
        const affectedUser: string | undefined = item.new_data?.affected_user_name;
        const isCompanyWide = affectedUser === ALL_USERS;
        const changedBy = item.new_data?.changed_by ?? item.action_by ?? item.user_name ?? '-';
        const isExpanded = expanded.has(item.id);
        const visibleChanges = isExpanded ? changes : changes.slice(0, COLLAPSED_CHANGE_COUNT);
        const hiddenCount = changes.length - visibleChanges.length;
        // Count individual switch flips, the same way the admin toggled them on the settings screen.
        const counts = {on: 0, off: 0};
        for (const change of changes) {
            for (const channel of CHANNELS) {
                const state = change[channel];
                if (state.old !== state.new) counts[state.new ? 'on' : 'off'] += 1;
            }
        }

        return (
            <Box key={item.id} display="flex" gap={2}>
                {/* Timeline rail */}
                <Box display="flex" flexDirection="column" alignItems="center" sx={{width: 12, flexShrink: 0}}>
                    <Box
                        sx={{
                            mt: 2.5,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.15)}`,
                        }}
                    />
                    {!isLast && <Box sx={{flex: 1, width: '2px', bgcolor: 'divider', mt: 1}}/>}
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        mb: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <Stack
                        direction={{xs: 'column', md: 'row'}}
                        alignItems={{xs: 'flex-start', md: 'center'}}
                        justifyContent="space-between"
                        gap={1.5}
                        px={2}
                        py={1.5}
                    >
                        <Stack direction="row" alignItems="center" gap={1.5} minWidth={0}>
                            <Avatar
                                src={
                                    isCompanyWide
                                        ? undefined
                                        : (affectedUser ? item.affected_user_image : item.user_image) ?? undefined
                                }
                                sx={{
                                    width: 38,
                                    height: 38,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                    color: 'primary.main',
                                }}
                            >
                                {isCompanyWide ? <IconUsers size={18}/> : initials(affectedUser ?? changedBy)}
                            </Avatar>
                            <Box minWidth={0}>
                                <Typography fontWeight={600} fontSize={14.5} noWrap>
                                    {isCompanyWide
                                        ? t('All users (company-wide)')
                                        : affectedUser ?? t('Permission update')}
                                </Typography>
                                <Stack direction="row" alignItems="center" gap={0.75} mt={0.25}>
                                    <Avatar src={item.user_image ?? undefined} sx={{width: 20, height: 20, fontSize: 10}}>
                                        {initials(changedBy)}
                                    </Avatar>
                                    <Typography fontSize={12.5} color="text.secondary" noWrap>
                                        {t('Changed by')}{' '}
                                        <Box component="span" fontWeight={600} color="text.primary">
                                            {changedBy}
                                        </Box>
                                        {' · '}
                                        {item.time}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>

                        {changes.length > 0 && (
                            <Stack direction="row" gap={0.75} flexWrap="wrap">
                                <Typography fontSize={12} color="text.secondary" sx={{alignSelf: 'center'}}>
                                    {changes.length} {changes.length === 1 ? t('permission') : t('permissions')}
                                </Typography>
                                <SummaryPill kind="on" count={counts.on}/>
                                <SummaryPill kind="off" count={counts.off}/>
                            </Stack>
                        )}
                    </Stack>

                    {/* Body */}
                    {changes.length > 0 ? (
                        <Box
                            sx={{
                                px: 2,
                                py: 1.5,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                bgcolor: alpha(theme.palette.grey[500], 0.04),
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))',
                                    gap: 1,
                                }}
                            >
                                {visibleChanges.map((change) => (
                                    <Stack
                                        key={change.name}
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        gap={1}
                                        sx={{
                                            pl: 1.25,
                                            pr: 0.75,
                                            py: 0.5,
                                            borderRadius: 1.5,
                                            bgcolor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderLeft: `3px solid ${kindColor[change.kind]}`,
                                        }}
                                    >
                                        <Typography fontSize={13} fontWeight={500} noWrap title={change.name}>
                                            {change.name}
                                        </Typography>
                                        <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
                                            {CHANNELS.map((channel) => (
                                                <SwitchCell key={channel} channel={channel} state={change[channel]}/>
                                            ))}
                                        </Stack>
                                    </Stack>
                                ))}
                            </Box>

                            {changes.length > COLLAPSED_CHANGE_COUNT && (
                                <Button
                                    size="small"
                                    onClick={() => toggleExpanded(item.id)}
                                    endIcon={isExpanded ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                                    sx={{mt: 1}}
                                >
                                    {isExpanded
                                        ? t('Show less')
                                        : `${t('Show')} ${hiddenCount} ${t('more')}`}
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <Box px={2} py={1.5} borderTop="1px solid" borderColor="divider">
                            <Typography fontSize={13} color="text.secondary">
                                {item.message ?? '-'}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            ModalProps={{keepMounted: false}}
            PaperProps={{
                sx: {
                    height: '90vh',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.default',
                },
            }}
        >
            {/* Drag handle */}
            <Box display="flex" justifyContent="center" pt={1}>
                <Box sx={{width: 40, height: 4, borderRadius: 2, bgcolor: 'divider'}}/>
            </Box>

            <Stack
                direction={{xs: 'column', sm: 'row'}}
                alignItems={{xs: 'stretch', sm: 'center'}}
                justifyContent="space-between"
                gap={1.5}
                px={{xs: 2, md: 3}}
                py={1.5}
                borderBottom="1px solid"
                borderColor="divider"
                sx={{flexShrink: 0, bgcolor: 'background.paper'}}
            >
                <Stack direction="row" alignItems="center" gap={1} minWidth={0}>
                    <IconButton onClick={onClose} size="small" aria-label="Back">
                        <IconArrowLeft size={18}/>
                    </IconButton>
                    <Box minWidth={0}>
                        <Typography fontWeight={700} fontSize={17} noWrap>
                            {t('Permission History')}
                        </Typography>
                        <Typography fontSize={12.5} color="text.secondary" noWrap>
                            {t('Who changed which permission, for whom and when')}
                            {totalItems > 0 && ` · ${totalItems} ${t('entries')}`}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" alignItems="center" gap={2}>
                    <Stack direction="row" gap={1.5} sx={{display: {xs: 'none', lg: 'flex'}}}>
                        {([
                            ['on', t('Switched on')],
                            ['off', t('Switched off')],
                            ['mixed', t('On & off')],
                        ] as Array<[ChangeKind, string]>).map(([kind, label]) => (
                            <Stack key={kind} direction="row" alignItems="center" gap={0.5}>
                                <Box sx={{width: 10, height: 10, borderRadius: '3px', bgcolor: kindColor[kind]}}/>
                                <Typography fontSize={12} color="text.secondary">
                                    {label}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <TextField
                        size="small"
                        placeholder={t('Search user or permission...')}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        sx={{width: {xs: '100%', sm: 300}}}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16}/>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </Stack>
            </Stack>

            <Box sx={{flex: 1, minHeight: 0, overflowY: 'auto', px: {xs: 1.5, md: 3}, py: 2}}>
                {loading && items.length === 0 ? (
                    <Box display="flex" justifyContent="center" py={8}>
                        <CircularProgress size={28}/>
                    </Box>
                ) : items.length === 0 ? (
                    <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={1}>
                        <Image src="/images/no-data.png" alt="No data" width={160} height={160}/>
                        <Typography color="text.secondary">
                            {debouncedSearch ? t('No matching permission changes') : t('No permission changes yet')}
                        </Typography>
                    </Box>
                ) : (
                    <Box maxWidth={1280} mx="auto">
                        {groups.map((group) => (
                            <Box key={group.date} mb={1}>
                                <Typography
                                    fontSize={12}
                                    fontWeight={700}
                                    color="text.secondary"
                                    textTransform="uppercase"
                                    letterSpacing={0.6}
                                    sx={{mb: 1, ml: 3.5}}
                                >
                                    {group.label}
                                </Typography>
                                {group.items.map((item, index) =>
                                    renderEntry(item, index === group.items.length - 1),
                                )}
                            </Box>
                        ))}

                        {page < totalPages && (
                            <Box display="flex" justifyContent="center" pt={1} pb={2}>
                                <Button
                                    variant="outlined"
                                    onClick={() => fetchHistory(page + 1)}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={14}/> : undefined}
                                >
                                    {loading ? t('Loading...') : t('Load more')}
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}
