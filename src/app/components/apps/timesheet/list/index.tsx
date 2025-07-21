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
    useMediaQuery,
} from '@mui/material';
import {
    IconSearch,
    IconFilter,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconX, IconArrowLeft,
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

import 'react-day-picker/dist/style.css';
import '../../../../global.css';
import { AxiosResponse } from 'axios';

const columnHelper = createColumnHelper();

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
    const [sidebarData, setSidebarData] = useState<any>(null);

    const isMobile = useMediaQuery('(max-width:600px)');

    const fetchData = async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            const response: AxiosResponse<TimesheetResponse> = await api.get('/timesheet/get-web', { params });

            if (response.data.IsSuccess) {
                setData(response.data.info);
            }
        } catch (error) {
            console.error('Error fetching timesheet data');
        }
    };

    useEffect(() => {
        if (startDate && endDate) fetchData(startDate, endDate);
    }, [startDate, endDate]);

    const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
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
                    payableHours: res.data.payable_hours || 0,
                });
            } else {
                setSidebarData(null);
            }
        } catch {
            setSidebarData(null);
        }
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
                size: 30,
            },
            columnHelper.accessor('user_name', {
                header: 'Name',
                cell: (info: any) => {
                    const row = info.row.original;
                    return (
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar src={row.user_thumb_image} alt={row.user_name} sx={{ width: 36, height: 36 }} />
                            <Box textAlign="left">
                                <Typography>{row.user_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
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
                        if (value === '-' || !value) return <div>-</div>;
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
                    return ['Pending', 'Locked', 'Paid'].includes(val) ? val : '-';
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
                spacing={{ xs: 1.5, sm: 2 }}
                alignItems="center"
                flexWrap="wrap"
            >
                <Button variant="contained">TIMESHEETS ({filteredData.length})</Button>
                <DateRangePickerBox from={tempStartDate} to={tempEndDate} onChange={handleDateRangeChange} />
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
                        <IconX size={40} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        select
                        label="Type"
                        value={tempFilters.type}
                        onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })}
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

            <Divider />

            <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableCell key={header.id} align="center">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableCell>
                                ))}
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

            {/* Drawer */}
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
                                    Total: {formatHour(sidebarData.payableHours)} H
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                {sidebarData.info.map((entry: any) => {
                                    const duration = formatHour(entry.worklog_payable_hours);

                                    return (
                                        <Box
                                            key={entry.id}
                                            sx={{
                                                position: 'relative',
                                                p: 2,
                                                borderRadius: 3,
                                                backgroundColor: '#fff',
                                                border: '1px solid #eee',
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
                                                    left: 100,
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
                                                    <Typography variant="body2" sx={{ color: '#666' }} mr={1}>
                                                        ({entry.formatted_work_start_time} - {entry.formatted_work_end_time})
                                                    </Typography>

                                                    <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                                                        {duration} H
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
