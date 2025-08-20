'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Chip,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Collapse,
} from '@mui/material';
import {
    IconX,
    IconClock,
    IconTableColumn,
    IconChevronRight,
    IconChevronDown,
} from '@tabler/icons-react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    VisibilityState,
    ExpandedState,
    getExpandedRowModel,
} from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { AxiosResponse } from 'axios';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import { TimeClock } from './time-clock';
import api from '@/utils/axios';

type DailyBreakdown = {
    rowType: 'week' | 'day';
    weekLabel?: string;
    date?: string;
    shift?: string;
    typeOfWork?: string;
    start?: string;
    end?: string;
    totalHours?: string;
    dailyTotal?: string;
    weeklyTotal?: string;
    regular?: string;
    employeeNotes?: string;
    managerNotes?: string;
    parsedDate?: Date | null;
    address?: string;
    check_in?: string;
    check_out?: string;
};

interface TimeClockDetailsProps {
    open: boolean;
    timeClock: TimeClock | null;
    user_id: any;
    currency: string;
    onClose: () => void;
}

type TimeClockDetailResponse = {
    IsSuccess: boolean;
    info: TimeClock[];
};

// const columnHelper = createColumnHelper<DailyBreakdown>();
const TimeClockDetails: React.FC<TimeClockDetailsProps> = ({  open, timeClock, user_id, currency, onClose}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [data, setData] = useState<TimeClock[]>([]);
    
    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '00:00';
        const num = parseFloat(val.toString());
        if (isNaN(num)) return '00:00';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const parseDate = (dateString: string): Date | null => {
        if (!dateString) return null;
        try {
            let parsedDate = parse(dateString, 'EEE d/M', new Date());
            if (isNaN(parsedDate.getTime())) {
                parsedDate = parse(dateString, 'dd-MM', new Date());
            }
            return parsedDate;
        } catch {
            return null;
        }
    };

    const sanitizeDateTime = (dateTime: string): string => {
        return dateTime && dateTime !== 'Invalid DateTime' ? dateTime : '--';
    };
    
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };
    
    const fetchTimeClockData = async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                user_id: user_id || '',
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            const response: AxiosResponse<TimeClockDetailResponse> = await api.get(
                '/timesheet/time-clock-details',
                { params }
            );

            if (response.data.IsSuccess) {
                setData(response.data.info || []);
            }
        } catch (error) {
            console.error('Error fetching timeClock data:', error);
        }
    };
    
    useEffect(() => {
        if (timeClock?.start_date && timeClock?.end_date) {
            fetchTimeClockData(
                new Date(timeClock.start_date),
                new Date(timeClock.end_date)
            );
        }
    }, [timeClock]);
    
    const dailyData = useMemo<DailyBreakdown[]>(() => {
        return (data || []).flatMap((week) => {
            const weekRows: DailyBreakdown[] = [];
            
            weekRows.push({
                rowType: 'week',
                weekLabel: week.week_range,
            });
            
            const dayRows = (week.days || []).map((day: any) => ({
                rowType: 'day' as const,
                date: day.date ?? '--',
                shift: day.shift_name || 'Shift',
                typeOfWork: day.type_of_work_name || 'Select',
                start: sanitizeDateTime(day.start),
                end: sanitizeDateTime(day.end),
                totalHours: formatHour(day.total_hours),
                dailyTotal: formatHour(day.daily_total),
                weeklyTotal: formatHour(day.weekly_total),
                regular: formatHour(day.regular),
                employeeNotes: day.employee_notes || '--',
                managerNotes: day.manager_notes || '--',
                weekLabel: week.week_range,
                parsedDate: parseDate(day.date),
                address: day.address || '--',
                check_in: sanitizeDateTime(day.check_in),
                check_out: sanitizeDateTime(day.check_out),
            }));

            weekRows.push(...dayRows);
            return weekRows;
        });
    }, [data]);
    
    const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'expander',
                header: '',
                size: 36,
                enableSorting: false,
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;
                    return (
                        <IconButton
                            size="small"
                            onClick={row.getToggleExpandedHandler()}
                            aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
                        >
                            {row.getIsExpanded() ? (
                                <IconChevronDown size={18} />
                            ) : (
                                <IconChevronRight size={18} />
                            )}
                        </IconButton>
                    );
                },
            },
            {
                id: 'select',
                header: () => <CustomCheckbox />,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? <CustomCheckbox /> : null,
                enableSorting: false,
                size: 40,
            },
            {
                id: 'date',
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => {
                    return row.original.rowType === 'day' ? (
                        <Stack>
                            <Typography variant="body2" fontWeight={500}>
                                {row.original.date}
                            </Typography>
                        </Stack>
                    ) : null;
                },
            },
            {
                id: 'shift',
                accessorKey: 'shift',
                header: 'Shift',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? (
                        <Chip
                            label={row.original.shift}
                            size="small"
                            variant="outlined"
                            icon={<IconClock size={14} />}
                        />
                    ) : null,
            },
            {
                id: 'typeOfWork',
                accessorKey: 'typeOfWork',
                header: 'Type of Work',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? (
                        <Typography variant="body2">
                            {row.original.typeOfWork || '—'}
                        </Typography>
                    ) : null,
            },
            {
                id: 'start',
                accessorKey: 'start',
                header: 'Start',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.start : null,
            },
            {
                id: 'end',
                accessorKey: 'end',
                header: 'End',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.end : null,
            },
            {
                id: 'totalHours',
                accessorKey: 'totalHours',
                header: 'Total hours',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.totalHours : null,
            },
            {
                id: 'dailyTotal',
                accessorKey: 'dailyTotal',
                header: 'Daily total',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? (
                        <Typography fontWeight={600}>{row.original.dailyTotal}</Typography>
                    ) : null,
            },
            {
                id: 'weeklyTotal',
                accessorKey: 'weeklyTotal',
                header: 'Weekly total',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? (
                        <Typography fontWeight={600}>{row.original.weeklyTotal}</Typography>
                    ) : null,
            },
            {
                id: 'regular',
                accessorKey: 'regular',
                header: 'Regular',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.regular : null,
            },
            {
                id: 'employeeNotes',
                accessorKey: 'employeeNotes',
                header: 'Employee notes',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.employeeNotes : null,
            },
            {
                id: 'managerNotes',
                accessorKey: 'managerNotes',
                header: 'Manager notes',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.managerNotes : null,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? (
                        <IconButton size="small">
                            <Typography variant="body2">⋮</Typography>
                        </IconButton>
                    ) : null,
                enableSorting: false,
                size: 40,
            },
        ],
        []
    );

    const expandedTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'date',
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => {
                    return row.original.rowType === 'day' ? (
                        <Stack>
                            <Typography variant="body2" fontWeight={500}>
                                {row.original.date}
                            </Typography>
                        </Stack>
                    ) : null;
                },
            },
            {
                id: 'address',
                accessorKey: 'address',
                header: 'Address',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.address : null,
            },
            {
                id: 'check_in',
                accessorKey: 'check_in',
                header: 'Check In',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.check_in : null,
            },
            {
                id: 'check_out',
                accessorKey: 'check_out',
                header: 'Check Out',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.check_out : null,
            },
            {
                id: 'totalHours',
                accessorKey: 'totalHours',
                header: 'Total hours',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.totalHours : null,
            },
        ],
        []
    );
    
    const table = useReactTable({
        data: dailyData,
        columns: mainTableColumns,
        state: {
            columnVisibility,
            expanded,
        },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onExpandedChange: setExpanded,
        getRowCanExpand: (row) => row.original.rowType === 'day',
    });
    
    if (!timeClock) return null;
    
    const statistics = [
        {
            value: formatHour(timeClock.total_hours),
            label: 'Regular',
        },
        {
            value: formatHour(timeClock.total_break_hours),
            label: 'Paid time off',
        },
        {
            value: formatHour(timeClock.total_hours),
            label: 'Total Paid Hours',
        },
        {
            value: '6',
            label: 'Worked Days',
        },
        {
            value: '00:00',
            label: 'Unpaid time off',
        },
        {
            value: timeClock.total_payable_amount
                ? `${currency}${timeClock.total_payable_amount}`
                : `${currency}0.00`,
            label: 'Pay per dates',
        },
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    p: 2,
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                        src={timeClock.user_thumb_image}
                        alt={timeClock.user_name}
                        sx={{ width: 40, height: 40 }}
                    />
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {timeClock.user_name}
                        </Typography>
                        <Typography color="textSecondary" variant="body2">
                            {timeClock.trade_name}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <IconX />
                </IconButton>
            </Box>
            
            <Box
                sx={{
                    p: 2,
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" spacing={6} alignItems="center">
                    {statistics.map((stat, index) => (
                        <Box key={index} textAlign="center">
                            <Typography variant="h4" fontWeight={700} color="text.primary">
                                {stat.value}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {stat.label}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
                
                <Stack>
                    <IconButton onClick={handlePopoverOpen}>
                        <IconTableColumn />
                    </IconButton>
                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
                    >
                        <TextField
                            size="small"
                            placeholder="Search"
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ mb: 1 }}
                        />
                        <FormGroup>
                            {table
                                .getAllLeafColumns()
                                .filter((col) =>
                                    col.id.toLowerCase().includes(search.toLowerCase())
                                )
                                .map((col) => (
                                    <FormControlLabel
                                        key={col.id}
                                        control={
                                            <Checkbox
                                                checked={col.getIsVisible()}
                                                onChange={col.getToggleVisibilityHandler()}
                                            />
                                        }
                                        label={(col.columnDef.header as string) || ''}
                                    />
                                ))}
                        </FormGroup>
                    </Popover>
                </Stack>
            </Box>
            
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <TableContainer>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableCell
                                            key={header.id}
                                            sx={{
                                                backgroundColor: '#fafafa',
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                            }}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHead>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => {
                                const rowData = row.original;
                                
                                if (rowData.rowType === 'week') {
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell
                                                colSpan={table.getAllLeafColumns().length}
                                                sx={{
                                                    backgroundColor: '#f0f0f0',
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {rowData.weekLabel}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }
                                
                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    sx={{ py: 1, fontSize: '0.875rem' }}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell
                                                colSpan={table.getAllLeafColumns().length}
                                                sx={{ p: 0, borderBottom: 0 }}
                                            >
                                                <Collapse
                                                    in={row.getIsExpanded()}
                                                    timeout="auto"
                                                    unmountOnExit
                                                >
                                                    <Box
                                                        sx={{
                                                            px: 3,
                                                            py: 2,
                                                            backgroundColor: '#fcfcfc',
                                                            borderTop: '1px dashed #e0e0e0',
                                                        }}
                                                    >
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    {expandedTableColumns.map((col) => (
                                                                        <TableCell
                                                                            key={col.id}
                                                                            sx={{
                                                                                backgroundColor: '#fafafa',
                                                                                fontWeight: 600,
                                                                            }}
                                                                        >
                                                                            {flexRender(col.header, {
                                                                                column: col,
                                                                            } as any)}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {table.getRowModel().rows.map((row) => (
                                                                    <TableRow key={row.id}>
                                                                        {expandedTableColumns.map((col) => {
                                                                            const cell = row.getVisibleCells().find((c) => c.column.id === col.id);
                                                                            return (
                                                                                <TableCell key={col.id}>
                                                                                    {cell
                                                                                        ? flexRender(cell.column.columnDef.cell, cell.getContext())
                                                                                        : null}
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default TimeClockDetails;
