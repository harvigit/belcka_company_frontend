import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Drawer, IconButton } from '@mui/material';
import { useReactTable, getCoreRowModel, getExpandedRowModel, ColumnDef, VisibilityState, ExpandedState } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { DateTime } from 'luxon';
import { AxiosResponse } from 'axios';
import api from '@/utils/axios';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import RequestDetails from './time-clock-details/request-details';
import Conflicts from './time-clock-details/conflicts/conflicts';
import { useTimeClockData } from './hooks/useTimeClockData';
import { useEditingState } from './hooks/useEditingState';
import { useNewRecords } from './hooks/useNewRecords';
import TimeClockHeader from './components/TimeClockHeader';
import TimeClockStats from './components/TimeClockStats';
import TimeClockTable from './components/TimeClockTable';
import ActionBar from './components/ActionBar';
import { DailyBreakdown, TimeClockDetailsProps } from '@/app/components/apps/time-clock/types/timeClock';
import { IconExclamationMark } from '@tabler/icons-react';
import Checklogs from './time-clock-details/checklogs/index';
import AddLeave from './time-clock-details/add-leave';

const STORAGE_KEY = 'time-clock-details-page';

interface RowData {
    rowType: string;
    timesheet_light_id?: string | number | null;
    rowsData?: { timesheet_light_id?: string | number }[];
}

interface ExportResponse {
    IsSuccess: boolean;
    message: string;
    data: {
        file: string;
        filename: string;
        contentType: string;
    };
}

const saveDateRangeToStorage = (startDate: Date | null, endDate: Date | null, columnVisibility: VisibilityState) => {
    try {
        const data = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null,
            columnVisibility,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
};

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                columnVisibility: parsed.columnVisibility || {},
            };
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
    }
    return null;
};

interface ExtendedTimeClockDetailsProps extends TimeClockDetailsProps {
    onDataChange?: () => void;
}

const TimeClockDetails: React.FC<ExtendedTimeClockDetailsProps> = ({
                                                                       open,
                                                                       timeClock,
                                                                       user_id,
                                                                       currency,
                                                                       allUsers = [],
                                                                       onClose,
                                                                       onUserChange,
                                                                       onDataChange,
                                                                   }) => {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);

    const getInitialDatesAndVisibility = () => {
        const stored = loadDateRangeFromStorage();
        if (stored && stored.startDate && stored.endDate) {
            return {
                startDate: stored.startDate,
                endDate: stored.endDate,
                columnVisibility: stored.columnVisibility,
            };
        }
        return {
            startDate: defaultStart,
            endDate: defaultEnd,
            columnVisibility: {},
        };
    };

    const initialData = useMemo(() => getInitialDatesAndVisibility(), []);

    // UI State
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialData.columnVisibility);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [expandedWorklogsIds, setExpandedWorklogsIds] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [requestListOpen, setRequestListOpen] = useState<boolean>(false);
    const [conflictSidebar, setConflictSidebar] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<Date | null>(initialData.startDate);
    const [endDate, setEndDate] = useState<Date | null>(initialData.endDate);
    const [filterValue, setFilterValue] = useState<string>('all');
    const [conflictsByDate, setConflictsByDate] = useState<{[key: string]: number}>({});
    const [checklogsSidebar, setChecklogsSidebar] = useState<boolean>(false);
    const [selectedWorkId, setSelectedWorkId] = useState<number>(0);
    const [addLeaveSidebar, setAddLeaveSidebar] = useState<boolean>(false);

    // Save columnVisibility to localStorage whenever it changes
    useEffect(() => {
        saveDateRangeToStorage(startDate, endDate, columnVisibility);
    }, [startDate, endDate, columnVisibility]);
    
    // Custom hooks
    const {
        data,
        headerDetail,
        pendingRequestCount,
        setPendingRequestCount,
        totalConflicts,
        setTotalConflicts,
        conflictDetails,
        shifts,
        projects,
        fetchTimeClockData,
    } = useTimeClockData(user_id, currency);

    useEffect(() => {
        if (conflictDetails && conflictDetails.length > 0) {
            const conflicts: {[key: string]: number} = {};

            conflictDetails.forEach((conflictGroup: any) => {
                const formattedDate = conflictGroup.formatted_date; 
                const items = conflictGroup.items || [];

                if (items.length > 0) {
                    const dateStr = items[0].date;
                    const [day, month, year] = dateStr.split('/');
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayName = daysOfWeek[dateObj.getDay()];
                    const formattedKey = `${dayName} ${parseInt(day)}/${parseInt(month)}`; // "Wed 1/10"

                    conflicts[formattedKey] = items.length;
                }
            });

            setConflictsByDate(conflicts);
        } else {
            setConflictsByDate({});
        }
    }, [conflictDetails]);
    
    const {
        editingWorklogs,
        savingWorklogs,
        setSavingWorklogs,
        editingShifts,
        startEditingField,
        startEditingShift,
        cancelEditingField,
        cancelEditingShift,
        updateEditingField,
        updateEditingShift,
        editingProjects,
        startEditingProject,
        updateEditingProject,
        cancelEditingProject,
    } = useEditingState();

    const {
        newRecords,
        savingNewRecords,
        setSavingNewRecords,
        startAddingNewRecord,
        updateNewRecord,
        cancelNewRecord,
        clearNewRecords,
    } = useNewRecords();

    // Navigation logic
    const currentUserIndex = useMemo(() => {
        if (!timeClock || !allUsers.length) return -1;
        return allUsers.findIndex((user) => user.user_id === timeClock.user_id);
    }, [timeClock, allUsers]);

    const handlePreviousUser = () => {
        setTotalConflicts(0);
        setPendingRequestCount(0);
        clearNewRecords();
        if (currentUserIndex > 0 && onUserChange) {
            onUserChange(allUsers[currentUserIndex - 1]);
        }
    };

    const handleNextUser = () => {
        setTotalConflicts(0);
        setPendingRequestCount(0);
        clearNewRecords();
        if (currentUserIndex >= 0 && currentUserIndex < allUsers.length - 1 && onUserChange) {
            onUserChange(allUsers[currentUserIndex + 1]);
        }
    };

    // Utility functions
    const formatHour = (val: string | number | null | undefined, isPricework: boolean = false): string => {
        if (val === null || val === undefined) return isPricework ? '--' : '00:00';
        if (isPricework) return '--';

        const str = val.toString().trim();
        if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
            const [h, m] = str.split(':');
            const minutes = parseFloat(m) || 0;
            return `${h.padStart(2, '0')}:${Math.floor(minutes).toString().padStart(2, '0')}`;
        }

        const num = parseFloat(str);
        if (!isNaN(num)) {
            const h = Math.floor(num);
            const m = Math.round((num - h) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        return isPricework ? '--' : '00:00';
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

    const hasValidWorklogData = (row: DailyBreakdown): boolean => {
        return !!(row.worklog_id || row.timesheet_light_id) &&
            row.start !== '--' &&
            row.end !== '--' &&
            row.start !== null &&
            row.end !== null &&
            row.start !== undefined &&
            row.end !== undefined;
    };

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    const validateAndFormatTime = (value: string): string => {
        if (!value || value.trim() === '') return '';

        const digits = value.replace(/\D/g, '');
        if (digits.length === 0) return '';

        let hours = 0;
        let minutes = 0;

        if (digits.length === 1) {
            hours = parseInt(digits);
            minutes = 0;
        } else if (digits.length === 2) {
            const num = parseInt(digits);
            if (num <= 23) {
                hours = num;
                minutes = 0;
            } else {
                hours = parseInt(digits[0]);
                minutes = parseInt(digits[1]) * 10;
            }
        } else if (digits.length === 3) {
            const firstTwo = parseInt(digits.slice(0, 2));
            if (firstTwo <= 23) {
                hours = firstTwo;
                minutes = parseInt(digits[2]) * 10;
            } else {
                hours = parseInt(digits[0]);
                minutes = parseInt(digits.slice(1, 3));
            }
        } else {
            hours = parseInt(digits.slice(0, 2));
            minutes = parseInt(digits.slice(2, 4));
        }

        hours = Math.min(hours, 23);
        minutes = Math.min(minutes, 59);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => setAnchorEl(null);

    const handleDateRangeChange = useCallback(
        (range: { from: Date | null; to: Date | null }) => {
            if (range.from && range.to) {
                setStartDate(range.from);
                setEndDate(range.to);
                fetchTimeClockData(range.from, range.to);
                saveDateRangeToStorage(range.from, range.to, columnVisibility);
                onDataChange?.();
            }
        },
        [fetchTimeClockData, columnVisibility, onDataChange]
    );

    const handleFilterChange = (value: string) => {
        setFilterValue(value);
    };

    const handleExportData = async (option: string) => {
        try {
            if (!dailyData || !Array.isArray(dailyData)) {
                throw new Error('Invalid or missing dailyData');
            }

            const timesheetIds: string[] = Array.from(selectedRows)
                .map((rowId) => parseInt(rowId.replace('row-', ''), 10))
                .filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < dailyData.length)
                .flatMap((rowIndex) => {
                    const rowData: RowData | undefined = dailyData[rowIndex];
                    if (!rowData || rowData.rowType !== 'day') return [];

                    if (!rowData.rowsData && rowData.timesheet_light_id != null) {
                        return [String(rowData.timesheet_light_id)];
                    }

                    if (Array.isArray(rowData.rowsData)) {
                        return rowData.rowsData
                            .filter((worklog): worklog is { timesheet_light_id: string | number } => !!worklog.timesheet_light_id)
                            .map((worklog) => String(worklog.timesheet_light_id));
                    }

                    return [];
                });

            if (timesheetIds.length === 0) {
                throw new Error('No timesheet IDs selected for export');
            }

            const ids = timesheetIds.join(',');
            const response: AxiosResponse<ExportResponse> = await api.post('/time-clock/export', { ids, format: option });

            if (response.data.IsSuccess) {
                const { file, filename, contentType } = response.data.data;

                const binaryString = atob(file);
                const binaryLen = binaryString.length;
                const bytes = new Uint8Array(binaryLen);
                for (let i = 0; i < binaryLen; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: contentType });

                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = filename || `timeclock_export_${new Date().toISOString()}.${option}`;
                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                const defaultStartDate = startDate || defaultStart;
                const defaultEndDate = endDate || defaultEnd;
                await fetchTimeClockData(defaultStartDate, defaultEndDate);
                setSelectedRows(new Set());
                onDataChange?.();
            } else {
                throw new Error(response.data.message || 'Export request failed');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    };

    const handleWorklogToggle = (worklogId: string) => {
        setExpandedWorklogsIds((prevIds) => {
            if (prevIds.includes(worklogId)) {
                return prevIds.filter((existingId) => existingId !== worklogId);
            } else {
                return [...prevIds, worklogId];
            }
        });
    };

    const handleConflicts = async () => {
        setConflictSidebar(true);
    };

    const closeConflictSidebar = async () => {
        setConflictSidebar(false);
        try {
            if (conflictDetails?.length > 0) {
                const defaultStartDate = startDate || defaultStart;
                const defaultEndDate = endDate || defaultEnd;
                await fetchTimeClockData(defaultStartDate, defaultEndDate);
                onDataChange?.();
            }
        } catch (error) {
            console.error('Error fetching time clock data after closing conflict sidebar:', error);
        }
    };


    const handleChecklogs = async (worklogId: number) => {
        setChecklogsSidebar(true);
        setSelectedWorkId(worklogId)
    };
    
    const closeChecklogsSidebar = async () => {
        setChecklogsSidebar(false);
        try {
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error fetching time clock data after closing conflict sidebar:', error);
        }
    };

    const handleAddLeave = async () => {
        setAddLeaveSidebar(true);
    };

    const closeAddLeaveSidebar = async () => {
        setAddLeaveSidebar(false);
        try {
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error fetching time clock data after closing add leave sidebar:', error);
        }
    };
    
    const handlePendingRequest = async () => {
        setRequestListOpen(true);
    };

    const closeRequestList = async () => {
        setRequestListOpen(false);
        try {
            if (pendingRequestCount > 0) {
                const defaultStartDate = startDate || defaultStart;
                const defaultEndDate = endDate || defaultEnd;
                await fetchTimeClockData(defaultStartDate, defaultEndDate);
                onDataChange?.();
            }
        } catch (error) {
            console.error('Error fetching time clock data after closing request list:', error);
        }
    };

    // API calls
    const saveFieldChanges = async (worklogId: string, originalLog: any) => {
        const editedData = editingWorklogs[worklogId];
        if (!editedData) return;

        if (isRecordLocked(originalLog)) {
            cancelEditingField(worklogId);
            return;
        }

        const originalStart = sanitizeDateTime(originalLog.start);
        const originalEnd = sanitizeDateTime(originalLog.end);
        const newStart = editedData.start ? validateAndFormatTime(editedData.start) : '';
        const newEnd = editedData.end ? validateAndFormatTime(editedData.end) : '';

        if (originalStart === newStart && originalEnd === newEnd) {
            cancelEditingField(worklogId);
            return;
        }

        if ((newStart && !timeRegex.test(newStart)) || (newEnd && !timeRegex.test(newEnd))) {
            console.error('Invalid time format before API call');
            cancelEditingField(worklogId);
            return;
        }

        setSavingWorklogs((prev) => new Set(prev).add(worklogId));
        try {
            await api.post('/time-clock/edit-worklog', {
                user_worklog_id: originalLog.worklog_id,
                date: originalLog.date_added,
                start_time: newStart,
                end_time: newEnd,
            });

            cancelEditingField(worklogId);
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error saving worklog:', error);
        } finally {
            setSavingWorklogs((prev) => {
                const newSet = new Set(prev);
                newSet.delete(worklogId);
                return newSet;
            });
        }
    };

    const saveShiftChanges = async (worklogId: string, originalLog: any) => {
        const editedData = editingShifts[worklogId];
        if (!editedData) return;

        if (isRecordLocked(originalLog)) {
            cancelEditingShift(worklogId);
            return;
        }

        const originalShiftId = originalLog.shift_id;
        const newShiftId = editedData.shift_id;

        if (originalShiftId === newShiftId) {
            cancelEditingShift(worklogId);
            return;
        }

        setSavingWorklogs((prev) => new Set(prev).add(worklogId));
        try {
            await api.post('/time-clock/edit-worklog-shift', {
                user_worklog_id: originalLog.worklog_id,
                shift_id: newShiftId,
            });

            cancelEditingShift(worklogId);
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error saving shift:', error);
        } finally {
            setSavingWorklogs((prev) => {
                const newSet = new Set(prev);
                newSet.delete(worklogId);
                return newSet;
            });
        }
    };

    const saveProjectChanges = async (worklogId: string, originalLog: any) => {
        const editedData = editingProjects[worklogId];
        if (!editedData) return;

        if (isRecordLocked(originalLog)) {
            cancelEditingProject(worklogId);
            return;
        }

        const originalProjectId = originalLog.project_id;
        const newProjectId = editedData.project_id;

        if (originalProjectId === newProjectId) {
            cancelEditingProject(worklogId);
            return;
        }

        setSavingWorklogs((prev) => new Set(prev).add(worklogId));
        try {
            await api.post('/time-clock/edit-worklog-project', {
                user_worklog_id: originalLog.worklog_id,
                project_id: newProjectId,
            });

            cancelEditingProject(worklogId);
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error saving project:', error);
        } finally {
            setSavingWorklogs((prev) => {
                const newSet = new Set(prev);
                newSet.delete(worklogId);
                return newSet;
            });
        }
    };

    const saveNewRecord = async (recordKey: string) => {
        const newRecord = newRecords[recordKey];
        if (!newRecord) return;

        if (!newRecord.shift_id || !newRecord.start || !newRecord.end) {
            console.error('All fields are required');
            return;
        }

        const formattedStart = validateAndFormatTime(newRecord.start);
        const formattedEnd = validateAndFormatTime(newRecord.end);

        if (!timeRegex.test(formattedStart) || !timeRegex.test(formattedEnd)) {
            console.error('Invalid time format');
            return;
        }

        const parsedDate = DateTime.fromFormat(newRecord.date, 'ccc d/M');
        if (!parsedDate.isValid) {
            console.error('Invalid date format:', newRecord.date);
            return;
        }
        const formattedDate = parsedDate.toFormat('yyyy-MM-dd');

        setSavingNewRecords((prev) => new Set(prev).add(recordKey));

        try {
            const params = {
                user_id: user_id,
                device_type: 3,
                device_model_type: 'web',
                date: formattedDate,
                shift_id: newRecord.shift_id,
                project_id: newRecord.project_id,
                start_time: formattedStart,
                end_time: formattedEnd,
            };

            const response = await api.post('/time-clock/add-worklog', params);

            if (response.data.IsSuccess) {
                cancelNewRecord(recordKey);
                const defaultStartDate = startDate || defaultStart;
                const defaultEndDate = endDate || defaultEnd;
                await fetchTimeClockData(defaultStartDate, defaultEndDate);
                onDataChange?.();
            }
        } catch (error) {
            console.error('Error saving new record:', error);
        } finally {
            setSavingNewRecords((prev) => {
                const newSet = new Set(prev);
                newSet.delete(recordKey);
                return newSet;
            });
        }
    };

    const dailyData = useMemo<DailyBreakdown[]>(() => {
        return (data || []).flatMap((week: any) => {
            const weekRows: DailyBreakdown[] = [];

            weekRows.push({
                isMoreThanWork: false,
                isLessThanWork: false,
                is_requested: false,
                is_edited: false,
                timesheet_light_id: 0,
                checkin_time: '--',
                checkout_time: '--',
                total_hours: '--',
                rowType: 'week',
                weekLabel: week.week_range,
                weeklyTotalHours: formatHour(week.weekly_total_hours),
                weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
            });

            const dayRows = (week.days || []).flatMap((day: any) => {
                let filteredWorklogs = (day.worklogs || []);

                if (filterValue === 'lock') {
                    filteredWorklogs = filteredWorklogs.filter(
                        (log: any) => log.status === '6' || log.status === 6
                    );
                } else if (filterValue === 'unlock') {
                    filteredWorklogs = filteredWorklogs.filter(
                        (log: any) => log.status === '7' || log.status === 7
                    );
                } 

                const hasWorklogs = filteredWorklogs.length > 0;

                if (hasWorklogs) {
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
                        isMoreThanWork: day.isMoreThanWork,
                        isLessThanWork: day.isLessThanWork,
                        weekLabel: week.week_range,
                        weeklyTotalHours: formatHour(week.weekly_total_hours),
                        weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
                        parsedDate: parseDate(day.date),
                        address: '--',
                        check_in: '--',
                        check_out: '--',
                        rowsData: filteredWorklogs,
                        rowSpan: 1,
                        status: day.status,
                        is_requested: false,
                        is_edited: false,
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
                    status: day.status,
                    is_requested: false,
                    is_edited: false,
                    isMoreThanWork: false,
                    isLessThanWork: false,
                    timesheet_light_id: day.timesheet_light_id,
                }];
            });

            weekRows.push(...dayRows);
            return weekRows;
        });
    }, [data, currency, filterValue]);

    const selectableRowIds = useMemo(() => {
        const ids: string[] = [];
        dailyData.forEach((row, index) => {
            if (row.rowType === 'day') {
                ids.push(`row-${index}`);
            }
        });
        return ids;
    }, [dailyData]);

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedRows(new Set(selectableRowIds));
        } else {
            setSelectedRows(new Set());
        }
    }, [selectableRowIds]);

    const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
        setSelectedRows((prev) => {
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

    const getSelectedRowsLockStatus = () => {
        let hasLockedRows = false;
        let hasUnlockedRows = false;

        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (!rowData.rowsData) {
                    if (isRecordLocked(rowData)) {
                        hasLockedRows = true;
                    } else if (isRecordUnlocked(rowData)) {
                        hasUnlockedRows = true;
                    }
                } else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
                    rowData.rowsData.forEach((worklog: any) => {
                        if (isRecordLocked(worklog)) {
                            hasLockedRows = true;
                        } else if (isRecordUnlocked(rowData)) {
                            hasUnlockedRows = true;
                        }
                    });
                }
            }
        });

        return { hasLockedRows, hasUnlockedRows };
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
                    onDataChange?.();
                } else {
                    console.error(`Error ${action}ing timesheets`);
                }
            } catch (error) {
                console.error(`Error ${action}ing timesheets:`, error);
            }
        },
        [startDate, endDate, fetchTimeClockData, onDataChange]
    );

    const handleLockClick = () => {
        const timesheetIds: (string | number)[] = [];
        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (!rowData.rowsData && rowData.timesheet_light_id != null) {
                    timesheetIds.push(rowData.timesheet_light_id);
                } else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
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
        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (!rowData.rowsData && rowData.timesheet_light_id) {
                    timesheetIds.push(rowData.timesheet_light_id);
                } else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
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

    const getSelectedRowsWorklogs = () => {
        let hasWorklogs = false;
        const worklogIds: string[] = [];

        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (rowData.rowsData && Array.isArray(rowData.rowsData) && rowData.rowsData.length > 0) {
                    hasWorklogs = true;
                    rowData.rowsData.forEach((worklog: any) => {
                        if (worklog.worklog_id) {
                            worklogIds.push(worklog.worklog_id);
                        }
                    });
                }
            }
        });

        return { hasWorklogs };
    };

    const handleDeleteWorklogs = async () => {
        const worklogIds: string[] = [];

        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                if (rowData.rowsData && Array.isArray(rowData.rowsData) && rowData.rowsData.length > 0) {
                    rowData.rowsData.forEach((worklog: any) => {
                        if (worklog.worklog_id) {
                            worklogIds.push(worklog.worklog_id);
                        }
                    });
                }
            }
        });

        if (worklogIds.length > 0) {
            try {
                const ids = worklogIds.join(',');
                const response: AxiosResponse<{
                    IsSuccess: boolean
                }> = await api.post('/time-clock/worklogs-bulk-delete', {ids});

                if (response.data.IsSuccess) {
                    const defaultStartDate = startDate || defaultStart;
                    const defaultEndDate = endDate || defaultEnd;
                    await fetchTimeClockData(defaultStartDate, defaultEndDate);
                    setSelectedRows(new Set());
                    onDataChange?.();
                } else {
                    console.error(`Error deleting timesheets`);
                }
            } catch (error) {
                console.error(`Error deleting timesheets:`, error);
            }
        }
    };

    const handleDeleteWorklog = async (worklogId: string) => {
        const worklogIds: string[] = [];

        if (worklogId) {
            worklogIds.push(worklogId);
        }

        if (worklogIds.length > 0) {
            try {
                const ids = worklogIds.join(',');
                const response: AxiosResponse<{
                    IsSuccess: boolean
                }> = await api.post('/time-clock/worklogs-bulk-delete', {ids});

                if (response.data.IsSuccess) {
                    const defaultStartDate = startDate || defaultStart;
                    const defaultEndDate = endDate || defaultEnd;
                    await fetchTimeClockData(defaultStartDate, defaultEndDate);
                    setSelectedRows(new Set());
                    onDataChange?.();
                } else {
                    console.error(`Error deleting timesheet`);
                }
            } catch (error) {
                console.error(`Error deleting timesheet:`, error);
            }
        }
    };

    const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <Box className="select-icon" sx={{
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CustomCheckbox
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                    </Box>
                ),
                cell: ({ row }) => {
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
                size: 50,
                meta: { align: 'center' },
            },
            {
                id: 'date',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Date</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.date : null,
                size: 150,
            },
            {
                id: 'conflicts',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}></span>,
                cell: ({ row }) => null,
                size: 50,
                enableSorting: false,
                meta: { align: 'center' },
            },
            {
                id: 'exclamation',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}></span>,
                meta: { label: 'Exclamation' },
                size: 36,
                enableSorting: false,
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;
                    const hasLogs = row.original.is_requested;
                    if (!hasLogs) return null;
                    return (
                        <IconButton
                            size="small"
                            color="error"
                            aria-label="error"
                            sx={{ '&:hover': { backgroundColor: 'transparent', color: '#fc4b6c' } }}
                            onClick={handlePendingRequest}
                        >
                            <IconExclamationMark size={18} />
                        </IconButton>
                    );
                },
            },
            {
                id: 'project',
                accessorKey: 'project',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Project</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.project : null,
                size: 120,
            },
            {
                id: 'shift',
                accessorKey: 'shift',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Shift</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.shift : null,
                size: 120,
            },
            {
                id: 'start',
                accessorKey: 'start',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Start</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.start : null,
                size: 80,
            },
            {
                id: 'end',
                accessorKey: 'end',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>End</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.end : null,
                size: 80,
            },
            {
                id: 'totalHours',
                accessorKey: 'totalHours',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Total hours</span>,
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;
                    const totalHours = row.original.totalHours;
                    const isEdited = row.original.is_edited;
                    const isPricework = row.original.rowsData ?
                        row.original.rowsData.some((log: any) => log.is_pricework) : false;
                    return (
                        <span style={{ color: isEdited ? '#ff0000' : 'inherit' }}>
                          {isPricework ? '--' : totalHours}
                        </span>
                    );
                },
                size: 150,
            },
            {
                id: 'priceWorkAmount',
                accessorKey: 'priceWorkAmount',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Pricework Amount</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.priceWorkAmount : null,
                size: 150,
            },
            {
                id: 'checkins',
                accessorKey: 'checkins',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Check Ins</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.priceWorkAmount : null,
                size: 140,
            },
            {
                id: 'dailyTotal',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Daily total</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.dailyTotal : null,
                size: 100,
            },
            {
                id: 'payableAmount',
                accessorKey: 'payableAmount',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Payable Amount</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.payableAmount : null,
                size: 140,
            },
            {
                id: 'employeeNotes',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Employee notes</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? row.original.employeeNotes : null,
                size: 150,
            },
            {
                id: 'action',
                header: () => <span style={{ display: 'block', textAlign: 'center' }}>Action</span>,
                cell: ({ row }) => null,
                size: 100,
            },
        ],
        [isAllSelected, isIndeterminate, selectedRows, handleSelectAll, handleRowSelect]
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

    useEffect(() => {
        if (!open) return;

        let start: Date | null = null;
        let end: Date | null = null;

        if (initialData?.startDate && initialData?.endDate) {
            start = new Date(initialData.startDate);
            end = new Date(initialData.endDate);
        } else {
            if(timeClock?.start_date && timeClock?.end_date){
                start = new Date(timeClock.start_date);
                end = new Date(timeClock.end_date);
            }
        }

        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
            setStartDate(start);
            setEndDate(end);
            fetchTimeClockData(start, end);
        }
    }, [timeClock, initialData, fetchTimeClockData]);

    if (!timeClock) return null;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <TimeClockHeader
                selectedRows={selectedRows}
                timeClock={timeClock}
                allUsers={allUsers}
                currentUserIndex={currentUserIndex}
                startDate={startDate}
                endDate={endDate}
                pendingRequestCount={pendingRequestCount}
                totalConflicts={totalConflicts}
                onPreviousUser={handlePreviousUser}
                onNextUser={handleNextUser}
                onDateRangeChange={handleDateRangeChange}
                onPendingRequest={handlePendingRequest}
                onConflicts={handleConflicts}
                filterValue={filterValue}
                onFilterChange={handleFilterChange}
                onExportData={handleExportData}
                onAddLeave={handleAddLeave}
            />

            <TimeClockStats
                headerDetail={headerDetail}
                currency={currency}
                formatHour={formatHour}
                table={table}
                search={search}
                setSearch={setSearch}
                anchorEl={anchorEl}
                handlePopoverOpen={handlePopoverOpen}
                handlePopoverClose={handlePopoverClose}
            />

            <TimeClockTable
                table={table}
                dailyData={dailyData}
                currency={currency}
                selectedRows={selectedRows}
                expandedWorklogsIds={expandedWorklogsIds}
                newRecords={newRecords}
                savingNewRecords={savingNewRecords}
                shifts={shifts}
                editingWorklogs={editingWorklogs}
                savingWorklogs={savingWorklogs}
                editingShifts={editingShifts}
                formatHour={formatHour}
                sanitizeDateTime={sanitizeDateTime}
                validateAndFormatTime={validateAndFormatTime}
                hasValidWorklogData={hasValidWorklogData}
                isRecordLocked={isRecordLocked}
                handleRowSelect={handleRowSelect}
                handlePendingRequest={handlePendingRequest}
                handleWorklogToggle={handleWorklogToggle}
                startAddingNewRecord={startAddingNewRecord}
                startEditingField={startEditingField}
                startEditingShift={startEditingShift}
                updateEditingField={updateEditingField}
                updateEditingShift={updateEditingShift}
                updateNewRecord={updateNewRecord}
                cancelEditingField={cancelEditingField}
                cancelEditingShift={cancelEditingShift}
                saveFieldChanges={saveFieldChanges}
                saveShiftChanges={saveShiftChanges}
                saveNewRecord={saveNewRecord}
                cancelNewRecord={cancelNewRecord}
                projects={projects}
                editingProjects={editingProjects}
                startEditingProject={startEditingProject}
                updateEditingProject={updateEditingProject}
                cancelEditingProject={cancelEditingProject}
                saveProjectChanges={saveProjectChanges}
                onDeleteClick={handleDeleteWorklog}
                conflictsByDate={conflictsByDate}
                openConflictsSideBar={handleConflicts}
                openChecklogsSidebar={handleChecklogs}
            />

            <ActionBar
                selectedRows={selectedRows}
                onClearSelection={() => setSelectedRows(new Set())}
                onLockClick={handleLockClick}
                onUnlockClick={handleUnlockClick}
                getSelectedRowsLockStatus={getSelectedRowsLockStatus}
                getSelectedRowsWorklogs={getSelectedRowsWorklogs}
                onDeleteClick={handleDeleteWorklogs}
            />

            <Drawer
                anchor="right"
                open={conflictSidebar}
                onClose={closeConflictSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <Conflicts
                    conflictDetails={conflictDetails}
                    totalConflicts={totalConflicts}
                    onClose={closeConflictSidebar}
                    fetchTimeClockData={() => fetchTimeClockData(startDate || defaultStart, endDate || defaultEnd)}
                    startDate={startDate ? format(startDate, 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd')}
                    endDate={endDate ? format(endDate, 'yyyy-MM-dd') : format(defaultEnd, 'yyyy-MM-dd')}
                />
            </Drawer>

            <Drawer
                anchor="right"
                open={checklogsSidebar}
                onClose={closeChecklogsSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '450px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <Checklogs
                    worklogId={selectedWorkId}
                    onClose={closeChecklogsSidebar}
                />
            </Drawer>

            <Drawer
                anchor="right"
                open={addLeaveSidebar}
                onClose={closeAddLeaveSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <AddLeave
                    onClose={closeAddLeaveSidebar}
                />
            </Drawer>

            <Drawer
                anchor="bottom"
                open={requestListOpen}
                onClose={closeRequestList}
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
                <RequestDetails
                    open={requestListOpen}
                    timeClock={timeClock}
                    user_id={user_id}
                    currency={currency}
                    allUsers={allUsers}
                    onClose={closeRequestList}
                    onUserChange={onUserChange}
                />
            </Drawer>
        </Box>
    );
};

export default TimeClockDetails;
