'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
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
    InputAdornment,
    Snackbar,
    Alert,
} from '@mui/material';
import {IconSearch, IconChevronLeft, IconChevronRight} from '@tabler/icons-react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';
import {format} from 'date-fns';
import {AxiosResponse} from 'axios';

import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import TimeClockDetails from './time-clock-details';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

import 'react-day-picker/dist/style.css';
import '@/app/global.css'
import {useRouter, useSearchParams} from 'next/navigation';

const columnHelper = createColumnHelper<TimeClock>();

const TIME_CLOCK_PAGE = 'time-clock-page';
const TIME_CLOCK_DETAILS_PAGE = 'time-clock-details-page';

const saveDateRangeToStorage = (startDate: Date | null, endDate: Date | null) => {
    try {
        const dateRange = {
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null
        };
        localStorage.setItem(TIME_CLOCK_PAGE, JSON.stringify(dateRange));
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
    } catch (error) {
        console.error('Error saving date range to localStorage:', error);
    }
};

const saveDateToStorage = (startDate: Date | null, endDate: Date | null) => {
    try {
        const dateRange = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null,
            columnVisibility: {},
        };
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
    } catch (error) {
        console.log('Error saving date range to localStorage:', error);
    }
};

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(TIME_CLOCK_PAGE);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null
            };
        }
    } catch (error) {
        console.error('Error loading date range from localStorage:', error);
    }
    return null;
};

export type TimeClock = {
    weekly_payable_amount: number;
    company_id: string;
    week_range: any;
    weekly_total_hours: string | number;
    daylog_payable_amount: number;
    pricework_total_amount: number;
    total_expense_amount: number;
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

    // Newly added fields from API
    has_leave_request?: boolean;
    has_expense_request?: boolean;
    has_worklog_request?: boolean;
};

type TimeClockResponse = {
    company_id: number;
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

    // Load from localStorage or use defaults
    const getInitialDates = () => {
        const stored = loadDateRangeFromStorage();

        if (stored && stored.startDate && stored.endDate) {
            return {
                startDate: stored.startDate,
                endDate: stored.endDate
            };
        } else {
            return {
                startDate: defaultStart,
                endDate: defaultEnd
            };
        }
    };

    const initialDates = getInitialDates();

    // State management
    const [data, setData] = useState<TimeClock[]>([]);
    const [currency, setCurrency] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filters, setFilters] = useState<FilterState>({type: ''});
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 50});
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [startDate, setStartDate] = useState<Date | null>(initialDates.startDate);
    const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [selectedTimeClock, setSelectedTimeClock] = useState<TimeClock | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
    const [hasDataChanged, setHasDataChanged] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<number | null>(null)
    const router = useRouter();
    const searchParams = useSearchParams();
    const userIdParam = searchParams?.get('user_id');
    const startParam = searchParams?.get('start_date');
    const endParam = searchParams?.get('end_date');
    const openParam = searchParams?.get('open');
    const hasInitialized = useRef(false);

    const fetchData = async (start: Date, end: Date): Promise<TimeClock[]> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            const response: AxiosResponse<TimeClockResponse> = await api.get('/time-clock/get', {
                params,
            });

            if (response.data.IsSuccess) {
                setData(response.data.info);
                setCompanyId(response.data.company_id);
                if (response.data.currency !== null) {
                    setCurrency(response.data.currency);
                }
                return response.data.info;
            }
        } catch (error) {
            setErrorMessage('Failed to fetch timesheet data. Please try again.');
        }
        return [];
    };

    useEffect(() => {
        if (startDate && endDate) fetchData(startDate, endDate);
    }, [startDate, endDate]);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            saveDateRangeToStorage(range.from, range.to);
        }
    };

    const handleRowClick = (timeClock: TimeClock) => {
        setSelectedTimeClock(timeClock);
        setDetailsOpen(true);
    };

    const handleUserChange = (newUser: TimeClock) => {
        const updatedUser = {
            ...newUser,
            start_date: selectedTimeClock?.start_date || startDate?.toISOString() || '',
            end_date: selectedTimeClock?.end_date || endDate?.toISOString() || '',
        };
        setSelectedTimeClock(updatedUser);
    };

    const closeDetails = async () => {
        setDetailsOpen(false);
        setSelectedTimeClock(null);

        const initialDates = getInitialDates();

        if (initialDates) {
            try {
                handleDateRangeChange({from: initialDates.startDate, to: initialDates.endDate});
                await fetchData(initialDates.startDate, initialDates.endDate);
                setHasDataChanged(false);
            } catch (error) {
                setErrorMessage('Failed to refresh data. Please try again.');
            }
        }
    };

    const handleDataChange = () => {
        setHasDataChanged(true);
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
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
                header: '...',
                cell: (info: any) => {
                    const row = info.row.original;
                    return (
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar src={row.user_thumb_image} alt={row.user_name} sx={{ width: 36, height: 36 }} />
                            <Box textAlign="left" sx={{ flex: 1, minWidth: 0 }}>
                                <Typography className="f-14" noWrap>
                                    {row.user_name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" noWrap>
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
                cell: (info: any) => {
                    const row = info.row.original;
                    const value = info.getValue();
                    const formatted = formatHour(value) || '-';

                    const hasPendingRequest =
                        row.has_leave_request === true ||
                        row.has_expense_request === true ||
                        row.has_worklog_request === true;

                    return (
                        <Typography
                            variant="h6"
                            sx={{
                                color: hasPendingRequest ? '#f97316' : 'inherit',
                            }}
                        >
                            {formatted}
                        </Typography>
                    );
                },
            }),

            columnHelper.accessor('payable_total_hours', {
                id: 'payable_total_hours',
                header: 'Payable Hours',
                cell: (info: any) => formatHour(info.getValue()) || '-',
            }),

            columnHelper.accessor('daylog_payable_amount', {
                id: 'daylog_payable_amount',
                header: 'Payable',
                cell: (info: any) => {
                    const value = info.getValue();
                    return value === 0 ? '0' : (value ? `${currency}${value}` : '-');
                },
            }),

            columnHelper.accessor('pricework_total_amount', {
                id: 'pricework_total_amount',
                header: 'Pricework',
                cell: (info: any) => {
                    const row = info.row.original;
                    const value = info.getValue();
                    const displayValue = value === 0 ? '0' : (value ? `${currency}${value}` : '-');

                    const hasPendingRequest =
                        row.has_leave_request === true ||
                        row.has_expense_request === true ||
                        row.has_worklog_request === true;

                    return (
                        <Typography
                            variant="h6"
                            sx={{
                                color: hasPendingRequest ? '#f97316' : 'inherit',
                            }}
                        >
                            {displayValue}
                        </Typography>
                    );
                },
            }),

            columnHelper.accessor('total_expense_amount', {
                id: 'total_expense_amount',
                header: 'Expense',
                cell: (info: any) => {
                    const row = info.row.original;
                    const value = info.getValue();
                    const displayValue = value === 0 ? '0' : (value ? `${currency}${value}` : '-');

                    const hasPendingRequest =
                        row.has_leave_request === true ||
                        row.has_expense_request === true ||
                        row.has_worklog_request === true;

                    return (
                        <Typography
                            variant="h6"
                            sx={{
                                color: hasPendingRequest ? '#f97316' : 'inherit',
                            }}
                        >
                            {displayValue}
                        </Typography>
                    );
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

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        if (!userIdParam || !startParam || !endParam) return;

        const startDateObj = new Date(startParam);
        const endDateObj = new Date(endParam);

        setStartDate(startDateObj);
        setEndDate(endDateObj);

        (async () => {
            try {
                const fetchedData = await fetchData(startDateObj, endDateObj);
                const foundUser = fetchedData.find(
                    (item) => Number(item.user_id) === Number(userIdParam)
                );

                if (foundUser) {
                    saveDateToStorage(startDateObj, endDateObj);
                    setSelectedTimeClock(foundUser);
                    setDetailsOpen(true);
                    router.replace('/apps/timesheet/list', {scroll: false});
                }

                setTimeout(() => {
                    router.replace('/apps/timesheet/list', {scroll: false});
                }, 500);
            } catch (err) {
                console.error('Failed to load data from query params:', err);
            }
            router.replace('/apps/timesheet/list', {scroll: false});
        })();
    }, [searchParams]);

    return (
        <Box sx={{position: 'relative', overflow: 'hidden'}}>
            <Box sx={{transition: 'height 0.3s ease-in-out'}}>
                <Stack
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
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconSearch size={16} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Stack>

                <Divider />

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
                                                align="left"
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
                                                    <Typography variant="body2">
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
                                        <TableCell key={cell.id} sx={{ padding: "10px" }} align="left">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

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
                        height: '90vh',
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
                    companyId={companyId}
                    currency={currency}
                    allUsers={filteredData}
                    onClose={closeDetails}
                    onUserChange={handleUserChange}
                    onDataChange={handleDataChange}
                    queryParams={{
                        start_date: startParam,
                        end_date: endParam,
                        open: openParam
                    }}
                />
            </Drawer>

            <Snackbar
                open={!!errorMessage}
                autoHideDuration={6000}
                onClose={() => setErrorMessage(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TimeClock;
