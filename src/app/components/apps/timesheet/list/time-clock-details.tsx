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
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import {
    IconX,
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
    rowsData?: [];
    checkin_time: any;
    checkout_time: any;
    total_hours: any;
    rowType: 'week' | 'day';
    weeklyTotalHours?: string;
    weeklyPayableAmount?: string;
    weekLabel?: string;

    date?: string;
    shift?: string;
    typeOfWork?: string;
    start?: string;
    end?: string;
    totalHours?: string;
    priceWorkAmount?: string;
    dailyTotal?: string;
    payableAmount?: string;
    regular?: string;
    employeeNotes?: string;
    managerNotes?: string;

    parsedDate?: Date | null;
    address?: string;
    check_in?: string;
    check_out?: string;

    isFirst?: boolean;
    rowSpan?: number;

    userChecklogs?: CheckLog[];
    allUserChecklogs?: CheckLog[];
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
    type_of_works: [];
    shifts: [];
};

type CheckLog = {
    checklog_id: number;
    date_added: string;
    address_id: number;
    address_name: string;
    checkin_time: string;
    checkout_time: string;
    total_hours: number;
};

const TimeClockDetails: React.FC<TimeClockDetailsProps> = ({open, timeClock, user_id, currency, onClose,}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [expandedWorklogs, setExpandedWorklogs] = useState<{[key: string]: number | null}>({});
    const [data, setData] = useState<TimeClock[]>([]);
    const [headerDetail, setHeaderDetail] = useState<any>(null);
    const [typeOfWorks, setTypeOfWorks] = useState<any>([]);
    const [shifts, setShifts] = useState<any>([]);

    const handleWorklogToggle = (rowId: string, worklogIndex: number) => {
        setExpandedWorklogs(prev => {
            const currentExpanded = prev[rowId];
            if (currentExpanded === worklogIndex) {
                return { ...prev, [rowId]: null };
            } else {
                return { ...prev, [rowId]: worklogIndex };
            }
        });
    };

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '00:00';
        const str = val.toString().trim();

        if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
            const [h, m] = str.split(':');
            const minutes = parseFloat(m) || 0;
            return `${h.padStart(2, '0')}:${Math.floor(minutes)
                .toString()
                .padStart(2, '0')}`;
        }

        const num = parseFloat(str);
        if (!isNaN(num)) {
            const h = Math.floor(num);
            const m = Math.round((num - h) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        return '00:00';
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
    const handlePopoverClose = () => setAnchorEl(null);

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
                setHeaderDetail(response.data);
            }
        } catch (error) {
            console.error('Error fetching timeClock data:', error);
        }
    };

    const fetchTimeClockResources = async (companyId: string): Promise<void> => {
        try {
            const params: Record<string, string> = { company_id: companyId || '' };
            const response: AxiosResponse<TimeClockDetailResponse> = await api.get(
                '/timesheet/time-clock-resources',
                { params }
            );
            if (response.data.IsSuccess) {
                setTypeOfWorks(response.data.type_of_works || []);
                setShifts(response.data.shifts || []);
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
        fetchTimeClockResources(timeClock?.company_id || '');
    }, [timeClock]);

    const dailyData = useMemo<DailyBreakdown[]>(() => {
        return (data || []).flatMap((week) => {
            const weekRows: DailyBreakdown[] = [];

            // Week header row
            weekRows.push({
                checkin_time: '--',
                checkout_time: '--',
                total_hours: '--',
                rowType: 'week',
                weekLabel: week.week_range,
                weeklyTotalHours: formatHour(week.weekly_total_hours),
                weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
            });

            // Days
            const dayRows = (week.days || []).flatMap((day: any) => {
                if (day.worklogs && day.worklogs.length > 0) {
                    if(day.worklogs.length === 1){
                        return day.worklogs.map((log: any, idx: number) => ({
                            rowType: 'day' as const,
                            date:  day.date,
                            shift: log.shift_name || 'Shift',
                            start: sanitizeDateTime(log.start),
                            end: sanitizeDateTime(log.end),
                            priceWorkAmount: `${currency}${log.pricework_amount || 0}`,
                            totalHours: log.total_hours != '--' ? formatHour(log.total_hours) : '--',
                            dailyTotal: formatHour(day.daily_total),
                            payableAmount: `${currency}${log.payable_amount || 0}`,
                            regular: formatHour(log.regular),
                            employeeNotes: (log.employee_notes || '--'),
                            managerNotes: (log.manager_notes || '--'),
                            weekLabel: week.week_range,
                            weeklyTotalHours: formatHour(week.weekly_total_hours),
                            weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
                            parsedDate: parseDate(day.date),
                            address: log.address || '--',
                            check_in: sanitizeDateTime(log.check_in),
                            check_out: sanitizeDateTime(log.check_out),
                            rowSpan: idx === 0 ? day.worklogs.length : 0,
                            userChecklogs: log.user_checklogs ?? [],
                        }));
                    }

                    const allChecklogs = day.worklogs.reduce((acc: CheckLog[], log: any) => {
                        if (log.user_checklogs && Array.isArray(log.user_checklogs)) {
                            return [...acc, ...log.user_checklogs];
                        }
                        return acc;
                    }, []);

                    return [{
                        rowType: 'day' as const,
                        date: day.date ?? '--',
                        shift: '--',
                        start: '--',
                        end: '--',
                        priceWorkAmount: '--',
                        totalHours: '--',
                        dailyTotal: formatHour(day.daily_total),
                        payableAmount: `${currency}${day.daily_payable_amount || 0}`,
                        regular: '--',
                        employeeNotes: day.employee_notes || '--',
                        managerNotes: day.manager_notes || '--',
                        weekLabel: week.week_range,
                        weeklyTotalHours: formatHour(week.weekly_total_hours),
                        weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
                        parsedDate: parseDate(day.date),
                        address: '--',
                        check_in: '--',
                        check_out: '--',
                        rowsData: day.worklogs,
                        rowSpan: 1,
                        allUserChecklogs: allChecklogs,
                    },
                    ];

                }

                return [
                    {
                        rowType: 'day' as const,
                        date: day.date ?? '--',
                        shift: '--',
                        start: '--',
                        end: '--',
                        priceWorkAmount: '--',
                        totalHours: '--',
                        dailyTotal: '--',
                        payableAmount: '--',
                        regular: '--',
                        employeeNotes: '--',
                        managerNotes: '--',
                        weekLabel: '--',
                        weeklyTotalHours: '--',
                        weeklyPayableAmount: '--',
                        parsedDate: '--',
                        address: '--',
                        check_in: '--',
                        check_out: '--',
                        rowSpan: 1,
                        allUserChecklogs: [],
                    },
                ];
            });

            weekRows.push(...dayRows);
            return weekRows;
        });
    }, [data, currency]);

    const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'select',
                header: () => <CustomCheckbox />,
                cell: ({ row }) =>
                    row.original.rowType === 'day'  ? (
                        <CustomCheckbox />
                    ) : null,
                enableSorting: false,
                size: 40,
            },
            {
                id: 'date',
                header: 'Date',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.date : null,
            },
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
                id: 'shift',
                accessorKey: 'shift',
                header: 'Shift',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.shift : null,
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
                id: 'priceWorkAmount',
                accessorKey: 'priceWorkAmount',
                header: 'Pricework Amount',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.priceWorkAmount : null,
            },
            {
                id: 'dailyTotal',
                header: 'Daily total',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.dailyTotal : null,
            },
            {
                id: 'payableAmount',
                accessorKey: 'payableAmount',
                header: 'Payable Amount',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.payableAmount : null,
            },
            {
                id: 'employeeNotes',
                header: 'Employee notes',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.employeeNotes : null,
            },
            {
                id: 'managerNotes',
                header: 'Manager notes',
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.managerNotes : null,
            },
        ],
        []
    );

    const expandedTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'address',
                accessorKey: 'address',
                header: 'Address'
            },
            {
                id: 'checkin_time',
                accessorKey: 'checkin_time',
                header: 'Check In'
            },
            {
                id: 'checkout_time',
                accessorKey: 'checkout_time',
                header: 'Check Out'
            },
            {
                id: 'total_hours',
                accessorKey: 'total_hours',
                header: 'Total hours',
            },
        ],
        []
    );

    const table = useReactTable({
        data: dailyData,
        columns: mainTableColumns,
        state: { columnVisibility, expanded },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onExpandedChange: setExpanded,
        getRowCanExpand: (row) => row.original.rowType === 'day',
    });

    if (!timeClock) return null;

    const headerDetails = [
        { value: formatHour(headerDetail?.total_hours), label: 'Total Hours' },
        { value: formatHour(headerDetail?.total_break_hours), label: 'Total Break Hours' },
        { value: formatHour(headerDetail?.payable_hours), label: 'Payable Hours' },
        { value: `${currency}${headerDetail?.total_payable_amount || 0}`, label: 'Total Payable Amount' },
        { value: headerDetail?.worked_days ?? 0, label: 'Worked Days' },
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
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
                    {headerDetails.map((stat, index) => (
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
                                        label={
                                            (typeof col.columnDef.header === 'string'
                                                ? col.columnDef.header
                                                : col.id) as string
                                        }
                                    />
                                ))}
                        </FormGroup>
                    </Popover>
                </Stack>
            </Box>

            {/* Table */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <TableContainer>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((header) => (
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

                                // Week header row
                                if (rowData.rowType === 'week') {
                                    const visibleColumnsCount =
                                        table.getVisibleLeafColumns().length;
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell
                                                colSpan={visibleColumnsCount}
                                                sx={{
                                                    backgroundColor: '#f0f0f0',
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                    py: 1.5,
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    sx={{ width: '100%', position: 'relative' }}
                                                >
                                                    <Typography
                                                        variant="body1"
                                                        fontWeight={600}
                                                        sx={{
                                                            position: 'absolute',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                        }}
                                                    >
                                                        {rowData.weekLabel}
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        fontWeight={600}
                                                        sx={{ marginLeft: 'auto' }}
                                                    >
                                                        Week Total: {rowData.weeklyTotalHours}({rowData.weeklyPayableAmount})
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                // Day rows
                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow key={row.id}> {/* 👈 Main Row */}

                                            {row.original.rowsData ? <>
                                                <TableCell><CustomCheckbox /></TableCell>
                                                <TableCell>{rowData.date}</TableCell>
                                                <TableCell colSpan={table.getVisibleLeafColumns().length - 6}>
                                                    <Table size="small" sx={{ padding:0, tableLayout: 'fixed' }}>
                                                        <TableBody>
                                                            {row.original.rowsData.map((log: any, idx: number) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell sx={{ width: '40px', textAlign: 'center' }}>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleWorklogToggle(row.id, idx)}
                                                                            aria-label={expandedWorklogs[row.id] === idx ? 'Collapse' : 'Expand'}
                                                                        >
                                                                            {expandedWorklogs[row.id] === idx ? (
                                                                                <IconChevronDown size={18} />
                                                                            ) : (
                                                                                <IconChevronRight size={18} />
                                                                            )}
                                                                        </IconButton>
                                                                    </TableCell>
                                                                    <TableCell>{log.shift_name}</TableCell>
                                                                    <TableCell>{sanitizeDateTime(log.start)}</TableCell>
                                                                    <TableCell>{sanitizeDateTime(log.end)}</TableCell>
                                                                    <TableCell>{formatHour(log.total_hours)}</TableCell>
                                                                    <TableCell>{`${currency}${log.pricework_amount || 0}`}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                    {/*{expandedWorklogs[row.id] !== null && expandedWorklogs[row.id] !== undefined && (*/}
                                                    {/*    <TableRow*/}
                                                    {/*        sx={{*/}
                                                    {/*            '& > td': {*/}
                                                    {/*                borderBottom: 'none',*/}
                                                    {/*            },*/}
                                                    {/*        }}*/}
                                                    {/*    >*/}
                                                    {/*        <TableCell*/}
                                                    {/*            colSpan={table.getVisibleLeafColumns().length}*/}
                                                    {/*            sx={{ p: 0 }}*/}
                                                    {/*        >*/}
                                                    {/*            <Box*/}
                                                    {/*                sx={{*/}
                                                    {/*                    px: 3,*/}
                                                    {/*                    py: 2,*/}
                                                    {/*                    backgroundColor: '#fcfcfc',*/}
                                                    {/*                    borderTop: '1px solid #e0e0e0',*/}
                                                    {/*                    borderBottom: '1px solid #e0e0e0',*/}
                                                    {/*                    borderRadius: 0,*/}
                                                    {/*                }}*/}
                                                    {/*            >*/}
                                                    {/*                {(() => {*/}
                                                    {/*                    const expandedWorklogIndex = expandedWorklogs[row.id];*/}
                                                    {/*                    const expandedWorklog = (row.original.rowsData?.[expandedWorklogIndex!]) as any;*/}
                                                    {/*                    const worklogChecklogs = expandedWorklog?.user_checklogs || [];*/}
                                                    
                                                    {/*                    return worklogChecklogs.length > 0 ? (*/}
                                                    {/*                        <Table size="small">*/}
                                                    {/*                            <TableHead>*/}
                                                    {/*                                <TableRow>*/}
                                                    {/*                                    <TableCell*/}
                                                    {/*                                        sx={{*/}
                                                    {/*                                            backgroundColor: '#fafafa',*/}
                                                    {/*                                            fontWeight: 600,*/}
                                                    {/*                                        }}*/}
                                                    {/*                                    >*/}
                                                    {/*                                        Address*/}
                                                    {/*                                    </TableCell>*/}
                                                    {/*                                    <TableCell*/}
                                                    {/*                                        sx={{*/}
                                                    {/*                                            backgroundColor: '#fafafa',*/}
                                                    {/*                                            fontWeight: 600,*/}
                                                    {/*                                        }}*/}
                                                    {/*                                    >*/}
                                                    {/*                                        Check In*/}
                                                    {/*                                    </TableCell>*/}
                                                    {/*                                    <TableCell*/}
                                                    {/*                                        sx={{*/}
                                                    {/*                                            backgroundColor: '#fafafa',*/}
                                                    {/*                                            fontWeight: 600,*/}
                                                    {/*                                        }}*/}
                                                    {/*                                    >*/}
                                                    {/*                                        Check Out*/}
                                                    {/*                                    </TableCell>*/}
                                                    {/*                                    <TableCell*/}
                                                    {/*                                        sx={{*/}
                                                    {/*                                            backgroundColor: '#fafafa',*/}
                                                    {/*                                            fontWeight: 600,*/}
                                                    {/*                                        }}*/}
                                                    {/*                                    >*/}
                                                    {/*                                        Total Hours*/}
                                                    {/*                                    </TableCell>*/}
                                                    {/*                                </TableRow>*/}
                                                    {/*                            </TableHead>*/}
                                                    {/*                            <TableBody>*/}
                                                    {/*                                {worklogChecklogs.map(*/}
                                                    {/*                                    (checklog: CheckLog) => {*/}
                                                    {/*                                        const sameAddressCount = worklogChecklogs.filter(*/}
                                                    {/*                                            (c: CheckLog) =>*/}
                                                    {/*                                                c.address_id === checklog.address_id*/}
                                                    {/*                                        ).length;*/}
                                                    {/*                                        const renderAddressCell =*/}
                                                    {/*                                            worklogChecklogs.findIndex(*/}
                                                    {/*                                                (c: CheckLog) =>*/}
                                                    {/*                                                    c.address_id === checklog.address_id*/}
                                                    {/*                                            ) === worklogChecklogs.indexOf(checklog);*/}
                                                    
                                                    {/*                                        return (*/}
                                                    {/*                                            <TableRow key={checklog.checklog_id}>*/}
                                                    {/*                                                {renderAddressCell && (*/}
                                                    {/*                                                    <TableCell*/}
                                                    {/*                                                        rowSpan={sameAddressCount}*/}
                                                    {/*                                                        sx={{ borderBottom: 'none' }}*/}
                                                    {/*                                                    >*/}
                                                    {/*                                                        {checklog.address_name}*/}
                                                    {/*                                                    </TableCell>*/}
                                                    {/*                                                )}*/}
                                                    {/*                                                <TableCell>*/}
                                                    {/*                                                    {checklog.checkin_time}*/}
                                                    {/*                                                </TableCell>*/}
                                                    {/*                                                <TableCell>*/}
                                                    {/*                                                    {checklog.checkout_time}*/}
                                                    {/*                                                </TableCell>*/}
                                                    {/*                                                <TableCell>*/}
                                                    {/*                                                    {formatHour(checklog.total_hours)}*/}
                                                    {/*                                                </TableCell>*/}
                                                    {/*                                            </TableRow>*/}
                                                    {/*                                        );*/}
                                                    {/*                                    }*/}
                                                    {/*                                )}*/}
                                                    {/*                            </TableBody>*/}
                                                    {/*                        </Table>*/}
                                                    {/*                    ) : (*/}
                                                    {/*                        <Typography*/}
                                                    {/*                            variant="body2"*/}
                                                    {/*                            color="text.secondary"*/}
                                                    {/*                            textAlign="center"*/}
                                                    {/*                            sx={{ py: 2 }}*/}
                                                    {/*                        >*/}
                                                    {/*                            This worklog has no check logs.*/}
                                                    {/*                        </Typography>*/}
                                                    {/*                    );*/}
                                                    {/*                })()}*/}
                                                    {/*            </Box>*/}
                                                    {/*        </TableCell>*/}
                                                    {/*    </TableRow>*/}
                                                    {/*)}*/}
                                                </TableCell>
                                                <TableCell sx={{ verticalAlign: 'middle' }}> {rowData.dailyTotal} </TableCell>
                                                <TableCell sx={{ verticalAlign: 'middle' }}> {rowData.payableAmount} </TableCell>
                                                <TableCell sx={{ verticalAlign: 'middle' }}> {rowData.employeeNotes} </TableCell>
                                                <TableCell sx={{ verticalAlign: 'middle' }}> {rowData.managerNotes} </TableCell>

                                            </> : row.getVisibleCells().map((cell) => {
                                                const { column } = cell;

                                                return (
                                                    <TableCell key={cell.id} sx={{ py: 1, fontSize: '0.875rem' }}>
                                                        {flexRender(column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                );
                                            })}
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
