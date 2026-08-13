'use client';

import React, {useMemo, useState} from 'react';
import {
    Avatar,
    Box,
    FormControlLabel,
    FormGroup,
    IconButton,
    InputAdornment,
    Popover,
    Stack,
    Tab,
    Tabs,
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
import {IconEye, IconSearch} from '@tabler/icons-react';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import {format, subDays} from 'date-fns';
import {
    createColumnHelper,
    flexRender,
    SortingState,
    VisibilityState,
} from '@tanstack/react-table';
import Image from 'next/image';
import api from '@/utils/axios';
import {useServerTable} from '@/hooks/useServerTable';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import PriceworkStatusBadge from './components/PriceworkStatusBadge';
import PriceworkDetailsDrawer from './components/PriceworkDetailsDrawer';
import PriceworkAttachmentsDrawer from './components/PriceworkAttachmentsDrawer';
import {
    PriceworkApiRow,
    PriceworkTabItem,
    PriceworkTabKey,
    normalizePriceworkStatus,
} from './types';

type PriceworkRow = PriceworkApiRow;

const columnHelper = createColumnHelper<PriceworkRow>();

const COLUMN_LABELS: Record<string, string> = {
    user_name: 'User',
    project_name: 'Project',
    address_name: 'Address',
    team_name: 'Team',
    pricework_date: 'Pricework Date',
    work_type: 'Work Type',
    unit_name: 'Unit',
    amount_per_unit: 'Amount Per Unit',
    work_complete: 'Work Complete',
    pricework_amount: 'Pricework Amount',
    note: 'Note',
    attachment_count: 'Attachments',
    status: 'Status',
    actions: 'Actions',
};

const formatAmount = (currency: string | null | undefined, amount: number | string | null | undefined) =>
    `${currency || '£'}${Number(amount || 0).toFixed(2)}`;

const PriceworkList = () => {
    const {data: session} = useSession();
    const user = session?.user as User | undefined;

    const [data, setData] = useState<PriceworkRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 6));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [sorting, setSorting] = useState<SortingState>([
        {id: 'pricework_date', desc: true},
    ]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        Object.fromEntries(Object.keys(COLUMN_LABELS).map((id) => [id, true])),
    );
    const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
    const [columnSearch, setColumnSearch] = useState('');
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [activeTab, setActiveTab] = useState<PriceworkTabKey>('all');
    const [tabCounts, setTabCounts] = useState({
        all: 0,
        pending: 0,
        approved: 0,
        sent: 0,
        rejected: 0,
    });
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsPricework, setDetailsPricework] = useState<PriceworkRow | null>(null);
    const [attachmentsOpen, setAttachmentsOpen] = useState(false);
    const [attachmentsPriceworkId, setAttachmentsPriceworkId] = useState<number | null>(null);

    const clearSelection = () => {
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
    };

    const handleTabChange = (tab: PriceworkTabKey) => {
        setActiveTab(tab);
        clearSelection();
    };

    const openPriceworkDetails = (row: PriceworkRow) => {
        setDetailsPricework(row);
        setDetailsOpen(true);
    };

    const closePriceworkDetails = () => {
        setDetailsOpen(false);
        setDetailsPricework(null);
    };

    const openPriceworkAttachments = (priceworkId: number) => {
        setAttachmentsPriceworkId(priceworkId);
        setAttachmentsOpen(true);
    };

    const closePriceworkAttachments = () => {
        setAttachmentsOpen(false);
        setAttachmentsPriceworkId(null);
    };

    const handleToggleSelect = (id: number) => {
        if (isSelectAll) {
            setIsSelectAll(false);
            const next = new Set(data.map((row) => row.id));
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
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setIsSelectAll(checked);
        setSelectedRowIds(new Set());
    };

    const selectedCount = isSelectAll ? data.length : selectedRowIds.size;

    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: () => (
                    <Stack direction="row" alignItems="center">
                        <CustomCheckbox
                            className="header-checkbox"
                            checked={
                                isSelectAll ||
                                (data.length > 0 && data.every((row) => selectedRowIds.has(row.id)))
                            }
                            indeterminate={
                                !isSelectAll &&
                                selectedRowIds.size > 0 &&
                                selectedRowIds.size < data.length
                            }
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleToggleSelectAll(e.target.checked);
                            }}
                        />
                    </Stack>
                ),
                cell: ({row}: {row: {original: PriceworkRow}}) => {
                    const item = row.original;
                    const isChecked = isSelectAll || selectedRowIds.has(item.id);
                    return (
                        <Stack direction="row" alignItems="center">
                            <CustomCheckbox
                                checked={isChecked}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleToggleSelect(item.id);
                                }}
                            />
                        </Stack>
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
            columnHelper.accessor('user_name', {
                id: 'user_name',
                header: () => 'User',
                cell: (info) => {
                    const row = info.row.original;
                    const name = row.user_name?.trim() || 'Unknown';
                    const role = row.trade_name?.trim() || '—';

                    return (
                        <Stack direction="row" alignItems="center" spacing={4} sx={{px: 1.5}}>
                            <Avatar
                                src={row.user_thumb_image || '/images/users/user.png'}
                                alt={name}
                                sx={{width: 36, height: 36}}
                                imgProps={{
                                    onError: (e) => {
                                        const target = e.currentTarget;
                                        if (target.src.includes('/images/users/user.png')) return;
                                        target.src = '/images/users/user.png';
                                    },
                                }}
                            />
                            <Box>
                                <Typography
                                    className="f-14"
                                    color="textPrimary"
                                    sx={{width: 150}}
                                >
                                    {name}
                                </Typography>
                                <Typography
                                    color="textSecondary"
                                    variant="subtitle1"
                                    width={150}
                                    noWrap
                                >
                                    {role}
                                </Typography>
                            </Box>
                        </Stack>
                    );
                },
                enableSorting: false,
            }),
            columnHelper.accessor('project_name', {
                id: 'project_name',
                header: () => 'Project',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('address_name', {
                id: 'address_name',
                header: () => 'Address',
                cell: (info) => (
                    <Typography
                        className="f-14"
                        sx={{
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={info.getValue() || undefined}
                    >
                        {info.getValue() || '—'}
                    </Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('team_name', {
                id: 'team_name',
                header: () => 'Team',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('pricework_date', {
                id: 'pricework_date',
                header: () => 'Pricework Date',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('work_type', {
                id: 'work_type',
                header: () => 'Work Type',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('unit_name', {
                id: 'unit_name',
                header: () => 'Unit',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('amount_per_unit', {
                id: 'amount_per_unit',
                header: () => 'Amount Per Unit',
                cell: (info) => (
                    <Typography className="f-14">
                        {formatAmount(info.row.original.currency, info.getValue())}
                    </Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('work_complete', {
                id: 'work_complete',
                header: () => 'Work Complete',
                cell: (info) => (
                    <Typography className="f-14">{Number(info.getValue() || 0)}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('pricework_amount', {
                id: 'pricework_amount',
                header: () => 'Pricework Amount',
                cell: (info) => (
                    <Typography className="f-14" fontWeight={600}>
                        {formatAmount(info.row.original.currency, info.getValue())}
                    </Typography>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('note', {
                id: 'note',
                header: () => 'Note',
                cell: (info) => (
                    <Typography
                        className="f-14"
                        sx={{
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={info.getValue() || undefined}
                    >
                        {info.getValue() || '—'}
                    </Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('attachment_count', {
                id: 'attachment_count',
                header: () => 'Attachments',
                cell: (info) => {
                    const count = Number(info.getValue() || 0);
                    const row = info.row.original;
                    return count > 0 ? (
                        <Typography
                            className="f-14"
                            sx={{
                                color: 'primary.main',
                                fontWeight: 500,
                                cursor: 'pointer',
                                '&:hover': {textDecoration: 'underline'},
                            }}
                            onClick={() => openPriceworkAttachments(row.id)}
                        >
                            View ({count})
                        </Typography>
                    ) : (
                        <Typography className="f-14" color="text.secondary">
                            —
                        </Typography>
                    );
                },
                enableSorting: false,
            }),
            columnHelper.accessor('status', {
                id: 'status',
                header: () => 'Status',
                cell: (info) => (
                    <PriceworkStatusBadge status={normalizePriceworkStatus(info.getValue())} />
                ),
                enableSorting: true,
            }),
            columnHelper.display({
                id: 'actions',
                header: () => 'Actions',
                cell: (info) => (
                    <Tooltip title="View details">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openPriceworkDetails(info.row.original)}
                        >
                            <IconEye size={18} />
                        </IconButton>
                    </Tooltip>
                ),
                enableSorting: false,
                enableHiding: false,
            }),
        ],
        [data, isSelectAll, selectedRowIds],
    );

    const fetchPriceworks = async () => {
        if (!user?.company_id) return;
        setLoading(true);
        try {
            let url = `pricework/list-web?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (startDate) url += `&start_date=${format(startDate, 'dd/MM/yyyy')}`;
            if (endDate) url += `&end_date=${format(endDate, 'dd/MM/yyyy')}`;
            if (activeTab !== 'all') url += `&status=${activeTab}`;

            if (sorting.length > 0) {
                const sortId =
                    sorting[0].id === 'status' ? 'approval_status' : sorting[0].id;
                url += `&sort_by=${sortId}&sort_order=${sorting[0].desc ? 'desc' : 'asc'}`;
            }

            const res = await api.get(url);
            if (res.data) {
                const responseData = Array.isArray(res.data.info) ? res.data.info : [];
                setData(responseData);
                clearSelection();

                const pagMeta = res.data.data || {};
                setTotalRows(
                    pagMeta.totalItems !== undefined ? pagMeta.totalItems : responseData.length,
                );
                if (pagMeta.totalPages !== undefined) {
                    setPageCount(pagMeta.totalPages);
                }

                if (res.data.status_counts) {
                    setTabCounts({
                        all: Number(res.data.status_counts.all || 0),
                        pending: Number(res.data.status_counts.pending || 0),
                        approved: Number(res.data.status_counts.approved || 0),
                        sent: Number(res.data.status_counts.sent || 0),
                        rejected: Number(res.data.status_counts.rejected || 0),
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch priceworks', error);
            setData([]);
            setTotalRows(0);
            setPageCount(0);
            clearSelection();
        } finally {
            setLoading(false);
        }
    };

    const {
        table,
        pagination,
        setPageCount,
        totalRows,
        setTotalRows,
    } = useServerTable({
        data,
        columns,
        fetchData: fetchPriceworks,
        debounceDependencies: [
            user?.company_id,
            search,
            startDate ? format(startDate, 'yyyy-MM-dd') : '',
            endDate ? format(endDate, 'yyyy-MM-dd') : '',
            activeTab,
        ],
        state: {sorting, columnVisibility},
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        manualSorting: true,
    });

    const tabs: PriceworkTabItem[] = useMemo(
        () => [
            {key: 'all', label: 'All', count: tabCounts.all},
            {key: 'pending', label: 'Pending', count: tabCounts.pending},
            {key: 'approved', label: 'Approved', count: tabCounts.approved},
            {key: 'sent', label: 'Sent', count: tabCounts.sent},
            {key: 'rejected', label: 'Rejected', count: tabCounts.rejected},
        ],
        [tabCounts],
    );

    const visibleColCount = table.getVisibleLeafColumns().length;
    const simpleColumns = table
        .getAllLeafColumns()
        .filter((col) => col.getIsVisible())
        .map((col) => ({name: col.id}));

    const filteredColumnToggles = Object.keys(COLUMN_LABELS).filter(
        (id) =>
            id !== 'actions' &&
            COLUMN_LABELS[id].toLowerCase().includes(columnSearch.trim().toLowerCase()),
    );

    const allColumnsSelected =
        filteredColumnToggles.length > 0 &&
        filteredColumnToggles.every((id) => columnVisibility[id] !== false);
    const someColumnsSelected = filteredColumnToggles.some(
        (id) => columnVisibility[id] !== false,
    );

    return (
        <Box
            sx={{
                height: 'calc(100vh - 100px)',
                display: 'flex',
                flexDirection: 'column',
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
                    spacing={{xs: 1, sm: 2, md: 4}}
                    alignItems={{sm: 'center'}}
                >
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <DateRangePickerBox
                            from={startDate}
                            to={endDate}
                            onChange={(range) => {
                                setStartDate(range.from ?? null);
                                setEndDate(range.to ?? null);
                                clearSelection();
                            }}
                        />
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                clearSelection();
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{width: {xs: '100%', sm: 180}}}
                        />
                    </Box>

                    <Box display="flex" justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Column visibility">
                            <IconButton
                                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                                color="primary"
                                size="small"
                            >
                                <IconEye size={20} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Stack>

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
                                        onChange={(e) => {
                                            const next = {...columnVisibility};
                                            filteredColumnToggles.forEach((id) => {
                                                next[id] = e.target.checked;
                                            });
                                            setColumnVisibility(next);
                                        }}
                                        sx={{p: 0.5, mr: 1}}
                                    />
                                }
                                sx={{
                                    m: 0,
                                    px: 0.75,
                                    py: 0.375,
                                    width: '100%',
                                    borderRadius: 1.5,
                                    borderBottom: '1px solid #eef2f7',
                                    mb: 0.25,
                                    '&:hover': {backgroundColor: '#f8fafc'},
                                    '& .MuiFormControlLabel-label': {
                                        fontSize: '14px',
                                        fontWeight: 600,
                                    },
                                }}
                                label="Select All"
                            />
                            {filteredColumnToggles.map((id) => (
                                <FormControlLabel
                                    key={id}
                                    control={
                                        <CustomCheckbox
                                            size="small"
                                            checked={columnVisibility[id] !== false}
                                            onChange={() =>
                                                setColumnVisibility((prev) => ({
                                                    ...prev,
                                                    [id]: !(prev[id] !== false),
                                                }))
                                            }
                                            sx={{p: 0.5, mr: 1}}
                                        />
                                    }
                                    sx={{
                                        m: 0,
                                        px: 0.75,
                                        py: 0.375,
                                        width: '100%',
                                        borderRadius: 1.5,
                                        '&:hover': {backgroundColor: '#f8fafc'},
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '14px',
                                            whiteSpace: 'nowrap',
                                        },
                                    }}
                                    label={COLUMN_LABELS[id]}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                </Popover>

                <Box sx={{mx: 2, borderBottom: '1px solid', borderColor: 'divider'}}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, value: PriceworkTabKey) => handleTabChange(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 42,
                            '& .MuiTabs-indicator': {height: 2, bgcolor: 'primary.main'},
                            '& .MuiTab-root': {
                                minHeight: 42,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: 14,
                                color: 'text.secondary',
                                px: 1.5,
                                mr: 0.5,
                                '&.Mui-selected': {
                                    color: 'primary.main',
                                    fontWeight: 600,
                                },
                            },
                        }}
                    >
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.key}
                                value={tab.key}
                                label={`${tab.label} (${tab.count})`}
                                disableRipple
                            />
                        ))}
                    </Tabs>
                </Box>

                <TableContainer
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'auto',
                        overflowY: 'auto',
                    }}
                >
                    <Table stickyHeader aria-label="priceworks sticky table">
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const isSortable = header.column.getCanSort();
                                        const isActive = header.column.getIsSorted();
                                        const isAsc = isActive === 'asc';
                                        return (
                                            <TableCell
                                                key={header.id}
                                                padding={
                                                    header.column.id === 'select'
                                                        ? 'checkbox'
                                                        : 'normal'
                                                }
                                                sx={{
                                                    whiteSpace: 'nowrap',
                                                    bgcolor: 'background.paper',
                                                    py: 1.25,
                                                    cursor: isSortable ? 'pointer' : 'default',
                                                }}
                                                onClick={
                                                    isSortable
                                                        ? header.column.getToggleSortingHandler()
                                                        : undefined
                                                }
                                            >
                                                <Box
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent={
                                                        header.column.id === 'actions'
                                                            ? 'flex-end'
                                                            : 'flex-start'
                                                    }
                                                    sx={{
                                                        ...(isSortable && {
                                                            '&:hover': {color: '#888'},
                                                        }),
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
                                <SkeletonLoader columns={simpleColumns} rowCount={8} />
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
                                                alt="No pricework data"
                                                style={{maxWidth: '100%', maxHeight: '100%'}}
                                                width={200}
                                                height={200}
                                            />
                                            <Typography color="text.secondary" className="f-14">
                                                No pricework records found
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        hover
                                        key={row.id}
                                        selected={
                                            isSelectAll || selectedRowIds.has(row.original.id)
                                        }
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                align={
                                                    cell.column.id === 'actions' ? 'right' : 'left'
                                                }
                                                padding={
                                                    cell.column.id === 'select'
                                                        ? 'checkbox'
                                                        : 'normal'
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

            <PriceworkDetailsDrawer
                open={detailsOpen}
                onClose={closePriceworkDetails}
                pricework={detailsPricework}
                onViewAttachments={(id) => {
                    openPriceworkAttachments(id);
                }}
            />

            <PriceworkAttachmentsDrawer
                open={attachmentsOpen}
                priceworkId={attachmentsPriceworkId}
                onClose={closePriceworkAttachments}
            />
        </Box>
    );
};

export default PriceworkList;
