'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    IconArrowBackUp,
    IconArrowLeft,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconFilter,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';

export type ArchivedUserLeave = {
    id: number;
    user_leave_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    user_name: string;
    user_thumb_image?: string | null;
    trade_name?: string | null;
    leave_name?: string | null;
    leave_type?: string | null;
    display_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    is_allday_leave?: boolean;
    total_time_of_days?: string | null;
    manager_note?: string | null;
    deleted_at?: string | null;
};

type FilterOption = {
    id: number | string;
    name: string;
    user_thumb_image?: string | null;
    user_image?: string | null;
};

type ArchiveFilters = {
    users: Array<number | string>;
    leaves: Array<number | string>;
    leaveTypes: string[];
};

interface ArchivedUserLeavesDrawerProps {
    open: boolean;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const EMPTY_FILTERS: ArchiveFilters = { users: [], leaves: [], leaveTypes: [] };

const TABLE_COLUMNS = [
    'Name',
    'Leave',
    'Type',
    'Dates',
    'Days',
    'Time',
    'Note',
    'Archived',
    '',
] as const;

const TABLE_GRID_COLUMNS =
    '2fr 0.55fr 0.5fr 1.5fr 0.4fr 0.85fr 1.1fr 0.95fr 64px';

const LEAVE_TYPE_OPTIONS: FilterOption[] = [
    { id: 'paid', name: 'Paid' },
    { id: 'unpaid', name: 'Unpaid' },
];

const formatDuration = (item: ArchivedUserLeave) => {
    if (item.is_allday_leave) {
        const days = Number(item.total_time_of_days);
        if (!Number.isNaN(days) && days > 0) {
            return `${days} day${days === 1 ? '' : 's'}`;
        }
        return 'All day';
    }
    return '-';
};

const formatTime = (item: ArchivedUserLeave) => {
    if (item.is_allday_leave) return 'All day';
    if (item.start_time && item.end_time) return `${item.start_time} - ${item.end_time}`;
    return '-';
};

const leaveTypeChipSx = (leaveType?: string | null) => {
    const type = String(leaveType || '').toLowerCase();
    if (type === 'paid') {
        return { backgroundColor: '#39af43', color: '#fff' };
    }
    if (type === 'unpaid') {
        return { backgroundColor: 'orange', color: '#fff' };
    }
    return { backgroundColor: '#e5e7eb', color: '#334155' };
};

const ArchivedUserLeavesDrawer: React.FC<ArchivedUserLeavesDrawerProps> = ({
    open,
    onClose,
    onWorkUpdated,
}) => {
    const session = useSession();
    const authUser = session.data?.user as User & { company_id?: number | null };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ArchivedUserLeave[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [restoring, setRestoring] = useState(false);

    const [filters, setFilters] = useState<ArchiveFilters>(EMPTY_FILTERS);
    const [tempFilters, setTempFilters] = useState<ArchiveFilters>(EMPTY_FILTERS);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [userOptions, setUserOptions] = useState<FilterOption[]>([]);
    const [leaveOptions, setLeaveOptions] = useState<FilterOption[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (open) {
            setPageIndex(0);
        }
    }, [debouncedSearch, startDate, endDate, filters, open]);

    const formatDateParam = (date: Date | null) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const activeFilterCount = useMemo(() => {
        return (
            (filters.users.length ? 1 : 0) +
            (filters.leaves.length ? 1 : 0) +
            (filters.leaveTypes.length ? 1 : 0)
        );
    }, [filters]);

    const loadFilterOptions = useCallback(async () => {
        try {
            const [usersRes, leavesRes] = await Promise.all([
                api.get('user/list'),
                authUser?.company_id
                    ? api.get(`company-leaves/get?company_id=${authUser.company_id}`)
                    : Promise.resolve({ data: { info: [] } }),
            ]);

            const users = Array.isArray(usersRes.data?.info) ? usersRes.data.info : [];
            setUserOptions(
                users.map((user: any) => ({
                    id: user.id,
                    name:
                        user.name ||
                        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                        `User ${user.id}`,
                    user_thumb_image: user.user_thumb_image || null,
                    user_image: user.user_image || user.image || null,
                })),
            );

            const leaves = Array.isArray(leavesRes.data?.info) ? leavesRes.data.info : [];
            setLeaveOptions(
                leaves.map((leave: any) => ({
                    id: leave.id,
                    name: leave.name || `Leave ${leave.id}`,
                })),
            );
        } catch (err) {
            console.error('Failed to load archived leave filter options', err);
        }
    }, [authUser?.company_id]);

    useEffect(() => {
        if (open) {
            loadFilterOptions();
        }
    }, [open, loadFilterOptions]);

    const fetchArchivedLeaves = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set('page', String(pageIndex + 1));
            params.set('limit', String(pageSize));
            if (debouncedSearch) params.set('search', debouncedSearch);

            const start = formatDateParam(startDate);
            const end = formatDateParam(endDate);
            if (start && end) {
                params.set('start_date', start);
                params.set('end_date', end);
            }
            if (filters.users.length) params.set('user_id', filters.users.join(','));
            if (filters.leaves.length) params.set('leave_id', filters.leaves.join(','));
            if (filters.leaveTypes.length) params.set('leave_type', filters.leaveTypes.join(','));

            const res = await api.get(`user-leaves/archive-list?${params.toString()}`);
            if (res.data?.IsSuccess) {
                setData(Array.isArray(res.data.data) ? res.data.data : []);
                const pagination = res.data.pagination;
                if (pagination) {
                    setTotalItems(Number(pagination.totalItems) || 0);
                    setTotalPages(Number(pagination.totalPages) || 1);
                } else {
                    const rows = Array.isArray(res.data.data) ? res.data.data : [];
                    setTotalItems(rows.length);
                    setTotalPages(1);
                }
            } else {
                setData([]);
                setError(res.data?.message || 'Failed to load archived leaves');
                toast.error(res.data?.message || 'Failed to load archived leaves');
            }
        } catch (err: any) {
            setData([]);
            const message =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load archived leaves';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, endDate, filters, pageIndex, pageSize, startDate]);

    useEffect(() => {
        if (open) {
            fetchArchivedLeaves();
        }
    }, [open, fetchArchivedLeaves]);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        setStartDate(range.from);
        setEndDate(range.to);
    };

    const openFilterDialog = () => {
        setTempFilters(filters);
        setFilterDialogOpen(true);
    };

    const handleClearFilters = () => {
        setTempFilters(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setFilterDialogOpen(false);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setFilterDialogOpen(false);
    };

    const handleClearAppliedFilters = () => {
        setFilters(EMPTY_FILTERS);
        setTempFilters(EMPTY_FILTERS);
    };

    const renderFilterSelect = (
        label: string,
        key: keyof ArchiveFilters,
        options: FilterOption[],
        showAvatar = false,
    ) => {
        const value = tempFilters[key];
        const selectedValueStrings = value.map(String);
        const selectedOptions = options.filter((option) =>
            selectedValueStrings.includes(String(option.id)),
        );
        const allSelected =
            options.length > 0 &&
            options.every((option) => selectedValueStrings.includes(String(option.id)));

        return (
            <Stack
                direction="row"
                spacing={0}
                alignItems="stretch"
                sx={{ width: '100%', minWidth: 0 }}
            >
                <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={options}
                    value={selectedOptions}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, selectedOption) =>
                        String(option.id) === String(selectedOption.id)
                    }
                    filterOptions={(list, state) => {
                        const query = state.inputValue.trim().toLowerCase();
                        if (!query) return list;
                        const words = query.split(/\s+/).filter(Boolean);
                        return list.filter((option) => {
                            const haystack = option.name.toLowerCase();
                            if (haystack.includes(query)) return true;
                            return words.every((word) => haystack.includes(word));
                        });
                    }}
                    onChange={(_, selected) => {
                        setTempFilters((prev) => ({
                            ...prev,
                            [key]: selected.map((option) => option.id),
                        }));
                    }}
                    renderTags={(tagValue, getTagProps) =>
                        tagValue.map((option, index) => {
                            const { key: chipKey, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip
                                    key={chipKey}
                                    label={option.name}
                                    color="primary"
                                    size="small"
                                    {...tagProps}
                                    sx={{
                                        borderRadius: '4px',
                                        fontSize: '0.9rem',
                                        height: 32,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'rgba(255,255,255,0.85)',
                                            '&:hover': { color: '#fff' },
                                        },
                                    }}
                                />
                            );
                        })
                    }
                    renderOption={(props, option, { selected }) => {
                        const { key: optionKey, ...optionProps } = props;
                        return (
                            <Box
                                component="li"
                                key={optionKey}
                                {...optionProps}
                                sx={{
                                    color: selected ? '#fff' : 'inherit',
                                    bgcolor: selected ? '#0b57d0 !important' : 'transparent',
                                    '&.Mui-focused': {
                                        bgcolor: selected ? '#0b57d0 !important' : '#f5f5f5',
                                    },
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1.5} minWidth={0} width="100%">
                                    {showAvatar ? (
                                        <Avatar
                                            src={
                                                option.user_thumb_image ||
                                                option.user_image ||
                                                undefined
                                            }
                                            alt={option.name}
                                            sx={{ width: 32, height: 32, fontSize: '14px' }}
                                        >
                                            {option.name?.[0]?.toUpperCase()}
                                        </Avatar>
                                    ) : null}
                                    <Typography
                                        component="span"
                                        variant="body1"
                                        className="f-14"
                                        sx={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {option.name}
                                    </Typography>
                                    {selected ? (
                                        <Typography component="span" sx={{ fontSize: 22, lineHeight: 1 }}>
                                            ✓
                                        </Typography>
                                    ) : null}
                                </Box>
                            </Box>
                        );
                    }}
                    noOptionsText={`No ${label.toLowerCase()} found`}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                            },
                        },
                        listbox: {
                            sx: {
                                maxHeight: 360,
                                py: 0,
                                '& .MuiAutocomplete-option': {
                                    minHeight: 54,
                                    fontSize: '1rem',
                                },
                            },
                        },
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder={selectedOptions.length ? '' : label}
                            size="small"
                        />
                    )}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        '& .MuiOutlinedInput-root': {
                            minHeight: 56,
                            alignItems: 'center',
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            '& fieldset': { borderColor: '#e0e0e0' },
                            '&:hover fieldset': { borderColor: '#0d5ef4' },
                            '&.Mui-focused fieldset': { borderColor: '#0d5ef4' },
                        },
                    }}
                />
                <Box
                    onClick={() => {
                        setTempFilters((prev) => ({
                            ...prev,
                            [key]: allSelected ? [] : options.map((option) => option.id),
                        }));
                    }}
                    sx={{
                        width: { xs: 100, sm: 110 },
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        border: '1px solid',
                        borderColor: allSelected || value.length > 0 ? '#0d5ef4' : '#e0e0e0',
                        borderLeft: 0,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderTopRightRadius: '6px',
                        borderBottomRightRadius: '6px',
                        cursor: 'pointer',
                        color: '#6b687d',
                        userSelect: 'none',
                        transition: 'border-color 150ms ease',
                        '&:hover': { borderColor: '#0d5ef4' },
                    }}
                >
                    <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && value.length > 0}
                        size="small"
                        sx={{ p: 0, pointerEvents: 'none' }}
                    />
                    <Typography component="span" variant="body1">
                        All
                    </Typography>
                </Box>
            </Stack>
        );
    };

    const legendItems = useMemo(() => {
        const map = new Map<string, string | null | undefined>();
        data.forEach((item) => {
            const name = item.leave_name || item.leave_type;
            if (name && !map.has(name)) {
                map.set(name, item.leave_type);
            }
        });
        return Array.from(map.entries()).map(([name, leaveType]) => ({ name, leaveType }));
    }, [data]);

    const handleConfirmRestore = async () => {
        if (!selectedId || restoring) return;

        try {
            setRestoring(true);
            const response = await api.post('user-leaves/unarchive', { id: selectedId });
            if (response.data?.IsSuccess) {
                toast.success(response.data.message || 'Leave restored successfully.');
                setOpenDialog(false);
                setSelectedId(null);
                if (data.length <= 1 && pageIndex > 0) {
                    setPageIndex((prev) => Math.max(0, prev - 1));
                } else {
                    await fetchArchivedLeaves();
                }
                onWorkUpdated?.();
            } else {
                toast.error(response.data?.message || 'Failed to restore leave');
            }
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    err?.message ||
                    'Failed to restore leave',
            );
        } finally {
            setRestoring(false);
        }
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: '100%',
                    height: { xs: '92vh', md: '88vh' },
                    maxHeight: '100vh',
                    padding: { xs: 2, md: 3 },
                    backgroundColor: '#f9f9f9',
                    borderTopLeftRadius: { xs: 16, md: 24 },
                    borderTopRightRadius: { xs: 16, md: 24 },
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton onClick={onClose}>
                        <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h6" fontWeight={700}>
                        Archived Leave
                    </Typography>
                </Stack>
                <IconButton onClick={onClose}>
                    <IconX />
                </IconButton>
            </Box>

            <Box
                mb={2}
                display="flex"
                gap={1.5}
                alignItems="center"
                flexWrap="wrap"
                sx={{ flexShrink: 0, width: '100%' }}
            >
                <TextField
                    placeholder="Search leaves..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ width: { xs: '100%', sm: 320 } }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconSearch size={16} />
                            </InputAdornment>
                        ),
                    }}
                />
                <DateRangePickerBox
                    from={startDate}
                    to={endDate}
                    onChange={handleDateRangeChange}
                    buttonMinWidth={260}
                    buttonLabelAlign="left"
                />
                <Button
                    color="primary"
                    variant="contained"
                    size="small"
                    onClick={openFilterDialog}
                    sx={{ minWidth: 40, px: 1, minHeight: 40 }}
                    aria-label="Open filters"
                >
                    <IconFilter size={18} />
                </Button>
                {activeFilterCount > 0 ? (
                    <Button
                        color="error"
                        variant="outlined"
                        size="small"
                        onClick={handleClearAppliedFilters}
                        sx={{ minWidth: 40, px: 1, minHeight: 40 }}
                        aria-label="Clear filters"
                    >
                        <IconX size={18} />
                    </Button>
                ) : null}
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    overflow: 'auto',
                }}
            >
                {loading ? (
                    <Box display="flex" justifyContent="center" py={8}>
                        <CircularProgress size={28} />
                    </Box>
                ) : error ? (
                    <Box p={3} textAlign="center">
                        <Typography color="error" mb={1}>
                            {error}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={fetchArchivedLeaves}
                            sx={{ textTransform: 'none' }}
                        >
                            Retry
                        </Button>
                    </Box>
                ) : data.length === 0 ? (
                    <Box p={3} textAlign="center">
                        <Typography color="text.secondary">No archived leaves found.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ width: '100%', minWidth: 1100 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: TABLE_GRID_COLUMNS,
                                width: '100%',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1,
                                backgroundColor: '#f8fafc',
                                borderBottom: '1px solid #e5e7eb',
                            }}
                        >
                            {TABLE_COLUMNS.map((label, index) => (
                                <Box
                                    key={label || `action-${index}`}
                                    sx={{
                                        px: 2,
                                        py: 1.25,
                                        textAlign:
                                            label === 'Type' || label === 'Days' || label === ''
                                                ? 'center'
                                                : 'left',
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight={800}>
                                        {label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {data.map((item) => (
                            <Box
                                key={item.id}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: TABLE_GRID_COLUMNS,
                                    width: '100%',
                                    borderBottom: '1px solid #eef2f7',
                                    alignItems: 'center',
                                    '&:hover': { backgroundColor: '#fafafa' },
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    sx={{ px: 2, py: 1.25, minWidth: 0 }}
                                >
                                    <Avatar
                                        src={item.user_thumb_image || '/images/users/user.png'}
                                        alt={item.user_name || 'User'}
                                        sx={{ width: 36, height: 36, flexShrink: 0 }}
                                    />
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography fontWeight={800} noWrap>
                                            {item.user_name ||
                                                `${item.first_name} ${item.last_name}`.trim() ||
                                                'User'}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                            display="block"
                                        >
                                            {item.trade_name || '-'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Box sx={{ px: 2, py: 1.25, minWidth: 0 }}>
                                    <Typography
                                        fontWeight={700}
                                        noWrap
                                        title={item.leave_name || 'Leave'}
                                    >
                                        {item.leave_name || 'Leave'}
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        px: 1.5,
                                        py: 1.25,
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            px: 1.2,
                                            py: 0.2,
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'capitalize',
                                            whiteSpace: 'nowrap',
                                            ...leaveTypeChipSx(item.leave_type),
                                        }}
                                    >
                                        {item.leave_type || '-'}
                                    </Typography>
                                </Box>

                                <Box sx={{ px: 2, py: 1.25, minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        {item.display_date ||
                                            `${item.start_date || '-'} - ${item.end_date || '-'}`}
                                    </Typography>
                                </Box>

                                <Box sx={{ px: 1.5, py: 1.25, textAlign: 'center' }}>
                                    <Typography variant="body2" fontWeight={700}>
                                        {formatDuration(item)}
                                    </Typography>
                                </Box>

                                <Box sx={{ px: 2, py: 1.25, minWidth: 0 }}>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {formatTime(item)}
                                    </Typography>
                                </Box>

                                <Box sx={{ px: 2, py: 1.25, minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                        title={item.manager_note || undefined}
                                    >
                                        {item.manager_note || '-'}
                                    </Typography>
                                </Box>

                                <Box sx={{ px: 2, py: 1.25, minWidth: 0 }}>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {item.deleted_at || '-'}
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        px: 1,
                                        py: 1.25,
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <IconButton
                                        color="primary"
                                        size="small"
                                        disabled={restoring}
                                        onClick={() => {
                                            setSelectedId(item.id);
                                            setOpenDialog(true);
                                        }}
                                    >
                                        <IconArrowBackUp size={18} />
                                    </IconButton>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            <Box sx={{ flexShrink: 0, pt: 1.5 }}>
                {legendItems.length > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
                        {legendItems.map((item) => (
                            <Chip
                                key={item.name}
                                size="small"
                                label={item.name}
                                sx={{
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    ...leaveTypeChipSx(item.leaveType),
                                }}
                            />
                        ))}
                    </Stack>
                ) : null}

                {!loading && !error && totalItems > 0 ? (
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        gap={1}
                        mb={0.5}
                    >
                        <Typography color="textSecondary" className="f-14">
                            {data.length} out of {totalItems} Rows
                        </Typography>
                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5}>
                            <Typography color="textSecondary" className="f-14">
                                Page {pageIndex + 1} of {Math.max(1, totalPages)} | Entries :
                            </Typography>
                            <CustomSelect
                                value={pageSize}
                                onChange={(e: { target: { value: any } }) => {
                                    setPageSize(Number(e.target.value));
                                    setPageIndex(0);
                                }}
                                sx={{ minWidth: 64 }}
                            >
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <MenuItem key={size} value={size}>
                                        {size}
                                    </MenuItem>
                                ))}
                            </CustomSelect>
                            <IconButton
                                size="small"
                                sx={{ width: 30 }}
                                onClick={() => setPageIndex(0)}
                                disabled={pageIndex <= 0}
                            >
                                <IconChevronsLeft size={18} />
                            </IconButton>
                            <IconButton
                                size="small"
                                sx={{ width: 30 }}
                                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                                disabled={pageIndex <= 0}
                            >
                                <IconChevronLeft size={18} />
                            </IconButton>
                            <IconButton
                                size="small"
                                sx={{ width: 30 }}
                                onClick={() =>
                                    setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))
                                }
                                disabled={pageIndex >= totalPages - 1}
                            >
                                <IconChevronRight size={18} />
                            </IconButton>
                            <IconButton
                                size="small"
                                sx={{ width: 30 }}
                                onClick={() => setPageIndex(Math.max(0, totalPages - 1))}
                                disabled={pageIndex >= totalPages - 1}
                            >
                                <IconChevronsRight size={18} />
                            </IconButton>
                        </Stack>
                    </Stack>
                ) : null}
            </Box>

            <Dialog
                open={filterDialogOpen}
                onClose={() => setFilterDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ m: 0, position: 'relative', overflow: 'visible' }}>
                    Filters
                    <IconButton
                        aria-label="close"
                        onClick={() => setFilterDialogOpen(false)}
                        size="large"
                        sx={{
                            position: 'absolute',
                            right: 12,
                            top: 8,
                            color: (theme) => theme.palette.grey[900],
                            zIndex: 10,
                        }}
                    >
                        <IconX size={28} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        {renderFilterSelect('Users', 'users', userOptions, true)}
                        {renderFilterSelect('Leave', 'leaves', leaveOptions)}
                        {renderFilterSelect('Type', 'leaveTypes', LEAVE_TYPE_OPTIONS)}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClearFilters} color="inherit">
                        Clear
                    </Button>
                    <Button onClick={handleApplyFilters} variant="contained" color="primary">
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDialog}
                onClose={() => {
                    if (!restoring) {
                        setOpenDialog(false);
                        setSelectedId(null);
                    }
                }}
            >
                <DialogTitle>Restore Leave</DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">
                        Are you sure you want to <strong>restore</strong> this leave?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setOpenDialog(false);
                            setSelectedId(null);
                        }}
                        variant="outlined"
                        color="primary"
                        disabled={restoring}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={restoring}
                        onClick={handleConfirmRestore}
                    >
                        {restoring ? 'Restoring...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Drawer>
    );
};

export default ArchivedUserLeavesDrawer;
