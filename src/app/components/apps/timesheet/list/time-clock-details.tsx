'use client';

import React, {useEffect, useMemo, useState, useCallback} from 'react';
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
    Checkbox, Button,
} from '@mui/material';
import {
    IconX,
    IconTableColumn,
    IconChevronRight,
    IconChevronDown,
    IconSearch,
    IconPlus,
    IconLock,
    IconLockOpen,
    IconTrash,
    IconChevronLeft,
} from '@tabler/icons-react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    VisibilityState,
    ExpandedState,
    getExpandedRowModel,
    RowData,
} from '@tanstack/react-table';
import {format, parse} from 'date-fns';
import {AxiosResponse} from 'axios';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import {TimeClock} from './time-clock';
import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        label?: string;
    }
}

type DailyBreakdown = {
    timesheet_light_id: number;
    rowsData?: any[];
    checkin_time: any;
    checkout_time: any;
    total_hours: any;
    rowType: 'week' | 'day';
    weeklyTotalHours?: string;
    weeklyPayableAmount?: string;
    weekLabel?: string;

    date?: string;
    shift?: string;
    project?: string;
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

    parsedDate?: Date | null | string;
    address?: string;
    check_in?: string;
    check_out?: string;

    isFirst?: boolean;
    rowSpan?: number;
    date_added?: string;
    worklog_id?: string;

    status?: number;

    userChecklogs?: CheckLog[];
    allUserChecklogs?: CheckLog[];
};

interface TimeClockDetailsProps {
    open: boolean;
    timeClock: TimeClock | null;
    user_id: any;
    currency: string;
    allUsers: TimeClock[]; // Add this prop to get all users list
    onClose: () => void;
    onUserChange?: (user: TimeClock) => void; // Add callback for user change
}

type TimeClockDetailResponse = {
    IsSuccess: boolean;
    info: TimeClock[];
    type_of_works: any[];
    shifts: any[];
    projects: any[];
    total_hours?: number;
    total_break_hours?: number;
    payable_hours?: number;
    total_payable_amount?: number;
    worked_days?: number;
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
    editingField?: 'start' | 'end';
};

interface CheckLogRowsProps {
    logs: CheckLog[];
    currency: string;
    formatHour: (val: string | number | null | undefined) => string;
    visibleColumnConfigs: { [key: string]: { width: number; visible: boolean } };
    getVisibleCellsLength: number;
    isMultiRow?: boolean;
}

const TimeClockDetails: React.FC<TimeClockDetailsProps> = ({
                                                               open,
                                                               timeClock,
                                                               user_id,
                                                               currency,
                                                               allUsers = [], // Default to empty array
                                                               onClose,
                                                               onUserChange
                                                           }) => {
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
    const [headerDetail, setHeaderDetail] = useState<TimeClockDetailResponse | null>(null);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    const [editingWorklogs, setEditingWorklogs] = useState<{ [key: string]: EditingWorklog }>({});
    const [savingWorklogs, setSavingWorklogs] = useState<Set<string>>(new Set());

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Get current user index and navigation functions
    const currentUserIndex = useMemo(() => {
        if (!timeClock || !allUsers.length) return -1;
        return allUsers.findIndex(user => user.user_id === timeClock.user_id);
    }, [timeClock, allUsers]);

    const canGoToPrevious = currentUserIndex > 0;
    const canGoToNext = currentUserIndex >= 0 && currentUserIndex < allUsers.length - 1;

    const handlePreviousUser = () => {
        if (canGoToPrevious && onUserChange) {
            const previousUser = allUsers[currentUserIndex - 1];
            onUserChange(previousUser);
        }
    };

    const handleNextUser = () => {
        if (canGoToNext && onUserChange) {
            const nextUser = allUsers[currentUserIndex + 1];
            onUserChange(nextUser);
        }
    };

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

    const isRecordLocked = (log: any): boolean => {
        return log?.status === 6 || log?.status === '6';
    };

    const isRecordUnlocked = (log: any): boolean => {
        return log?.status === 7 || log?.status === '7' || (log?.status && log.status !== 6 && log.status !== '6');
    };

    // Helper function to check if a day has valid worklog data
    const hasValidWorklogData = (row: DailyBreakdown): boolean => {
        return !!(row.worklog_id || row.timesheet_light_id) &&
            row.start !== '--' &&
            row.end !== '--' &&
            row.start !== null &&
            row.end !== null &&
            row.start !== undefined &&
            row.end !== undefined;
    };

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handlePopoverClose = () => setAnchorEl(null);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            fetchTimeClockData(range.from, range.to);
        }
    };

    const startEditingField = (worklogId: string, field: 'start' | 'end', log: any) => {
        if (isRecordLocked(log)) {
            return;
        }

        setEditingWorklogs(prev => ({
            ...prev,
            [worklogId]: {
                worklogId,
                start: log.start || '',
                end: log.end || '',
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

    const getSelectedRowsLockStatus = () => {
        let hasLockedRows = false;
        let hasUnlockedRows = false;

        const selectedRowIndices = Array.from(selectedRows).map(rowId => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach(rowIndex => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (!rowData.rowsData) {
                    if (isRecordLocked(rowData)) {
                        hasLockedRows = true;
                    } else if(isRecordUnlocked(rowData)) {
                        hasUnlockedRows = true;
                    }
                }
                else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
                    rowData.rowsData.forEach((worklog: any) => {
                        if (isRecordLocked(worklog)) {
                            hasLockedRows = true;
                        } else if(isRecordUnlocked(rowData)) {
                            hasUnlockedRows = true;
                        }
                    });
                }
            }
        });

        return { hasLockedRows, hasUnlockedRows };
    };

    const handleLockClick = () => {
        const timesheetIds: (string | number)[] = [];
        const selectedRowIndices = Array.from(selectedRows).map(rowId => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach(rowIndex => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (!rowData.rowsData && rowData.timesheet_light_id != null) {
                    timesheetIds.push(rowData.timesheet_light_id);
                }
                else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
                    rowData.rowsData.forEach((worklog: any) => {
                        if (worklog.timesheet_light_id) {
                            timesheetIds.push(worklog.timesheet_light_id);
                        }
                    });
                }
            }
        });

        if (timesheetIds.length > 0) {
            toggleTimesheetStatus(timesheetIds, 'approve');
        }
    };

    const handleUnlockClick = () => {
        const timesheetIds: (string | number)[] = [];

        const selectedRowIndices = Array.from(selectedRows).map(rowId => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach(rowIndex => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (!rowData.rowsData && rowData.timesheet_light_id) {
                    timesheetIds.push(rowData.timesheet_light_id);
                }
                else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
                    rowData.rowsData.forEach((worklog: any) => {
                        if (worklog.timesheet_light_id) {
                            timesheetIds.push(worklog.timesheet_light_id);
                        }
                    });
                }
            }
        });

        if (timesheetIds.length > 0) {
            toggleTimesheetStatus(timesheetIds, 'unapprove');
        }
    };

    const toggleTimesheetStatus = useCallback(
        async (timesheetIds: (string | number)[], action: 'approve' | 'unapprove') => {
            try {
                const ids = timesheetIds.join(',');
                const endpoint = action === 'approve' ? '/timesheet/approve' : '/timesheet/unapprove';
                const response: AxiosResponse<{ IsSuccess: boolean }> = await api.post(endpoint, { ids });

                if (response.data.IsSuccess) {
                    const defaultStartDate = startDate || defaultStart;
                    const defaultEndDate = endDate || defaultEnd;
                    await fetchTimeClockData(defaultStartDate, defaultEndDate);

                    setSelectedRows(new Set());
                } else {
                    console.error(`Error ${action}ing timesheets`);
                }
            } catch (error) {
                console.error(`Error ${action}ing timesheets:`, error);
            }
        },
        [startDate, endDate]
    );

    const saveFieldChanges = async (worklogId: string, originalLog: any) => {
        const editedData = editingWorklogs[worklogId];
        if (!editedData) return;

        if (isRecordLocked(originalLog)) {
            cancelEditingField(worklogId);
            return;
        }

        const originalStart = sanitizeDateTime(originalLog.start);
        const originalEnd = sanitizeDateTime(originalLog.end);
        const newStart = editedData.start || '';
        const newEnd = editedData.end || '';

        if (originalStart === newStart && originalEnd === newEnd) {
            cancelEditingField(worklogId);
            return;
        }

        setSavingWorklogs(prev => new Set(prev).add(worklogId));
        try {
            await api.post('/time-clock/edit-worklog', {
                user_worklog_id: originalLog.worklog_id,
                date: originalLog.date_added,
                start_time: editedData.start,
                end_time: editedData.end,
            });

            cancelEditingField(worklogId);

            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
        } catch (error) {
            console.error('Error saving worklog:', error);
        } finally {
            setSavingWorklogs(prev => {
                const newSet = new Set(prev);
                newSet.delete(worklogId);
                return newSet;
            });
        }
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

    useEffect(() => {
        if (timeClock?.start_date && timeClock?.end_date) {
            const start = new Date(timeClock.start_date);
            const end = new Date(timeClock.end_date);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                setStartDate(start);
                setEndDate(end);
            }

            fetchTimeClockData(
                new Date(timeClock.start_date),
                new Date(timeClock.end_date)
            );
        }
    }, [timeClock]);

    const dailyData = useMemo<DailyBreakdown[]>(() => {
        return (data || []).flatMap((week: any) => {
            const weekRows: DailyBreakdown[] = [];

            weekRows.push({
                timesheet_light_id: 0,
                checkin_time: '--',
                checkout_time: '--',
                total_hours: '--',
                rowType: 'week',
                weekLabel: week.week_range,
                weeklyTotalHours: formatHour(week.weekly_total_hours),
                weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`
            });

            const dayRows = (week.days || []).flatMap((day: any) => {
                if (day.worklogs && day.worklogs.length > 0) {
                    if (day.worklogs.length === 1) {
                        return day.worklogs.map((log: any, idx: number) => ({
                            rowType: 'day' as const,
                            date: day.date,
                            timesheet_id: day.timesheet_id,
                            date_added: log.date_added,
                            worklog_id: log.worklog_id,
                            shift: log.shift_name || '--',
                            project: log.project_name || '--',
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
                            status: log.status || day.status,
                            timesheet_light_id: log.timesheet_light_id || day.timesheet_light_id,
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
                        timesheet_id: day.timesheet_id ?? '--',
                        shift: '--',
                        project: '--',
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
                        status: day.status,
                        timesheet_light_id: day.timesheet_light_id,
                    }];
                }

                return [{
                    rowType: 'day' as const,
                    date: day.date ?? '--',
                    timesheet_id: day.timesheet_id ?? null,
                    shift: '--',
                    project: '--',
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
                    status: day.status,
                    timesheet_light_id: day.timesheet_light_id,
                }];
            });

            weekRows.push(...dayRows);
            return weekRows;
        });
    }, [data, currency]);

    const selectableRowIds = useMemo(() => {
        const ids: string[] = [];
        dailyData.forEach((row, index) => {
            if (row.rowType === 'day') {
                ids.push(`row-${index}`);
            }
        });
        return ids;
    }, [dailyData.length]);

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedRows(new Set(selectableRowIds));
        } else {
            setSelectedRows(new Set());
        }
    }, [selectableRowIds]);

    const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(rowId);
            } else {
                newSet.delete(rowId);
            }
            return newSet;
        });
    }, []);

    const isAllSelected = selectableRowIds.length > 0 && selectedRows.size === selectableRowIds.length;
    const isIndeterminate = selectedRows.size > 0 && selectedRows.size < selectableRowIds.length;

    const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <CustomCheckbox
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                ),
                cell: ({row}) => {
                    if (row.original.rowType !== 'day') return null;

                    const rowId = `row-${row.index}`;
                    return (
                        <CustomCheckbox
                            checked={selectedRows.has(rowId)}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                        />
                    );
                },
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
                meta: { label: 'Expand/Collapse' },
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
                            {row.getIsExpanded() ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                        </IconButton>
                    );
                },
            },
            {
                id: 'project',
                accessorKey: 'project',
                header: 'Project',
                cell: ({row}) =>
                    row.original.rowType === 'day' ? row.original.project : null,
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
        [isAllSelected, isIndeterminate, selectedRows, handleSelectAll, handleRowSelect]
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

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const formatTimeInput = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length === 4) {
            return digits.slice(0, 2) + ':' + digits.slice(2, 4);
        }
        return value;
    };

    const renderEditableTimeCell = (
        worklogId: string,
        field: 'start' | 'end',
        currentValue: string,
        log: any
    ) => {
        const editingData = editingWorklogs[worklogId];
        const isEditing = editingData && editingData.editingField === field;
        const isSaving = savingWorklogs.has(worklogId);
        const isLocked = isRecordLocked(log);

        if (isEditing && !isLocked) {
            return (
                <Box sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    p: 0.5,
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <TextField
                        type="text"
                        value={editingData[field] || ''}
                        placeholder="HH:mm"
                        variant="standard"
                        InputProps={{
                            disableUnderline: true,
                        }}
                        onChange={(e) => {
                            const formatted = formatTimeInput(e.target.value);
                            updateEditingField(worklogId, field, formatted);
                        }}
                        onBlur={() => {
                            const newValue = editingData[field] || '';
                            const originalValue = sanitizeDateTime(currentValue);

                            if (timeRegex.test(newValue) && newValue !== originalValue) {
                                saveFieldChanges(worklogId, log);
                            } else {
                                cancelEditingField(worklogId);
                            }
                        }}
                        onKeyDown={(e) => handleKeyPress(e, worklogId, log)}
                        autoFocus
                        disabled={isSaving}
                        sx={{
                            width: '60px',
                            '& .MuiInputBase-input': {
                                fontSize: '0.875rem',
                                textAlign: 'center',
                                p: 0,
                            }
                        }}
                    />
                </Box>
            );
        }

        return (
            <Box
                onClick={() => !isLocked && startEditingField(worklogId, field, log)}
                sx={{
                    py: 0.5,
                    fontSize: '0.875rem',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: isLocked ? 0.6 : 1,
                    '&:hover': !isLocked ? {
                        borderRadius: '4px',
                    } : {},
                }}
                title={isLocked ? 'This worklog is locked and cannot be edited' : 'Click to edit'}
            >
                {sanitizeDateTime(currentValue)}
            </Box>
        );
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
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', position: 'relative'}}>
            <Box
                sx={{
                    p: 2,
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                {/* Top Navigation Row */}
                {allUsers.length > 1 && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                        }}
                    >
                        {canGoToPrevious ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    px: 2,
                                    py: 1,
                                    borderRadius: '25px',
                                    backgroundColor: 'white',
                                    border: '2px solid #e0e0e0',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={handlePreviousUser}
                            >
                                <IconChevronLeft size={20} color="#8b8a8a" />
                                <Avatar
                                    src={allUsers[currentUserIndex - 1]?.user_thumb_image}
                                    alt={allUsers[currentUserIndex - 1]?.user_name}
                                    sx={{ width: 28, height: 28, mx: 1 }}
                                />
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ fontSize: '0.85rem' }}
                                >
                                    {allUsers[currentUserIndex - 1]?.user_name}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ width: '200px' }} />
                        )}

                        {canGoToNext ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    px: 2,
                                    py: 1,
                                    borderRadius: '25px',
                                    backgroundColor: 'white',
                                    border: '2px solid #e0e0e0',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={handleNextUser}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ fontSize: '0.85rem' }}
                                >
                                    {allUsers[currentUserIndex + 1]?.user_name}
                                </Typography>
                                <Avatar
                                    src={allUsers[currentUserIndex + 1]?.user_thumb_image}
                                    alt={allUsers[currentUserIndex + 1]?.user_name}
                                    sx={{ width: 28, height: 28, mx: 1 }}
                                />
                                <IconChevronRight size={20} color="#8b8a8a" />
                            </Box>
                        ) : (
                            <Box sx={{ width: '200px' }} />
                        )}
                    </Box>
                )}

                {/* Main Header Content Row */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
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
                        </Stack>
                    </Stack>

                    <IconButton onClick={onClose} size="small">
                        <IconX/>
                    </IconButton>
                </Stack>
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
                                            col.columnDef.meta?.label ||
                                            (typeof col.columnDef.header === 'string' && col.columnDef.header.trim() !== ''
                                                ? col.columnDef.header
                                                : col.id)
                                        }
                                    />
                                ))}
                        </FormGroup>
                    </Popover>
                </Stack>
            </Box>

            {/* Table */}
            <Box sx={{flex: 1, overflow: 'auto', paddingBottom: selectedRows.size > 0 ? '80px' : '0px'}}>
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
                                    const visibleColumnsCount = table.getVisibleLeafColumns().length;
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
                                                        Week Total: {rowData.weeklyTotalHours} ({rowData.weeklyPayableAmount})
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

                                                return row.original.rowsData.map((log: any, index: number) => {
                                                    const worklogId = `${row.id}-${log.worklog_id}`;
                                                    const isWorklogExpanded = expandedWorklogsIds.includes(log.worklog_id);
                                                    const isFirstRow = index === 0;
                                                    const isLogLocked = isRecordLocked(log);

                                                    return (
                                                        <>
                                                            <TableRow
                                                                key={log.worklog_id}
                                                                sx={{
                                                                    backgroundColor: isLogLocked ? 'rgba(244, 67, 54, 0.02)' : 'transparent',
                                                                }}
                                                            >
                                                                {isFirstRow && visibleColumnConfigs.select?.visible && (
                                                                    <TableCell rowSpan={rowSpan}
                                                                               sx={{
                                                                                   width: `${visibleColumnConfigs.select.width}px`,
                                                                                   py: 0.5,
                                                                               }}
                                                                    >
                                                                        <CustomCheckbox
                                                                            checked={selectedRows.has(`row-${row.index}`)}
                                                                            onChange={(e) => handleRowSelect(`row-${row.index}`, e.target.checked)}
                                                                        />
                                                                    </TableCell>
                                                                )}

                                                                {isFirstRow && visibleColumnConfigs.date?.visible &&
                                                                    <TableCell rowSpan={rowSpan} sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>{rowData.date}</TableCell>}

                                                                {visibleColumnConfigs.expander?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem'
                                                                    }}>
                                                                        { log.user_checklogs && log.user_checklogs.length > 0 ? (
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

                                                                {visibleColumnConfigs.project?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem',
                                                                    }}>{log.project_name || '--'}</TableCell>}

                                                                {visibleColumnConfigs.shift?.visible &&
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem',
                                                                    }}>{log.shift_name || '--'}</TableCell>}

                                                                {visibleColumnConfigs.start?.visible && (
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem',
                                                                    }}>
                                                                        {log.is_pricework || isLogLocked ? (
                                                                            <Box sx={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                opacity: isLogLocked ? 0.6 : 1
                                                                            }}>
                                                                                {sanitizeDateTime(log.start)}
                                                                            </Box>
                                                                        ) : (
                                                                            renderEditableTimeCell(worklogId, 'start', log.start, log)
                                                                        )}
                                                                    </TableCell>
                                                                )}

                                                                {visibleColumnConfigs.end?.visible && (
                                                                    <TableCell sx={{
                                                                        py: 0.5,
                                                                        fontSize: '0.875rem',
                                                                    }}>
                                                                        {log.is_pricework || isLogLocked ? (
                                                                            <Box sx={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                opacity: isLogLocked ? 0.6 : 1
                                                                            }}>
                                                                                {sanitizeDateTime(log.end)}
                                                                            </Box>
                                                                        ) : (
                                                                            renderEditableTimeCell(worklogId, 'end', log.end, log)
                                                                        )}
                                                                    </TableCell>
                                                                )}

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
                                                <TableRow
                                                    key={row.id}
                                                    sx={{
                                                        backgroundColor: isRecordLocked(row.original) ? 'rgba(244, 67, 54, 0.02)' : 'transparent',
                                                    }}
                                                >
                                                    {row.getVisibleCells().map((cell) => {
                                                        const {column} = cell;
                                                        const cellId = `${row.id}-single-${column.id}`;

                                                        if ((column.id === 'start' || column.id === 'end') &&
                                                            row.original.rowType === 'day' &&
                                                            !row.original.rowsData) {
                                                            return (
                                                                <TableCell key={cell.id} sx={{
                                                                    py: 0.5,
                                                                    fontSize: '0.875rem',
                                                                    borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                                }}>
                                                                    {hasValidWorklogData(row.original) ?
                                                                        renderEditableTimeCell(cellId, column.id as 'start' | 'end', row.original[column.id as keyof DailyBreakdown] as string, row.original)
                                                                        :
                                                                        <Box sx={{
                                                                            py: 0.5,
                                                                            fontSize: '0.875rem',
                                                                            opacity: 0.6
                                                                        }}>
                                                                            {row.original[column.id as keyof DailyBreakdown] as string || '--'}
                                                                        </Box>
                                                                    }
                                                                </TableCell>
                                                            );
                                                        }

                                                        return (
                                                            <TableCell key={cell.id} sx={{
                                                                py: 0.5,
                                                                fontSize: '0.875rem',
                                                                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            }}>
                                                                {flexRender(column.columnDef.cell, cell.getContext())}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                                {row.getIsExpanded() && <CheckLogRows
                                                    logs={row.original.userChecklogs || []}
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

            {/* Bottom Action Bar with Lock/Unlock Buttons */}
            {selectedRows.size > 0 && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 20px rgba(0,0,0,0.15)',
                        px: 3,
                        py: 1,
                        zIndex: 1000,
                        minWidth: '400px',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton
                            size="small"
                            onClick={() => setSelectedRows(new Set())}
                            sx={{ color: '#666' }}
                        >
                            <IconX size={16} />
                        </IconButton>

                        <Typography variant="body2" fontWeight={600} color="text.primary">
                            {selectedRows.size} Selected
                        </Typography>

                        <Box sx={{ flexGrow: 1 }} />

                        <Stack direction="row" spacing={1}>
                            {(() => {
                                const { hasLockedRows, hasUnlockedRows } = getSelectedRowsLockStatus();

                                return (
                                    <>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="success"
                                            sx={{ px: 2 }}
                                            onClick={handleLockClick}
                                            disabled={!hasUnlockedRows}
                                        >
                                            <IconLock size={16} />
                                            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                                                Lock
                                            </Typography>
                                        </Button>

                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            sx={{ px: 2 }}
                                            onClick={handleUnlockClick}
                                            disabled={!hasLockedRows}
                                        >
                                            <IconLockOpen size={16} />
                                            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                                                Unlock
                                            </Typography>
                                        </Button>
                                    </>
                                );
                            })()}
                        </Stack>
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

const CheckLogRows = ({logs, currency, formatHour, visibleColumnConfigs, getVisibleCellsLength, isMultiRow = false }: any) => {
    return (
        <TableRow>
            {visibleColumnConfigs.select?.visible && <TableCell></TableCell>}
            {!isMultiRow && visibleColumnConfigs.status?.visible && <TableCell></TableCell>}
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
                                <TableRow key={checklog.checklog_id}>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.address_name}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.task_name || '--'}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.checkin_time}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.checkout_time}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {formatHour(checklog.total_hours)}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.pricework_amount ? `${currency}${checklog.pricework_amount}` : `${currency}0`}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        fontStyle="italic"
                        sx={{ p: 1 }}
                    >
                        This worklog has no checklogs
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
};

export default TimeClockDetails;
