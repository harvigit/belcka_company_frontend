'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Drawer,
} from '@mui/material';
import { IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { AxiosResponse } from 'axios';

import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import TimeClockDetails from './time-clock-details';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

import 'react-day-picker/dist/style.css';
import '../../../../global.css';

const columnHelper = createColumnHelper<TimeClock>();

export type TimeClock = {
    weekly_payable_amount: number;
    company_id: string;
    week_range: any;
    weekly_total_hours: string | number;
    daylog_payable_amount: number;
    pricework_total_amount: number;
    total_payable_amount: number;
    user_id: any;
    user_name: string;
    trade_name: string;
    type: string;
    user_thumb_image: string;
    start_date: string;
    end_date: string;
    days: Record<string, any>;
    payable_total_hours: string;
    total_hours?: string | number;
    total_break_hours?: string | number;
};

type TimeClockResponse = {
    IsSuccess: boolean;
    info: TimeClock[];
    currency: string;
};

type FilterState = {
    type: string;
};

type SortingState = Array<{
    id: string;
    desc: boolean;
}>;

type PaginationState = {
    pageIndex: number;
    pageSize: number;
};

const TimeClock = () => {
    // Initialize default date range (current week)
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);

    // State management
    const [data, setData] = useState<TimeClock[]>([]);
    const [currency, setCurrency] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filters, setFilters] = useState<FilterState>({ type: '' });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [startDate, setStartDate] = useState<Date | null>(defaultStart);
    const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [selectedTimeClock, setSelectedTimeClock] = useState<TimeClock | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

    const fetchData = async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            const response: AxiosResponse<TimeClockResponse> = await api.get('/timesheet/get-time-clock', {
                params,
            });

            if (response.data.IsSuccess) {
                setData(response.data.info);
                if (response.data.currency !== null) {
                    setCurrency(response.data.currency);
                }
            }
        } catch (error) {
            console.error('Error fetching timesheet data:', error);
        }
    };

    useEffect(() => {
        if (startDate && endDate) fetchData(startDate, endDate);
    }, [startDate, endDate]);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
        }
    };

    const handleRowClick = (timeClock: TimeClock) => {
        setSelectedTimeClock(timeClock);
        setDetailsOpen(true);
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setSelectedTimeClock(null);
    };

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchesSearch =
                item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.trade_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filters.type ? item.type === filters.type : true;
            return matchesSearch && matchesType;
        });
    }, [data, searchTerm, filters]);

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '-';
        const num = parseFloat(val.toString());
        if (isNaN(num)) return '-';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const columns: any = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }: { table: any }) => (
                    <CustomCheckbox
                        checked={table.getIsAllPageRowsSelected()}
                        indeterminate={table.getIsSomePageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                ),
                cell: ({ row }: { row: any }) => (
                    <CustomCheckbox
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        indeterminate={row.getIsSomeSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
                size: 30,
            },
            columnHelper.accessor('user_name', {
                id: 'user_name',
                header: 'Name',
                cell: (info: any) => {
                    const row = info.row.original;
                    return (
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar src={row.user_thumb_image} alt={row.user_name} sx={{ width: 36, height: 36 }} />
                            <Box textAlign="left">
                                <Typography>{row.user_name}</Typography>
                                <Typography color="textSecondary" variant="subtitle1">
                                    {row.trade_name}
                                </Typography>
                            </Box>
                        </Stack>
                    );
                },
            }),
            columnHelper.accessor('total_hours', {
                id: 'total_hours',
                header: 'Total Hours',
                cell: (info: any) => formatHour(info.getValue()) || '-',
            }),
            columnHelper.accessor('total_break_hours', {
                id: 'total_break_hours',
                header: 'Total Break Hours',
                cell: (info: any) => formatHour(info.getValue()) || '-',
            }),
            columnHelper.accessor('payable_total_hours', {
                id: 'payable_total_hours',
                header: 'Payable Hours',
                cell: (info: any) => formatHour(info.getValue()) || '-',
            }),
            columnHelper.accessor('daylog_payable_amount', {
                id: 'daylog_payable_amount',
                header: 'Payable Amount',
                cell: (info: any) => {
                    const value = info.getValue();
                    return value === 0 ? '0' : (value ? `${currency}${value}` : '-');
                },
            }),
            columnHelper.accessor('pricework_total_amount', {
                id: 'pricework_total_amount',
                header: 'Pricework Amount',
                cell: (info: any) => {
                    const value = info.getValue();
                    return value === 0 ? '0' : (value ? `${currency}${value}` : '-');
                },
            }),
            columnHelper.accessor('total_payable_amount', {
                id: 'total_payable_amount',
                header: 'Total Payable Amount',
                cell: (info: any) => {
                    const value = info.getValue();
                    return value === 0 ? '0' : (value ? `${currency}${value}` : '-');
                },
            }),
        ],
        [currency]
    );

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            pagination,
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
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

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ transition: 'height 0.3s ease-in-out' }}>
                {/* Search and Filter Controls */}
                <Stack
                    mt={3}
                    mx={2}
                    mb={3}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1.5, sm: 2 }}
                    alignItems="center"
                    flexWrap="wrap"
                >
                    <DateRangePickerBox from={startDate} to={endDate} onChange={handleDateRangeChange} />
                    <TextField
                        placeholder="Search..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ endAdornment: <IconSearch size={16} /> }}
                    />
                </Stack>

                <Divider />

                {/* Data Table */}
                <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
                    <Table stickyHeader>
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
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 11,
                                                    backgroundColor: '#fff',
                                                    p: 0,
                                                }}
                                            >
                                                <Box
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    sx={{
                                                        cursor: isSortable ? 'pointer' : 'default',
                                                        border: '2px solid transparent',
                                                        borderRadius: '6px',
                                                        px: 1.5,
                                                        py: 0.75,
                                                        fontWeight: isActive ? 600 : 500,
                                                        color: '#000',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        '&:hover': { color: '#888' },
                                                        '&:hover .hoverIcon': { opacity: 1 },
                                                    }}
                                                >
                                                    <Typography variant="body2" fontWeight="inherit">
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </Typography>
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
                            {table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    onMouseEnter={() => setHoveredRow(row.id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    onClick={() => handleRowClick(row.original)}
                                    sx={{
                                        cursor: 'pointer',
                                        backgroundColor: hoveredRow === row.id ? '#f5f5f5' : 'transparent',
                                        transition: 'background-color 0.2s ease',
                                        '&:hover': {
                                            backgroundColor: '#f5f5f5',
                                        },
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} align="center">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination Controls */}
                <Stack
                    gap={1}
                    pr={3}
                    pt={1}
                    pl={3}
                    pb={3}
                    alignItems="center"
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography color="textSecondary">
                            {table.getPrePaginationRowModel().rows.length} Rows
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: {
                                xs: 'block',
                                sm: 'flex',
                            },
                        }}
                        alignItems="center"
                    >
                        <Stack direction="row" alignItems="center">
                            <Typography color="textSecondary">Page</Typography>
                            <Typography color="textSecondary" fontWeight={600} ml={1}>
                                {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                            </Typography>
                            <Typography color="textSecondary" ml={'3px'}>
                                {' '}
                                | Entries :{' '}
                            </Typography>
                        </Stack>
                        <Stack ml={'5px'} direction="row" alignItems="center" color="textSecondary">
                            <CustomSelect
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

            <Drawer
                anchor="bottom"
                open={detailsOpen}
                onClose={closeDetails}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        height: '95vh',
                        boxShadow: 'none',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        overflow: 'hidden',
                    },
                }}
            >
                <TimeClockDetails
                    open={detailsOpen}
                    timeClock={selectedTimeClock}
                    user_id={selectedTimeClock?.user_id}
                    currency={currency}
                    onClose={closeDetails}
                />
            </Drawer>
        </Box>
    );
};

export default TimeClock;
