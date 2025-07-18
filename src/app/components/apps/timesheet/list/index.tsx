'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    Grid,
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
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconSearch,
    IconFilter,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconX, IconArrowBack, IconEdit, IconArrowLeft,
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
import { format } from 'date-fns';
import dayjs from 'dayjs';

import 'react-day-picker/dist/style.css';
import '../../../../global.css';
import { AxiosResponse } from 'axios';

const columnHelper = createColumnHelper();

// Type definitions
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
};

type TimesheetResponse = {
    IsSuccess: boolean;
    info: Timesheet[];
};

const TimesheetList = () => {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);

    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);

    const [data, setData] = useState<Timesheet[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const [filters, setFilters] = useState<any>({ type: '' });
    const [tempFilters, setTempFilters] = useState<any>(filters);
    const [sorting, setSorting] = useState<any>([]);
    const [pagination, setPagination] = useState<any>({ pageIndex: 0, pageSize: 50 });
    const [selectedRows, setSelectedRows] = useState<any>({});

    const [startDate, setStartDate] = useState<Date | null>(defaultStart);
    const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
    const [tempStartDate, setTempStartDate] = useState<Date | null>(defaultStart);
    const [tempEndDate, setTempEndDate] = useState<Date | null>(defaultEnd);

    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);

    const [sidebarData, setSidebarData] = useState<any>(null); // Sidebar data state

    const fetchData = async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            const response: AxiosResponse<TimesheetResponse> = await api.get(
                '/timesheet/get-web',
                {params}
            );

            if (response.data.IsSuccess) {
                setData(response.data.info);
            } else {
                console.error('Something went wrong!');
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching timesheet data:', error.message);
            } else {
                console.error(
                    'An unknown error occurred while fetching timesheet data.'
                );
            }
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchData(startDate, endDate);
        }
    }, [startDate, endDate]);

    const handleDateRangeChange: any = (range: {
        from: Date | undefined;
        to: Date | undefined;
    }) => {
        if (range.from && range.to) {
            setTempStartDate(range.from);
            setTempEndDate(range.to);
            setStartDate(range.from);
            setEndDate(range.to);
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

    const formatHour = (val: any) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '-';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const fetchSidebarData = async (worklogIds: number[]) => {
        try {
            const res = await api.get('/timesheet/worklog-details', {
                params: { worklog_ids: worklogIds.join(',') },
            });

            if (res.data?.IsSuccess) {
                setSidebarData({
                    info: res.data.info || [],
                    formattedDate: res.data.formatted_date || 0,
                    totalMinutes: res.data.total_minutes || 0,
                    totalBreakSeconds: res.data.total_break_seconds || 0,
                    payableWorkSeconds: res.data.payable_work_seconds || 0,
                });
            } else {
                setSidebarData({
                    info: [],
                    formattedDate: 0,
                    totalMinutes: 0,
                    totalBreakSeconds: 0,
                    payableWorkSeconds: 0,
                });
            }
        } catch (error) {
            setSidebarData({
                info: [],
                formattedDate: 0,
                totalMinutes: 0,
                totalBreakSeconds: 0,
                payableWorkSeconds: 0,
            });
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    const columns: any = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }: { table: any }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                ),
                cell: ({ row }: { row: any }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                ),
                enableSorting: false,
                enableColumnFilter: false,
                size: 30,
            },
            columnHelper.accessor('user_name', {
                id: 'user_name',
                header: 'Name',
                cell: (info: any) => {
                    const row = info.row.original;
                    return (
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                                src={row.user_thumb_image}
                                alt={row.user_name}
                                sx={{ width: 36, height: 36 }}
                            />
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography>{row.user_name}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    {row.trade_name}
                                </Typography>
                            </Box>
                        </Stack>
                    );
                },
            }),
            columnHelper.accessor('week_number', {
                id: 'week_number',
                header: 'Week',
                cell: (info: any) => {
                    const row = info.row.original;
                    return (
                        <Tooltip title={`${row.start_date_month} - ${row.end_date_month}`}>
                            <Typography>{info.getValue()}</Typography>
                        </Tooltip>
                    );
                },
            }),
            columnHelper.accessor('type', { header: 'Type' }),
            ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) =>
                columnHelper.accessor((row: any) => row.days?.[day], {
                    id: day,
                    header: day,
                    cell: (info: any) => {
                        const value = info.getValue();
                        const row = info.row.original;

                        if (value === '-' || !value) {
                            return <div>-</div>;
                        }

                        return (
                            <div
                                onClick={() => {
                                    if (Array.isArray(value.worklog_ids) && value.worklog_ids.length) {
                                        fetchSidebarData(value.worklog_ids);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {formatHour(value.hours)}
                            </div>
                        );
                    },
                })
            ),
            columnHelper.accessor('payable_total_hours', {
                header: 'Payable Hours',
                cell: (info: any) => formatHour(info.getValue()) || '-',
            }),
            columnHelper.accessor('status', {
                header: 'Status',
                cell: (info: any) => {
                    const val = info.getValue();
                    if (!['Pending', 'Locked', 'Paid'].includes(val)) return '-';
                    return val;
                },
            }),
        ],
        []
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
        onRowSelectionChange: setSelectedRows,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Box>
            <Stack
                mt={3}
                mx={2}
                mb={3}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems="center"
            >
                <Button variant="contained" color="primary">
                    TIMESHEETS ({filteredData.length})
                </Button>

                <DateRangePickerBox
                    from={tempStartDate}
                    to={tempEndDate}
                    onChange={handleDateRangeChange}
                />

                <TextField
                    placeholder="Search..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ endAdornment: <IconSearch size={16} /> }}
                />
                <Button variant="contained" onClick={() => setOpen(true)}>
                    <IconFilter width={18} />
                </Button>

                <Dialog
                    open={open}
                    onClose={() => setOpen(false)}
                    fullWidth
                    maxWidth="sm"
                >
                    <DialogTitle sx={{m: 0, position: 'relative', overflow: 'visible'}}>
                        Filters
                        <IconButton
                            aria-label="close"
                            onClick={() => setOpen(false)}
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
                            <IconX size={40} style={{ width: 40, height: 40 }} />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            select
                            label="Type"
                            value={tempFilters.type}
                            onChange={(e) =>
                                setTempFilters({ ...tempFilters, type: e.target.value })
                            }
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
                                setFilters({ type: '' });
                                setTempFilters({ type: '' });
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
            </Stack>

            <Divider />

            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                    <TableHead
                        sx={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            backgroundColor: '#fff',
                        }}
                    >
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
                                    <TableCell key={cell.id} align="center">
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
                p={3}
                alignItems="center"
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
            >
                <Typography variant="body1">{filteredData.length} Rows</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">Page</Typography>
                    <Typography variant="body1" fontWeight={600}>
                        {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount()}
                    </Typography>
                    | Entries:
                    <TextField
                        select
                        size="small"
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                    >
                        {[10, 50, 100, 250, 500].map((size) => (
                            <MenuItem key={size} value={size}>
                                {size}
                            </MenuItem>
                        ))}
                    </TextField>
                    <IconButton
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <IconChevronsLeft />
                    </IconButton>
                    <IconButton
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <IconChevronLeft />
                    </IconButton>
                    <IconButton
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <IconChevronRight />
                    </IconButton>
                    <IconButton
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <IconChevronsRight />
                    </IconButton>
                </Box>
            </Stack>

            {/* Sidebar Drawer */}
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
                    <Box display="flex" alignItems="center" justifyContent="space-between" mt={1} mb={2}>
                        <IconButton onClick={() => setSidebarData(null)}>
                            <IconArrowLeft />
                        </IconButton>
                        
                        <Typography variant="h6" fontWeight={700}>
                            Work Logs
                        </Typography>
                    </Box>

                    {Array.isArray(sidebarData?.info) && sidebarData.info.length > 0 ? (
                        <>
                            <Box display="flex" justifyContent="space-between" mt={1} mb={2}>
                                <Typography variant="h6" fontWeight={700}>
                                    {sidebarData.formattedDate}
                                </Typography>

                                <Typography variant="h6" fontWeight={700} sx={{ color: '#000' }}>
                                    Total: {formatTime(sidebarData.payableWorkSeconds)}
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                {sidebarData.info.map((entry: any) => {
                                    const duration = formatTime(entry.worklog_payable_work_seconds);

                                    return (
                                        <Box
                                            key={entry.id}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                backgroundColor: '#fff',
                                                boxShadow: 'inset 0 0 0 rgba(0,0,0,0)',
                                                border: '1px solid #eee',
                                            }}
                                        >
                                            <Box>
                                                <Stack direction="row" spacing={1} mb={1}>
                                                    <Box
                                                        sx={{
                                                            backgroundColor: '#FF7A00',
                                                            color: '#fff',
                                                            borderRadius: 1,
                                                            px: 1.2,
                                                            py: 0.3,
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Shift
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            backgroundColor: '#C9E9FF',
                                                            color: '#000',
                                                            borderRadius: 1,
                                                            px: 1.2,
                                                            py: 0.3,
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {entry.shift_name}
                                                    </Box>
                                                </Stack>

                                                <Box display="flex" justifyContent="space-between" mt={1} mb={2}>
                                                    <Typography variant="body2" sx={{ color: '#666' }} mr={1}>
                                                        ({entry.formatted_work_start_time} - {entry.formatted_work_end_time})
                                                    </Typography>

                                                    <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                                                        {duration}
                                                    </Typography>
                                                </Box>
                                                
                                            </Box>

                                            {/*<IconButton size="small">*/}
                                            {/*    <Box*/}
                                            {/*        component="span"*/}
                                            {/*        sx={{*/}
                                            {/*            width: 25,*/}
                                            {/*            height: 25,*/}
                                            {/*            display: 'flex',*/}
                                            {/*            alignItems: 'center',*/}
                                            {/*            justifyContent: 'center',*/}
                                            {/*        }}*/}
                                            {/*    >*/}
                                            {/*        <IconEdit size="small" />*/}
                                            {/*    </Box>*/}
                                            {/*</IconButton>*/}
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
        </Box>
    );
};

export default TimesheetList;
