'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    IconButton,
    InputAdornment,
    Popover,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    createColumnHelper,
    flexRender,
    SortingState,
} from '@tanstack/react-table';
import {IconEye, IconFilter, IconSearch, IconX} from '@tabler/icons-react';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import dayjs from 'dayjs';
import Image from 'next/image';
import api from '@/utils/axios';
import {useServerTable} from '@/hooks/useServerTable';
import {getTableSortQuery} from '@/utils/tableSort';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import {usePersistentColumnVisibility} from '@/hooks/usePersistentColumnVisibility';
import {tableFilterOptions} from '@/utils/uniqueFilterOptions';

type LabourRow = {
    row_id?: number;
    row_key?: string;
    worklog_id?: number;
    checklog_id?: number | null;
    id?: string | null;
    display_id?: string | null;
    team_id?: number | null;
    team_name?: string | null;
    user_id?: number | null;
    user_name?: string | null;
    type?: string | null;
    trade_id?: number | null;
    trade_name?: string | null;
    date?: string | null;
    shift_hours?: number | string | null;
    payable_hours?: number | string | null;
    payable_work_minutes?: number | string | null;
    amount_per_unit?: number | string | null;
    work_complete?: number | string | null;
    rate?: number | string | null;
    total?: number | string | null;
    check_in_number?: number | string | null;
    check_in_hours?: number | string | null;
    risk?: number | string | null;
    currency?: string | null;
};

type FilterOption = {
    id: number | string;
    name: string;
    user_code?: string | null;
};

type LabourFilterState = {
    teams: number[];
    users: number[];
    types: string[];
    trades: number[];
};

const EMPTY_LABOUR_FILTERS: LabourFilterState = {
    teams: [],
    users: [],
    types: [],
    trades: [],
};

const NUMERIC_COLUMNS = new Set([
    'shiftHours',
    'payable',
    'workComplete',
    'rate',
    'total',
    'checkInNumber',
    'checkInHours',
    'risk',
]);

const COLUMN_LABELS: Record<string, string> = {
    id: 'ID',
    team: 'Team',
    user: 'User',
    type: 'Type',
    trade: 'Trade',
    date: 'Date',
    hours: 'Hours',
    qty: 'Qty',
    rate: 'Rate',
    payable: 'Payable Hr',
    total: 'Total',
    checkInNumber: 'Check-in(No.)',
    checkInHours: 'Check-in',
    shiftHours: 'Shift',
    risk: 'Risk %',
};

const columnHelper = createColumnHelper<LabourRow>();

const formatNumber = (value: number | string | null | undefined) => {
    const numberValue = Number(value || 0);
    return Number.isInteger(numberValue)
        ? String(numberValue)
        : numberValue.toFixed(2);
};

const formatAmount = (
    currency: string | null | undefined,
    amount: number | string | null | undefined,
) => `${currency || '£'}${Number(amount || 0).toFixed(2)}`;

const getNumericResponseValue = (
    response: any,
    keys: string[],
    fallback = 0,
) => {
    for (const key of keys) {
        const value = response?.[key] ?? response?.data?.[key];
        const amount = Number(value);
        if (Number.isFinite(amount)) return amount;
    }

    return fallback;
};

const formatMinutesFromHours = (value: number | string | null | undefined) =>
    String(Math.round(Number(value || 0) * 60));

const formatOptionalNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '--';

    return formatNumber(value);
};

const formatPayableHour = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '--';

    const str = value.toString().trim();
    if (!str) return '--';

    if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
        const [h, m] = str.split(':');
        const minutes = parseFloat(m) || 0;
        return `${h.padStart(2, '0')}:${Math.floor(minutes).toString().padStart(2, '0')}`;
    }

    const num = parseFloat(str);
    if (isNaN(num)) return '--';

    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const Labour = ({projectId}: { projectId: number }) => {
    const session = useSession();
    const user = session.data?.user as User & {
        company_id?: number | null;
        id?: string | number | null;
    };
    const [data, setData] = useState<LabourRow[]>([]);
    const [currency, setCurrency] = useState('£');
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        {id: 'date', desc: true},
    ]);
    
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [filters, setFilters] = useState<LabourFilterState>(EMPTY_LABOUR_FILTERS);
    const [tempFilters, setTempFilters] = useState<LabourFilterState>(EMPTY_LABOUR_FILTERS);
    const [filterOpen, setFilterOpen] = useState(false);
    
    const [filterOptions, setFilterOptions] = useState<{
        teams: FilterOption[];
        users: FilterOption[];
        types: FilterOption[];
        trades: FilterOption[];
    }>({
        teams: [],
        users: [],
        types: [],
        trades: [],
    });
    
    const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(
        null,
    );
    
    const [columnSearch, setColumnSearch] = useState('');
    const {columnVisibility, onColumnVisibilityChange} =
        usePersistentColumnVisibility({
            storageKey: `cv_${user?.company_id}_${user?.id ?? 'user'}_project_labour`,
            enabled: Boolean(user?.company_id),
            alwaysVisibleColumns: ['select'],
        });

    const handleToggleSelect = useCallback((id: number) => {
        if (isSelectAll) {
            setIsSelectAll(false);
            const next = new Set(
                data
                    .map((row) => row.row_id)
                    .filter((value): value is number => typeof value === 'number'),
            );
            next.delete(id);
            setSelectedRowIds(next);
            return;
        }
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, [data, isSelectAll]);

    const handleToggleSelectAll = useCallback((checked: boolean) => {
        setIsSelectAll(checked);
        setSelectedRowIds(new Set());
    }, []);

    const handleFilterValueChange = (
        key: keyof LabourFilterState,
        value: Array<number | string>,
        numeric = true,
    ) => {
        const normalizedValue = numeric
            ? value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
            : value.map((item) => String(item)).filter(Boolean);

        setTempFilters((prev) => ({
            ...prev,
            [key]: normalizedValue,
        }));
    };

    const handleOpenFilters = () => {
        setTempFilters(filters);
        setFilterOpen(true);
    };

    const handleCloseFilters = () => {
        setFilterOpen(false);
    };

    const handleClearFilters = () => {
        setFilters(EMPTY_LABOUR_FILTERS);
        setTempFilters(EMPTY_LABOUR_FILTERS);
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
        setFilterOpen(false);
    };

    const handleClearAppliedFilters = (event: React.MouseEvent) => {
        event.stopPropagation();
        setFilters(EMPTY_LABOUR_FILTERS);
        setTempFilters(EMPTY_LABOUR_FILTERS);
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
        setFilterOpen(false);
    };

    const columns = useMemo(
        () => [
            // {
            //     id: 'select',
            //     enableSorting: false,
            //     enableHiding: false,
            //     header: () => (
            //         <Stack direction="row" alignItems="center">
            //             <CustomCheckbox
            //                 className="header-checkbox"
            //                 checked={
            //                     isSelectAll ||
            //                     (data.length > 0 &&
            //                         data.every((row) => selectedRowIds.has(row.row_id || 0)))
            //                 }
            //                 indeterminate={
            //                     !isSelectAll &&
            //                     selectedRowIds.size > 0 &&
            //                     selectedRowIds.size < data.length
            //                 }
            //                 onClick={(e: React.MouseEvent) => e.stopPropagation()}
            //                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            //                     e.stopPropagation();
            //                     e.preventDefault();
            //                     handleToggleSelectAll(e.target.checked);
            //                 }}
            //             />
            //         </Stack>
            //     ),
            //     cell: ({row}: { row: { original: LabourRow } }) => {
            //         const item = row.original;
            //         const rowId = item.row_id || 0;
            //         const isChecked = isSelectAll || selectedRowIds.has(rowId);
            //         const showCheckbox = isChecked || hoveredRow === rowId;
            //
            //         return (
            //             <Stack direction="row" alignItems="center">
            //                 <CustomCheckbox
            //                     className="row-checkbox"
            //                     checked={isChecked}
            //                     onClick={(e: React.MouseEvent) => e.stopPropagation()}
            //                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            //                         e.stopPropagation();
            //                         e.preventDefault();
            //                         handleToggleSelect(rowId);
            //                     }}
            //                     sx={{
            //                         opacity: showCheckbox ? 1 : 0,
            //                         pointerEvents: showCheckbox ? 'auto' : 'none',
            //                         transition: 'opacity 0.2s ease',
            //                     }}
            //                 />
            //             </Stack>
            //         );
            //     },
            // },
            
            columnHelper.accessor('display_id', {
                id: 'id',
                header: () => <Typography variant="subtitle2">ID</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {getValue() || '-'}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('team_name', {
                id: 'team',
                header: () => <Typography variant="subtitle2">Team</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {getValue() || '-'}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('user_name', {
                id: 'user',
                header: () => <Typography variant="subtitle2">User</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {getValue() || '-'}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('type', {
                id: 'type',
                header: () => <Typography variant="subtitle2">Type</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {getValue() || '-'}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('trade_name', {
                id: 'trade',
                header: () => <Typography variant="subtitle2">Trade</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {getValue() || '-'}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('date', {
                id: 'date',
                header: () => <Typography variant="subtitle2">Date</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {getValue() || '-'}
                    </Typography>
                ),
            }),

            columnHelper.accessor('work_complete', {
                id: 'qty',
                header: () => <Typography variant="subtitle2">Qty</Typography>,
                cell: ({row, getValue}) => {
                    const isPricework = String(row.original.type || '').toLowerCase() === 'pricework';

                    return (
                        <Typography className="f-14" color="textPrimary" noWrap>
                            {isPricework ? formatOptionalNumber(getValue()) : '--'}
                        </Typography>
                    );
                },
            }),
            
            columnHelper.accessor('rate', {
                id: 'rate',
                header: () => <Typography variant="subtitle2">Rate</Typography>,
                cell: ({row, getValue}) => {
                    const isDaywork = String(row.original.type || '').toLowerCase() === 'daywork';
                    const isPricework = String(row.original.type || '').toLowerCase() === 'pricework';
                    const rateValue = isPricework
                        ? row.original.amount_per_unit ?? getValue()
                        : getValue();

                    return (
                        <Typography className="f-14" color="textPrimary" noWrap>
                            {currency} {Number(rateValue || 0).toFixed(2)}
                            {isDaywork ? '/hr' : isPricework ? '/unit' : ''}
                        </Typography>
                    );
                },
            }),
            
            columnHelper.accessor('payable_hours', {
                id: 'payable',
                header: () => <Typography variant="subtitle2">Payable Hr</Typography>,
                cell: ({row, getValue}) => {
                    const payableHours = row.original.payable_work_minutes != null
                        ? Number(row.original.payable_work_minutes) / 60
                        : getValue();

                    return (
                        <Typography className="f-14" color="textPrimary" noWrap>
                            {formatPayableHour(payableHours)}
                        </Typography>
                    );
                },
            }),
            
            columnHelper.accessor('total', {
                id: 'total',
                header: () => <Typography variant="subtitle2">Total</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" fontWeight={500} color="textPrimary">
                        {currency}
                        {Number(getValue() || 0).toFixed(2)}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('check_in_number', {
                id: 'checkInNumber',
                header: () => (
                    <Typography variant="subtitle2">Check-in(No.)</Typography>
                ),
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {formatNumber(getValue())}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('check_in_hours', {
                id: 'checkInHours',
                header: () => (
                    <Typography variant="subtitle2">Check-in</Typography>
                ),
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {formatMinutesFromHours(getValue())}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('shift_hours', {
                id: 'shiftHours',
                header: () => <Typography variant="subtitle2">Shift</Typography>,
                cell: ({getValue}) => (
                    <Typography className="f-14" color="textPrimary" noWrap>
                        {formatMinutesFromHours(getValue())}
                    </Typography>
                ),
            }),
            
            columnHelper.accessor('risk', {
                id: 'risk',
                header: () => <Typography variant="subtitle2">Risk %</Typography>,
                cell: ({getValue}) => {
                    const risk = Number(getValue() || 0);
                    return (
                        <Typography
                            className="f-14"
                            fontWeight={600}
                            sx={{
                                color:
                                    risk < 0
                                        ? 'error.main'
                                        : risk >= 50
                                        ? 'error.main'
                                        : risk >= 20
                                            ? 'warning.main'
                                            : 'success.main',
                            }}
                        >
                            {risk}%
                        </Typography>
                    );
                },
            }),
        ],
        [
            currency,
            data,
            handleToggleSelect,
            handleToggleSelectAll,
            hoveredRow,
            isSelectAll,
            selectedRowIds,
        ],
    );

    const formattedStart = startDate ? dayjs(startDate).format('DD/MM/YYYY') : '';
    const formattedEnd = endDate ? dayjs(endDate).format('DD/MM/YYYY') : '';

    const fetchLabour = async () => {
        if (!user?.company_id || !projectId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                company_id: String(user.company_id),
                project_id: String(projectId),
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
            });
            if (searchTerm) params.set('search', searchTerm);
            if (formattedStart) params.set('start_date', formattedStart);
            if (formattedEnd) params.set('end_date', formattedEnd);
            if (filters.teams.length) params.set('team_ids', filters.teams.join(','));
            if (filters.users.length) params.set('user_ids', filters.users.join(','));
            if (filters.types.length) params.set('types', filters.types.join(','));
            if (filters.trades.length) params.set('trade_ids', filters.trades.join(','));
            const sortQuery = getTableSortQuery(sorting);
            if (sortQuery) {
                params.set('sort_by', sortQuery.sort_by);
                params.set('sort_order', sortQuery.sort_order);
            }

            const res = await api.get(
                `project-analytics/web-labors?${params.toString()}`,
            );
            const responseData = Array.isArray(res.data?.info) ? res.data.info : [];
            const apiFilterOptions = res.data?.filter_options || {};

            setData(responseData);
            setCurrency(res.data?.currency || '£');
            setTotalAmount(
                getNumericResponseValue(
                    res.data,
                    ['total_amount', 'total_labour_amount', 'amount_total'],
                    responseData.reduce(
                        (sum: number, item: LabourRow) =>
                            sum + Number(item.total || 0),
                        0,
                    ),
                ),
            );
            setFilterOptions((prev) => ({
                teams: tableFilterOptions(
                    apiFilterOptions.teams,
                    responseData,
                    'team_id',
                    'team_name',
                    prev.teams,
                ),
                users: tableFilterOptions(
                    apiFilterOptions.users,
                    responseData,
                    'user_id',
                    'user_name',
                    prev.users,
                ),
                types: tableFilterOptions(
                    apiFilterOptions.types,
                    responseData,
                    'type',
                    'type',
                    prev.types,
                ),
                trades: tableFilterOptions(
                    apiFilterOptions.trades,
                    responseData,
                    'trade_id',
                    'trade_name',
                    prev.trades,
                ),
            }));
            
            setIsSelectAll(false);
            setSelectedRowIds(new Set());

            const pagMeta =
                res.data?.data?.totalPages !== undefined ||
                res.data?.data?.totalItems !== undefined
                    ? res.data.data
                    : {};

            if (pagMeta.totalItems !== undefined) {
                setTotalRows(pagMeta.totalItems);
            } else {
                setTotalRows(Array.isArray(responseData) ? responseData.length : 0);
            }

            if (pagMeta.totalPages !== undefined) {
                setPageCount(pagMeta.totalPages);
            } else if (pagMeta.last_page !== undefined) {
                setPageCount(pagMeta.last_page);
            }
        } catch (err) {
            console.error('Failed to fetch project labour details', err);
            setData([]);
            setTotalAmount(0);
            setTotalRows(0);
            setPageCount(0);
        }
        setLoading(false);
    };

    const {table, pagination, totalRows, setTotalRows, setPageCount} =
        useServerTable({
            data,
            columns,
            fetchData: fetchLabour,
            debounceDependencies: [
                searchTerm,
                formattedStart,
                formattedEnd,
                user?.company_id,
                projectId,
                filters.teams.join(','),
                filters.users.join(','),
                filters.types.join(','),
                filters.trades.join(','),
            ],
            state: {sorting, columnVisibility},
            onSortingChange: setSorting,
            onColumnVisibilityChange,
            manualSorting: true,
            getRowId: (row) => String(row.row_key || row.row_id || row.id),
        });

    const visibleColCount =
        table.getVisibleLeafColumns().length || columns.length;
    const skeletonColumns = table.getVisibleLeafColumns().map((column) => ({
        name: column.id ?? 'Column',
    }));
    const selectedCount = isSelectAll ? data.length : selectedRowIds.size;

    const columnToggles = table
        .getAllLeafColumns()
        .filter((column) => column.id !== 'select')
        .map((column) => ({
            id: column.id,
            label: COLUMN_LABELS[column.id] || column.id,
            visible: column.getIsVisible(),
            toggleVisibility: column.toggleVisibility,
        }));

    const filteredColumnToggles = columnToggles.filter((column) =>
        column.label.toLowerCase().includes(columnSearch.trim().toLowerCase()),
    );

    const allColumnsSelected =
        filteredColumnToggles.length > 0 &&
        filteredColumnToggles.every((column) => column.visible);

    const someColumnsSelected = filteredColumnToggles.some(
        (column) => column.visible,
    );
    const activeFilterCount =
        filters.teams.length +
        filters.users.length +
        filters.types.length +
        filters.trades.length;

    const renderFilterSelect = (
        label: string,
        key: keyof LabourFilterState,
        options: FilterOption[],
        numeric = true,
    ) => {
        const value = tempFilters[key] as Array<number | string>;
        const selectedValueStrings = value.map(String);
        const selectedOptions = options.filter((option) =>
            selectedValueStrings.includes(String(option.id)),
        );

        return (
            <Autocomplete
                multiple
                disableCloseOnSelect
                options={options}
                value={selectedOptions}
                getOptionLabel={(option) => option.user_code ? `${option.name} (${option.user_code})` : option.name}
                isOptionEqualToValue={(option, selectedOption) => String(option.id) === String(selectedOption.id)}
                onChange={(_, selected) => {
                    handleFilterValueChange(
                        key,
                        selected.map((option) => numeric ? Number(option.id) : String(option.id)),
                        numeric,
                    );
                }}
                renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                        const {key: chipKey, ...tagProps} = getTagProps({index});

                        return (
                            <Chip
                                key={chipKey}
                                label={option.name}
                                color="primary"
                                size="small"
                                {...tagProps}
                                sx={{borderRadius: '4px', height: 28}}
                            />
                        );
                    })
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        size="small"
                        placeholder={selectedOptions.length ? '' : `Select ${label.toLowerCase()}`}
                    />
                )}
            />
        );
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <Stack
                    mr={2}
                    ml={2}
                    mb={1}
                    mt={1}
                    justifyContent="space-between"
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={{xs: 1, sm: 2}}
                    alignItems={{sm: 'center'}}
                >
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <DateRangePickerBox
                            from={startDate}
                            to={endDate}
                            onChange={(range) => {
                                setStartDate(range.from);
                                setEndDate(range.to);
                            }}
                        />
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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

                        <Button
                            color="primary"
                            variant="contained"
                            size="small"
                            onClick={handleOpenFilters}
                            aria-label="Open filters"
                            sx={{
                                minHeight: 34,
                                height: 34,
                                whiteSpace: 'nowrap',
                                textTransform: 'none',
                                fontWeight: 600,
                                minWidth: 40,
                                px: 1.5,
                                mt: { xs: 1, sm: 0 }
                            }}
                        >
                            <IconFilter size={18}/>
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button
                                color="error"
                                variant="outlined"
                                size="small"
                                onClick={handleClearAppliedFilters}
                                aria-label="Clear filters"
                                sx={{
                                    minHeight: 34,
                                    height: 34,
                                    whiteSpace: 'nowrap',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    minWidth: 64,
                                    px: 1.5,
                                }}
                            >
                                <IconX size={18}/>
                            </Button>
                        )}
                        
                    </Box>
                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.75}>
                        <Box
                            sx={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 0.75,
                                py: 0.75,
                                px: 1.25,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" noWrap>
                                Total
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                                {formatAmount(currency, totalAmount)}
                            </Typography>
                        </Box>
                        <Tooltip title="Column visibility">
                            <IconButton
                                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                                color="primary"
                                size="small"
                            >
                                <IconEye size={20}/>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Stack>

                <Dialog
                    open={filterOpen}
                    onClose={handleCloseFilters}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                        sx: {
                            width: {xs: 'calc(100vw - 24px)', sm: '100%'},
                            maxWidth: 600,
                            m: {xs: 1.5, sm: 4},
                            overflow: 'visible',
                        },
                    }}
                >
                    <DialogTitle sx={{m: 0, position: 'relative', overflow: 'visible'}}>
                        Filters
                        <IconButton
                            aria-label="Close"
                            onClick={handleCloseFilters}
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
                            <IconX size={40} style={{width: 40, height: 40}}/>
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{overflowX: 'hidden'}}>
                        <Stack spacing={2} mt={1} sx={{width: '100%', minWidth: 0}}>
                            {renderFilterSelect('Teams', 'teams', filterOptions.teams)}
                            {renderFilterSelect('Users', 'users', filterOptions.users)}
                            {renderFilterSelect('Types', 'types', filterOptions.types, false)}
                            {renderFilterSelect('Trades', 'trades', filterOptions.trades)}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClearFilters} color="inherit">
                            Clear
                        </Button>
                        <Button variant="contained" onClick={handleApplyFilters}>
                            Apply
                        </Button>
                    </DialogActions>
                </Dialog>

                <Popover
                    open={Boolean(columnMenuAnchor)}
                    anchorEl={columnMenuAnchor}
                    onClose={() => {
                        setColumnMenuAnchor(null);
                        setColumnSearch('');
                    }}
                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                    transformOrigin={{vertical: 'top', horizontal: 'right'}}
                    PaperProps={{
                        sx: {
                            p: 1.25,
                            width: 280,
                            borderRadius: 2,
                            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                            border: '1px solid #e5e7eb',
                            maxHeight: 'min(420px, calc(100vh - 140px))',
                            overflow: 'hidden',
                        },
                    }}
                >
                    <TextField
                        size="small"
                        placeholder="Search columns..."
                        fullWidth
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        sx={{
                            mb: 1,
                            '& .MuiInputBase-root': {
                                borderRadius: 1.5,
                                backgroundColor: '#fff',
                            },
                        }}
                    />
                    <Box
                        sx={{
                            maxHeight: 'calc(min(420px, calc(100vh - 140px)) - 64px)',
                            overflowY: 'auto',
                            pr: 0.5,
                        }}
                    >
                        <FormGroup sx={{gap: 0.25}}>
                            <FormControlLabel
                                control={
                                    <CustomCheckbox
                                        size="small"
                                        checked={allColumnsSelected}
                                        indeterminate={!allColumnsSelected && someColumnsSelected}
                                        disabled={filteredColumnToggles.length === 0}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            filteredColumnToggles.forEach((column) => {
                                                column.toggleVisibility(e.target.checked);
                                            });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{p: 0.5, mr: 1}}
                                    />
                                }
                                sx={{
                                    m: 0,
                                    px: 0.75,
                                    py: 0.375,
                                    width: '100%',
                                    borderRadius: 1.5,
                                    alignItems: 'center',
                                    textTransform: 'none',
                                    borderBottom: '1px solid #eef2f7',
                                    mb: 0.25,
                                    '&:hover': {backgroundColor: '#f8fafc'},
                                    '& .MuiFormControlLabel-label': {
                                        fontSize: '14px',
                                        lineHeight: 1.35,
                                        whiteSpace: 'nowrap',
                                        fontWeight: 600,
                                    },
                                }}
                                onClick={(e) => e.stopPropagation()}
                                label="Select All"
                            />
                            {filteredColumnToggles.map((column) => (
                                <FormControlLabel
                                    key={column.id}
                                    control={
                                        <CustomCheckbox
                                            size="small"
                                            checked={column.visible}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                column.toggleVisibility(!column.visible);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{p: 0.5, mr: 1}}
                                        />
                                    }
                                    sx={{
                                        m: 0,
                                        px: 0.75,
                                        py: 0.375,
                                        width: '100%',
                                        borderRadius: 1.5,
                                        alignItems: 'center',
                                        textTransform: 'none',
                                        '&:hover': {backgroundColor: '#f8fafc'},
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '14px',
                                            lineHeight: 1.35,
                                            whiteSpace: 'nowrap',
                                        },
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    label={column.label}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                </Popover>

                <TableContainer
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'auto',
                        overflowY: 'auto',
                    }}
                >
                    <Table stickyHeader aria-label="project labour details">
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const isActive = header.column.getIsSorted();
                                        const isAsc = isActive === 'asc';
                                        const isSortable = header.column.getCanSort();

                                        return (
                                            <TableCell
                                                key={header.id}
                                                align={
                                                    NUMERIC_COLUMNS.has(header.column.id)
                                                        ? 'right'
                                                        : 'left'
                                                }
                                                padding={
                                                    header.column.id === 'select' ? 'checkbox' : 'normal'
                                                }
                                                sx={{
                                                    paddingTop: '10px',
                                                    paddingBottom: '10px',
                                                    whiteSpace: 'nowrap',
                                                    bgcolor: 'background.paper',
                                                    width: header.column.id === 'select' ? 42 : 'auto',
                                                }}
                                            >
                                                <Box
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    sx={{
                                                        cursor: isSortable ? 'pointer' : 'default',
                                                        border: '2px solid transparent',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: NUMERIC_COLUMNS.has(
                                                            header.column.id,
                                                        )
                                                            ? 'flex-end'
                                                            : 'flex-start',
                                                        '&:hover': isSortable
                                                            ? {color: '#888'}
                                                            : undefined,
                                                        '&:hover .hoverIcon': {opacity: 1},
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
                            {loading ? (
                                <SkeletonLoader columns={skeletonColumns} rowCount={8}/>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={Math.max(visibleColCount, 1)}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: 'calc(50vh - 100px)',
                                                gap: 1,
                                            }}
                                        >
                                            <Image
                                                src="/images/no-data.png"
                                                alt="No labour data"
                                                width={200}
                                                height={200}
                                                style={{maxWidth: '100%', maxHeight: '100%'}}
                                            />
                                            <Typography color="text.secondary" className="f-14">
                                                No labour found for this project
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        selected={
                                            isSelectAll || selectedRowIds.has(row.original.row_id || 0)
                                        }
                                        onMouseEnter={() => setHoveredRow(row.original.row_id || 0)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        sx={{
                                            '&:hover .row-checkbox': {
                                                opacity: '1 !important',
                                                pointerEvents: 'auto',
                                            },
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                align={
                                                    NUMERIC_COLUMNS.has(cell.column.id) ? 'right' : 'left'
                                                }
                                                padding={
                                                    cell.column.id === 'select' ? 'checkbox' : 'normal'
                                                }
                                            >
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
            </Box>

            <TablePaginationFooter
                table={table}
                totalRows={totalRows}
                selectedCount={selectedCount}
            />
        </Box>
    );
};

export default Labour;
