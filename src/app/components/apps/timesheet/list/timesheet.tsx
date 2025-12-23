'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Avatar,
    Box,
    Button, Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    MenuItem,
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
    useMediaQuery,
} from '@mui/material';
import {
    IconSearch,
    IconFilter,
    IconChevronLeft,
    IconChevronRight,
    IconX,
    IconArrowLeft,
    IconPencil, IconChevronDown, IconChevronUp,
} from '@tabler/icons-react';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    createColumnHelper,
} from '@tanstack/react-table';
import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import {format} from 'date-fns';

import 'react-day-picker/dist/style.css';
import '../../../../global.css';
import {AxiosResponse} from 'axios';

import ShiftEditPopover from './edit-shift-time/shift-edit-popover';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

const columnHelper = createColumnHelper();

const STORAGE_KEY = 'timesheet-date-range';

const saveDateRangeToStorage = (startDate: Date, endDate: Date) => {
    try {
        const dateRange = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
    } catch (error) {
        console.error('Error saving date range to localStorage:', error);
    }
};

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
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

type Timesheet = {
    user_name: string;
    trade_name: string;
    type: string;
    status?: string;
    user_thumb_image: string;
    week_number: string;
    start_date_month: string;
    end_date_month: string;
    days: Record<string, any>;
    payable_total_hours: string;
    timesheet_light_id: string | number;
    status_text?: string;
};

type TimesheetResponse = {
    IsSuccess: boolean;
    info: Timesheet[];
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

const TimesheetList = () => {
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
        }
        return {
            startDate: defaultStart,
            endDate: defaultEnd
        };
    };

    const initialDates = getInitialDates();

    const [data, setData] = useState<Timesheet[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currency, setCurrency] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const [filters, setFilters] = useState<FilterState>({type: ''});
    const [tempFilters, setTempFilters] = useState<FilterState>(filters);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 50});
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

    // Use initial dates from localStorage or defaults
    const [startDate, setStartDate] = useState<Date | null>(initialDates.startDate);
    const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

    const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

    const [sidebarData, setSidebarData] = useState<any>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedWorklog, setSelectedWorklog] = useState<any>(null);

    const isMobile = useMediaQuery('(max-width:600px)');

    const fetchData = async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            const response: AxiosResponse<TimesheetResponse> = await api.get('/timesheet/get-web', {params});

            if (response.data.IsSuccess) {
                setData(response.data.info);
                setCurrency(response.data.currency);
            }
        } catch (error) {
            console.error('Error fetching timesheet data');
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchData(startDate, endDate);
        }
    }, [startDate, endDate]);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);

            saveDateRangeToStorage(range.from, range.to);
        }
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

    const toggleTimesheetStatus = useCallback(
        async (timesheetIds: (string | number)[], action: 'approve' | 'unapprove') => {
            try {
                const ids = timesheetIds.join(',');
                const endpoint = action === 'approve' ? '/timesheet/approve' : '/timesheet/unapprove';
                const response: AxiosResponse<{ IsSuccess: boolean }> = await api.post(endpoint, {ids});

                if (response.data.IsSuccess) {
                    const defaultStartDate = startDate || defaultStart;
                    const defaultEndDate = endDate || defaultEnd;
                    fetchData(defaultStartDate, defaultEndDate);
                    setSelectedRows({});
                } else {
                    console.error(`Error ${action}ing timesheets`);
                }
            } catch (error) {
                console.error(`Error ${action}ing timesheets:`, error);
            }
        },
        [startDate, endDate]
    );

    const handleLockClick = () => {
        const timesheetIds = table.getRowModel().rows
            .filter(row => selectedRows[row.id])
            .map(row => row.original.timesheet_light_id);

        if (timesheetIds.length > 0) {
            toggleTimesheetStatus(timesheetIds, 'approve');
        }
    };

    const handleUnlockClick = () => {
        const timesheetIds = table.getRowModel().rows
            .filter(row => selectedRows[row.id])
            .map(row => row.original.timesheet_light_id);

        if (timesheetIds.length > 0) {
            toggleTimesheetStatus(timesheetIds, 'unapprove');
        }
    };

    const fetchSidebarData = async (worklogIds: number[]) => {
        try {
            const res = await api.get('/timesheet/worklog-details', {
                params: {worklog_ids: worklogIds.join(',')},
            });

            if (res.data?.IsSuccess) {
                setSidebarData({
                    info: res.data.info || [],
                    userName: res.data.user_name || 0,
                    formattedDate: res.data.formatted_date || 0,
                    totalMinutes: res.data.total_minutes || 0,
                    totalBreakSeconds: res.data.total_break_seconds || 0,
                    payableWorkSeconds: res.data.payable_work_seconds || 0,
                    payableHours: res.data.payable_hours || 0,
                });
            } else {
                setSidebarData(null);
            }
        } catch {
            setSidebarData(null);
        }
    };

    const handleEditClick = (entry: any) => {
        setSelectedWorklog(entry);
        setPopoverOpen(true);
    };

    const columns: any = useMemo(
        () => [
            {
                id: 'select',
                header: ({table}: { table: any }) => (
                    <CustomCheckbox
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                ),
                cell: ({row}: { row: any }) => (
                    <CustomCheckbox
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                ),
                enableSorting: false,
                size: 30,
            },
            columnHelper.accessor('user_name', {
                header: 'Name',
                cell: (info: any) => {
                    const row = info.row.original;

                    return (
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                            <Avatar
                                src={row.user_thumb_image}
                                alt={row.user_name}
                                sx={{ width: 36, height: 36 }}
                            />
                            <Box textAlign="left" sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                   className="f-14"
                                    noWrap
                                >
                                    {row.user_name}
                                </Typography>

                                <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    noWrap
                                >
                                    {row.trade_name}
                                </Typography>
                            </Box>
                        </Stack>
                    );
                },
            }),
            columnHelper.accessor('week_number', {
                header: 'Week',
                cell: (info: any) => {
                    const row = info.row.original;
                    return (
                        <Tooltip title={`${row.start_date_month} - ${row.end_date_month}`}>
                            <Typography className="f-14">{info.getValue()}</Typography>
                        </Tooltip>
                    );
                },
            }),
            columnHelper.accessor('type', {header: 'Type'}),
            ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) =>
                columnHelper.accessor((row: any) => row.days?.[day], {
                    id: day,
                    header: day,
                    cell: (info: any) => {
                        const value = info.getValue();
                        const row = info.row.original;

                        if (!value) return <div>-</div>;

                        const textColor = value.is_working ? "#1e4db7" : value.color;

                        if (value.hours === 0 && value.pricework_amount === 0) {
                            return <div style={{ color: textColor }}>-</div>;
                        }

                        return (
                            <div
                                onClick={() => {
                                    if (Array.isArray(value.worklog_ids) && value.worklog_ids.length) {
                                        fetchSidebarData(value.worklog_ids);
                                    }
                                }}
                                style={{ cursor: "pointer", color: textColor }}
                            >
                                {row.type === 'P'
                                    ? `${currency}${value.pricework_amount || 0}`
                                    : formatHour(value.hours)
                                }
                            </div>
                        );
                    },
                })
            ),
            columnHelper.accessor('payable_total_hours', {
                header: 'Payable Hours',
                cell: (info: any) => {
                    const row = info.row.original;
                    return row.type === 'T' ? formatHour(info.getValue()) || '-' : '-';
                },
            }),

            columnHelper.accessor('total_pricework_amount', {
                header: 'Pricework Amount',
                cell: (info: any) => {
                    const row = info.row.original;
                    return row.type === 'P' ? `${currency}${info.getValue() || 0}` : '-';
                },
            }),
            columnHelper.accessor('status_text', {
                header: 'Status',
                cell: (info: any) => {
                    const value = info.getValue();
                    const color = value === 'Locked' ? 'green' : 'red';
                    return (
                        <Typography style={{color: color}} className="f-14"> {value} </Typography>
                    );
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
            rowSelection: selectedRows,
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        enableRowSelection: true,
        onRowSelectionChange: (newSelection) => {
            setSelectedRows(newSelection);
        },
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
        <Box>
            <Stack
                mb={3}
                direction={{xs: 'column', sm: 'row'}}
                spacing={{xs: 1.5, sm: 2}}
                alignItems="center"
                flexWrap="wrap"
            >
                <DateRangePickerBox
                    from={startDate}
                    to={endDate}
                    onChange={handleDateRangeChange}
                />
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
                <Button variant="contained" onClick={() => setOpen(true)}>
                    <IconFilter width={18}/>
                </Button>

                {Object.keys(selectedRows).length > 0 && (
                    <>
                        <Button variant="outlined" color="success" onClick={handleLockClick}> Lock </Button>
                        <Button variant="outlined" color="error" onClick={handleUnlockClick}> Unlock </Button>
                    </>
                )}
            </Stack>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
                <DialogTitle>
                    Filters
                    <IconButton
                        onClick={() => setOpen(false)}
                        sx={{
                            position: 'absolute',
                            right: 12,
                            top: 8,
                            backgroundColor: 'transparent',
                        }}
                    >
                        <IconX size={40}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        select
                        label="Type"
                        value={tempFilters.type}
                        onChange={(e) => setTempFilters({...tempFilters, type: e.target.value})}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="T">Timesheet</MenuItem>
                        <MenuItem value="P">Pricework</MenuItem>
                        <MenuItem value="E">Expense</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setFilters({type: ''});
                            setTempFilters({type: ''});
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

            <Divider/>

            {/* Data Table */}
            <TableContainer sx={{ overflowX: 'auto'}}>
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
                                                    '&:hover': {color: '#888'},
                                                    '&:hover .hoverIcon': {opacity: 1},
                                                }}
                                            >
                                                <Typography variant="body2">
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
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
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}  sx={{ padding: "10px" }}align="center">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination and Rows Info */}
            <Stack
                gap={1}
                pr={3}
                pt={1}
                pl={3}
                pb={3}
                alignItems="center"
                direction={{xs: 'column', sm: 'row'}}
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
                            {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}
                        </Typography>
                        <Typography color="textSecondary" ml={'3px'}>
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
                            sx={{width: '30px'}}
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <IconChevronLeft/>
                        </IconButton>
                        <IconButton
                            size="small"
                            sx={{width: '30px'}}
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <IconChevronRight/>
                        </IconButton>
                    </Stack>
                </Box>
            </Stack>

            <Drawer
                anchor="right"
                open={sidebarData !== null}
                onClose={() => setSidebarData(null)}
                sx={{
                    width: 350,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 350,
                        padding: 2,
                        backgroundColor: '#f9f9f9',
                    },
                }}
            >
                <Box>
                    {Array.isArray(sidebarData?.info) && sidebarData.info.length > 0 ? (
                        <>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1} mb={2}>
                                <Box display="flex" alignItems="center">
                                    <IconButton onClick={() => setSidebarData(null)}>
                                        <IconArrowLeft/>
                                    </IconButton>

                                    <Typography variant="h6" fontWeight={700}>
                                        {sidebarData.userName}
                                    </Typography>
                                </Box>

                                <Typography variant="h6" fontWeight={700}>
                                    Work Logs
                                </Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between" mt={1} mb={2}>
                                <Typography variant="h6" fontWeight={700}>
                                    {sidebarData.formattedDate}
                                </Typography>

                                <Typography variant="h6" fontWeight={700} sx={{color: '#000'}}>
                                    Total: {formatHour(sidebarData.payableHours)} H
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                {sidebarData.info.map((entry: any) => {
                                    const isExpanded = expandedEntryId === entry.id;
                                    const duration = formatHour(entry.worklog_payable_hours);

                                    return (
                                        <Box
                                            key={entry.id}
                                            sx={{
                                                position: 'relative',
                                                borderRadius: 2,
                                                border: '1px solid #ddd',
                                                padding: 2,
                                                backgroundColor: '#fff',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                transition: '0.3s ease',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: -10,
                                                    left: 16,
                                                    backgroundColor: '#FF7A00',
                                                    border: '1px solid #FF7A00',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    px: 1,
                                                    py: 0.2,
                                                    borderRadius: '999px',
                                                }}
                                            >
                                                {entry.shift_name}
                                            </Box>

                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: -10,
                                                    left: 90,
                                                    backgroundColor: '#009DFF',
                                                    border: '1px solid #009DFF',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    px: 1,
                                                    py: 0.2,
                                                    borderRadius: '999px',
                                                }}
                                            >
                                                {entry.team_name}
                                            </Box>

                                            <Box mt={2}>
                                                <Box display="flex" justifyContent="space-between" mt={1} mb={2}>
                                                    {/* Left side content */}
                                                    <Box display="flex" alignItems="center">
                                                        <Typography variant="body2" sx={{color: '#666'}} mr={1}>
                                                            ({entry.formatted_work_start_time} - {entry.formatted_work_end_time})
                                                        </Typography>

                                                        <Typography variant="h6" fontWeight={700}>
                                                            {duration} H
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        {(entry.status < 6 || entry.status === 7) && entry.is_request_pending !== true && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedWorklog(entry);
                                                                    handleEditClick(entry);
                                                                }}
                                                            >
                                                                <Box
                                                                    component="span"
                                                                    sx={{
                                                                        width: 20,
                                                                        height: 20,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    <IconPencil size="small"/>
                                                                </Box>
                                                            </IconButton>
                                                        )}

                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                                            aria-label="Toggle details"
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                            }}
                                                        >
                                                            {isExpanded ? <IconChevronUp size="16"/> :
                                                                <IconChevronDown size="16"/>}
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                <Stack spacing={2} mt={2}>
                                                    {entry.user_checklogs.map((userChecklog: any) => {
                                                        const duration = formatHour(userChecklog.total_work_hours);

                                                        return (
                                                            <Box
                                                                key={userChecklog.id}
                                                                sx={{
                                                                    p: 2,
                                                                    borderRadius: 2,
                                                                    backgroundColor: '#fff',
                                                                    border: '1px solid #ddd',
                                                                    position: 'relative',
                                                                }}
                                                            >
                                                                <Stack direction="row" spacing={1} position="absolute"
                                                                       top={-10} left={16}>
                                                                    {userChecklog.address_name &&
                                                                        <Box
                                                                            sx={{
                                                                                backgroundColor: '#FF7A00',
                                                                                color: '#fff',
                                                                                fontSize: 11,
                                                                                fontWeight: 600,
                                                                                px: 1.5,
                                                                                py: 0.5,
                                                                                borderRadius: '999px',
                                                                                maxWidth: '50%',
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                            }}
                                                                        >
                                                                            {userChecklog.address_name}
                                                                        </Box>
                                                                    }
                                                                    {userChecklog.type_of_work_name &&
                                                                        <Box
                                                                            sx={{
                                                                                backgroundColor: '#009DFF',
                                                                                color: '#fff',
                                                                                fontSize: 11,
                                                                                fontWeight: 600,
                                                                                px: 1.5,
                                                                                py: 0.5,
                                                                                borderRadius: '999px',
                                                                                maxWidth: '50%',
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                            }}
                                                                        >
                                                                            {userChecklog.type_of_work_name}
                                                                        </Box>
                                                                    }
                                                                </Stack>

                                                                <Box mt={2}>
                                                                    <Box display="flex" justifyContent="space-between"
                                                                         mt={1} mb={2}>
                                                                        <Box display="flex" alignItems="center">
                                                                            <Typography variant="body2"
                                                                                        sx={{color: '#666'}} mr={1}>
                                                                                ({userChecklog.formatted_checkin_date_time} - {userChecklog.formatted_checkout_date_time})
                                                                            </Typography>

                                                                            <Typography variant="h6" fontWeight={700}>
                                                                                {duration} H
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        );
                                                    })}
                                                </Stack>
                                            </Collapse>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </>
                    ) : (
                        <Typography variant="body1" color="text.secondary" mt={2}>
                            No work logs available.
                        </Typography>
                    )}
                </Box>
            </Drawer>

            <ShiftEditPopover
                popoverOpen={popoverOpen}
                setPopoverOpen={setPopoverOpen}
                setSelectedWorklog={setSelectedWorklog}
                selectedWorklog={selectedWorklog}
            />
        </Box>
    );
};

export default TimesheetList;
