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
    IconArrowRight,
    IconChevronDown,
    IconChevronUp,
    IconSearch,
    IconUsers,
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
    action_by: string | null;
    message: string | null;
    date: string;
    time: string;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
}

type ChangeKind = 'added' | 'changed' | 'removed';

interface PermissionChange {
    name: string;
    old: string;
    new: string;
    kind: ChangeKind;
}

const KIND_ORDER: Record<ChangeKind, number> = {changed: 0, added: 1, removed: 2};

const getChanges = (item: HistoryItem): PermissionChange[] => {
    const oldData = item.old_data ?? {};
    const newData = item.new_data ?? {};
    return Object.keys(newData)
        .filter((key) => !META_KEYS.has(key) && typeof newData[key] === 'string')
        .map((key) => {
            const oldValue = typeof oldData[key] === 'string' ? oldData[key] : 'Off';
            const newValue = newData[key];
            const kind: ChangeKind =
                oldValue === 'Off' ? 'added' : newValue === 'Off' ? 'removed' : 'changed';
            return {name: key, old: oldValue, new: newValue, kind};
        })
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
        added: theme.palette.success.main,
        changed: theme.palette.primary.main,
        removed: theme.palette.error.main,
    };

    const statusColor = (label: string) => {
        if (label === 'Web & App') return theme.palette.success.main;
        if (label === 'Web') return theme.palette.primary.main;
        if (label === 'App') return theme.palette.info.main;
        return theme.palette.text.secondary;
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

    const StatusBadge = ({label, faded}: {label: string; faded?: boolean}) => {
        const color = statusColor(label);
        return (
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 68,
                    height: 22,
                    px: 1,
                    borderRadius: '6px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color,
                    bgcolor: alpha(color, faded ? 0.06 : 0.12),
                    opacity: faded ? 0.8 : 1,
                }}
            >
                {label}
            </Box>
        );
    };

    const SummaryPill = ({kind, count}: {kind: ChangeKind; count: number}) => {
        if (!count) return null;
        const labels: Record<ChangeKind, string> = {
            added: t('added'),
            changed: t('changed'),
            removed: t('removed'),
        };
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
                {count} {labels[kind]}
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
        const counts = changes.reduce(
            (acc, change) => ({...acc, [change.kind]: acc[change.kind] + 1}),
            {added: 0, changed: 0, removed: 0} as Record<ChangeKind, number>,
        );

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
                                    <Avatar src={item.user_image ?? ''} sx={{width: 18, height: 18, fontSize: 10}}>
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
                                <SummaryPill kind="changed" count={counts.changed}/>
                                <SummaryPill kind="added" count={counts.added}/>
                                <SummaryPill kind="removed" count={counts.removed}/>
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
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                                            pr: 1,
                                            py: 0.75,
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
                                            <StatusBadge label={change.old} faded/>
                                            <IconArrowRight size={13} color={theme.palette.text.disabled}/>
                                            <StatusBadge label={change.new}/>
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
                        {(['changed', 'added', 'removed'] as ChangeKind[]).map((kind) => (
                            <Stack key={kind} direction="row" alignItems="center" gap={0.5}>
                                <Box sx={{width: 10, height: 10, borderRadius: '3px', bgcolor: kindColor[kind]}}/>
                                <Typography fontSize={12} color="text.secondary" textTransform="capitalize">
                                    {t(kind)}
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
