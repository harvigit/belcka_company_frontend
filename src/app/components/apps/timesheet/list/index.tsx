'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, Grid, IconButton, MenuItem, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import {
    IconSearch, IconFilter, IconChevronLeft, IconChevronRight,
    IconChevronsLeft, IconChevronsRight
} from '@tabler/icons-react';
import {
    flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
    getSortedRowModel, useReactTable, createColumnHelper
} from '@tanstack/react-table';
import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import { format } from 'date-fns';

import 'react-day-picker/dist/style.css';
import '../../../../global.css';

const columnHelper = createColumnHelper();

const TimesheetList = () => {
    const today = new Date();
    const defaultStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const defaultEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [filters, setFilters] = useState({ type: '' });
    const [tempFilters, setTempFilters] = useState(filters);
    const [sorting, setSorting] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [selectedRows, setSelectedRows] = useState({});

    const [startDate, setStartDate] = useState<Date | null>(defaultStart);
    const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
    const [tempStartDate, setTempStartDate] = useState<Date | null>(defaultStart);
    const [tempEndDate, setTempEndDate] = useState<Date | null>(defaultEnd);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchData = async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };
            const response = await api.get('/timesheet/get-web', { params });
            if (response.data.IsSuccess) {
                setData(response.data.info);
            } else {
                console.error('Something went wrong!');
            }
        } catch (error) {
            console.error('Error fetching timesheet data:', error);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchData(startDate, endDate);
        }
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

            // const matchesStatus = filters.status ? item.status === filters.status : true;
            // return matchesSearch && matchesType && matchesStatus;
            
            return matchesSearch && matchesType;
        });
    }, [data, searchTerm, filters]);

    const formatHour = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '-';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            enableSorting: false,
            enableColumnFilter: false,
            size: 30
        },
        columnHelper.accessor('user_name', {
            id: 'user_name',
            header: 'Name',
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar src={row.user_thumb_image} alt={row.user_name} sx={{ width: 36, height: 36 }} />
                        <Box>
                            <Typography fontWeight={600}>{row.user_name}</Typography>
                            <Typography variant="caption" color="textSecondary">{row.trade_name}</Typography>
                        </Box>
                    </Stack>
                );
            }
        }),
        columnHelper.accessor('week_number', {
            id: 'week_number',
            header: 'Week',
            cell: (info) => {
                const row = info.row.original;
                return (
                    <Tooltip title={`${row.start_date_month} - ${row.end_date_month}`}>
                        <Typography>{info.getValue()}</Typography>
                    </Tooltip>
                );
            }
        }),
        columnHelper.accessor('type', { header: 'Type' }),
        ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) =>
            columnHelper.accessor((row) => row.days?.[day], {
                id: day,
                header: day,
                cell: (info) =>
                    <span style={{fontSize: '18px'}}>
                        {formatHour(info.getValue()) || '-'}
                    </span>
            })
        ),
        columnHelper.accessor('payable_total_hours', {
            header: 'Payable Hours',
            cell: (info) => 
                <span style={{fontSize: '18px'}}>
                  {formatHour(info.getValue()) || '-'}
                </span>
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: (info) => {
                const val = info.getValue();
                if (!['Pending', 'Locked', 'Paid'].includes(val)) return '-';
                return val;
            }
        })
    ], []);

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            pagination,
            rowSelection: selectedRows
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        enableRowSelection: true,
        onRowSelectionChange: setSelectedRows,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    });

    return (
        <Box>
            <Stack mt={3} mx={2} mb={3} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
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

                <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle>Filters</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            select
                            label="Type"
                            value={tempFilters.type}
                            onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })}
                        >
                            <MenuItem value=''>All</MenuItem>
                            <MenuItem value='T'>Timesheet</MenuItem>
                            <MenuItem value='P'>Pricework</MenuItem>
                            <MenuItem value='E'>Expense</MenuItem>
                        </TextField>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { setFilters({ type: '' }); setTempFilters({ type: '' }); setOpen(false); }} color="inherit">Clear</Button>
                        <Button variant="contained" onClick={() => { setFilters(tempFilters); setOpen(false); }}>Apply</Button>
                    </DialogActions>
                </Dialog>
            </Stack>

            <Divider />

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {table.getHeaderGroups().map((headerGroup) =>
                                headerGroup.headers.map((header) => {
                                    const isActive = header.column.getIsSorted();
                                    const isAsc = header.column.getIsSorted() === 'asc';
                                    const isSortable = header.column.getCanSort();
                                    return (
                                        <TableCell key={header.id} align="center" sx={{ p: 0 }}>
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
                                                    '&:hover .hoverIcon': { opacity: 1 }
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
                                                            color: isActive ? '#000' : '#888'
                                                        }}
                                                    >
                                                        {isActive ? (isAsc ? '↑' : '↓') : '↑'}
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>
                                    );
                                })
                            )}
                        </TableRow>
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

            <Stack gap={1} p={3} alignItems="center" direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
                <Typography variant="body1">{filteredData.length} Rows</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">Page</Typography>
                    <Typography variant="body1" fontWeight={600}>
                        {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </Typography>
                    | Entries:
                    <TextField
                        select
                        size="small"
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                    >
                        {[10, 50, 100, 250, 500].map((size) => (
                            <MenuItem key={size} value={size}>{size}</MenuItem>
                        ))}
                    </TextField>
                    <IconButton onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                        <IconChevronsLeft />
                    </IconButton>
                    <IconButton onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        <IconChevronLeft />
                    </IconButton>
                    <IconButton onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        <IconChevronRight />
                    </IconButton>
                    <IconButton onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                        <IconChevronsRight />
                    </IconButton>
                </Box>
            </Stack>
        </Box>
    );
};

export default TimesheetList;
