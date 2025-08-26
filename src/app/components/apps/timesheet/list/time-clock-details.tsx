'use client';

import React, {useEffect, useMemo, useState} from 'react';
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
    IconChevronDown, IconSearch,
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
import {format, parse} from 'date-fns';
import {AxiosResponse} from 'axios';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import {TimeClock} from './time-clock';
import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

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
    pricework_amount: React.ReactNode;
    task_name: string;
    checklog_id: number;
    date_added: string;
    address_id: number;
    address_name: string;
    checkin_time: string;
    checkout_time: string;
    total_hours: number;
};

type EditingWorklog = {
    worklogId: string;
    start: string;
    end: string;
    shift_id: string;
    shift_name: string;
    editingField?: 'start' | 'end' | 'shift';
};

const TimeClockDetails: React.FC<TimeClockDetailsProps> = ({open, timeClock, user_id, currency, onClose,}) => {
    const today = new Date();
    
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [expandedWorklogsIds, setExpandedWorklogsIds] = useState<string[]>([]);
    const [data, setData] = useState<TimeClock[]>([]);
    const [headerDetail, setHeaderDetail] = useState<any>(null);
    // const [typeOfWorks, setTypeOfWorks] = useState<any>([]);
    // const [shifts, setShifts] = useState<any>([]);

    const [editingWorklogs, setEditingWorklogs] = useState<{ [key: string]: EditingWorklog }>({});
    const [savingWorklogs, setSavingWorklogs] = useState<Set<string>>(new Set());

    const [startDate, setStartDate] = useState<Date | null>(defaultStart);
    const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
    
    const handleWorklogToggle = (worklogId: string) => {
        setExpandedWorklogsIds(prevIds => {
            if (prevIds.includes(worklogId)) {
                return prevIds.filter(existingId => existingId !== worklogId);
            } else {
                return [...prevIds, worklogId];
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

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
        }
    };
    
    const createWorklogId = (rowId: string, worklogIndex: number): string => {
        return `${rowId}-worklog-${worklogIndex}`;
    };
    
    const startEditingField = (worklogId: string, field: 'start' | 'end' | 'shift', log: any) => {
        setEditingWorklogs(prev => ({
            ...prev,
            [worklogId]: {
                worklogId,
                start: log.start || '',
                end: log.end || '',
                shift_id: log.shift_id || '',
                shift_name: log.shift_name || '',
                editingField: field,
            }
        }));
    };
    
    const cancelEditingField = (worklogId: string) => {
        setEditingWorklogs(prev => {
            const newState = {...prev};
            delete newState[worklogId];
            return newState;
        });
    };

    const updateEditingField = (worklogId: string, field: keyof EditingWorklog, value: string) => {
        setEditingWorklogs(prev => ({
            ...prev,
            [worklogId]: {
                ...prev[worklogId],
                [field]: value
            }
        }));
    };

    const saveFieldChanges = async (worklogId: string, originalLog: any) => {
        // const editedData = editingWorklogs[worklogId];
        // if (!editedData) return;
        //
        // setSavingWorklogs(prev => new Set(prev).add(worklogId));
        // try {
        //     const response = await api.put('/timesheet/update-worklog', {
        //         worklog_id: originalLog.worklog_id,
        //         start: editedData.start,
        //         end: editedData.end,
        //         shift_id: editedData.shift_id,
        //     });
        //
        //     if (response.data.IsSuccess) {
        //         setData(prevData => {
        //             return prevData.map(week => ({
        //                 ...week,
        //                 days: week.days?.map((day: any) => ({
        //                     ...day,
        //                     worklogs: day.worklogs?.map((log: any) =>
        //                         log.worklog_id === originalLog.worklog_id
        //                             ? {
        //                                 ...log,
        //                                 start: editedData.start,
        //                                 end: editedData.end,
        //                                 shift_id: editedData.shift_id,
        //                                 shift_name: editedData.shift_name,
        //                             }
        //                             : log
        //                     )
        //                 }))
        //             }));
        //         });
        //
        //         cancelEditingField(worklogId);
        //     }
        // } catch (error) {
        //     console.error('Error saving worklog:', error);
        //     // You might want to show an error message to the user
        // } finally {
        //     setSavingWorklogs(prev => {
        //         const newSet = new Set(prev);
        //         newSet.delete(worklogId);
        //         return newSet;
        //     });
        // }
    };

    const handleKeyPress = (event: React.KeyboardEvent, worklogId: string, originalLog: any) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveFieldChanges(worklogId, originalLog);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingField(worklogId);
        }
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
                {params}
            );
            if (response.data.IsSuccess) {
                setData(response.data.info || []);
                setHeaderDetail(response.data);
            }
        } catch (error) {
            console.error('Error fetching timeClock data:', error);
        }
    };

    // const fetchTimeClockResources = async (companyId: string): Promise<void> => {
    //     try {
    //         const params: Record<string, string> = {company_id: companyId || ''};
    //         const response: AxiosResponse<TimeClockDetailResponse> = await api.get(
    //             '/timesheet/time-clock-resources',
    //             {params}
    //         );
    //         if (response.data.IsSuccess) {
    //             setTypeOfWorks(response.data.type_of_works || []);
    //             setShifts(response.data.shifts || []);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching timeClock data:', error);
    //     }
    // };

    useEffect(() => {
        if (timeClock?.start_date && timeClock?.end_date) {
            fetchTimeClockData(
                new Date(timeClock.start_date),
                new Date(timeClock.end_date)
            );
        }
        // fetchTimeClockResources(timeClock?.company_id || '');
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
                    if (day.worklogs.length === 1) {
                        return day.worklogs.map((log: any, idx: number) => ({
                            rowType: 'day' as const,
                            date: day.date,
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
                header: () => <CustomCheckbox/>,
                cell: ({row}) =>
                    row.original.rowType === 'day' ? (
                        <CustomCheckbox/>
                    ) : null,
                enableSorting: false,
                size: 40,
            },
            {
                id: 'date',
                header: 'Date',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.date : null,
            },
            {
                id: 'expander',
                header: '',
                size: 36,
                enableSorting: false,
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;

                    const hasLogs = row.original.userChecklogs && row.original.userChecklogs.length > 0;

                    if (!hasLogs) return null;

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
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.shift : null,
            },
            {
                id: 'start',
                accessorKey: 'start',
                header: 'Start',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.start : null,
            },
            {
                id: 'end',
                accessorKey: 'end',
                header: 'End',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.end : null,
            },
            {
                id: 'totalHours',
                accessorKey: 'totalHours',
                header: 'Total hours',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.totalHours : null,
            },
            {
                id: 'priceWorkAmount',
                accessorKey: 'priceWorkAmount',
                header: 'Pricework Amount',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.priceWorkAmount : null,
            },
            {
                id: 'dailyTotal',
                header: 'Daily total',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.dailyTotal : null,
            },
            {
                id: 'payableAmount',
                accessorKey: 'payableAmount',
                header: 'Payable Amount',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.payableAmount : null,
            },
            {
                id: 'employeeNotes',
                header: 'Employee notes',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.employeeNotes : null,
            },
            {
                id: 'managerNotes',
                header: 'Manager notes',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.managerNotes : null,
            },
        ],
        []
    );

    const table = useReactTable({
        data: dailyData,
        columns: mainTableColumns,
        state: {columnVisibility, expanded},
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onExpandedChange: setExpanded,
        getRowCanExpand: (row) => row.original.rowType === 'day',
    });

    const renderEditableTimeCell = (
        worklogId: string,
        field: 'start' | 'end',
        currentValue: string,
        log: any
    ) => {
        const editingData = editingWorklogs[worklogId];
        const isEditing = editingData && editingData.editingField === field;
        const isSaving = savingWorklogs.has(worklogId);

        if (isEditing) {
            return (
                <TextField
                    type="text"
                    value={editingData[field] || ''}
                    placeholder="HH:mm"
                    onChange={(e) => {
                        const formatted = formatTimeInput(e.target.value);
                        updateEditingField(worklogId, field, formatted);
                    }}
                    onBlur={() => {
                        const value = editingData[field] || '';
                        if (timeRegex.test(value)) {
                            saveFieldChanges(worklogId, log);
                        } else {
                            updateEditingField(worklogId, field, '');
                        }
                    }}
                    onKeyPress={(e) => handleKeyPress(e, worklogId, log)}
                    autoFocus
                    disabled={isSaving}
                    sx={{
                        width: '60px',
                        '& .MuiInputBase-input': {
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }
                    }}
                />
            );
        }

        return (
            <TableCell 
                onClick={() => startEditingField(worklogId, field, log)} 
                sx={{
                    py: 0.5,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                }}
            >{sanitizeDateTime(currentValue)}</TableCell>
        );
    };

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // 24-hour HH:mm
    const formatTimeInput = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length === 4) {
            return digits.slice(0, 2) + ':' + digits.slice(2, 4);
        }
        return value;
    };
    
    if (!timeClock) return null;

    const headerDetails = [
        {value: formatHour(headerDetail?.total_hours), label: 'Total Hours'},
        {value: formatHour(headerDetail?.total_break_hours), label: 'Total Break Hours'},
        {value: formatHour(headerDetail?.payable_hours), label: 'Payable Hours'},
        {value: `${currency}${headerDetail?.total_payable_amount || 0}`, label: 'Total Payable Amount'},
        {value: headerDetail?.worked_days ?? 0, label: 'Worked Days'},
    ];

    const getVisibleColumnConfigs = () => {
        const visibleColumns = table.getVisibleLeafColumns();
        const configs: { [key: string]: { width: number; visible: boolean } } = {};

        mainTableColumns.forEach(col => {
            const isVisible = visibleColumns.some(visCol => visCol.id === col.id);
            configs[col.id as string] = {
                width: col.size || 100,
                visible: isVisible
            };
        });

        return configs;
    };

    const visibleColumnConfigs = getVisibleColumnConfigs();


    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
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
                        sx={{width: 40, height: 40}}
                    />
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {timeClock.user_name}
                        </Typography>
                        <Typography color="textSecondary" variant="body2">
                            {timeClock.trade_name}
                        </Typography>
                    </Box>

                    {/*<Stack*/}
                    {/*    mt={3}*/}
                    {/*    mx={2}*/}
                    {/*    mb={3}*/}
                    {/*    direction={{ xs: 'column', sm: 'row' }}*/}
                    {/*    spacing={{ xs: 1.5, sm: 2 }}*/}
                    {/*    alignItems="center"*/}
                    {/*    flexWrap="wrap"*/}
                    {/*>*/}
                    {/*    <DateRangePickerBox from={startDate} to={endDate} onChange={handleDateRangeChange} />*/}
                    {/*</Stack>*/}
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <IconX/>
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
                        <IconTableColumn/>
                    </IconButton>
                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                        transformOrigin={{vertical: 'top', horizontal: 'right'}}
                        PaperProps={{sx: {width: 220, p: 1, borderRadius: 2}}}
                    >
                        <TextField
                            size="small"
                            placeholder="Search"
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{mb: 1}}
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
            <Box sx={{flex: 1, overflow: 'auto'}}>
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
                                                    sx={{width: '100%', position: 'relative'}}
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
                                                        sx={{marginLeft: 'auto'}}
                                                    >
                                                        Week
                                                        Total: {rowData.weeklyTotalHours}({rowData.weeklyPayableAmount})
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                // Day rows
                                return (
                                    <React.Fragment key={row.id}>
                                        {row.original.rowsData ? (() => {
                                                const worklogIds = row.original.rowsData.map((log: any) => log.worklog_id);
                                                const expandedWorklogsCount = expandedWorklogsIds.filter((id) =>
                                                    worklogIds.includes(id)
                                                ).length;
                                                const rowSpan = row.original.rowsData.length + expandedWorklogsCount;

                                                return row.original.rowsData.map((log: any, index) => {

                                                    const worklogId = createWorklogId(row.id, index);
                                                    
                                                    const isWorklogExpanded = expandedWorklogsIds.includes(log.worklog_id);
                                                    const isFirstRow = index === 0;

                                                    return (
                                                        <>
                                                            <TableRow key={log.worklog_id}>
                                                                {isFirstRow && visibleColumnConfigs.select?.visible && (
                                                                    <TableCell rowSpan={rowSpan}
                                                                               sx={{
                                                                                   width: `${visibleColumnConfigs.select.width}px`,
                                                                                   py: 0.5,
                                                                               }}>
                                                                        <CustomCheckbox/>
                                                                    </TableCell>
                                                                )}
                                                                {isFirstRow && visibleColumnConfigs.date?.visible &&
                                                                    <TableCell rowSpan={rowSpan} sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{rowData.date}</TableCell>}
                                                            
                                                                {visibleColumnConfigs.expander?.visible && 
                                                                    <TableCell sx={{py: 0.5, fontSize: '0.875rem'}}>
                                                                        { log.user_checklogs.length > 0 ? (
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleWorklogToggle(log.worklog_id)}
                                                                                aria-label={isWorklogExpanded ? 'Collapse' : 'Expand'}>
                                                                                {isWorklogExpanded ? (
                                                                                    <IconChevronDown size={18}/>
                                                                                ) : (
                                                                                    <IconChevronRight size={18}/>
                                                                                )}
                                                                            </IconButton>
                                                                        ) : null}
                                                                    </TableCell>}

                                                                {visibleColumnConfigs.shift?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{log.shift_name}</TableCell>}
                                                                
                                                                {visibleColumnConfigs.start?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{sanitizeDateTime(log.start)}</TableCell>}

                                                                {visibleColumnConfigs.end?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{sanitizeDateTime(log.end)}</TableCell>}

                                                                {/*{visibleColumnConfigs.end?.visible && log.is_pricework ? (*/}
                                                                {/*    <TableCell sx={{*/}
                                                                {/*        py: 0.5,*/}
                                                                {/*        fontSize: '0.875rem'*/}
                                                                {/*    }}>{sanitizeDateTime(log.start)}</TableCell>*/}
                                                                {/*) : (*/}
                                                                {/*    renderEditableTimeCell(worklogId, 'start', log.start, log)*/}
                                                                {/*)}*/}
                                                                
                                                                {/*{visibleColumnConfigs.end?.visible && log.is_pricework ? (*/}
                                                                {/*    <TableCell sx={{*/}
                                                                {/*        py: 0.5,*/}
                                                                {/*        fontSize: '0.875rem'*/}
                                                                {/*    }}>{sanitizeDateTime(log.end)}</TableCell>*/}
                                                                {/*) : (*/}
                                                                {/*    renderEditableTimeCell(worklogId, 'end', log.end, log)*/}
                                                                {/*)}*/}
                                                                
                                                                {visibleColumnConfigs.totalHours?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{formatHour(log.total_hours)}</TableCell>}
                                                                
                                                                {visibleColumnConfigs.priceWorkAmount?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{`${currency}${log.pricework_amount || 0}`}</TableCell>}
                                                                
                                                                {isFirstRow && visibleColumnConfigs.dailyTotal?.visible &&
                                                                    <TableCell rowSpan={rowSpan} sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}> {rowData.dailyTotal} </TableCell>}
                                                                
                                                                {isFirstRow && visibleColumnConfigs.payableAmount?.visible &&
                                                                    <TableCell rowSpan={rowSpan} sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}> {rowData.payableAmount} </TableCell>}
                                                                
                                                                {isFirstRow && visibleColumnConfigs.employeeNotes?.visible &&
                                                                    <TableCell rowSpan={rowSpan} sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}> {rowData.employeeNotes} </TableCell>}
                                                                
                                                                {isFirstRow && visibleColumnConfigs.managerNotes?.visible &&
                                                                    <TableCell rowSpan={rowSpan} sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}> {rowData.managerNotes} </TableCell>}
                                                                
                                                            </TableRow>
                                                            {isWorklogExpanded &&
                                                                <CheckLogRows
                                                                    logs={log.user_checklogs}
                                                                    currency={currency}
                                                                    visibleColumnConfigs={visibleColumnConfigs}
                                                                    formatHour={formatHour}
                                                                    isMultiRow={true}
                                                                    getVisibleCellsLength={5}
                                                                />
                                                            }
                                                        </>)
                                                })
                                            })() :
                                            <>
                                                <TableRow key={row.id}>

                                                    {row.getVisibleCells().map((cell) => {
                                                        const {column} = cell;

                                                        return (
                                                            <TableCell key={cell.id} sx={{py: 0.5, fontSize: '0.875rem'}}>
                                                                {flexRender(column.columnDef.cell, cell.getContext())}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                                {row.getIsExpanded() && <CheckLogRows
                                                    logs={row.original.userChecklogs}
                                                    currency={currency}
                                                    formatHour={formatHour}
                                                    visibleColumnConfigs={visibleColumnConfigs}
                                                    getVisibleCellsLength={row.getVisibleCells().length}
                                                />}
                                            </>}
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

const CheckLogRows = ({logs, currency, formatHour, visibleColumnConfigs, getVisibleCellsLength, isMultiRow = false }: any) => {
    return (
        <TableRow>
            {visibleColumnConfigs.select?.visible && <TableCell></TableCell>}
            {!isMultiRow && visibleColumnConfigs.date?.visible && <TableCell></TableCell>}
            {!isMultiRow && visibleColumnConfigs.expander?.visible && <TableCell></TableCell>}
            <TableCell sx={{padding: 0}} colSpan={getVisibleCellsLength}>
                {logs?.length > 0 ? (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{
                                    backgroundColor: '#fafafa',
                                    fontWeight: 600,
                                    py: 0.5,
                                }}>
                                    Address
                                </TableCell>
                                <TableCell sx={{
                                    backgroundColor: '#fafafa',
                                    fontWeight: 600,
                                    py: 0.5,
                                }}>
                                    Task
                                </TableCell>
                                <TableCell sx={{
                                    backgroundColor: '#fafafa',
                                    fontWeight: 600,
                                    py: 0.5,
                                }}>
                                    Check In
                                </TableCell>
                                <TableCell sx={{
                                    backgroundColor: '#fafafa',
                                    fontWeight: 600,
                                    py: 0.5,
                                }}>
                                    Check Out
                                </TableCell>
                                <TableCell sx={{
                                    backgroundColor: '#fafafa',
                                    fontWeight: 600,
                                    py: 0.5,
                                }}>
                                    Hours
                                </TableCell>
                                <TableCell sx={{
                                    backgroundColor: '#fafafa',
                                    fontWeight: 600,
                                    py: 0.5,
                                }}>
                                    Amount
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((checklog: CheckLog) => (
                                <TableRow
                                    key={checklog.checklog_id}>
                                    <TableCell
                                        sx={{py: 0.5}}>
                                        {checklog.address_name}
                                    </TableCell>
                                    <TableCell
                                        sx={{py: 0.5}}>
                                        {checklog.task_name || '--'}
                                    </TableCell>
                                    <TableCell
                                        sx={{py: 0.5}}>
                                        {checklog.checkin_time}
                                    </TableCell>
                                    <TableCell
                                        sx={{py: 0.5}}>
                                        {checklog.checkout_time}
                                    </TableCell>
                                    <TableCell
                                        sx={{py: 0.5}}>
                                        {formatHour(checklog.total_hours)}
                                    </TableCell>
                                    <TableCell
                                        sx={{py: 0.5}}>
                                        {checklog.pricework_amount ? `${currency}${checklog.pricework_amount}` : `${currency}0`}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography variant="body2"
                                color="text.secondary"
                                fontStyle="italic">
                        This worklog has no checklogs
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    )
}

export default TimeClockDetails;
