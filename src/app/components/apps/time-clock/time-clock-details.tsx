import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {Box, Drawer, IconButton, TableCell, Typography} from '@mui/material';
import {
    useReactTable,
    getCoreRowModel,
    getExpandedRowModel,
    ColumnDef,
    VisibilityState,
    ExpandedState
} from '@tanstack/react-table';
import {format, parse} from 'date-fns';
import {DateTime} from 'luxon';
import {AxiosResponse} from 'axios';
import api from '@/utils/axios';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import RequestDetails from './time-clock-details/request-details';
import Conflicts from './time-clock-details/conflicts/conflicts';
import {useTimeClockData} from './hooks/useTimeClockData';
import {useEditingState} from './hooks/useEditingState';
import {useNewRecords} from './hooks/useNewRecords';
import TimeClockHeader from './components/TimeClockHeader';
import TimeClockStats from './components/TimeClockStats';
import TimeClockTable from './components/TimeClockTable';
import ActionBar from './components/ActionBar';
import {DailyBreakdown, TimeClockDetailsProps, RecordType} from '@/app/components/apps/time-clock/types/timeClock';
import {IconExclamationMark} from '@tabler/icons-react';
import Checklogs from './time-clock-details/checklogs/index';
import Expenses from './time-clock-details/expenses/index';
import Penalties from './time-clock-details/penalties/index';
import AddLeave from './time-clock-details/leaves/add-leave';
import LeaveRequest from './time-clock-details/leaves/leave-request';
import AddExpense from './time-clock-details/expenses/add-expense';
import {formatHour} from '@/app/components/apps/time-clock/utils/recordHelpers';
import {Stack} from '@mui/system';

import ConfirmationDialog from './components/ConfirmationDialog';
import toast from 'react-hot-toast';
import {useRouter} from 'next/navigation';

const TIME_CLOCK_PAGE = 'time-clock-page';
const TIME_CLOCK_DETAILS_PAGE = 'time-clock-details-page';

interface RowData {
    rowType: string;
    rowsData?: [];
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

const DELETE_ENDPOINTS: Record<RecordType, string> = {
    worklog: '/time-clock/worklogs-bulk-delete',
    expense: '/expense/bulk-delete',
    leave: '/user-leaves/delete-leave',
};

const saveDateRangeToStorage = (startDate: Date | null, endDate: Date | null, columnVisibility: VisibilityState) => {
    try {
        const data = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null,
            columnVisibility,
        };
        localStorage.setItem(TIME_CLOCK_PAGE, JSON.stringify(data));
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
};

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(TIME_CLOCK_DETAILS_PAGE);
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
    queryParams?: {
        user_id?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        open?: string | null;
        type?: string | null;
        recordId?: string | null;
    };
}

const TimeClockDetails: React.FC<ExtendedTimeClockDetailsProps> = ({
                                                                       open,
                                                                       timeClock,
                                                                       user_id,
                                                                       companyId,
                                                                       currency,
                                                                       allUsers = [],
                                                                       onClose,
                                                                       onUserChange,
                                                                       onDataChange,
                                                                       queryParams
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
    // const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialData.columnVisibility);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [expandedWorklogsIds, setExpandedWorklogsIds] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [requestListOpen, setRequestListOpen] = useState<boolean>(false);
    const [conflictSidebar, setConflictSidebar] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<Date | null>(initialData.startDate);
    const [endDate, setEndDate] = useState<Date | null>(initialData.endDate);
    const [filterValue, setFilterValue] = useState<string>('all');
    const [conflictsByDate, setConflictsByDate] = useState<{ [key: string]: number }>({});
    const [checklogsSidebar, setChecklogsSidebar] = useState<boolean>(false);
    const [selectedWorkId, setSelectedWorkId] = useState<number>(0);
    const [addLeaveSidebar, setAddLeaveSidebar] = useState<boolean>(false);
    const [leaveRequestSidebar, setLeaveRequestSidebar] = useState<boolean>(false);

    const [addExpenseSidebar, setAddExpenseSidebar] = useState<boolean>(false);
    const [expensesSidebar, setExpensesSidebar] = useState<boolean>(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<number>(0);
    const router = useRouter();

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        actionType: 'lock' | 'unlock' | 'delete';
        conflictCount: number;
    } | null>(null);

    const [penaltyAppealByDate, setPenaltyAppealByDate] = useState<{ [key: string]: number }>({});
    const [penaltiesSidebar, setPenaltiesSidebar] = useState<boolean>(false);

    const initialParamsRef = useRef(queryParams);
    const handledRef = useRef(false);

    // Custom hooks
    const {
        data,
        setData,
        headerDetail,
        pendingRequestCount,
        setPendingRequestCount,
        totalConflicts,
        setTotalConflicts,
        conflictDetails,
        leaveRequestCount,
        setLeaveRequestCount,
        penaltyAppealCount,
        setPenaltyAppealCount,
        userHasRatePermission,
        setUserHasRatePermission,
        shifts,
        projects,
        fetchTimeClockData,
        payrollCycle,
        fetchPayrollCycle,
    } = useTimeClockData(user_id, currency);

    const amountColumns = [
        'priceWork',
        'cis_amount',
        'gross_amount',
        'payableAmount',
        'adjustment',
        'dailyTotal',
    ];

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        ...initialData.columnVisibility,
        priceWork: false,
        cis_amount: false,
        gross_amount: false,
        payableAmount: false,
        adjustment: false,
        dailyTotal: false,
    });

    useEffect(() => { fetchPayrollCycle(); }, []);
    
    useEffect(() => {
        setColumnVisibility((prev) => ({
            ...prev,
            ...Object.fromEntries(amountColumns.map((col) => [col, userHasRatePermission])),
        }));
    }, [userHasRatePermission]);

    // Save columnVisibility to localStorage whenever it changes
    useEffect(() => {
        saveDateRangeToStorage(startDate, endDate, columnVisibility);
    }, [startDate, endDate, columnVisibility]); 
    
    // Process conflicts
    useEffect(() => {
        if (conflictDetails && conflictDetails.length > 0) {
            const conflicts: { [key: string]: number } = {};

            conflictDetails.forEach((conflictGroup: any) => {
                const formattedDate = conflictGroup.formatted_date;
                const items = conflictGroup.items || [];

                if (items.length > 0) {
                    const dateStr = items[0].date;
                    const [day, month, year] = dateStr.split('/');
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayName = daysOfWeek[dateObj.getDay()];
                    const formattedKey = `${dayName} ${parseInt(day)}/${parseInt(month)}`;

                    conflicts[formattedKey] = items.length;
                }
            });

            setConflictsByDate(conflicts);
        } else {
            setConflictsByDate({});
        }
    }, [conflictDetails]);

    // ADD THIS NEW EFFECT FOR PENALTY APPEALS
    useEffect(() => {
        if (data && data.length > 0) {
            const appeals: { [key: string]: number } = {};

            data.forEach((week: any) => {
                (week.days || []).forEach((day: any) => {
                    const worklogs = day.worklogs || [];
                    const appealedWorklogs = worklogs.filter((log: any) => log.is_penalty_appealed);

                    if (appealedWorklogs.length > 0) {
                        appeals[day.date] = appealedWorklogs.length;
                    }
                });
            });

            setPenaltyAppealByDate(appeals);
        } else {
            setPenaltyAppealByDate({});
        }
    }, [data]);

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
        return log?.status === 6 || log?.status === '6' || log?.status === 9 || log?.status === '9';
    };

    const isRecordUnlocked = (log: any): boolean => {
        return log?.status === 7 || log?.status === '7';
    };

    const hasValidWorklogData = (row: DailyBreakdown): boolean => {
        return !!(row.worklog_id) &&
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
                setData([]);
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

            const timesheetIds: (string | number)[] = [];
            const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
                return parseInt(rowId.replace('row-', ''));
            });

            selectedRowIndices.forEach((rowIndex) => {
                const rowData = dailyData[rowIndex];
                if (rowData && rowData.rowType === 'day') {
                    timesheetIds.push(rowData.timesheet_ids);
                }
            });

            if (timesheetIds.length === 0) return;
            
            const ids = timesheetIds.join(',');
            const response: AxiosResponse<ExportResponse> = await api.post('/time-clock/export-details', {ids, format: option});

            if (response.data.IsSuccess) {
                const {file, filename, contentType} = response.data.data;

                const binaryString = atob(file);
                const binaryLen = binaryString.length;
                const bytes = new Uint8Array(binaryLen);
                for (let i = 0; i < binaryLen; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], {type: contentType});

                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = filename || `timeclock_details_export_${new Date().toISOString()}.${option}`;
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

    const handleLeaveRequests = async () => {
        setLeaveRequestSidebar(true);
    };

    useEffect(() => {
        if (handledRef.current) return;

        const params = initialParamsRef.current;
        if (!params || params.open !== 'true') return;

        if (params.type === 'expense' && params.recordId) {
            setExpensesSidebar(true);
            setSelectedExpenseId(Number(params.recordId));
        } else if (params.type == 'leave') {
            setLeaveRequestSidebar(true);
        } else if (params.type == 'penalty') {
            setPenaltiesSidebar(true);
        } else {
            setRequestListOpen(true);
        }

        handledRef.current = true;

        const timer = setTimeout(() => {
            router.replace('/apps/timesheet/list');
        }, 4000);

        return () => clearTimeout(timer);
    }, []);


    const closeLeaveRequestSidebar = async () => {
        try {
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();

            setLeaveRequestSidebar(false);
        } catch (error) {
            console.error('Error fetching time clock data after closing leaves sidebar:', error);
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
            console.error('Error fetching time clock data after closing checklogs sidebar:', error);
        }
    };

    const handleExpenses = async (expenseId: number) => {
        setExpensesSidebar(true);
        setSelectedExpenseId(expenseId)
    };

    const closeExpensesSidebar = async () => {
        setExpensesSidebar(false);
        try {
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error fetching time clock data after closing expenses sidebar:', error);
        }
    };

    const handlePenalties = async (worklogId: number) => {
        setPenaltiesSidebar(true);
        setSelectedWorkId(worklogId)
    };

    const closePenaltiesSidebar = async () => {
        setPenaltiesSidebar(false);
        try {
            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            onDataChange?.();
        } catch (error) {
            console.error('Error fetching time clock data after closing penalties sidebar:', error);
        }
    };

    const handleAddLeave = async () => {
        setAddLeaveSidebar(true);
    };

    const handleAddExpense = async () => {
        setAddExpenseSidebar(true);
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

    const closeAddExpenseSidebar = async () => {
        setAddExpenseSidebar(false);
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

    const handleAdjustmentSave = async (date: string, amount: number) => {
        try {
            const response = await api.post('/time-clock/adjustment-amount', {user_id, date, adjustment_amount: amount});
            if (response.data.IsSuccess) {
                const defaultStartDate = startDate || defaultStart;
                const defaultEndDate = endDate || defaultEnd;
                await fetchTimeClockData(defaultStartDate, defaultEndDate);
                onDataChange?.();
            }
        } catch (error) {
            console.error('Error saving adjustment:', error);
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

        cancelEditingField(worklogId);
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
                toast.success(response.data.message)
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
        if (!data || data.length === 0) {
            return [];
        }

        return data.flatMap((week: any) => {
            const weekRows: DailyBreakdown[] = [{
                isMoreThanWork: false,
                isLessThanWork: false,
                is_requested: false,
                is_penalty_appealed: false,
                is_penalty_edited: false,
                is_edited: false,
                checkin_time: '--',
                checkout_time: '--',
                total_hours: '--',
                rowType: 'week',
                weekLabel: week.week_range,
                weeklyTotalHours: formatHour(week.weekly_total_hours),
                weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
                timesheet_ids: '',
                cis_amount: 0,
                gross_amount: 0,
                adjustment: ''
            }];

            const filteredDayRows = (week.days || []).flatMap((day: any) => {
                let worklogs = day.worklogs || [];

                // Apply filter
                if (filterValue === 'lock') {
                    worklogs = worklogs.filter((log: any) => log.status === '6' || log.status === 6);
                } else if (filterValue === 'unlock') {
                    worklogs = worklogs.filter((log: any) => log.status === '7' || log.status === 7);
                } else if (filterValue === 'paid') {
                    worklogs = worklogs.filter((log: any) => log.status === '9' || log.status === 9);
                } else if (filterValue === 'leave') {
                    worklogs = worklogs.filter((log: any) => log.type === 'leave');
                }

                const isFilterActive = ['lock', 'unlock', 'paid', 'leave'].includes(filterValue);
                if (isFilterActive && worklogs.length === 0) {
                    return [];
                }

                const hasWorklogs = worklogs.length > 0;

                if (hasWorklogs) {
                    // const totalPayableAmount = worklogs.reduce((sum: number, log: any) => {
                    //     return sum + (parseFloat(log.payable_amount) || 0);
                    // }, 0);

                    return [{
                        rowType: 'day' as const,
                        date: day.date ?? '--',
                        has_pending_leave_request: day.has_pending_leave_request ?? false,
                        is_timesheet_paid: day.status === '9' || day.status === 9,
                        timesheet_ids: day.timesheet_ids ?? '--',
                        shift: '--',
                        project: '--',
                        start: '--',
                        end: '--',
                        priceWork: '--',
                        expense: '--',
                        cis_amount: '--',
                        gross_amount: '--',
                        checkIns: '--',
                        totalHours: '--',
                        penaltyHours: '--',
                        dailyTotal: formatHour(day.daily_total),
                        payableAmount: `${currency}${day.daily_payable_amount}`,
                        daily_adjustment_amount: day.daily_adjustment_amount ?? 0,
                        adjustment_added_by_name: day.adjustment_added_by_name ?? '',
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
                        check_out: '--',
                        rowsData: worklogs,
                        rowSpan: 1,
                        status_text: '--',
                        is_requested: false,
                        is_edited: false,
                    }];
                }

                return [{
                    rowType: 'day' as const,
                    date: day.date ?? '--',
                    has_pending_leave_request: day.has_pending_leave_request ?? false,
                    is_timesheet_paid: day.status === '9' || day.status === 9,
                    timesheet_ids: day.timesheet_ids ?? null,
                    shift: '--',
                    project: '--',
                    start: '--',
                    end: '--',
                    priceWork: '--',
                    expense: '--',
                    cis_amount: '--',
                    gross_amount: '--',
                    totalHours: '--',
                    penaltyHours: '--',
                    dailyTotal: '--',
                    payableAmount: '--',
                    daily_adjustment_amount: '--',
                    adjustment_added_by_name: '--',
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
                    status_text: '--',
                    is_requested: false,
                    is_edited: false,
                    isMoreThanWork: false,
                    isLessThanWork: false,
                }];
            });

            weekRows.push(...filteredDayRows);
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

        return {hasLockedRows, hasUnlockedRows};
    };

    const toggleTimesheetStatus = useCallback(async (timesheetIds: (string | number)[], action: 'approve' | 'unapprove') => {
        try {
            const ids = timesheetIds.join(',');
            const endpoint = action === 'approve' ? '/timesheet/approve' : '/timesheet/unapprove';
            const response: AxiosResponse<{ IsSuccess: boolean }> = await api.post(endpoint, {ids});

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
    }, [startDate, endDate, fetchTimeClockData, onDataChange]);

    // Navigation logic
    const currentUserIndex = useMemo(() => {
        if (!timeClock || !allUsers.length) return -1;
        return allUsers.findIndex((user) => user.user_id === timeClock.user_id);
    }, [timeClock, allUsers]);

    const handlePreviousUser = () => {
        clearNewRecords();
        setSelectedRows(new Set());
        setData([]);
        setTotalConflicts(0);
        setLeaveRequestCount(0);
        setPenaltyAppealCount(0);
        setPendingRequestCount(0);
        setConflictsByDate({});
        setPenaltyAppealByDate({});
        setExpandedWorklogsIds([]);

        if (currentUserIndex > 0 && onUserChange) {
            onUserChange(allUsers[currentUserIndex - 1]);
        }
    };

    const handleNextUser = () => {
        clearNewRecords();
        setSelectedRows(new Set());
        setData([]);
        setTotalConflicts(0);
        setLeaveRequestCount(0);
        setPenaltyAppealCount(0);
        setPendingRequestCount(0);
        setConflictsByDate({});
        setPenaltyAppealByDate({});
        setExpandedWorklogsIds([]);

        if (currentUserIndex >= 0 && currentUserIndex < allUsers.length - 1 && onUserChange) {
            onUserChange(allUsers[currentUserIndex + 1]);
        }
    };

    const getConflictsInSelectedRows = () => {
        let conflictCount = 0;
        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                const dateKey: string | undefined = rowData.date;
                if (dateKey && conflictsByDate[dateKey]) {
                    conflictCount += conflictsByDate[dateKey];
                }
            }
        });

        return conflictCount;
    };

    const handleLockClick = () => {
        const timesheetIds: (string | number)[] = [];
        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];
            if (rowData && rowData.rowType === 'day') {
                timesheetIds.push(rowData.timesheet_ids);
            }
        });

        if (timesheetIds.length === 0) return;

        const conflictCount = getConflictsInSelectedRows();

        if (conflictCount > 0) {
            setConfirmDialog({
                open: true,
                actionType: 'lock',
                conflictCount,
            });
        } else {
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
                timesheetIds.push(rowData.timesheet_ids);
            }
        });

        if (timesheetIds.length === 0) return;

        const conflictCount = getConflictsInSelectedRows();

        if (conflictCount > 0) {
            setConfirmDialog({
                open: true,
                actionType: 'unlock',
                conflictCount,
            });
        } else {
            toggleTimesheetStatus(timesheetIds, 'unapprove');
        }
    };

    const handleDeleteWorklogs = async () => {
        const worklogIds: string[] = [];
        const leaveIds: string[] = [];
        const expenseIds: string[] = [];

        const selectedRowIndices = Array.from(selectedRows).map((rowId) =>
            parseInt(rowId.replace('row-', ''))
        );

        selectedRowIndices.forEach((rowIndex) => {
            const rowData = dailyData[rowIndex];

            if (rowData && rowData.rowType === 'day') {
                if (Array.isArray(rowData.rowsData)) {
                    rowData.rowsData.forEach((record: any) => {
                        // Worklog
                        if (record.worklog_id) {
                            worklogIds.push(record.worklog_id);
                        }

                        // Leave
                        if (record.is_leave && record.user_leave_id) {
                            leaveIds.push(record.user_leave_id);
                        }

                        // Expense
                        if (record.is_expense && record.expense_id) {
                            expenseIds.push(record.expense_id);
                        }
                    });
                }
            }
        });

        if (!worklogIds.length && !leaveIds.length && !expenseIds.length) return;

        const conflictCount = getConflictsInSelectedRows();

        if (conflictCount > 0) {
            setConfirmDialog({open: true, actionType: 'delete', conflictCount,});
        } else {
            await proceedWithDelete({worklogIds, leaveIds, expenseIds,});
        }
    };

    const proceedWithDelete = async ({worklogIds, leaveIds, expenseIds,}: {
        worklogIds: string[];
        leaveIds: string[];
        expenseIds: string[];
    }) => {
        try {
            // Worklogs
            if (worklogIds.length) {
                await api.post(DELETE_ENDPOINTS.worklog, {
                    ids: worklogIds.join(','),
                });
            }

            // Expenses
            if (expenseIds.length) {
                await api.post(DELETE_ENDPOINTS.expense, {
                    ids: expenseIds.join(','),
                });
            }

            // Leaves
            if (leaveIds.length) {
                await api.post(DELETE_ENDPOINTS.leave, {
                    user_leave_id: leaveIds.join(','),
                });
            }

            const defaultStartDate = startDate || defaultStart;
            const defaultEndDate = endDate || defaultEnd;

            await fetchTimeClockData(defaultStartDate, defaultEndDate);
            setSelectedRows(new Set());
            onDataChange?.();

        } catch (error) {
            console.error('Error deleting records:', error);
        }
    };


    // const proceedWithDelete = async (worklogIds: string[]) => {
    //     try {
    //         const ids = worklogIds.join(',');
    //         const response: AxiosResponse<{
    //             IsSuccess: boolean
    //         }> = await api.post('/time-clock/worklogs-bulk-delete', {ids});
    //
    //         if (response.data.IsSuccess) {
    //             const defaultStartDate = startDate || defaultStart;
    //             const defaultEndDate = endDate || defaultEnd;
    //             await fetchTimeClockData(defaultStartDate, defaultEndDate);
    //             setSelectedRows(new Set());
    //             onDataChange?.();
    //         } else {
    //             console.error(`Error deleting timesheets`);
    //         }
    //     } catch (error) {
    //         console.error(`Error deleting timesheets:`, error);
    //     }
    // };

    const handleConfirmAction = async () => {
        if (!confirmDialog) return;

        const selectedRowIndices = Array.from(selectedRows).map((rowId) => {
            return parseInt(rowId.replace('row-', ''));
        });

        setConfirmDialog(null);

        switch (confirmDialog.actionType) {
            case 'lock': {
                const timesheetIds: (string | number)[] = [];
                selectedRowIndices.forEach((rowIndex) => {
                    const rowData = dailyData[rowIndex];
                    timesheetIds.push(rowData.timesheet_ids);
                });
                if (timesheetIds.length > 0) {
                    await toggleTimesheetStatus(timesheetIds, 'approve');
                }
                break;
            }
            case 'unlock': {
                const timesheetIds: (string | number)[] = [];
                selectedRowIndices.forEach((rowIndex) => {
                    const rowData = dailyData[rowIndex];
                    timesheetIds.push(rowData.timesheet_ids);
                });
                if (timesheetIds.length > 0) {
                    await toggleTimesheetStatus(timesheetIds, 'unapprove');
                }
                break;
            }
            case 'delete': {
                const worklogIds: string[] = [];
                const leaveIds: string[] = [];
                const expenseIds: string[] = [];

                const selectedRowIndices = Array.from(selectedRows).map((rowId) =>
                    parseInt(rowId.replace('row-', ''))
                );

                selectedRowIndices.forEach((rowIndex) => {
                    const rowData = dailyData[rowIndex];

                    if (rowData && rowData.rowType === 'day') {
                        if (Array.isArray(rowData.rowsData)) {
                            rowData.rowsData.forEach((record: any) => {
                                // Worklog
                                if (record.worklog_id) {
                                    worklogIds.push(record.worklog_id);
                                }

                                // Leave
                                if (record.is_leave && record.user_leave_id) {
                                    leaveIds.push(record.user_leave_id);
                                }

                                // Expense
                                if (record.is_expense && record.expense_id) {
                                    expenseIds.push(record.expense_id);
                                }
                            });
                        }
                    }
                });

                if (!worklogIds.length && !leaveIds.length && !expenseIds.length) return;

                await proceedWithDelete({worklogIds, leaveIds, expenseIds,});

                break;
            }
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

        return {hasWorklogs};
    };

    const handleDeleteRecord = async (id: string, type: RecordType) => {
        if (!id || !type) {
            console.error('Invalid delete parameters');
            return;
        }

        try {
            const endpoint = DELETE_ENDPOINTS[type];

            if (!endpoint) {
                console.error(`Unknown record type: ${type}`);
                return;
            }

            let response: AxiosResponse<{ IsSuccess: boolean }>;

            if (type === 'leave') {
                response = await api.post(endpoint, {user_leave_id: id});
            } else {
                response = await api.post(endpoint, {ids: id});
            }

            if (response.data.IsSuccess) {
                const defaultStartDate = startDate || defaultStart;
                const defaultEndDate = endDate || defaultEnd;

                await fetchTimeClockData(defaultStartDate, defaultEndDate);
                setSelectedRows(new Set());
                onDataChange?.();
            } else {
                console.error(`Error deleting ${type}`);
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
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
                size: 50,
                meta: {align: 'center'},
            },
            {
                id: 'date',
                header: () => <span style={{ display: 'block', textAlign: 'center', color: '#203040' }}>Date</span>,
                cell: (info: any) => {
                    const row = info.row.original;

                    return (
                        <Stack direction="row" alignItems="center" spacing={2} sx={{width: '100%'}}>
                            <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                                <Typography
                                    className="f-14"
                                    noWrap
                                >
                                    {row.original.date}
                                </Typography>
                            </Box>
                        </Stack>
                    );
                },
                size: 150,
            },
            // {
            //     id: 'date',
            //     header: () => <span style={{display: 'block', textAlign: 'center'}}>Date</span>,
            //     cell: ({row}) => row.original.rowType === 'day' ? row.original.date : null,
            //     size: 150,
            // },
            {
                id: 'conflicts',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}></span>,
                cell: ({row}) => null,
                size: 60,
                enableSorting: false,
                enableHiding: false,
                meta: {align: 'center'},
            },
            {
                id: 'exclamation',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}></span>,
                meta: {label: 'Exclamation'},
                size: 60,
                enableSorting: false,
                cell: ({row}) => {
                    if (row.original.rowType !== 'day') return null;
                    const hasLogs = row.original.is_requested;
                    if (!hasLogs) return null;
                    return (
                        <IconButton
                            size="small"
                            color="error"
                            aria-label="error"
                            sx={{'&:hover': {backgroundColor: 'transparent', color: '#fc4b6c'}}}
                            onClick={handlePendingRequest}
                        >
                            <IconExclamationMark size={18}/>
                        </IconButton>
                    );
                },
            },
            {
                id: 'project',
                accessorKey: 'project',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Project</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.project : null,
                size: 120,
            },
            {
                id: 'shift',
                accessorKey: 'shift',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Shift</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.shift : null,
                size: 120,
            },
            {
                id: 'start',
                accessorKey: 'start',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Start</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.start : null,
                size: 80,
            },
            {
                id: 'end',
                accessorKey: 'end',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>End</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.end : null,
                size: 80,
            },
            {
                id: 'totalHours',
                accessorKey: 'totalHours',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Total hours</span>,
                cell: ({row}) => {
                    if (row.original.rowType !== 'day') return null;
                    const totalHours = row.original.totalHours;
                    const isEdited = row.original.is_edited;
                    const isPricework = row.original.rowsData ?
                        row.original.rowsData.some((log: any) => log.is_pricework) : false;
                    return (
                        <span style={{color: isEdited ? '#ff0000' : 'inherit'}}>
                          {isPricework ? '--' : totalHours}
                        </span>
                    );
                },
                size: 120,
            },
            {
                id: 'penaltyHours',
                accessorKey: 'penaltyHours',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Penalty hours</span>,
                cell: ({row}) => {
                    if (row.original.rowType !== 'day') return null;
                    const penaltyHours = row.original.penaltyHours;
                    const isEdited = row.original.is_edited;
                    const isPricework = row.original.rowsData ?
                        row.original.rowsData.some((log: any) => log.is_pricework) : false;
                    return (
                        <span style={{color: isEdited ? '#ff0000' : 'inherit'}}>
                          {isPricework ? '--' : penaltyHours}
                        </span>
                    );
                },
                size: 120,
            },
            {
                id: 'priceWork',
                accessorKey: 'priceWork',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Pricework</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.priceWork : null,
                size: 120,
            },
            {
                id: 'expense',
                accessorKey: 'expense',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Expense</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.expense : null,
                size: 120,
            },
            {
                id: 'cis_amount',
                accessorKey: 'cis_amount',
                meta: {label: 'CIS'},
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>CIS</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.cis_amount : null,
                size: 120,
            },
            {
                id: 'gross_amount',
                accessorKey: 'gross_amount',
                meta: {label: 'Gross'},
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Gross</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.gross_amount : null,
                size: 120,
            },
            {
                id: 'checkIns',
                accessorKey: 'checkIns',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Check Ins</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.check_in : null,
                size: 100,
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Status</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.status_text : null,
                size: 100,
            },
            {
                id: 'dailyTotal',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Daily total</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.dailyTotal : null,
                size: 100,
            },
            // {
            //     id: 'expenseAmount',
            //     accessorKey: 'expenseAmount',
            //     header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Expense Amount</span>,
            //     cell: ({row}) => row.original.rowType === 'day' ? row.original.expenseAmount : null,
            //     size: 140,
            // },
            {
                id: 'adjustment',
                accessorKey: 'adjustment',
                header: () => <span style={{ display: 'block', textAlign: 'center', color: '#203040' }}>Adjustment</span>,
                cell: ({ row }) => row.original.rowType === 'day' ? (row.original.adjustment ?? '--') : null,
                size: 130,
            },
            {
                id: 'payableAmount',
                accessorKey: 'payableAmount',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Payable Amount</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.payableAmount : null,
                size: 150,
            },
            {
                id: 'employeeNotes',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Employee notes</span>,
                cell: ({row}) => row.original.rowType === 'day' ? row.original.employeeNotes : null,
                size: 150,
            },
            {
                id: 'action',
                header: () => <span style={{display: 'block', textAlign: 'center', color: '#203040' }}>Action</span>,
                cell: ({row}) => null,
                size: 100,
            },
        ],
        [isAllSelected, isIndeterminate, selectedRows, handleSelectAll, handleRowSelect, penaltyAppealByDate]
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

    useEffect(() => {
        if (!open) return;

        let start: Date | null = null;
        let end: Date | null = null;

        if (initialData?.startDate && initialData?.endDate) {
            start = new Date(initialData.startDate);
            end = new Date(initialData.endDate);
        } else {
            if (timeClock?.start_date && timeClock?.end_date) {
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
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', position: 'relative'}}>
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
                onAddExpense={handleAddExpense}
                payrollCycle={payrollCycle}
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
                userHasRatePermission={userHasRatePermission}
                amountColumns={amountColumns}
            />

            <TimeClockTable
                key={user_id}
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
                onDeleteClick={handleDeleteRecord}
                conflictsByDate={conflictsByDate}
                penaltyAppealByDate={penaltyAppealByDate}
                openConflictsSideBar={handleConflicts}
                openChecklogsSidebar={handleChecklogs}
                openExpensesSidebar={handleExpenses}
                openPenaltiesSidebar={handlePenalties}
                leaveRequestCount={leaveRequestCount}
                penaltyAppealCount={penaltyAppealCount}
                openLeaveRequestsSideBar={handleLeaveRequests}
                onAdjustmentSave={handleAdjustmentSave}
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
                    startDate={startDate ? format(startDate, 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd')}
                    endDate={endDate ? format(endDate, 'yyyy-MM-dd') : format(defaultEnd, 'yyyy-MM-dd')}
                />
            </Drawer>

            <Drawer
                anchor="right"
                open={leaveRequestSidebar}
                onClose={closeLeaveRequestSidebar}
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
                <LeaveRequest
                    open
                    startDate={startDate}
                    endDate={endDate}
                    onClose={closeLeaveRequestSidebar}
                    companyId={companyId}
                    userId={user_id}
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
                        width: '500px',
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
                open={expensesSidebar}
                onClose={closeExpensesSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '500px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <Expenses
                    expenseId={selectedExpenseId}
                    onClose={closeExpensesSidebar}
                />
            </Drawer>

            <Drawer
                anchor="right"
                open={penaltiesSidebar}
                onClose={closePenaltiesSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '500px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <Penalties
                    worklogId={selectedWorkId}
                    onClose={closePenaltiesSidebar}
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
                    userId={user_id}
                    companyId={companyId}
                />
            </Drawer>

            <Drawer
                anchor="right"
                open={addExpenseSidebar}
                onClose={closeAddExpenseSidebar}
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
                <AddExpense
                    onClose={closeAddExpenseSidebar}
                    userId={user_id}
                    selecteUser={false}
                    companyId={companyId}
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

            {confirmDialog && (
                <ConfirmationDialog
                    open={confirmDialog.open}
                    onClose={() => setConfirmDialog(null)}
                    onConfirm={handleConfirmAction}
                    title={confirmDialog.actionType === 'lock' ? 'Lock Records' : confirmDialog.actionType === 'unlock' ? 'Unlock Records' : 'Delete Records'}
                    message={confirmDialog.actionType === 'lock' ? 'Are you sure you want to lock the selected records?' : confirmDialog.actionType === 'unlock' ? 'Are you sure you want to unlock the selected records?' : 'Are you sure you want to delete the selected records? This action cannot be undone.'}
                    conflictCount={confirmDialog.conflictCount}
                    actionType={confirmDialog.actionType}
                />
            )}
        </Box>
    );
};

export default TimeClockDetails;
