// 'use client';
//
// import React, {useEffect, useMemo, useState, useCallback} from 'react';
// import {
//     Avatar,
//     Box,
//     IconButton,
//     Stack,
//     Table,
//     TableBody,
//     TableCell,
//     TableContainer,
//     TableHead,
//     TableRow,
//     TextField,
//     Typography,
//     Popover,
//     FormGroup,
//     FormControlLabel,
//     Checkbox, Button, Drawer, Select, MenuItem, FormControl,
// } from '@mui/material';
// import {
//     IconX,
//     IconTableColumn,
//     IconChevronRight,
//     IconChevronDown,
//     IconPlus,
//     IconLock,
//     IconLockOpen,
//     IconChevronLeft,
//     IconExclamationMark,
// } from '@tabler/icons-react';
// import {
//     useReactTable,
//     getCoreRowModel,
//     flexRender,
//     ColumnDef,
//     VisibilityState,
//     ExpandedState,
//     getExpandedRowModel,
//     RowData,
// } from '@tanstack/react-table';
// import {format, parse} from 'date-fns';
// import {AxiosResponse} from 'axios';
// import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
// import {TimeClock} from './time-clock';
// import api from '@/utils/axios';
// import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
// import RequestDetails from './time-clocl-details/request-details';
// import Conflicts from './time-clocl-details/conflicts/conflicts';
// import CheckLogRows from './time-clocl-details/check-log-list';
// import {DateTime} from 'luxon';
//
// declare module '@tanstack/react-table' {
//     interface ColumnMeta<TData extends RowData, TValue> {
//         label?: string;
//     }
// }
//
// type DailyBreakdown = {
//     is_requested: boolean;
//     is_edited: boolean;
//     timesheet_light_id: number;
//     rowsData?: any[];
//     checkin_time: any;
//     checkout_time: any;
//     total_hours: any;
//     rowType: 'week' | 'day';
//     weeklyTotalHours?: string;
//     weeklyPayableAmount?: string;
//     weekLabel?: string;
//
//     date?: string;
//     shift?: string;
//     shift_id?: number | string;
//     project?: string;
//     typeOfWork?: string;
//     start?: string;
//     end?: string;
//     totalHours?: string;
//     priceWorkAmount?: string;
//     dailyTotal?: string;
//     payableAmount?: string;
//     regular?: string;
//     employeeNotes?: string;
//     managerNotes?: string;
//
//     parsedDate?: Date | null | string;
//     address?: string;
//     check_in?: string;
//     check_out?: string;
//
//     isFirst?: boolean;
//     rowSpan?: number;
//     date_added?: string;
//     worklog_id?: string;
//
//     status?: number;
//
//     userChecklogs?: CheckLog[];
//     allUserChecklogs?: CheckLog[];
// };
//
// interface TimeClockDetailsProps {
//     open: boolean;
//     timeClock: TimeClock | null;
//     user_id: any;
//     currency: string;
//     allUsers: TimeClock[];
//     onClose: () => void;
//     onUserChange?: (user: TimeClock) => void;
// }
//
// type TimeClockDetailResponse = {
//     conflicts: any[];
//     company_id: number;
//     IsSuccess: boolean;
//     info: TimeClock[];
//     type_of_works: any[];
//     shifts: any[];
//     projects: any[];
//     total_hours?: number;
//     total_break_hours?: number;
//     payable_hours?: number;
//     total_payable_amount?: number;
//     worked_days?: number;
//     pending_request_count?: number;
//     total_conflicts?: number;
// };
//
// type TimeClockResourcesResponse = {
//     IsSuccess: boolean;
//     shifts: Shift[];
// };
//
// interface Shift {
//     id: number;
//     name: string;
// }
//
// interface ConflictItem {
//     user_id: number;
//     date: string;
//     start: string;
//     end: string;
//     shift_name: string;
//     shift_id: string;
//     color?: string;
//     worklog_id?: number;
//     project?: string;
// }
//
// interface ConflictDetail {
//     formatted_date: string;
//     date: string;
//     items: ConflictItem[];
// }
//
// type CheckLog = {
//     pricework_amount: React.ReactNode;
//     task_name: string;
//     checklog_id: number;
//     date_added: string;
//     address_id: number;
//     address_name: string;
//     checkin_time: string;
//     checkout_time: string;
//     total_hours: number;
// };
//
// type EditingWorklog = {
//     worklogId: string;
//     start: string;
//     end: string;
//     shift_id: number | string;
//     editingField?: 'start' | 'end' | 'shift';
// };
//
// type NewRecord = {
//     date: string;
//     shift_id: number | string;
//     start: string;
//     end: string;
// };
//
// const TimeClockDetails: React.FC<TimeClockDetailsProps> = ({
//                                                                open,
//                                                                timeClock,
//                                                                user_id,
//                                                                currency,
//                                                                allUsers = [],
//                                                                onClose,
//                                                                onUserChange
//                                                            }) => {
//     const today = new Date();
//
//     const defaultStart = new Date(today);
//     defaultStart.setDate(today.getDate() - today.getDay() + 1);
//     const defaultEnd = new Date(today);
//     defaultEnd.setDate(today.getDate() - today.getDay() + 7);
//
//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [search, setSearch] = useState('');
//     const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
//     const [expanded, setExpanded] = useState<ExpandedState>({});
//     const [expandedWorklogsIds, setExpandedWorklogsIds] = useState<string[]>([]);
//     const [data, setData] = useState<TimeClock[]>([]);
//     const [headerDetail, setHeaderDetail] = useState<TimeClockDetailResponse | null>(null);
//     const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
//
//     const [editingWorklogs, setEditingWorklogs] = useState<{ [key: string]: EditingWorklog }>({});
//     const [savingWorklogs, setSavingWorklogs] = useState<Set<string>>(new Set());
//     const [editingShifts, setEditingShifts] = useState<{
//         [key: string]: { shift_id: number | string; editingField: 'shift' }
//     }>({});
//     const [newRecords, setNewRecords] = useState<{ [key: string]: NewRecord }>({});
//     const [savingNewRecords, setSavingNewRecords] = useState<Set<string>>(new Set());
//
//     const [startDate, setStartDate] = useState<Date | null>(null);
//     const [endDate, setEndDate] = useState<Date | null>(null);
//
//     const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
//     const [totalConflicts, setTotalConflicts] = useState<number>(0);
//     const [requestListOpen, setRequestListOpen] = useState<boolean>(false);
//
//     const [conflictSidebar, setConflictSidebar] = useState<boolean>(false);
//     const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
//
//     const [shifts, setShifts] = useState<Shift[]>([]);
//
//     // Get current user index and navigation functions
//     const currentUserIndex = useMemo(() => {
//         if (!timeClock || !allUsers.length) return -1;
//         return allUsers.findIndex(user => user.user_id === timeClock.user_id);
//     }, [timeClock, allUsers]);
//
//     const canGoToPrevious = currentUserIndex > 0;
//     const canGoToNext = currentUserIndex >= 0 && currentUserIndex < allUsers.length - 1;
//
//     const handlePreviousUser = () => {
//         setTotalConflicts(0)
//         setPendingRequestCount(0)
//
//         if (canGoToPrevious && onUserChange) {
//             const previousUser = allUsers[currentUserIndex - 1];
//             onUserChange(previousUser);
//         }
//
//         setNewRecords({})
//     };
//
//     const handleNextUser = () => {
//         setTotalConflicts(0)
//         setPendingRequestCount(0)
//
//         if (canGoToNext && onUserChange) {
//             const nextUser = allUsers[currentUserIndex + 1];
//             onUserChange(nextUser);
//         }
//
//         setNewRecords({})
//     };
//
//     const handleWorklogToggle = (worklogId: string) => {
//         setExpandedWorklogsIds(prevIds => {
//             if (prevIds.includes(worklogId)) {
//                 return prevIds.filter(existingId => existingId !== worklogId);
//             } else {
//                 return [...prevIds, worklogId];
//             }
//         });
//     };
//
//     const formatHour = (val: string | number | null | undefined, isPricework: boolean = false): string => {
//         if (val === null || val === undefined) return isPricework ? '--' : '00:00';
//
//         if (isPricework) return '--';
//
//         const str = val.toString().trim();
//
//         if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
//             const [h, m] = str.split(':');
//             const minutes = parseFloat(m) || 0;
//             return `${h.padStart(2, '0')}:${Math.floor(minutes)
//                 .toString()
//                 .padStart(2, '0')}`;
//         }
//
//         const num = parseFloat(str);
//         if (!isNaN(num)) {
//             const h = Math.floor(num);
//             const m = Math.round((num - h) * 60);
//             return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
//         }
//         return isPricework ? '--' : '00:00';
//     };
//
//     const parseDate = (dateString: string): Date | null => {
//         if (!dateString) return null;
//         try {
//             let parsedDate = parse(dateString, 'EEE d/M', new Date());
//             if (isNaN(parsedDate.getTime())) {
//                 parsedDate = parse(dateString, 'dd-MM', new Date());
//             }
//             return parsedDate;
//         } catch {
//             return null;
//         }
//     };
//
//     const sanitizeDateTime = (dateTime: string): string => {
//         return dateTime && dateTime !== 'Invalid DateTime' ? dateTime : '--';
//     };
//
//     const isRecordLocked = (log: any): boolean => {
//         return log?.status === 6 || log?.status === '6';
//     };
//
//     const isRecordUnlocked = (log: any): boolean => {
//         return log?.status === 7 || log?.status === '7' || (log?.status && log.status !== 6 && log.status !== '6');
//     };
//
//     const hasValidWorklogData = (row: DailyBreakdown): boolean => {
//         return !!(row.worklog_id || row.timesheet_light_id) &&
//             row.start !== '--' &&
//             row.end !== '--' &&
//             row.start !== null &&
//             row.end !== null &&
//             row.start !== undefined &&
//             row.end !== undefined;
//     };
//
//     const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
//         setAnchorEl(event.currentTarget);
//     };
//     const handlePopoverClose = () => setAnchorEl(null);
//
//     const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
//         if (range.from && range.to) {
//             setStartDate(range.from);
//             setEndDate(range.to);
//             fetchTimeClockData(range.from, range.to);
//         }
//     };
//
//     const startEditingField = (worklogId: string, field: 'start' | 'end', log: any) => {
//         if (isRecordLocked(log)) {
//             return;
//         }
//
//         setEditingWorklogs(prev => ({
//             ...prev,
//             [worklogId]: {
//                 worklogId,
//                 start: log.start || '',
//                 end: log.end || '',
//                 shift_id: log.shift_id || '',
//                 editingField: field,
//             }
//         }));
//     };
//
//     const startEditingShift = (worklogId: string, currentShiftId: number | string, log: any) => {
//         if (isRecordLocked(log)) {
//             return;
//         }
//
//         setEditingShifts(prev => ({
//             ...prev,
//             [worklogId]: {
//                 shift_id: currentShiftId || '',
//                 editingField: 'shift',
//             }
//         }));
//     };
//
//     const cancelEditingField = (worklogId: string) => {
//         setEditingWorklogs(prev => {
//             const newState = {...prev};
//             delete newState[worklogId];
//             return newState;
//         });
//     };
//
//     const cancelEditingShift = (worklogId: string) => {
//         setEditingShifts(prev => {
//             const newState = {...prev};
//             delete newState[worklogId];
//             return newState;
//         });
//     };
//
//     const updateEditingField = (worklogId: string, field: keyof EditingWorklog, value: string) => {
//         setEditingWorklogs(prev => ({
//             ...prev,
//             [worklogId]: {
//                 ...prev[worklogId],
//                 [field]: value
//             }
//         }));
//     };
//
//     const updateEditingShift = (worklogId: string, shiftId: number | string) => {
//         setEditingShifts(prev => ({
//             ...prev,
//             [worklogId]: {
//                 ...prev[worklogId],
//                 shift_id: shiftId
//             }
//         }));
//     };
//
//     const startAddingNewRecord = (date: string) => {
//         const recordKey = `new-${date}-${Date.now()}`;
//
//         setNewRecords(prev => ({
//             ...prev,
//             [recordKey]: {
//                 date,
//                 shift_id: '',
//                 start: '',
//                 end: '',
//             }
//         }));
//     };
//
//     const updateNewRecord = (recordKey: string, field: keyof NewRecord, value: string | number) => {
//         setNewRecords(prev => ({
//             ...prev,
//             [recordKey]: {
//                 ...prev[recordKey],
//                 [field]: value
//             }
//         }));
//     };
//
//     const cancelNewRecord = (recordKey: string) => {
//         setNewRecords(prev => {
//             const newState = {...prev};
//             delete newState[recordKey];
//             return newState;
//         });
//     };
//
//     const saveNewRecord = async (recordKey: string) => {
//         const newRecord = newRecords[recordKey];
//         if (!newRecord) return;
//
//         if (!newRecord.shift_id || !newRecord.start || !newRecord.end) {
//             console.error('All fields are required');
//             return;
//         }
//
//         const formattedStart = validateAndFormatTime(newRecord.start);
//         const formattedEnd = validateAndFormatTime(newRecord.end);
//
//         if (!timeRegex.test(formattedStart) || !timeRegex.test(formattedEnd)) {
//             console.error('Invalid time format');
//             return;
//         }
//
//         const parsedDate = DateTime.fromFormat(newRecord.date, 'ccc d/M');
//         if (!parsedDate.isValid) {
//             console.error('Invalid date format:', newRecord.date);
//             return;
//         }
//         const formattedDate = parsedDate.toFormat('yyyy-MM-dd');
//
//         setSavingNewRecords(prev => new Set(prev).add(recordKey));
//
//         try {
//             const params = {
//                 user_id: user_id,
//                 device_type: 3,
//                 device_model_type: 'web',
//                 date: formattedDate,
//                 shift_id: newRecord.shift_id,
//                 start_time: formattedStart,
//                 end_time: formattedEnd,
//             }
//
//             const response = await api.post('/time-clock/add-worklog', params);
//
//             if (response.data.IsSuccess) {
//                 cancelNewRecord(recordKey);
//             }
//
//             const defaultStartDate = startDate || defaultStart;
//             const defaultEndDate = endDate || defaultEnd;
//             await fetchTimeClockData(defaultStartDate, defaultEndDate);
//         } catch (error) {
//             console.error('Error saving new record:', error);
//         } finally {
//             setSavingNewRecords(prev => {
//                 const newSet = new Set(prev);
//                 newSet.delete(recordKey);
//                 return newSet;
//             });
//         }
//     };
//
//     const getSelectedRowsLockStatus = () => {
//         let hasLockedRows = false;
//         let hasUnlockedRows = false;
//
//         const selectedRowIndices = Array.from(selectedRows).map(rowId => {
//             return parseInt(rowId.replace('row-', ''));
//         });
//
//         selectedRowIndices.forEach(rowIndex => {
//             const rowData = dailyData[rowIndex];
//             if (rowData && rowData.rowType === 'day') {
//                 if (!rowData.rowsData) {
//                     if (isRecordLocked(rowData)) {
//                         hasLockedRows = true;
//                     } else if (isRecordUnlocked(rowData)) {
//                         hasUnlockedRows = true;
//                     }
//                 } else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
//                     rowData.rowsData.forEach((worklog: any) => {
//                         if (isRecordLocked(worklog)) {
//                             hasLockedRows = true;
//                         } else if (isRecordUnlocked(rowData)) {
//                             hasUnlockedRows = true;
//                         }
//                     });
//                 }
//             }
//         });
//
//         return {hasLockedRows, hasUnlockedRows};
//     };
//
//     const handleConflicts = async () => {
//         setConflictSidebar(true);
//     };
//
//     const closeConflictSidebar = async () => {
//         setConflictSidebar(false);
//
//         const defaultStartDate = startDate || defaultStart;
//         const defaultEndDate = endDate || defaultEnd;
//
//         await fetchTimeClockData(defaultStartDate, defaultEndDate);
//     };
//
//     const handlePendingRequest = async () => {
//         setRequestListOpen(true);
//     };
//
//     const closeRequestList = async () => {
//         setRequestListOpen(false);
//
//         const defaultStartDate = startDate || defaultStart;
//         const defaultEndDate = endDate || defaultEnd;
//
//         await fetchTimeClockData(defaultStartDate, defaultEndDate);
//     };
//
//     const handleLockClick = () => {
//         const timesheetIds: (string | number)[] = [];
//         const selectedRowIndices = Array.from(selectedRows).map(rowId => {
//             return parseInt(rowId.replace('row-', ''));
//         });
//
//         selectedRowIndices.forEach(rowIndex => {
//             const rowData = dailyData[rowIndex];
//             if (rowData && rowData.rowType === 'day') {
//                 if (!rowData.rowsData && rowData.timesheet_light_id != null) {
//                     timesheetIds.push(rowData.timesheet_light_id);
//                 } else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
//                     rowData.rowsData.forEach((worklog: any) => {
//                         if (worklog.timesheet_light_id) {
//                             timesheetIds.push(worklog.timesheet_light_id);
//                         }
//                     });
//                 }
//             }
//         });
//
//         if (timesheetIds.length > 0) {
//             toggleTimesheetStatus(timesheetIds, 'approve');
//         }
//     };
//
//     const handleUnlockClick = () => {
//         const timesheetIds: (string | number)[] = [];
//
//         const selectedRowIndices = Array.from(selectedRows).map(rowId => {
//             return parseInt(rowId.replace('row-', ''));
//         });
//
//         selectedRowIndices.forEach(rowIndex => {
//             const rowData = dailyData[rowIndex];
//             if (rowData && rowData.rowType === 'day') {
//                 if (!rowData.rowsData && rowData.timesheet_light_id) {
//                     timesheetIds.push(rowData.timesheet_light_id);
//                 } else if (rowData.rowsData && Array.isArray(rowData.rowsData)) {
//                     rowData.rowsData.forEach((worklog: any) => {
//                         if (worklog.timesheet_light_id) {
//                             timesheetIds.push(worklog.timesheet_light_id);
//                         }
//                     });
//                 }
//             }
//         });
//
//         if (timesheetIds.length > 0) {
//             toggleTimesheetStatus(timesheetIds, 'unapprove');
//         }
//     };
//
//     const toggleTimesheetStatus = useCallback(
//         async (timesheetIds: (string | number)[], action: 'approve' | 'unapprove') => {
//             try {
//                 const ids = timesheetIds.join(',');
//                 const endpoint = action === 'approve' ? '/timesheet/approve' : '/timesheet/unapprove';
//                 const response: AxiosResponse<{ IsSuccess: boolean }> = await api.post(endpoint, {ids});
//
//                 if (response.data.IsSuccess) {
//                     const defaultStartDate = startDate || defaultStart;
//                     const defaultEndDate = endDate || defaultEnd;
//                     await fetchTimeClockData(defaultStartDate, defaultEndDate);
//
//                     setSelectedRows(new Set());
//                 } else {
//                     console.error(`Error ${action}ing timesheets`);
//                 }
//             } catch (error) {
//                 console.error(`Error ${action}ing timesheets:`, error);
//             }
//         },
//         [startDate, endDate]
//     );
//
//     const saveFieldChanges = async (worklogId: string, originalLog: any) => {
//         const editedData = editingWorklogs[worklogId];
//         if (!editedData) return;
//
//         if (isRecordLocked(originalLog)) {
//             cancelEditingField(worklogId);
//             return;
//         }
//
//         const originalStart = sanitizeDateTime(originalLog.start);
//         const originalEnd = sanitizeDateTime(originalLog.end);
//
//         const newStart = editedData.start ? validateAndFormatTime(editedData.start) : '';
//         const newEnd = editedData.end ? validateAndFormatTime(editedData.end) : '';
//
//         if (originalStart === newStart && originalEnd === newEnd) {
//             cancelEditingField(worklogId);
//             return;
//         }
//
//         if ((newStart && !timeRegex.test(newStart)) || (newEnd && !timeRegex.test(newEnd))) {
//             console.error('Invalid time format before API call');
//             cancelEditingField(worklogId);
//             return;
//         }
//
//         setSavingWorklogs(prev => new Set(prev).add(worklogId));
//         try {
//             await api.post('/time-clock/edit-worklog', {
//                 user_worklog_id: originalLog.worklog_id,
//                 date: originalLog.date_added,
//                 start_time: newStart,
//                 end_time: newEnd,
//             });
//
//             cancelEditingField(worklogId);
//
//             const defaultStartDate = startDate || defaultStart;
//             const defaultEndDate = endDate || defaultEnd;
//             await fetchTimeClockData(defaultStartDate, defaultEndDate);
//         } catch (error) {
//             console.error('Error saving worklog:', error);
//         } finally {
//             setSavingWorklogs(prev => {
//                 const newSet = new Set(prev);
//                 newSet.delete(worklogId);
//                 return newSet;
//             });
//         }
//     };
//
//     const saveShiftChanges = async (worklogId: string, originalLog: any) => {
//         const editedData = editingShifts[worklogId];
//         if (!editedData) return;
//
//         if (isRecordLocked(originalLog)) {
//             cancelEditingShift(worklogId);
//             return;
//         }
//
//         const originalShiftId = originalLog.shift_id;
//         const newShiftId = editedData.shift_id;
//
//         if (originalShiftId === newShiftId) {
//             cancelEditingShift(worklogId);
//             return;
//         }
//
//         setSavingWorklogs(prev => new Set(prev).add(worklogId));
//         try {
//             await api.post('/time-clock/edit-worklog-shift', {
//                 user_worklog_id: originalLog.worklog_id,
//                 shift_id: newShiftId,
//             });
//
//             cancelEditingShift(worklogId);
//
//             const defaultStartDate = startDate || defaultStart;
//             const defaultEndDate = endDate || defaultEnd;
//             await fetchTimeClockData(defaultStartDate, defaultEndDate);
//         } catch (error) {
//             console.error('Error saving shift:', error);
//         } finally {
//             setSavingWorklogs(prev => {
//                 const newSet = new Set(prev);
//                 newSet.delete(worklogId);
//                 return newSet;
//             });
//         }
//     };
//
//     const fetchTimeClockData = async (start: Date, end: Date): Promise<void> => {
//         try {
//
//             console.log(start, 'start')
//             console.log(end, 'end')
//             const params: Record<string, string> = {
//                 user_id: user_id || '',
//                 start_date: format(start, 'dd/MM/yyyy'),
//                 end_date: format(end, 'dd/MM/yyyy'),
//             };
//             const response: AxiosResponse<TimeClockDetailResponse> = await api.get(
//                 '/time-clock/details',
//                 {params}
//             );
//             if (response.data.IsSuccess) {
//                 setData(response.data.info || []);
//                 setHeaderDetail(response.data);
//                 setPendingRequestCount(response.data.pending_request_count || 0);
//                 setTotalConflicts(response.data.total_conflicts || 0);
//                 setConflictDetails(response.data.conflicts || []);
//
//                 fetchTimeClockResources(response.data.company_id);
//             }
//         } catch (error) {
//             console.error('Error fetching timeClock data:', error);
//         }
//     };
//
//     const fetchTimeClockResources = async (companyId: number): Promise<void> => {
//         try {
//             const response: AxiosResponse<TimeClockResourcesResponse> = await api.get(
//                 '/time-clock/resources',
//                 {params: {companyId}}
//             );
//             if (response.data.IsSuccess) {
//                 setShifts(response.data.shifts || []);
//             }
//         } catch (error) {
//             console.error('Error fetching timeClock data:', error);
//         }
//     };
//
//     useEffect(() => {
//         if (timeClock?.start_date && timeClock?.end_date) {
//             const start = new Date(timeClock.start_date);
//             const end = new Date(timeClock.end_date);
//
//             if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
//                 setStartDate(start);
//                 setEndDate(end);
//             }
//
//             fetchTimeClockData(
//                 new Date(timeClock.start_date),
//                 new Date(timeClock.end_date)
//             );
//         }
//     }, [timeClock]);
//
//     const dailyData = useMemo<DailyBreakdown[]>(() => {
//         return (data || []).flatMap((week: any) => {
//             const weekRows: DailyBreakdown[] = [];
//
//             weekRows.push({
//                 is_requested: false,
//                 is_edited: false,
//                 timesheet_light_id: 0,
//                 checkin_time: '--',
//                 checkout_time: '--',
//                 total_hours: '--',
//                 rowType: 'week',
//                 weekLabel: week.week_range,
//                 weeklyTotalHours: formatHour(week.weekly_total_hours),
//                 weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`
//             });
//
//             const dayRows = (week.days || []).flatMap((day: any) => {
//                 const hasWorklogs = day.worklogs && day.worklogs.length > 0;
//
//                 if (hasWorklogs) {
//                     const allChecklogs = day.worklogs.reduce((acc: CheckLog[], log: any) => {
//                         if (log.user_checklogs && Array.isArray(log.user_checklogs)) {
//                             return [...acc, ...log.user_checklogs];
//                         }
//                         return acc;
//                     }, []);
//
//                     return [{
//                         rowType: 'day' as const,
//                         date: day.date ?? '--',
//                         timesheet_id: day.timesheet_id ?? '--',
//                         shift: '--',
//                         project: '--',
//                         start: '--',
//                         end: '--',
//                         priceWorkAmount: '--',
//                         totalHours: '--',
//                         dailyTotal: formatHour(day.daily_total),
//                         payableAmount: `${currency}${day.daily_payable_amount || 0}`,
//                         regular: '--',
//                         employeeNotes: day.employee_notes || '--',
//                         managerNotes: day.manager_notes || '--',
//                         weekLabel: week.week_range,
//                         weeklyTotalHours: formatHour(week.weekly_total_hours),
//                         weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
//                         parsedDate: parseDate(day.date),
//                         address: '--',
//                         check_in: '--',
//                         check_out: '--',
//                         rowsData: day.worklogs,
//                         rowSpan: 1,
//                         allUserChecklogs: allChecklogs,
//                         status: day.status,
//                         is_requested: false,
//                         is_edited: false,
//                         timesheet_light_id: day.timesheet_light_id,
//                     }];
//                 }
//
//                 return [{
//                     rowType: 'day' as const,
//                     date: day.date ?? '--',
//                     timesheet_id: day.timesheet_id ?? null,
//                     shift: '--',
//                     project: '--',
//                     start: '--',
//                     end: '--',
//                     priceWorkAmount: '--',
//                     totalHours: '--',
//                     dailyTotal: '--',
//                     payableAmount: '--',
//                     regular: '--',
//                     employeeNotes: '--',
//                     managerNotes: '--',
//                     weekLabel: '--',
//                     weeklyTotalHours: '--',
//                     weeklyPayableAmount: '--',
//                     parsedDate: '--',
//                     address: '--',
//                     check_in: '--',
//                     check_out: '--',
//                     rowSpan: 1,
//                     allUserChecklogs: [],
//                     status: day.status,
//                     is_requested: false,
//                     is_edited: false,
//                     timesheet_light_id: day.timesheet_light_id,
//                 }];
//             });
//
//             weekRows.push(...dayRows);
//             return weekRows;
//         });
//     }, [data, currency]);
//
//     const selectableRowIds = useMemo(() => {
//         const ids: string[] = [];
//         dailyData.forEach((row, index) => {
//             if (row.rowType === 'day') {
//                 ids.push(`row-${index}`);
//             }
//         });
//         return ids;
//     }, [dailyData.length]);
//
//     const handleSelectAll = useCallback((checked: boolean) => {
//         if (checked) {
//             setSelectedRows(new Set(selectableRowIds));
//         } else {
//             setSelectedRows(new Set());
//         }
//     }, [selectableRowIds]);
//
//     const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
//         setSelectedRows(prev => {
//             const newSet = new Set(prev);
//             if (checked) {
//                 newSet.add(rowId);
//             } else {
//                 newSet.delete(rowId);
//             }
//             return newSet;
//         });
//     }, []);
//
//     const isAllSelected = selectableRowIds.length > 0 && selectedRows.size === selectableRowIds.length;
//     const isIndeterminate = selectedRows.size > 0 && selectedRows.size < selectableRowIds.length;
//
//     const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
//         () => [
//             {
//                 id: 'select',
//                 header: () => (
//                     <CustomCheckbox
//                         checked={isAllSelected}
//                         indeterminate={isIndeterminate}
//                         onChange={(e) => handleSelectAll(e.target.checked)}
//                     />
//                 ),
//                 cell: ({row}) => {
//                     if (row.original.rowType !== 'day') return null;
//
//                     const rowId = `row-${row.index}`;
//                     return (
//                         <CustomCheckbox
//                             checked={selectedRows.has(rowId)}
//                             onChange={(e) => handleRowSelect(rowId, e.target.checked)}
//                         />
//                     );
//                 },
//                 enableSorting: false,
//                 size: 50,
//                 meta: {align: 'center'},
//             },
//             {
//                 id: 'date',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Date</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.date : null,
//                 size: 100,
//             },
//             {
//                 id: 'exclamation',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}></span>,
//                 meta: {label: 'Exclamation'},
//                 size: 36,
//                 enableSorting: false,
//                 cell: ({row}) => {
//                     if (row.original.rowType !== 'day') return null;
//
//                     const hasLogs = row.original.is_requested;
//                     if (!hasLogs) return null;
//
//                     return (
//                         <IconButton
//                             size="small"
//                             color="error"
//                             aria-label="error"
//                             sx={{
//                                 '&:hover': {
//                                     backgroundColor: 'transparent',
//                                     color: '#fc4b6c',
//                                 },
//                             }}
//                             onClick={handlePendingRequest}
//                         >
//                             <IconExclamationMark size={18}/>
//                         </IconButton>
//                     );
//                 },
//             },
//             {
//                 id: 'expander',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}></span>,
//                 meta: {label: 'Expand/Collapse'},
//                 size: 36,
//                 enableSorting: false,
//                 cell: ({row}) => {
//                     if (row.original.rowType !== 'day') return null;
//
//                     const hasLogs = row.original.userChecklogs && row.original.userChecklogs.length > 0;
//                     if (!hasLogs) return null;
//
//                     return (
//                         <IconButton
//                             size="small"
//                             onClick={row.getToggleExpandedHandler()}
//                             aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
//                         >
//                             {row.getIsExpanded() ? <IconChevronDown size={18}/> : <IconChevronRight size={18}/>}
//                         </IconButton>
//                     );
//                 },
//             },
//             {
//                 id: 'project',
//                 accessorKey: 'project',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Project</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.project : null,
//                 size: 120,
//             },
//             {
//                 id: 'shift',
//                 accessorKey: 'shift',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Shift</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.shift : null,
//                 size: 120,
//             },
//             {
//                 id: 'start',
//                 accessorKey: 'start',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Start</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.start : null,
//                 size: 80,
//             },
//             {
//                 id: 'end',
//                 accessorKey: 'end',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>End</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.end : null,
//                 size: 80,
//             },
//             {
//                 id: 'totalHours',
//                 accessorKey: 'totalHours',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Total hours</span>,
//                 cell: ({row}) => {
//                     if (row.original.rowType !== 'day') return null;
//
//                     const totalHours = row.original.totalHours;
//                     const isEdited = row.original.is_edited;
//
//                     const isPricework = row.original.rowsData ?
//                         row.original.rowsData.some((log: any) => log.is_pricework) :
//                         false;
//
//                     return (
//                         <span style={{
//                             color: isEdited ? '#ff0000' : 'inherit'
//                         }}>
//                         {isPricework ? '--' : totalHours}
//                     </span>
//                     );
//                 },
//                 size: 100,
//             },
//             {
//                 id: 'priceWorkAmount',
//                 accessorKey: 'priceWorkAmount',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Pricework Amount</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.priceWorkAmount : null,
//                 size: 140,
//             },
//             {
//                 id: 'dailyTotal',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Daily total</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.dailyTotal : null,
//                 size: 100,
//             },
//             {
//                 id: 'payableAmount',
//                 accessorKey: 'payableAmount',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Payable Amount</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.payableAmount : null,
//                 size: 140,
//             },
//             {
//                 id: 'employeeNotes',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Employee notes</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.employeeNotes : null,
//                 size: 150,
//             },
//             {
//                 id: 'managerNotes',
//                 header: () => <span style={{display: 'block', textAlign: 'center'}}>Manager notes</span>,
//                 cell: ({row}) =>
//                     row.original.rowType === 'day' ? row.original.managerNotes : null,
//                 size: 150,
//             },
//         ],
//         [isAllSelected, isIndeterminate, selectedRows, handleSelectAll, handleRowSelect]
//     );
//
//     const table = useReactTable({
//         data: dailyData,
//         columns: mainTableColumns,
//         state: {columnVisibility, expanded},
//         onColumnVisibilityChange: setColumnVisibility,
//         getCoreRowModel: getCoreRowModel(),
//         getExpandedRowModel: getExpandedRowModel(),
//         onExpandedChange: setExpanded,
//         getRowCanExpand: (row) => row.original.rowType === 'day',
//     });
//
//     const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
//    
//     const validateAndFormatTime = (value: string): string => {
//         if (!value || value.trim() === '') return '';
//
//         const digits = value.replace(/\D/g, '');
//         if (digits.length === 0) return '';
//
//         let hours = 0;
//         let minutes = 0;
//
//         if (digits.length === 1) {
//             // H -> 0H:00
//             hours = parseInt(digits);
//             minutes = 0;
//         } else if (digits.length === 2) {
//             const num = parseInt(digits);
//             if (num <= 23) {
//                 hours = num;
//                 minutes = 0;
//             } else {
//                 hours = parseInt(digits[0]);
//                 minutes = parseInt(digits[1]) * 10;
//             }
//         } else if (digits.length === 3) {
//             const firstTwo = parseInt(digits.slice(0, 2));
//             if (firstTwo <= 23) {
//                 hours = firstTwo;
//                 minutes = parseInt(digits[2]) * 10;
//             } else {
//                 hours = parseInt(digits[0]);
//                 minutes = parseInt(digits.slice(1, 3));
//             }
//         } else {
//             hours = parseInt(digits.slice(0, 2));
//             minutes = parseInt(digits.slice(2, 4));
//         }
//
//         hours = Math.min(hours, 23);
//         minutes = Math.min(minutes, 59);
//
//         return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
//     };
//
//     const renderEditableTimeCell = (
//         worklogId: string,
//         field: 'start' | 'end',
//         currentValue: string,
//         log: any
//     ) => {
//         const editingData = editingWorklogs[worklogId];
//         const isEditing = editingData && editingData.editingField === field;
//         const isSaving = savingWorklogs.has(worklogId);
//         const isLocked = isRecordLocked(log);
//
//         if (isEditing && !isLocked) {
//             return (
//                 <Box sx={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     width: '100%',
//                     minHeight: '32px',
//                 }}>
//                     <TextField
//                         type="text"
//                         value={editingData[field] || ''}
//                         placeholder="HH:MM"
//                         variant="outlined"
//                         size="small"
//                         onChange={(e) => {
//                             updateEditingField(worklogId, field, e.target.value);
//                         }}
//                         onBlur={() => {
//                             const inputValue = editingData[field] || '';
//                             const formattedTime = validateAndFormatTime(inputValue);
//                             const originalValue = sanitizeDateTime(currentValue);
//
//                             if (formattedTime && formattedTime !== originalValue) {
//                                 updateEditingField(worklogId, field, formattedTime);
//                                 saveFieldChanges(worklogId, log);
//                             } else {
//                                 cancelEditingField(worklogId);
//                             }
//                         }}
//                         onKeyDown={(e) => {
//                             if (e.key === 'Enter') {
//                                 e.preventDefault();
//                                 const inputValue = editingData[field] || '';
//                                 const formattedTime = validateAndFormatTime(inputValue);
//                                 const originalValue = sanitizeDateTime(currentValue);
//
//                                 if (formattedTime && formattedTime !== originalValue) {
//                                     updateEditingField(worklogId, field, formattedTime);
//                                     saveFieldChanges(worklogId, log);
//                                 } else {
//                                     cancelEditingField(worklogId);
//                                 }
//                             } else if (e.key === 'Escape') {
//                                 e.preventDefault();
//                                 cancelEditingField(worklogId);
//                             }
//                         }}
//                         autoFocus
//                         disabled={isSaving}
//                         sx={{
//                             width: '70px',
//                             '& .MuiInputBase-root': {
//                                 height: '32px',
//                             },
//                             '& .MuiInputBase-input': {
//                                 fontSize: '0.875rem',
//                                 textAlign: 'center',
//                                 p: '6px 8px',
//                             }
//                         }}
//                     />
//                 </Box>
//             );
//         }
//
//         return (
//             <Box
//                 onClick={() => !isLocked && startEditingField(worklogId, field, log)}
//                 sx={{
//                     py: 0.5,
//                     fontSize: '0.875rem',
//                     cursor: isLocked ? 'not-allowed' : 'pointer',
//                     minHeight: '32px',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     opacity: isLocked ? 0.6 : 1,
//                     '&:hover': !isLocked ? {
//                         borderRadius: '4px',
//                         backgroundColor: 'rgba(0,0,0,0.04)',
//                     } : {},
//                 }}
//                 title={isLocked ? 'This worklog is locked and cannot be edited' : 'Click to edit'}
//             >
//                 {sanitizeDateTime(currentValue)}
//             </Box>
//         );
//     };
//
//     const renderEditableShiftCell = (
//         worklogId: string,
//         currentShiftId: number | string,
//         currentShiftName: string,
//         log: any
//     ) => {
//         const editingData = editingShifts[worklogId];
//         const isEditing = editingData && editingData.editingField === 'shift';
//         const isSaving = savingWorklogs.has(worklogId);
//         const isLocked = isRecordLocked(log);
//
//         if (isEditing && !isLocked) {
//             return (
//                 <Box sx={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     width: '100%',
//                     minHeight: '32px',
//                 }}>
//                     <FormControl size="small" sx={{
//                         minWidth: '100px',
//                         width: '100%',
//                         maxWidth: '100px',
//                     }}>
//                         <Select
//                             value={editingData.shift_id || ''}
//                             onChange={(e) => updateEditingShift(worklogId, e.target.value)}
//                             onBlur={() => saveShiftChanges(worklogId, log)}
//                             onKeyDown={(e) => {
//                                 if (e.key === 'Enter') {
//                                     e.preventDefault();
//                                     saveShiftChanges(worklogId, log);
//                                 } else if (e.key === 'Escape') {
//                                     e.preventDefault();
//                                     cancelEditingShift(worklogId);
//                                 }
//                             }}
//                             autoFocus
//                             disabled={isSaving}
//                             sx={{
//                                 height: '32px',
//                                 '& .MuiSelect-select': {
//                                     fontSize: '0.875rem',
//                                     py: '6px',
//                                     px: '8px',
//                                     textAlign: 'center',
//                                 },
//                                 '& .MuiOutlinedInput-notchedOutline': {
//                                     borderColor: '#e0e0e0',
//                                 }
//                             }}
//                         >
//                             {shifts.map((shift) => (
//                                 <MenuItem key={shift.id} value={shift.id}>
//                                     {shift.name}
//                                 </MenuItem>
//                             ))}
//                         </Select>
//                     </FormControl>
//                 </Box>
//             );
//         }
//
//         return (
//             <Box
//                 onClick={() => !isLocked && startEditingShift(worklogId, currentShiftId, log)}
//                 sx={{
//                     py: 0.5,
//                     fontSize: '0.875rem',
//                     cursor: isLocked ? 'not-allowed' : 'pointer',
//                     minHeight: '32px',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     opacity: isLocked ? 0.6 : 1,
//                     '&:hover': !isLocked ? {
//                         borderRadius: '4px',
//                         backgroundColor: 'rgba(0,0,0,0.04)',
//                     } : {},
//                 }}
//                 title={isLocked ? 'This worklog is locked and cannot be edited' : 'Click to edit shift'}
//             >
//                 {currentShiftName || '--'}
//             </Box>
//         );
//     };
//    
//     if (!timeClock) return null;
//
//     const headerDetails = [
//         {value: formatHour(headerDetail?.total_hours), label: 'Total Hours'},
//         {value: formatHour(headerDetail?.total_break_hours), label: 'Total Break Hours'},
//         {value: formatHour(headerDetail?.payable_hours), label: 'Payable Hours'},
//         {value: `${currency}${headerDetail?.total_payable_amount || 0}`, label: 'Total Payable Amount'},
//         {value: headerDetail?.worked_days ?? 0, label: 'Worked Days'},
//     ];
//
//     const getVisibleColumnConfigs = () => {
//         const visibleColumns = table.getVisibleLeafColumns();
//         const configs: { [key: string]: { width: number; visible: boolean } } = {};
//
//         mainTableColumns.forEach(col => {
//             const isVisible = visibleColumns.some(visCol => visCol.id === col.id);
//             configs[col.id as string] = {
//                 width: col.size || 100,
//                 visible: isVisible
//             };
//         });
//
//         return configs;
//     };
//
//     const visibleColumnConfigs = getVisibleColumnConfigs();
//
//     return (
//         <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', position: 'relative'}}>
//             <Box
//                 sx={{
//                     p: 2,
//                     borderBottom: '1px solid #e0e0e0',
//                     display: 'flex',
//                     flexDirection: 'column',
//                     gap: 2,
//                 }}
//             >
//                 {/* Top Navigation Row */}
//                 {allUsers.length > 1 && (
//                     <Box
//                         sx={{
//                             display: 'flex',
//                             alignItems: 'center',
//                             justifyContent: 'space-between',
//                             mb: 1,
//                         }}
//                     >
//                         {canGoToPrevious ? (
//                             <Box
//                                 sx={{
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     cursor: 'pointer',
//                                     px: 2,
//                                     py: 1,
//                                     borderRadius: '25px',
//                                     backgroundColor: 'white',
//                                     border: '2px solid #e0e0e0',
//                                     transition: 'all 0.2s ease',
//                                 }}
//                                 onClick={handlePreviousUser}
//                             >
//                                 <IconChevronLeft size={20} color="#8b8a8a"/>
//                                 <Avatar
//                                     src={allUsers[currentUserIndex - 1]?.user_thumb_image}
//                                     alt={allUsers[currentUserIndex - 1]?.user_name}
//                                     sx={{width: 28, height: 28, mx: 1}}
//                                 />
//                                 <Typography
//                                     variant="body2"
//                                     fontWeight={600}
//                                     sx={{fontSize: '0.85rem'}}
//                                 >
//                                     {allUsers[currentUserIndex - 1]?.user_name}
//                                 </Typography>
//                             </Box>
//                         ) : (
//                             <Box sx={{width: '200px'}}/>
//                         )}
//
//                         {canGoToNext ? (
//                             <Box
//                                 sx={{
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     cursor: 'pointer',
//                                     px: 2,
//                                     py: 1,
//                                     borderRadius: '25px',
//                                     backgroundColor: 'white',
//                                     border: '2px solid #e0e0e0',
//                                     transition: 'all 0.2s ease',
//                                 }}
//                                 onClick={handleNextUser}
//                             >
//                                 <Typography
//                                     variant="body2"
//                                     fontWeight={600}
//                                     sx={{fontSize: '0.85rem'}}
//                                 >
//                                     {allUsers[currentUserIndex + 1]?.user_name}
//                                 </Typography>
//                                 <Avatar
//                                     src={allUsers[currentUserIndex + 1]?.user_thumb_image}
//                                     alt={allUsers[currentUserIndex + 1]?.user_name}
//                                     sx={{width: 28, height: 28, mx: 1}}
//                                 />
//                                 <IconChevronRight size={20} color="#8b8a8a"/>
//                             </Box>
//                         ) : (
//                             <Box sx={{width: '200px'}}/>
//                         )}
//                     </Box>
//                 )}
//
//                 {/* Main Header Content Row */}
//                 <Stack direction="row" alignItems="center" justifyContent="space-between">
//                     <Stack direction="row" alignItems="center" spacing={2}>
//                         <Avatar
//                             src={timeClock.user_thumb_image}
//                             alt={timeClock.user_name}
//                             sx={{width: 40, height: 40}}
//                         />
//                         <Box>
//                             <Typography variant="h6" fontWeight={600}>
//                                 {timeClock.user_name}
//                             </Typography>
//                             <Typography color="textSecondary" variant="body2">
//                                 {timeClock.trade_name}
//                             </Typography>
//                         </Box>
//
//                         <Stack
//                             mt={3}
//                             mx={2}
//                             mb={3}
//                             direction={{xs: 'column', sm: 'row'}}
//                             spacing={{xs: 1.5, sm: 2}}
//                             alignItems="center"
//                             flexWrap="wrap"
//                         >
//                             <DateRangePickerBox from={startDate} to={endDate} onChange={handleDateRangeChange}/>
//                         </Stack>
//                     </Stack>
//
//                     <Stack direction="row" spacing={1}>
//                         {totalConflicts > 0 && (
//
//                             <Button
//                                 variant="outlined"
//                                 sx={{
//                                     borderRadius: '50px',
//                                     borderColor: '#f28b82',
//                                     px: 1.5,
//                                     py: 0.5,
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     gap: 1,
//                                     textTransform: 'none',
//                                     '&:hover': {
//                                         backgroundColor: 'transparent',
//                                         borderColor: '#f28b82',
//                                     },
//                                 }}
//                                 onClick={handleConflicts}
//                             >
//                                 <Box
//                                     sx={{
//                                         backgroundColor: '#e53935',
//                                         color: 'white',
//                                         fontSize: '12px',
//                                         fontWeight: 'bold',
//                                         width: 20,
//                                         height: 20,
//                                         display: 'flex',
//                                         alignItems: 'center',
//                                         justifyContent: 'center',
//                                         borderRadius: '50%',
//                                     }}
//                                 >
//                                     {totalConflicts}
//                                 </Box>
//                                 <Typography
//                                     sx={{
//                                         fontWeight: 600,
//                                         color: '#e53935',
//                                         fontSize: '14px',
//                                     }}
//                                 >
//                                     Conflicts
//                                 </Typography>
//                             </Button>
//                         )}
//
//                         {pendingRequestCount > 0 && (
//                             <Button
//                                 size="small"
//                                 variant="outlined"
//                                 color="warning"
//                                 sx={{
//                                     px: 2,
//                                     '&:hover': {
//                                         backgroundColor: 'transparent',
//                                         borderColor: 'inherit',
//                                         boxShadow: 'none',
//                                         color: '#fdc90f',
//                                     },
//                                 }}
//                                 onClick={handlePendingRequest}
//                             >
//                                 <Typography sx={{ml: 0.5, fontWeight: 600}}>
//                                     Pending Requests ({pendingRequestCount})
//                                 </Typography>
//                             </Button>
//                         )}
//                     </Stack>
//                 </Stack>
//             </Box>
//
//             <Box
//                 sx={{
//                     p: 2,
//                     borderBottom: '1px solid #e0e0e0',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                 }}
//             >
//                 <Stack direction="row" spacing={6} alignItems="center">
//                     {headerDetails.map((stat, index) => (
//                         <Box key={index} textAlign="center">
//                             <Typography variant="h4" fontWeight={700} color="text.primary">
//                                 {stat.value}
//                             </Typography>
//                             <Typography variant="caption" color="textSecondary">
//                                 {stat.label}
//                             </Typography>
//                         </Box>
//                     ))}
//                 </Stack>
//
//                 <Stack>
//                     <IconButton onClick={handlePopoverOpen}>
//                         <IconTableColumn/>
//                     </IconButton>
//                     <Popover
//                         open={Boolean(anchorEl)}
//                         anchorEl={anchorEl}
//                         onClose={handlePopoverClose}
//                         anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
//                         transformOrigin={{vertical: 'top', horizontal: 'right'}}
//                         PaperProps={{sx: {width: 220, p: 1, borderRadius: 2}}}
//                     >
//                         <TextField
//                             size="small"
//                             placeholder="Search"
//                             fullWidth
//                             value={search}
//                             onChange={(e) => setSearch(e.target.value)}
//                             sx={{mb: 1}}
//                         />
//                         <FormGroup>
//                             {table
//                                 .getAllLeafColumns()
//                                 .filter((col) =>
//                                     col.id.toLowerCase().includes(search.toLowerCase())
//                                 )
//                                 .map((col) => (
//                                     <FormControlLabel
//                                         key={col.id}
//                                         control={
//                                             <Checkbox
//                                                 checked={col.getIsVisible()}
//                                                 onChange={col.getToggleVisibilityHandler()}
//                                             />
//                                         }
//                                         label={
//                                             col.columnDef.meta?.label ||
//                                             (typeof col.columnDef.header === 'string' && col.columnDef.header.trim() !== ''
//                                                 ? col.columnDef.header
//                                                 : col.id)
//                                         }
//                                     />
//                                 ))}
//                         </FormGroup>
//                     </Popover>
//                 </Stack>
//             </Box>
//
//             {/* Table with fixed layout */}
//             <Box sx={{flex: 1, overflow: 'auto', paddingBottom: selectedRows.size > 0 ? '80px' : '0px'}}>
//                 <TableContainer sx={{overflowY: 'hidden'}}>
//                     <Table size="small" stickyHeader sx={{tableLayout: 'fixed', width: '100%'}}>
//                         <TableHead>
//                             {table.getHeaderGroups().map((hg) => (
//                                 <TableRow key={hg.id}>
//                                     {hg.headers.map((header) => (
//                                         <TableCell
//                                             key={header.id}
//                                             sx={{
//                                                 backgroundColor: '#fafafa',
//                                                 fontWeight: 600,
//                                                 fontSize: '0.875rem',
//                                                 position: 'sticky',
//                                                 top: 0,
//                                                 zIndex: 10,
//                                                 width: `${header.column.columnDef.size || 100}px`,
//                                                 minWidth: `${header.column.columnDef.size || 100}px`,
//                                                 maxWidth: `${header.column.columnDef.size || 100}px`,
//                                             }}
//                                         >
//                                             {flexRender(
//                                                 header.column.columnDef.header,
//                                                 header.getContext()
//                                             )}
//                                         </TableCell>
//                                     ))}
//                                 </TableRow>
//                             ))}
//                         </TableHead>
//
//                         <TableBody>
//                             {table.getRowModel().rows.map((row) => {
//                                 const rowData = row.original;
//
//                                 // Week header row
//                                 if (rowData.rowType === 'week') {
//                                     const visibleColumnsCount = table.getVisibleLeafColumns().length;
//                                     return (
//                                         <TableRow key={row.id}>
//                                             <TableCell
//                                                 colSpan={visibleColumnsCount}
//                                                 sx={{
//                                                     backgroundColor: '#f0f0f0',
//                                                     fontWeight: 600,
//                                                     textAlign: 'center',
//                                                     py: 1.5,
//                                                 }}
//                                             >
//                                                 <Stack
//                                                     direction="row"
//                                                     alignItems="center"
//                                                     sx={{width: '100%', position: 'relative'}}
//                                                 >
//                                                     <Typography
//                                                         variant="body1"
//                                                         fontWeight={600}
//                                                         sx={{
//                                                             position: 'absolute',
//                                                             left: '50%',
//                                                             transform: 'translateX(-50%)',
//                                                         }}
//                                                     >
//                                                         {rowData.weekLabel}
//                                                     </Typography>
//                                                     <Typography
//                                                         variant="body1"
//                                                         fontWeight={600}
//                                                         sx={{marginLeft: 'auto'}}
//                                                     >
//                                                         Week
//                                                         Total: {rowData.weeklyTotalHours} ({rowData.weeklyPayableAmount})
//                                                     </Typography>
//                                                 </Stack>
//                                             </TableCell>
//                                         </TableRow>
//                                     );
//                                 }
//
//                                 // Collect new records for this date
//                                 const dateNewRecords = Object.entries(newRecords).filter(
//                                     ([_, rec]) => rec.date === rowData.date
//                                 );
//
//                                 // Day rows
//                                 if (row.original.rowsData) {
//                                     const worklogIds = row.original.rowsData.map((log: any) => log.worklog_id);
//                                     const expandedWorklogsCount = expandedWorklogsIds.filter((id) =>
//                                         worklogIds.includes(id)
//                                     ).length;
//                                     const rowSpan = row.original.rowsData.length + expandedWorklogsCount + dateNewRecords.length;
//
//                                     const subRows = row.original.rowsData.map((log: any, index: number) => {
//                                         const worklogId = `${row.id}-${log.worklog_id}`;
//                                         const isWorklogExpanded = expandedWorklogsIds.includes(log.worklog_id);
//                                         const isFirstRow = index === 0;
//                                         const isLogLocked = isRecordLocked(log);
//
//                                         return (
//                                             <>
//                                                 <TableRow
//                                                     key={log.worklog_id}
//                                                     sx={{
//                                                         '& td': {textAlign: 'center'},
//                                                         backgroundColor: isLogLocked ? 'rgba(244, 67, 54, 0.02)' : 'transparent',
//                                                     }}
//                                                 >
//                                                     {isFirstRow && visibleColumnConfigs.select?.visible && (
//                                                         <TableCell
//                                                             rowSpan={rowSpan}
//                                                             align="center"
//                                                             sx={{
//                                                                 width: `${visibleColumnConfigs.select.width}px`,
//                                                                 py: 0.5
//                                                             }}
//                                                         >
//                                                             <CustomCheckbox
//                                                                 checked={selectedRows.has(`row-${row.index}`)}
//                                                                 onChange={(e) => handleRowSelect(`row-${row.index}`, e.target.checked)}
//                                                             />
//                                                         </TableCell>
//                                                     )}
//
//                                                     {isFirstRow && visibleColumnConfigs.date?.visible && (
//                                                         <TableCell rowSpan={rowSpan} align="center"
//                                                                    sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             <Box
//                                                                 sx={{
//                                                                     display: 'flex',
//                                                                     alignItems: 'center',
//                                                                     justifyContent: 'center',
//                                                                     gap: 1,
//                                                                 }}
//                                                             >
//                                                                 <span>{rowData.date}</span>
//                                                                 <IconButton
//                                                                     onClick={() => startAddingNewRecord(rowData.date as string)}
//                                                                     size="small"
//                                                                     sx={{'&:hover': {backgroundColor: 'transparent'}}}
//                                                                     title="Add new record"
//                                                                 >
//                                                                     <IconPlus size={16} color="#1976d2"/>
//                                                                 </IconButton>
//                                                             </Box>
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.exclamation?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {log.is_requested ? (
//                                                                 <IconButton
//                                                                     size="small"
//                                                                     color="error"
//                                                                     onClick={handlePendingRequest}
//                                                                     aria-label="error"
//                                                                     sx={{
//                                                                         '&:hover': {
//                                                                             backgroundColor: 'transparent',
//                                                                             color: '#fc4b6c'
//                                                                         }
//                                                                     }}
//                                                                 >
//                                                                     <IconExclamationMark size={18}/>
//                                                                 </IconButton>
//                                                             ) : null}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.expander?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {log.user_checklogs && log.user_checklogs.length > 0 ? (
//                                                                 <IconButton
//                                                                     size="small"
//                                                                     onClick={() => handleWorklogToggle(log.worklog_id)}
//                                                                     aria-label={isWorklogExpanded ? 'Collapse' : 'Expand'}
//                                                                 >
//                                                                     {isWorklogExpanded ? <IconChevronDown size={18}/> :
//                                                                         <IconChevronRight size={18}/>}
//                                                                 </IconButton>
//                                                             ) : null}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.project?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {log.project_name || '--'}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.shift?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {log.is_pricework || isLogLocked ? (
//                                                                 <Box sx={{
//                                                                     display: 'flex',
//                                                                     alignItems: 'center',
//                                                                     justifyContent: 'center',
//                                                                     opacity: isLogLocked ? 0.6 : 1
//                                                                 }}>
//                                                                     {log.shift_name || '--'}
//                                                                 </Box>
//                                                             ) : (
//                                                                 renderEditableShiftCell(worklogId, log.shift_id, log.shift_name, log)
//                                                             )}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.start?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {log.is_pricework || isLogLocked ? (
//                                                                 <Box sx={{
//                                                                     display: 'flex',
//                                                                     alignItems: 'center',
//                                                                     justifyContent: 'center',
//                                                                     opacity: isLogLocked ? 0.6 : 1
//                                                                 }}>
//                                                                     {sanitizeDateTime(log.start)}
//                                                                 </Box>
//                                                             ) : (
//                                                                 renderEditableTimeCell(worklogId, 'start', log.start, log)
//                                                             )}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.end?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {log.is_pricework || isLogLocked ? (
//                                                                 <Box sx={{
//                                                                     display: 'flex',
//                                                                     alignItems: 'center',
//                                                                     justifyContent: 'center',
//                                                                     opacity: isLogLocked ? 0.6 : 1
//                                                                 }}>
//                                                                     {sanitizeDateTime(log.end)}
//                                                                 </Box>
//                                                             ) : (
//                                                                 renderEditableTimeCell(worklogId, 'end', log.end, log)
//                                                             )}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.totalHours?.visible && (
//                                                         <TableCell
//                                                             align="center"
//                                                             sx={{
//                                                                 py: 0.5,
//                                                                 fontSize: '0.875rem',
//                                                                 color: log.is_edited ? '#ff0000' : 'inherit'
//                                                             }}
//                                                         >
//                                                             {log.is_pricework ? '--' : formatHour(log.total_hours)}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {visibleColumnConfigs.priceWorkAmount?.visible && (
//                                                         <TableCell align="center" sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {`${currency}${log.pricework_amount || 0}`}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {isFirstRow && visibleColumnConfigs.dailyTotal?.visible && (
//                                                         <TableCell rowSpan={rowSpan} align="center"
//                                                                    sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {rowData.dailyTotal}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {isFirstRow && visibleColumnConfigs.payableAmount?.visible && (
//                                                         <TableCell rowSpan={rowSpan} align="center"
//                                                                    sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {rowData.payableAmount}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {isFirstRow && visibleColumnConfigs.employeeNotes?.visible && (
//                                                         <TableCell rowSpan={rowSpan} align="center"
//                                                                    sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {rowData.employeeNotes}
//                                                         </TableCell>
//                                                     )}
//
//                                                     {isFirstRow && visibleColumnConfigs.managerNotes?.visible && (
//                                                         <TableCell rowSpan={rowSpan} align="center"
//                                                                    sx={{py: 0.5, fontSize: '0.875rem'}}>
//                                                             {rowData.managerNotes}
//                                                         </TableCell>
//                                                     )}
//                                                 </TableRow>
//
//                                                 {isWorklogExpanded && (
//                                                     <CheckLogRows
//                                                         logs={log.user_checklogs}
//                                                         currency={currency}
//                                                         formatHour={formatHour}
//                                                         visibleColumnConfigs={visibleColumnConfigs}
//                                                         getVisibleCellsLength={6}
//                                                         isMultiRow={true}
//                                                     />
//                                                 )}
//                                             </>
//                                         );
//                                     });
//
//                                     const newSubRows = dateNewRecords.map(([recordKey, newRecord]) => {
//                                         const isSaving = savingNewRecords.has(recordKey);
//
//                                         return (
//                                             <TableRow
//                                                 key={recordKey}
//                                                 sx={{
//                                                     backgroundColor: 'rgba(25, 118, 210, 0.04)',
//                                                     '& td': {textAlign: 'center'},
//                                                 }}
//                                             >
//                                                 {visibleColumnConfigs.exclamation?.visible &&
//                                                     <TableCell align="center" sx={{py: 0.5}}></TableCell>}
//                                                 {visibleColumnConfigs.expander?.visible &&
//                                                     <TableCell align="center" sx={{py: 0.5}}></TableCell>}
//                                                 {visibleColumnConfigs.project?.visible && (
//                                                     <TableCell align="center"
//                                                                sx={{py: 0.5, fontSize: '0.875rem'}}>--</TableCell>
//                                                 )}
//
//                                                 {visibleColumnConfigs.shift?.visible && (
//                                                     <TableCell
//                                                         align="center"
//                                                         sx={{
//                                                             py: 0.5,
//                                                             display: 'flex',
//                                                             alignItems: 'center',
//                                                             justifyContent: 'center',
//                                                             width: '100%',
//                                                             minHeight: '45px',
//                                                         }}
//                                                     >
//                                                         <FormControl
//                                                             size="small"
//                                                             sx={{minWidth: '100px', width: '100%', maxWidth: '100px'}}
//                                                         >
//                                                             <Select
//                                                                 value={newRecord.shift_id}
//                                                                 onChange={(e) => updateNewRecord(recordKey, 'shift_id', e.target.value)}
//                                                                 disabled={isSaving}
//                                                                 displayEmpty
//                                                                 sx={{
//                                                                     height: '32px',
//                                                                     '& .MuiSelect-select': {
//                                                                         fontSize: '0.875rem',
//                                                                         py: '6px',
//                                                                         px: '8px',
//                                                                         textAlign: 'center',
//                                                                     },
//                                                                     '& .MuiOutlinedInput-notchedOutline': {
//                                                                         borderColor: '#e0e0e0',
//                                                                     },
//                                                                 }}
//                                                             >
//                                                                 <MenuItem value="">Select Shift</MenuItem>
//                                                                 {shifts.map((shift) => (
//                                                                     <MenuItem key={shift.id} value={shift.id}>
//                                                                         {shift.name}
//                                                                     </MenuItem>
//                                                                 ))}
//                                                             </Select>
//                                                         </FormControl>
//                                                     </TableCell>
//                                                 )}
//
//                                                 {visibleColumnConfigs.start?.visible && (
//                                                     <TableCell align="center" sx={{py: 0.5}}>
//                                                         <TextField
//                                                             type="text"
//                                                             value={newRecord.start}
//                                                             placeholder="HH:MM"
//                                                             variant="outlined"
//                                                             size="small"
//                                                             onChange={(e) => {
//                                                                 const raw = e.target.value.replace(/[^\d:]/g, '');
//                                                                 updateNewRecord(recordKey, 'start', raw);
//                                                             }}
//                                                             onBlur={() => {
//                                                                 const formattedTime = validateAndFormatTime(newRecord.start);
//                                                                 updateNewRecord(recordKey, 'start', formattedTime);
//                                                             }}
//                                                             disabled={isSaving}
//                                                             sx={{
//                                                                 width: '70px',
//                                                                 '& .MuiInputBase-input': {
//                                                                     fontSize: '0.875rem',
//                                                                     textAlign: 'center',
//                                                                 },
//                                                             }}
//                                                         />
//                                                     </TableCell>
//                                                 )}
//
//                                                 {visibleColumnConfigs.end?.visible && (
//                                                     <TableCell align="center" sx={{py: 0.5}}>
//                                                         <TextField
//                                                             type="text"
//                                                             value={newRecord.end}
//                                                             placeholder="HH:MM"
//                                                             variant="outlined"
//                                                             size="small"
//                                                             onChange={(e) => {
//                                                                 const raw = e.target.value.replace(/[^\d:]/g, '');
//                                                                 updateNewRecord(recordKey, 'end', raw);
//                                                             }}
//                                                             onBlur={() => {
//                                                                 const formattedTime = validateAndFormatTime(newRecord.end);
//                                                                 updateNewRecord(recordKey, 'end', formattedTime);
//                                                             }}
//                                                             disabled={isSaving}
//                                                             sx={{
//                                                                 width: '70px',
//                                                                 '& .MuiInputBase-input': {
//                                                                     fontSize: '0.875rem',
//                                                                     textAlign: 'center',
//                                                                 },
//                                                             }}
//                                                         />
//                                                     </TableCell>
//                                                 )}
//
//                                                 {visibleColumnConfigs.totalHours?.visible && (
//                                                     <TableCell align="center" sx={{py: 0.5}}>
//                                                         <Stack direction="row" justifyContent="center" spacing={1}
//                                                                alignItems="center">
//                                                             <Button
//                                                                 size="small"
//                                                                 variant="contained"
//                                                                 color="primary"
//                                                                 onClick={() => saveNewRecord(recordKey)}
//                                                                 disabled={isSaving || !newRecord.shift_id || !newRecord.start || !newRecord.end}
//                                                                 sx={{
//                                                                     textTransform: 'none',
//                                                                     fontSize: '0.75rem',
//                                                                     minWidth: '60px'
//                                                                 }}
//                                                             >
//                                                                 {isSaving ? 'Saving...' : 'Save'}
//                                                             </Button>
//                                                         </Stack>
//                                                     </TableCell>
//                                                 )}
//
//                                                 {visibleColumnConfigs.priceWorkAmount?.visible && (
//                                                     <TableCell align="center" sx={{py: 0.5}}>
//                                                         <Stack direction="row" justifyContent="center" spacing={1}
//                                                                alignItems="center">
//                                                             <Button
//                                                                 size="small"
//                                                                 variant="outlined"
//                                                                 onClick={() => cancelNewRecord(recordKey)}
//                                                                 disabled={isSaving}
//                                                                 sx={{
//                                                                     textTransform: 'none',
//                                                                     fontSize: '0.75rem',
//                                                                     minWidth: '60px'
//                                                                 }}
//                                                             >
//                                                                 Cancel
//                                                             </Button>
//                                                         </Stack>
//                                                     </TableCell>
//                                                 )}
//                                             </TableRow>
//                                         );
//                                     });
//
//                                     return (
//                                         <React.Fragment key={row.id}>
//                                             {subRows}
//                                             {newSubRows}
//                                         </React.Fragment>
//                                     );
//                                 } else {
//                                     // Single or empty day
//                                     return (
//                                         <React.Fragment key={row.id}>
//                                             <TableRow
//                                                 key={row.id}
//                                                 sx={{
//                                                     backgroundColor: isRecordLocked(row.original)
//                                                         ? 'rgba(244, 67, 54, 0.02)'
//                                                         : 'transparent',
//                                                 }}
//                                             >
//                                                 {row.getVisibleCells().map((cell) => {
//                                                     const {column} = cell;
//                                                     const cellId = `${row.id}-single-${column.id}`;
//
//                                                     const dateNewRecords = Object.entries(newRecords).filter(
//                                                         ([_, rec]) => rec.date === row.original.date
//                                                     );
//                                                     const hasNewRecords = dateNewRecords.length > 0;
//                                                     const isEmptyDay = !hasValidWorklogData(row.original);
//
//                                                     // ---- Date column (with add button) ----
//                                                     if (
//                                                         column.id === 'date' &&
//                                                         row.original.rowType === 'day' &&
//                                                         !row.original.rowsData
//                                                     ) {
//                                                         return (
//                                                             <TableCell
//                                                                 key={cell.id}
//                                                                 sx={{
//                                                                     py: 0.5,
//                                                                     fontSize: '0.875rem',
//                                                                     borderBottom: '1px solid rgba(224, 224, 224, 1)',
//                                                                     textAlign: 'center',
//                                                                     verticalAlign: 'middle',
//                                                                 }}
//                                                             >
//                                                                 <Box
//                                                                     sx={{
//                                                                         display: 'flex',
//                                                                         alignItems: 'center',
//                                                                         justifyContent: 'space-between',
//                                                                     }}
//                                                                 >
//                                                                     <span>{row.original.date}</span>
//                                                                     {!hasNewRecords && (
//                                                                         <IconButton
//                                                                             onClick={() =>
//                                                                                 startAddingNewRecord(row.original.date as string)
//                                                                             }
//                                                                             size="small"
//                                                                             sx={{
//                                                                                 '&:hover': {
//                                                                                     backgroundColor: 'transparent',
//                                                                                 },
//                                                                             }}
//                                                                             title="Add new record"
//                                                                         >
//                                                                             <IconPlus size={16} color="#1976d2"/>
//                                                                         </IconButton>
//                                                                     )}
//                                                                 </Box>
//                                                             </TableCell>
//                                                         );
//                                                     }
//
//                                                     // ---- Inline new record inputs ----
//                                                     if (hasNewRecords && isEmptyDay && dateNewRecords.length === 1) {
//                                                         const [recordKey, newRecord] = dateNewRecords[0];
//                                                         const isSaving = savingNewRecords.has(recordKey);
//
//                                                         if (column.id === 'shift') {
//                                                             return (
//                                                                 <TableCell
//                                                                     key={cell.id}
//                                                                     sx={{
//                                                                         py: 0.5,
//                                                                         textAlign: 'center',
//                                                                         verticalAlign: 'middle'
//                                                                     }}
//                                                                 >
//                                                                     <FormControl
//                                                                         size="small"
//                                                                         sx={{
//                                                                             minWidth: '100px',
//                                                                             width: '100%',
//                                                                             maxWidth: '100px',
//                                                                         }}
//                                                                     >
//                                                                         <Select
//                                                                             value={newRecord.shift_id}
//                                                                             onChange={(e) =>
//                                                                                 updateNewRecord(recordKey, 'shift_id', e.target.value)
//                                                                             }
//                                                                             disabled={isSaving}
//                                                                             displayEmpty
//                                                                             sx={{
//                                                                                 height: '32px',
//                                                                                 '& .MuiSelect-select': {
//                                                                                     fontSize: '0.875rem',
//                                                                                     py: '6px',
//                                                                                     px: '8px',
//                                                                                     textAlign: 'center',
//                                                                                 },
//                                                                                 '& .MuiOutlinedInput-notchedOutline': {
//                                                                                     borderColor: '#e0e0e0',
//                                                                                 },
//                                                                             }}
//                                                                         >
//                                                                             <MenuItem value="">Select Shift</MenuItem>
//                                                                             {shifts.map((shift) => (
//                                                                                 <MenuItem key={shift.id}
//                                                                                           value={shift.id}>
//                                                                                     {shift.name}
//                                                                                 </MenuItem>
//                                                                             ))}
//                                                                         </Select>
//                                                                     </FormControl>
//                                                                 </TableCell>
//                                                             );
//                                                         }
//
//                                                         if (column.id === 'start' || column.id === 'end') {
//                                                             return (
//                                                                 <TableCell
//                                                                     key={cell.id}
//                                                                     sx={{
//                                                                         py: 0.5,
//                                                                         textAlign: 'center',
//                                                                         verticalAlign: 'middle'
//                                                                     }}
//                                                                 >
//                                                                     <TextField
//                                                                         type="text"
//                                                                         value={newRecord[column.id]}
//                                                                         placeholder="HH:MM"
//                                                                         variant="outlined"
//                                                                         size="small"
//                                                                         onChange={(e) => {
//                                                                             const raw = e.target.value.replace(/[^\d:]/g, '');
//                                                                             updateNewRecord(recordKey, 'start', raw);
//                                                                         }}
//                                                                         onBlur={() => {
//                                                                             const formattedTime = validateAndFormatTime(newRecord.start);
//                                                                             updateNewRecord(recordKey, 'start', formattedTime);
//                                                                         }}
//                                                                         disabled={isSaving}
//                                                                         sx={{
//                                                                             width: '70px',
//                                                                             '& .MuiInputBase-input': {
//                                                                                 fontSize: '0.875rem',
//                                                                                 textAlign: 'center',
//                                                                             },
//                                                                         }}
//                                                                     />
//                                                                 </TableCell>
//                                                             );
//                                                         }
//
//                                                         if (column.id === 'totalHours') {
//                                                             return (
//                                                                 <TableCell
//                                                                     key={cell.id}
//                                                                     sx={{
//                                                                         py: 0.5,
//                                                                         textAlign: 'center',
//                                                                         verticalAlign: 'middle'
//                                                                     }}
//                                                                 >
//                                                                     <Button
//                                                                         size="small"
//                                                                         variant="contained"
//                                                                         color="primary"
//                                                                         onClick={() => saveNewRecord(recordKey)}
//                                                                         disabled={
//                                                                             isSaving || !newRecord.shift_id || !newRecord.start || !newRecord.end
//                                                                         }
//                                                                         sx={{
//                                                                             textTransform: 'none',
//                                                                             fontSize: '0.75rem',
//                                                                             minWidth: '60px',
//                                                                         }}
//                                                                     >
//                                                                         {isSaving ? 'Saving...' : 'Save'}
//                                                                     </Button>
//                                                                 </TableCell>
//                                                             );
//                                                         }
//
//                                                         if (column.id === 'priceWorkAmount') {
//                                                             return (
//                                                                 <TableCell
//                                                                     key={cell.id}
//                                                                     sx={{
//                                                                         py: 0.5,
//                                                                         textAlign: 'center',
//                                                                         verticalAlign: 'middle'
//                                                                     }}
//                                                                 >
//                                                                     <Button
//                                                                         size="small"
//                                                                         variant="outlined"
//                                                                         onClick={() => cancelNewRecord(recordKey)}
//                                                                         disabled={isSaving}
//                                                                         sx={{
//                                                                             textTransform: 'none',
//                                                                             fontSize: '0.75rem',
//                                                                             minWidth: '60px',
//                                                                         }}
//                                                                     >
//                                                                         Cancel
//                                                                     </Button>
//                                                                 </TableCell>
//                                                             );
//                                                         }
//
//                                                         if (column.id === 'project') {
//                                                             return (
//                                                                 <TableCell
//                                                                     key={cell.id}
//                                                                     sx={{
//                                                                         py: 0.5,
//                                                                         fontSize: '0.875rem',
//                                                                         textAlign: 'center',
//                                                                         verticalAlign: 'middle',
//                                                                     }}
//                                                                 >
//                                                                     --
//                                                                 </TableCell>
//                                                             );
//                                                         }
//                                                     }
//
//                                                     return (
//                                                         <TableCell
//                                                             key={cell.id}
//                                                             sx={{
//                                                                 py: 0.5,
//                                                                 fontSize: '0.875rem',
//                                                                 borderBottom: '1px solid rgba(224, 224, 224, 1)',
//                                                                 textAlign: 'center',
//                                                                 verticalAlign: 'middle',
//                                                             }}
//                                                         >
//                                                             {flexRender(column.columnDef.cell, cell.getContext())}
//                                                         </TableCell>
//                                                     );
//                                                 })}
//                                             </TableRow>
//
//                                             {row.getIsExpanded() &&
//                                                 row.original.userChecklogs &&
//                                                 row.original.userChecklogs.length > 0 && (
//                                                     <CheckLogRows
//                                                         logs={row.original.userChecklogs || []}
//                                                         currency={currency}
//                                                         formatHour={formatHour}
//                                                         visibleColumnConfigs={visibleColumnConfigs}
//                                                         getVisibleCellsLength={row.getVisibleCells().length}
//                                                     />
//                                                 )}
//                                         </React.Fragment>
//                                     );
//                                 }
//                             })}
//                         </TableBody>
//                     </Table>
//                 </TableContainer>
//             </Box>
//
//             {/* Bottom Action Bar with Lock/Unlock Buttons */}
//             {selectedRows.size > 0 && (
//                 <Box
//                     sx={{
//                         position: 'fixed',
//                         bottom: 20,
//                         left: '50%',
//                         transform: 'translateX(-50%)',
//                         backgroundColor: 'white',
//                         borderRadius: '12px',
//                         boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
//                         px: 3,
//                         py: 1.5,
//                         zIndex: 1000,
//                         minWidth: '400px',
//                         border: '1px solid #e0e0e0',
//                     }}
//                 >
//                     <Stack direction="row" alignItems="center" spacing={2}>
//                         <IconButton
//                             size="small"
//                             onClick={() => setSelectedRows(new Set())}
//                             sx={{
//                                 color: '#666',
//                                 '&:hover': {
//                                     bgcolor: 'grey.100'
//                                 }
//                             }}
//                         >
//                             <IconX size={16}/>
//                         </IconButton>
//
//                         <Typography variant="body2" fontWeight={600} color="text.primary">
//                             {selectedRows.size} Selected
//                         </Typography>
//
//                         <Box sx={{flexGrow: 1}}/>
//
//                         <Stack direction="row" spacing={1.5}>
//                             {(() => {
//                                 const {hasLockedRows, hasUnlockedRows} = getSelectedRowsLockStatus();
//
//                                 return (
//                                     <>
//                                         <Button
//                                             size="small"
//                                             variant="outlined"
//                                             color="success"
//                                             sx={{
//                                                 px: 2.5,
//                                                 textTransform: 'none',
//                                                 fontWeight: 600,
//                                                 borderRadius: '8px',
//                                                 '&:hover': {
//                                                     boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)'
//                                                 }
//                                             }}
//                                             onClick={handleLockClick}
//                                             disabled={!hasUnlockedRows}
//                                         >
//                                             <IconLock size={16}/>
//                                             <Typography variant="caption" sx={{ml: 0.5, fontWeight: 600}}>
//                                                 Lock
//                                             </Typography>
//                                         </Button>
//
//                                         <Button
//                                             size="small"
//                                             variant="outlined"
//                                             color="error"
//                                             sx={{
//                                                 px: 2.5,
//                                                 textTransform: 'none',
//                                                 fontWeight: 600,
//                                                 borderRadius: '8px',
//                                                 '&:hover': {
//                                                     boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)'
//                                                 }
//                                             }}
//                                             onClick={handleUnlockClick}
//                                             disabled={!hasLockedRows}
//                                         >
//                                             <IconLockOpen size={16}/>
//                                             <Typography variant="caption" sx={{ml: 0.5, fontWeight: 600}}>
//                                                 Unlock
//                                             </Typography>
//                                         </Button>
//                                     </>
//                                 );
//                             })()}
//                         </Stack>
//                     </Stack>
//                 </Box>
//             )}
//
//             <Drawer
//                 anchor="right"
//                 open={conflictSidebar}
//                 onClose={closeConflictSidebar}
//                 PaperProps={{
//                     sx: {
//                         borderRadius: 0,
//                         boxShadow: 'none',
//                         overflow: 'hidden',
//                         width: '504px',
//                         borderTopLeftRadius: 18,
//                         borderBottomLeftRadius: 18,
//                     },
//                 }}
//             >
//                 <Conflicts
//                     conflictDetails={conflictDetails}
//                     totalConflicts={totalConflicts}
//                     onClose={closeConflictSidebar}
//                     fetchTimeClockData={() => fetchTimeClockData(startDate || defaultStart, endDate || defaultEnd)}
//                     startDate={startDate ? format(startDate, 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd')}
//                     endDate={endDate ? format(endDate, 'yyyy-MM-dd') : format(defaultEnd, 'yyyy-MM-dd')}
//                 />
//             </Drawer>
//
//             <Drawer
//                 anchor="bottom"
//                 open={requestListOpen}
//                 onClose={closeRequestList}
//                 PaperProps={{
//                     sx: {
//                         borderRadius: 0,
//                         height: '90vh',
//                         boxShadow: 'none',
//                         borderTopLeftRadius: 12,
//                         borderTopRightRadius: 12,
//                         overflow: 'hidden',
//                     },
//                 }}
//             >
//                 <RequestDetails
//                     open={requestListOpen}
//                     timeClock={timeClock}
//                     user_id={user_id}
//                     currency={currency}
//                     allUsers={allUsers}
//                     onClose={closeRequestList}
//                     onUserChange={onUserChange}
//                 />
//             </Drawer>
//         </Box>
//     );
// };
//
// export default TimeClockDetails;
