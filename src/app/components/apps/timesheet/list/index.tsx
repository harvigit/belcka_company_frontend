'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, Grid, IconButton, MenuItem, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import {
    IconSearch, IconFilter, IconChevronLeft, IconChevronRight,
    IconChevronsLeft, IconChevronsRight
} from '@tabler/icons-react';

import api from '@/utils/axios';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';
import '../../../../global.css';

const headers = [
    'Name', 'Week', 'Type', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Payable Hours', 'Status', 'Locked',
];

const typeOptions = [
    // { label: 'All', value: 'all' },
    { label: 'Timesheet', value: 'T' },
    { label: 'Pricework', value: 'P' },
    { label: 'Expense', value: 'E' },
];

const TimesheetList = () => {
    const today = new Date();
    const defaultStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const defaultEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    const [data, setData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [filters, setFilters] = useState({ type: '', status: '' });
    const [tempFilters, setTempFilters] = useState(filters);

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

    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const uniqueStatuses = [...new Set(data.map((item) => item.status).filter(Boolean))];
    const pageCount = Math.ceil(filteredData.length / rowsPerPage);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        setTempStartDate(range.from);
        setTempEndDate(range.to);
        if (range.from && range.to) {
            fetchData(range.from, range.to);
        }
    };

    return (
        <Box>
            <Stack mt={3} mx={2} mb={3} justifyContent="space-between" direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 4 }}>
                <Grid display="flex" gap={1} alignItems="center">
                    <Button variant="contained" color="primary">
                        TIMESHEETS ({filteredData.length})
                    </Button>

                    {/* Date Range Picker */}
                    <DateRangePickerBox
                        from={tempStartDate}
                        to={tempEndDate}
                        onChange={handleDateRangeChange}
                    />

                    <TextField
                        placeholder="Search..."
                        size="small"
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ endAdornment: <IconSearch size="16" /> }}
                    />

                    {/* Filter Button */}
                    <Button variant="contained" onClick={() => setOpen(true)}>
                        <IconFilter width={18} />
                    </Button>

                    {/* Filter Dialog */}
                    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                        <DialogTitle>Filters</DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} mt={1}>
                                <TextField
                                    select
                                    label="Type"
                                    value={tempFilters.type}
                                    onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })}
                                >
                                    {typeOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {/* Status Filter in Dialog */}
                                {/*<TextField*/}
                                {/*    select*/}
                                {/*    label="Status"*/}
                                {/*    value={tempFilters.status}*/}
                                {/*    onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}*/}
                                {/*>*/}
                                {/*    <MenuItem value="">All</MenuItem>*/}
                                {/*    {uniqueStatuses.map((status) => (*/}
                                {/*        <MenuItem key={status} value={status}>{status}</MenuItem>*/}
                                {/*    ))}*/}
                                {/*</TextField>*/}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() => {
                                    setFilters({ type: '', status: '' });
                                    setTempFilters({ type: '', status: '' });
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
                                    setStartDate(tempStartDate);
                                    setEndDate(tempEndDate);
                                    if (tempStartDate && tempEndDate) {
                                        fetchData(tempStartDate, tempEndDate);
                                    }
                                    setOpen(false);
                                }}
                            >
                                Apply
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Grid>
            </Stack>

            <Divider />

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {headers.map((header) => (
                                <TableCell key={header} align="center">
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {header}
                                    </Typography>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={headers.length} align="center">
                                    No records found
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell align="center">
                                        <Stack direction="row" alignItems="center" spacing={2} justifyContent="center">
                                            <Avatar src={row.user_thumb_image} alt={row.user_name} sx={{ width: 36, height: 36 }} />
                                            <Box textAlign="left">
                                                <Typography fontWeight={600}>{row.user_name}</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {row.trade_name}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography>{row.week_number}</Typography>
                                        <Typography variant="caption">{row.start_date_month} - {row.end_date_month}</Typography>
                                    </TableCell>
                                    <TableCell align="center">{row.type ?? '-'}</TableCell>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                        <TableCell key={day} align="center">
                                            {row.days?.[day] ?? '-'}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center">{row.payable_total_hours ?? '-'}</TableCell>
                                    <TableCell align="center">{row.status ?? '-'}</TableCell>
                                    <TableCell align="center">{row.lockedAmount ?? '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <Stack
                gap={1}
                p={3}
                alignItems="center"
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">
                        {filteredData.length} Rows
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">Page</Typography>
                    <Typography variant="body1" fontWeight={600}>
                        {page + 1} of {pageCount}
                    </Typography>
                    | Go to page:
                    <CustomTextField
                        type="number"
                        min="1"
                        max={pageCount}
                        defaultValue={page + 1}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = Number(e.target.value);
                            if (value > 0 && value <= pageCount) setPage(value - 1);
                        }}
                    />
                    <CustomSelect value={rowsPerPage} onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setPage(0);
                    }}>
                        {[10, 15, 25, 50].map((size) => (
                            <MenuItem key={size} value={size}>{size}</MenuItem>
                        ))}
                    </CustomSelect>
                    <IconButton size="small" onClick={() => setPage(0)} disabled={page === 0}><IconChevronsLeft /></IconButton>
                    <IconButton size="small" onClick={() => setPage(page - 1)} disabled={page === 0}><IconChevronLeft /></IconButton>
                    <IconButton size="small" onClick={() => setPage(page + 1)} disabled={page >= pageCount - 1}><IconChevronRight /></IconButton>
                    <IconButton size="small" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}><IconChevronsRight /></IconButton>
                </Box>
            </Stack>
        </Box>
    );
};

export default TimesheetList;
