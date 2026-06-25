import React, { useMemo, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Stack,
    Typography,
    IconButton,
    Button,
    TextField,
    MenuItem,
    FormControl,
    Select,
    Tooltip,
    Popover,
    Chip,
    CircularProgress
} from '@mui/material';
import { flexRender } from '@tanstack/react-table';
import {
    IconExclamationMark,
    IconExclamationCircle,
    IconPlus,
    IconTrash,
    IconSun,
    IconPointFilled,
    IconBrandAndroid,
    IconBrandApple,
    IconWorld,
} from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import EditableTimeCell from './EditableTimeCell';
import EditableShiftCell from './EditableShiftCell';
import EditableProjectCell from './EditableProjectCell';
import EditableAdjustmentCell from './EditableAdjustmentCell';
import NewRecordRow from './NewRecordRow';
import {
    DailyBreakdown,
    EditingWorklog,
    NewRecord,
    Shift,
    Project,
    RecordType
} from '@/app/components/apps/time-clock/types/timeClock';
import LocationMapDrawer from './LocationMapDrawer';

interface LocationDrawerState {
    open: boolean;
    worklogId: number | undefined;
}

interface TimeClockTableProps {
    table: any;
    dailyData: DailyBreakdown[];
    currency: string;
    selectedRows: Set<string>;
    expandedWorklogsIds: string[];
    newRecords: { [key: string]: NewRecord };
    savingNewRecords: Set<string>;
    shifts: Shift[];
    editingWorklogs: { [key: string]: EditingWorklog };
    savingWorklogs: Set<string>;
    editingShifts: { [key: string]: { shift_id: number | string; editingField: 'shift' } };
    formatHour: (val: string | number | null | undefined, isPricework?: boolean) => string;
    sanitizeDateTime: (dateTime: string) => string;
    validateAndFormatTime: (value: string) => string;
    hasValidWorklogData: (row: DailyBreakdown) => boolean;
    isRecordLocked: (log: any) => boolean;
    handleRowSelect: (rowId: string, checked: boolean) => void;
    handlePendingRequest: () => void;
    handleWorklogToggle: (worklogId: string) => void;
    startAddingNewRecord: (date: string, projects: any, shifts: any) => void;
    startEditingField: (worklogId: string, field: 'start' | 'end', log: any) => void;
    startEditingShift: (worklogId: string, currentShiftId: number | string, log: any) => void;
    updateEditingField: (worklogId: string, field: keyof EditingWorklog, value: string) => void;
    updateEditingShift: (worklogId: string, shiftId: number | string) => void;
    updateNewRecord: (recordKey: string, field: keyof NewRecord, value: string | number) => void;
    cancelEditingField: (worklogId: string) => void;
    cancelEditingShift: (worklogId: string) => void;
    saveFieldChanges: (worklogId: string, originalLog: any) => void;
    saveShiftChanges: (worklogId: string, originalLog: any) => void;
    saveNewRecord: (recordKey: string) => void;
    cancelNewRecord: (recordKey: string) => void;
    projects: Project[];
    editingProjects: { [key: string]: { project_id: number | string; editingField: 'project' } };
    startEditingProject: (worklogId: string, currentShiftId: number | string, log: any) => void;
    updateEditingProject: (worklogId: string, shiftId: number | string) => void;
    saveProjectChanges: (worklogId: string, originalLog: any) => void;
    cancelEditingProject: (worklogId: string) => void;
    onDeleteClick: (id: string, type: RecordType) => void;
    conflictsByDate?: { [key: string]: number };
    openConflictsSideBar?: () => Promise<void>;
    openChecklogsSidebar?: (worklogId: number) => Promise<void>;
    openExpensesSidebar?: (expenseId: number) => Promise<void>;
    openPenaltiesSidebar?: (worklogId: number) => Promise<void>;
    leaveRequestCount: number;
    penaltyAppealCount: number;
    penaltyAppealByDate?: { [key: string]: number };
    openLeaveRequestsSideBar?: () => Promise<void>;
    onAdjustmentSave?: (date: string, amount: number) => Promise<void>;
}

const TimeClockTable: React.FC<TimeClockTableProps> = ({
                                                           table,
                                                           dailyData,
                                                           currency,
                                                           selectedRows,
                                                           expandedWorklogsIds,
                                                           newRecords,
                                                           savingNewRecords,
                                                           shifts,
                                                           editingWorklogs,
                                                           savingWorklogs,
                                                           editingShifts,
                                                           formatHour,
                                                           sanitizeDateTime,
                                                           validateAndFormatTime,
                                                           hasValidWorklogData,
                                                           isRecordLocked,
                                                           handleRowSelect,
                                                           handlePendingRequest,
                                                           handleWorklogToggle,
                                                           startAddingNewRecord,
                                                           startEditingField,
                                                           startEditingShift,
                                                           updateEditingField,
                                                           updateEditingShift,
                                                           updateNewRecord,
                                                           cancelEditingField,
                                                           cancelEditingShift,
                                                           saveFieldChanges,
                                                           saveShiftChanges,
                                                           saveNewRecord,
                                                           cancelNewRecord,
                                                           projects,
                                                           editingProjects,
                                                           startEditingProject,
                                                           updateEditingProject,
                                                           saveProjectChanges,
                                                           cancelEditingProject,
                                                           onDeleteClick,
                                                           conflictsByDate = {},
                                                           openConflictsSideBar,
                                                           openChecklogsSidebar,
                                                           openExpensesSidebar,
                                                           openPenaltiesSidebar,
                                                           leaveRequestCount,
                                                           openLeaveRequestsSideBar,
                                                           onAdjustmentSave
                                                       }) => {
    const [conflictAnchorEl, setConflictAnchorEl] = useState<HTMLElement | null>(null);
    const [exclamationAnchorEl, setExclamationAnchorEl] = useState<HTMLElement | null>(null);
    const [selectedWorklog, setSelectedWorklog] = useState<any>(null);

    const [locationDrawer, setLocationDrawer] = useState<LocationDrawerState>({
        open: false,
        worklogId: undefined,
    });
    
    const getVisibleColumnConfigs = () => {
        const visibleColumns = table.getVisibleLeafColumns();
        const configs: { [key: string]: { width: number; visible: boolean } } = {};

        table.getAllLeafColumns().forEach((col: any) => {
            const isVisible = visibleColumns.some((visCol: any) => visCol.id === col.id);
            configs[col.id] = {
                width: col.columnDef.size || 100,
                visible: isVisible,
            };
        });

        return configs;
    };

    const visibleColumnConfigs = getVisibleColumnConfigs();

    const conflictDaysCount = useMemo(() => {
        return Object.keys(conflictsByDate).filter(date => conflictsByDate[date] > 0).length;
    }, [conflictsByDate]);

    const hasAnyConflictOrLeave = useMemo(() => {
        if (conflictDaysCount > 0) return true;
        return dailyData.some(row => row.rowType === 'day' && (row as any).has_pending_leave_request === true);
    }, [conflictDaysCount, dailyData]);

    const hasAnyExclamation = useMemo(() => {
        return dailyData.some(row => {
            if (row.rowType !== 'day') return false;
            const rowsData = (row as any).rowsData;
            if (Array.isArray(rowsData)) {
                return rowsData.some((log: any) => log.is_requested || log.is_penalty_appealed);
            }
            return (row as any).is_requested;
        });
    }, [dailyData]);

    const handleConflicts = () => {
        setConflictAnchorEl(null);
        openConflictsSideBar?.();
    };

    const handleRequests = () => {
        setConflictAnchorEl(null);
        openLeaveRequestsSideBar?.();
    };

    const handleLocationPinClick = async (worklogId: number) => {
        setLocationDrawer(prev => ({
            open: true,
            worklogId,
        }));
    };

    const closeLocationDrawer = () => {
        setLocationDrawer({
            open: false,
            worklogId: undefined,
        });
    };

    const isNewRecordValid = (newRecord: NewRecord) => {
        return (
            !!newRecord.shift_id &&
            !!newRecord.start &&
            !!newRecord.end &&
            validateAndFormatTime(newRecord.start) !== '' &&
            validateAndFormatTime(newRecord.end) !== ''
        );
    };

    const getTruncatedName = (name: string) => {
        if (!name || name == '--') return '--';
        const firstWord = name.trim().split(' ')[0];
        return firstWord.length > 10 ? firstWord.slice(0, 3) + '.' : firstWord + '.';
    };

    const getDeviceInfo = (type: number | null): {label: string; icon: React.ReactElement} => {
        switch (Number(type)) {
            case 1:
                return {label: 'Android', icon: (<IconBrandAndroid size={18} color="#4CAF50" stroke={1.8}/>),};
            case 2:
                return {label: 'iOS', icon: (<IconBrandApple size={18} color="#000" stroke={1.8}/>),};
            case 3:
                return {label: 'Web', icon: (<IconWorld size={18} color="#1976d2" stroke={1.8}/>),};
            case 4:
                return {label: 'Cron', icon: (<IconWorld size={18} color="#1976d2" stroke={1.8}/>),};
            default:
                return {label: '--', icon: (<IconWorld size={18} color="#999" stroke={1.8}/>),};
        }
    };

    const DeviceTooltipContent = ({log, isStartTime,}: { log: any; isStartTime: boolean; }) => {
        const deviceType = isStartTime ? log.start_device_type : log.end_device_type;
        const deviceModel = isStartTime ? log.start_device_model_type : log.end_device_model_type;
        const timeText = isStartTime ? log.start : log.end;
        const label = isStartTime ? 'Clock-in' : 'Clock-out';
        const deviceInfo = deviceType != null ? getDeviceInfo(deviceType) : null;

        return (
            <Box sx={{p: 0.5}} >

                {deviceType != null && (
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8,}}>
                        {deviceInfo != null && deviceInfo.icon}
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#666',
                                fontSize: '0.825rem',
                                fontWeight: 500,
                            }}
                        >
                            {deviceInfo != null && deviceInfo.label}
                        </Typography>
                    </Box>
                )}
                {deviceModel && (
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.8, mb: 1,}}>
                        <IconWorld size={16} color="#888" stroke={1.8}/>
                        <Typography variant="body2" sx={{
                            color: '#666',
                            fontSize: '0.825rem',
                        }}>
                            {deviceModel}
                        </Typography>
                    </Box>
                )}

                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.8,}}>
                    <Chip label={label} size="small" sx={{
                        backgroundColor: '#5b9ef5',
                        color: '#fff',
                        fontWeight: 500,
                        height: '24px',
                        fontSize: '0.75rem',
                        textTransform: 'capitalize',
                        '& .MuiChip-label': {px: 1,},
                    }}/>
                    <Typography variant="caption" sx={{
                        color: '#999',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                    }}>
                        {sanitizeDateTime(timeText)}
                    </Typography>
                </Box>
            </Box>
        );
    };

    const renderLocationPin = (log: any, isStartTime: boolean) => {
        const hasLocation = isStartTime
            ? (log.start_latitude || log.start_longitude)
            : (log.end_latitude || log.end_longitude);

        const deviceType = isStartTime ? log.start_device_type : log.end_device_type;
        const deviceInfo = getDeviceInfo(deviceType);

        if (!hasLocation) return null;

        if (deviceType == null) {
            return (
                <Tooltip
                    title={`View clock-${isStartTime ? 'in' : 'out'} location`}
                    arrow
                    placement="top"
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            '&:hover': {
                                opacity: 0.7,
                            }
                        }}
                        onClick={() => handleLocationPinClick(Number(log.worklog_id))}
                    >
                        {deviceInfo.icon}
                    </Box>
                </Tooltip>
            );
        }

        return (
            <Tooltip
                title={
                    <DeviceTooltipContent
                        log={log}
                        isStartTime={isStartTime}
                    />
                }
                arrow
                placement="top"
                slotProps={{
                    tooltip: {
                        sx: {
                            backgroundColor: '#fff',
                            color: '#333',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            p: 1,
                        },
                    },
                    arrow: {
                        sx: {
                            color: '#fff',
                        },
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                            opacity: 0.7,
                        },
                    }}
                    onClick={() => handleLocationPinClick(Number(log.worklog_id))}
                >
                    {deviceInfo.icon}
                </Box>
            </Tooltip>
        );
    };
    
    return (
        <Box sx={{
            flex: 1,
            overflow: 'auto',
            paddingBottom: selectedRows.size > 0 ? '80px' : '0px',
            maxHeight: 'calc(100vh - 250px)',
            position: 'relative'
        }}>
            <TableContainer sx={{
                height: '100%',
                overflow: 'auto',
            }}>
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', paddingBottom: '2rem' }}>
                    <TableHead>
                        {table.getHeaderGroups().map((hg: any) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((header: any) => (
                                    <TableCell
                                        key={header.id}
                                        sx={{
                                            backgroundColor: '#f6f7f7',
                                            fontSize: '0.875rem',
                                            position: 'sticky',
                                            top: 0,
                                            width: header.id === 'conflicts'
                                                ? (hasAnyConflictOrLeave ? `${header.column.columnDef.size}px` : '0px')
                                                : header.id === 'exclamation'
                                                    ? (hasAnyExclamation ? `${header.column.columnDef.size}px` : '0px')
                                                    : `${header.column.columnDef.size}px`,
                                            minWidth: header.id === 'conflicts'
                                                ? (hasAnyConflictOrLeave ? `${header.column.columnDef.size || 100}px` : '0px')
                                                : header.id === 'exclamation'
                                                    ? (hasAnyExclamation ? `${header.column.columnDef.size || 100}px` : '0px')
                                                    : `${header.column.columnDef.size || 100}px`,
                                            maxWidth: header.id === 'conflicts'
                                                ? (hasAnyConflictOrLeave ? `${header.column.columnDef.size || 100}px` : '0px')
                                                : header.id === 'exclamation'
                                                    ? (hasAnyExclamation ? `${header.column.columnDef.size || 100}px` : '0px')
                                                    : `${header.column.columnDef.size || 100}px`,
                                            overflow: 'hidden',
                                            padding: (header.id === 'conflicts' && !hasAnyConflictOrLeave) || (header.id === 'exclamation' && !hasAnyExclamation) ? 0 : undefined,
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            p: 1
                                        }}
                                    >
                                        {header.id === 'conflicts' ? (
                                            conflictDaysCount > 0 ? (
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    sx={{
                                                        color: '#fff',
                                                        backgroundColor: '#fc4b6c',
                                                        borderRadius: '50%',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        minWidth: '24px',
                                                        minHeight: '24px',
                                                        padding: '4px',
                                                        aspectRatio: '1/1',
                                                    }}
                                                >
                                                    {conflictDaysCount}
                                                </Typography>
                                            ) : null
                                        ) : (
                                            <Typography sx={{ color: '#203040' }}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </Typography>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>

                    <TableBody
                        sx={{
                            '& tr:last-child > td': {
                                borderBottom: '1px solid rgba(224, 224, 224, 1) !important',
                            },
                            '& tr:last-child > th': {
                                borderBottom: '1px solid rgba(224, 224, 224, 1) !important',
                            }
                        }}
                    >
                        {table.getRowModel().rows.map((row: any) => {
                            const rowData = row.original;
                            const rowId = `row-${row.index}`;
                            const isRowSelected = selectedRows.has(rowId);
                            const isRowLocked = isRecordLocked(rowData);

                            if (rowData.rowType === 'week') {
                                const visibleColumnsCount = table.getVisibleLeafColumns().length;
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell
                                            colSpan={visibleColumnsCount}
                                            sx={{
                                                backgroundColor: '#f0f1f2',
                                                fontWeight: 600,
                                                textAlign: 'center',
                                                color: '#8b939c'
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" sx={{ width: '100%', position: 'relative' }}>
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
                                                    Week Total: {rowData.weeklyTotalHours} ({rowData.weeklyPayableAmount})
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            const dateNewRecords = Object.entries(newRecords).filter(
                                ([_, rec]) => rec.date === rowData.date
                            );
                            const hasRecords = hasValidWorklogData(rowData) || dateNewRecords.length > 0;

                            const hasConflicts = conflictsByDate && conflictsByDate[rowData.date] > 0;
                            const hasLeaveRequests = rowData.has_pending_leave_request === true;

                            // Day rows with multiple worklogs
                            if (row.original.rowsData) {
                                const worklogIds = row.original.rowsData.map((log: any) => log.worklog_id);
                                const expandedWorklogsCount = expandedWorklogsIds.filter((id) =>
                                    worklogIds.includes(id)
                                ).length;

                                const rowSpan = row.original.rowsData.length + expandedWorklogsCount + dateNewRecords.length;

                                const subRows = row.original.rowsData.map((log: any, index: number) => {
                                    const worklogId = log.is_expense ? `${row.id}-expense-${log.expense_id}-${index}` : log.is_leave ? `${row.id}-leave-${log.user_leave_id}-${index}` : `${row.id}-worklog-${log.worklog_id}`;
                                    const isFirstRow = index === 0;
                                    const isLogLocked = isRecordLocked(log) || log.is_timesheet_locked === true;

                                    return (
                                        <React.Fragment key={worklogId}>
                                            <TableRow
                                                sx={{
                                                    height: '45px',
                                                    minHeight: '45px',
                                                    maxHeight: '45px',
                                                    '& td': {
                                                        textAlign: 'center',
                                                        verticalAlign: 'middle',
                                                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important',
                                                    },
                                                    backgroundColor: isLogLocked ? 'rgba(244, 67, 54, 0.02)' : 'transparent',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        backgroundColor: '#f4433605',
                                                    },
                                                    '&:hover .select-icon': {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    },
                                                    '&:hover .plus-icon': {
                                                        display: isLogLocked ? 'none' : 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    },
                                                    '&:hover .action-icon': {
                                                        display: 'flex !important',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: 0,
                                                    },
                                                }}
                                            >
                                                {/* Select Column */}
                                                {isFirstRow && visibleColumnConfigs.select?.visible && (
                                                    <TableCell
                                                        rowSpan={rowSpan}
                                                        align="center"
                                                        className="rowspan-cell"
                                                        sx={{
                                                            width: `${visibleColumnConfigs.select.width}px`,
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        <Box className="select-icon" sx={{
                                                            height: '100%',
                                                            display: isRowSelected ? 'flex' : 'none',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <CustomCheckbox
                                                                checked={isRowSelected}
                                                                onChange={(e) => handleRowSelect(`row-${row.index}`, e.target.checked)}
                                                            />
                                                        </Box>
                                                    </TableCell>
                                                )}

                                                {/* Date Column */}
                                                {isFirstRow && visibleColumnConfigs.date?.visible && (
                                                    <TableCell
                                                        rowSpan={rowSpan}
                                                        align="center"
                                                        className="rowspan-cell"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            width: `auto`,
                                                        }}
                                                    >
                                                        <Box sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '100%',
                                                            position: 'relative',
                                                            gap: 10
                                                        }}>
                                                            <Typography variant="h6" sx={{ textAlign: 'center' }}>{rowData.date}</Typography>
                                                            {!isLogLocked && !hasRecords && (
                                                                <Box className="plus-icon" sx={{
                                                                    display: 'none',
                                                                    height: '100%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    position: 'absolute',
                                                                    right: '2px',
                                                                }}>
                                                                    <IconButton
                                                                        onClick={() => startAddingNewRecord(rowData.date as string, projects as any, shifts as any)}
                                                                        size="small"
                                                                        sx={{
                                                                            padding: 0,
                                                                            minWidth: 'auto',
                                                                            minHeight: 'auto',
                                                                            width: '24px',
                                                                            height: '24px',
                                                                            '&:hover': { backgroundColor: 'transparent' }
                                                                        }}
                                                                        title="Add new record"
                                                                    >
                                                                        <IconPlus size={16} color="#1976d2"/>
                                                                    </IconButton>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                )}

                                                {/* Conflicts Column */}
                                                {isFirstRow && visibleColumnConfigs.conflicts?.visible && (
                                                    <TableCell
                                                        rowSpan={rowSpan}
                                                        align="center"
                                                        className="rowspan-cell"
                                                        sx={{
                                                            py: 0.5,
                                                            px: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            width: `${visibleColumnConfigs.conflicts.width}px`,
                                                        }}
                                                    >
                                                        {(hasLeaveRequests || hasConflicts) && (
                                                            <Tooltip
                                                                title={`${conflictDaysCount + leaveRequestCount} Issue${conflictDaysCount + leaveRequestCount !== 1 ? 's' : ''}`}
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    aria-label={`${conflictDaysCount + leaveRequestCount} scheduling conflict${conflictDaysCount + leaveRequestCount !== 1 ? 's' : ''}`}
                                                                    onClick={(e) => setConflictAnchorEl(e.currentTarget)}
                                                                    sx={{
                                                                        p: 0,
                                                                        '&:hover': {
                                                                            backgroundColor: 'error.light',
                                                                            color: 'error.dark',
                                                                            opacity: 0.9
                                                                        }
                                                                    }}
                                                                >
                                                                    <IconExclamationCircle size={20}/>
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.exclamation?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {log.is_requested || log.is_penalty_appealed ? (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={(e) => {
                                                                    setExclamationAnchorEl(e.currentTarget);
                                                                    setSelectedWorklog(log);
                                                                }}
                                                                aria-label="error"
                                                                sx={{
                                                                    '&:hover': {
                                                                        backgroundColor: 'transparent',
                                                                        color: '#fc4b6c'
                                                                    }
                                                                }}
                                                            >
                                                                <IconExclamationMark size={18}/>
                                                            </IconButton>
                                                        ) : null}
                                                    </TableCell>
                                                )}

                                                {/* Project Column */}
                                                {visibleColumnConfigs.project?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {log.is_leave ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isLogLocked ? 0.6 : 1,
                                                            }}>
                                                                --
                                                            </Box>
                                                        ) : log.is_expense ? (
                                                            <Tooltip title={log.project_name || ''} arrow placement="top">
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    opacity: 0.6,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'clip',
                                                                    maxWidth: '100%',
                                                                }}>
                                                                    {getTruncatedName(log.project_name)}
                                                                </Box>
                                                            </Tooltip>
                                                        ) : (
                                                            isLogLocked ? (
                                                                <Tooltip title={log.project_name || ''} arrow placement="top">
                                                                    <Box sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        opacity: 0.6,
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'clip',
                                                                        maxWidth: '100%',
                                                                        px: 1
                                                                    }}>
                                                                        {getTruncatedName(log.project_name)}
                                                                    </Box>
                                                                </Tooltip>
                                                            ) : (
                                                                <EditableProjectCell
                                                                    worklogId={worklogId}
                                                                    currentProjectId={log.project_id}
                                                                    currentProjectName={log.project_name}
                                                                    log={log}
                                                                    projects={projects}
                                                                    editingProjects={editingProjects}
                                                                    savingWorklogs={savingWorklogs}
                                                                    startEditingProject={startEditingProject}
                                                                    updateEditingProject={updateEditingProject}
                                                                    saveProjectChanges={saveProjectChanges}
                                                                    cancelEditingProject={cancelEditingProject}
                                                                />
                                                            )
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* Shift Column */}
                                                {visibleColumnConfigs.shift?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {log.is_leave ? (
                                                            <Tooltip title={log.leave_name || ''} arrow placement="top">
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <IconSun size={18} color='#32bf90' />
                                                                    <Box sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        opacity: isLogLocked ? 0.6 : 1,
                                                                        textTransform: 'capitalize',
                                                                        marginLeft: '4px',
                                                                        color: '#32bf90'
                                                                    }}>
                                                                        {getTruncatedName(log.leave_name)}
                                                                    </Box>
                                                                </Box>
                                                            </Tooltip>
                                                        ) : log.is_expense ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 0.6,
                                                            }}>
                                                                {getTruncatedName(log.shift_name)}
                                                            </Box>
                                                        ) : log.is_pricework ? (
                                                            <Tooltip
                                                                title="Pricework type record cannot be edited"
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    opacity: isLogLocked ? 0.6 : 1,
                                                                    cursor: 'not-allowed',
                                                                    minHeight: '32px',
                                                                    py: 0.5,
                                                                    fontSize: '0.875rem',
                                                                    borderRadius: '4px',
                                                                    px: '8px',
                                                                }}>
                                                                    {getTruncatedName(log.shift_name)}
                                                                </Box>
                                                            </Tooltip>
                                                        ) : isLogLocked ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 0.6,
                                                                cursor: 'not-allowed',
                                                                minHeight: '32px',
                                                                py: 0.5,
                                                                fontSize: '0.875rem',
                                                            }}>
                                                                {getTruncatedName(log.shift_name)}
                                                            </Box>
                                                        ) : (
                                                            <EditableShiftCell
                                                                worklogId={worklogId}
                                                                currentShiftId={log.shift_id}
                                                                currentShiftName={log.shift_name}
                                                                log={log}
                                                                shifts={shifts}
                                                                editingShifts={editingShifts}
                                                                savingWorklogs={savingWorklogs}
                                                                startEditingShift={startEditingShift}
                                                                updateEditingShift={updateEditingShift}
                                                                saveShiftChanges={saveShiftChanges}
                                                                cancelEditingShift={cancelEditingShift}
                                                            />
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* Start Time Column */}
                                                {visibleColumnConfigs.start?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {log.is_leave || log.is_pricework || log.is_expense ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 1,
                                                            }}>
                                                                {sanitizeDateTime(log.start)}
                                                            </Box>
                                                        ) : (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.5
                                                            }}>
                                                                <EditableTimeCell
                                                                    worklogId={worklogId}
                                                                    field="start"
                                                                    currentValue={log.start}
                                                                    log={log}
                                                                    editingWorklogs={editingWorklogs}
                                                                    savingWorklogs={savingWorklogs}
                                                                    sanitizeDateTime={sanitizeDateTime}
                                                                    validateAndFormatTime={validateAndFormatTime}
                                                                    updateEditingField={updateEditingField}
                                                                    startEditingField={startEditingField}
                                                                    cancelEditingField={cancelEditingField}
                                                                    saveFieldChanges={saveFieldChanges}
                                                                />

                                                                {renderLocationPin(log, true)}
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                )}
                                                
                                                {/* Break Time Column */}
                                                {visibleColumnConfigs.break?.visible && (
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    {log.is_leave || log.is_expense ? '--' : (log.total_break_hours ? formatHour(log.total_break_hours) : '--')}
                                                </TableCell>
                                                )}

                                                {/* End Time Column */}
                                                {visibleColumnConfigs.end?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {log.is_leave || log.is_pricework || log.is_expense ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 1,
                                                            }}>
                                                                {sanitizeDateTime(log.end)}
                                                            </Box>
                                                        ) : (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.5
                                                            }}>
                                                                <EditableTimeCell
                                                                    worklogId={worklogId}
                                                                    field="end"
                                                                    currentValue={log.end}
                                                                    log={log}
                                                                    editingWorklogs={editingWorklogs}
                                                                    savingWorklogs={savingWorklogs}
                                                                    sanitizeDateTime={sanitizeDateTime}
                                                                    validateAndFormatTime={validateAndFormatTime}
                                                                    updateEditingField={updateEditingField}
                                                                    startEditingField={startEditingField}
                                                                    cancelEditingField={cancelEditingField}
                                                                    saveFieldChanges={saveFieldChanges}
                                                                />
                                                                {renderLocationPin(log, false)}
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* Total Hours Column */}
                                                {visibleColumnConfigs.totalHours?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            color: (log.isMoreThanWork || log.isLessThanWork) ? '#1976d2' : (log.is_added || log.is_edited ? '#ff0000' : 'inherit')
                                                        }}
                                                    >
                                                        {log.is_leave ? (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    opacity: isLogLocked ? 0.6 : 1,
                                                                    textTransform: 'capitalize',
                                                                    marginLeft: '4px',
                                                                    color: '#32bf90'
                                                                }}
                                                            >
                                                                {formatHour(log?.total_hours ?? 0)} ({log?.leave_type ?? ''})
                                                            </Box>
                                                        ) : (
                                                            log.is_pricework ? '--' : formatHour(log?.total_hours ?? 0)
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* Penalty Hours Column */}
                                                {visibleColumnConfigs.penaltyHours?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        onClick={() => openPenaltiesSidebar?.(log.worklog_id)}
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: "0.875rem",
                                                            height: "49px",
                                                            verticalAlign: "middle",
                                                            display: "flex",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                            color: log.is_penalty_edited ? "#ff0000" : "inherit",
                                                            "&:hover": { color: "#1976d2" },
                                                        }}
                                                    >
                                                        {log.is_penalty_appealed && (
                                                            <Tooltip title={log.penalty_message} arrow placement="top">
                                                                <Box
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        cursor: "pointer",
                                                                        marginLeft: '-15px',
                                                                    }}
                                                                >
                                                                    <IconPointFilled size={18} style={{ color: "#ff9800" }} />
                                                                </Box>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip
                                                            title={log.penalty_message || ""}
                                                            arrow
                                                            placement="top"
                                                            disableHoverListener={!log.penalty_message}
                                                        >
                                                            <Box sx={{ cursor: log.penalty_message ? "pointer" : "default" }}>
                                                                {log.is_pricework ? "--" : formatHour(log?.penalty_hours ?? 0)}
                                                            </Box>
                                                        </Tooltip>
                                                    </TableCell>
                                                )}

                                                {/* Pricework Column */}
                                                {visibleColumnConfigs.priceWork?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {`${currency}${log.pricework_amount || 0}`}
                                                    </TableCell>
                                                )}

                                                {/* Expense Column */}
                                                {visibleColumnConfigs.expense?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        onClick={() => {
                                                            if (log.is_expense && log.expense_id) {
                                                                openExpensesSidebar?.(log.expense_id);
                                                            }
                                                        }}
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            cursor: (log.total_expense_amount > 0) ? 'pointer' : 'default',
                                                            '&:hover': {
                                                                color: (log.total_expense_amount > 0) ? '#1976d2' : 'inherit'
                                                            }
                                                        }}
                                                    >
                                                        {`${currency}${log.total_expense_amount || 0}`}
                                                    </TableCell>
                                                )}

                                                {/* CIS Column */}
                                                {visibleColumnConfigs.cis_amount?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        {`${currency}${log.cis_amount || 0}`}
                                                    </TableCell>
                                                )}

                                                {/* GROSS Column */}
                                                {visibleColumnConfigs.gross_amount?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        {`${currency}${log.gross_amount || 0}`}
                                                    </TableCell>
                                                )}

                                                {/* Check ins Column */}
                                                {visibleColumnConfigs.checkIns?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        onClick={() => openChecklogsSidebar?.(log.worklog_id)}
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            '&:hover': {
                                                                color: '#1976d2'
                                                            }
                                                        }}
                                                    >
                                                        {`${log.check_ins || 0}`}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.status?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        {(() => {
                                                            const statusText = log.status_text;
                                                            const statusColorFromApi = log.status_color;
                                                            const statusUpdatedBy = log.status_updated_by_name || '--';
                                                            const statusUpdatedAt = log.status_updated_at || '—';

                                                            const tooltipStyles = {
                                                                '& .MuiTooltip-arrow': { color: '#1a1f29' },
                                                            };

                                                            const tooltipTitle = `Status updated by ${statusUpdatedBy} on ${statusUpdatedAt}`;

                                                            if (!statusText || !statusColorFromApi) {
                                                                return (
                                                                    <Typography color="text.secondary" variant="body2">
                                                                        —
                                                                    </Typography>
                                                                );
                                                            }

                                                            const muiColors = ['success', 'error', 'warning', 'primary', 'info', 'secondary'] as const;

                                                            const chipProps = {
                                                                label: statusText,
                                                                size: 'small' as const,
                                                                sx: {
                                                                    width: 80,
                                                                    height: 28,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    textTransform: 'capitalize',
                                                                },
                                                            };

                                                            const isMuiColor = muiColors.includes(statusColorFromApi as any);

                                                            return (
                                                                <Tooltip title={tooltipTitle} arrow placement="top" sx={tooltipStyles}>
                                                                    {isMuiColor ? (
                                                                        <Chip {...chipProps} color={statusColorFromApi as any} />
                                                                    ) : (
                                                                        <Chip
                                                                            {...chipProps}
                                                                            sx={{
                                                                                ...chipProps.sx,
                                                                                backgroundColor: statusColorFromApi,
                                                                                color: '#fff',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Tooltip>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                )}

                                                {/* Daily Total Column */}
                                                {isFirstRow && visibleColumnConfigs.dailyTotal?.visible && (
                                                    <TableCell
                                                        rowSpan={rowSpan}
                                                        align="center"
                                                        className="rowspan-cell"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            color: (hasLeaveRequests || hasConflicts) ? '#fc4b6c' : ((rowData.isMoreThanWork || rowData.isLessThanWork) ? '#1976d2' : 'inherit')
                                                        }}
                                                    >
                                                        {rowData.dailyTotal}
                                                    </TableCell>
                                                )}

                                                {/* Net Payable Amount Column */}
                                                {isFirstRow && visibleColumnConfigs.netPayableAmount?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {rowData.netPayableAmount}
                                                    </TableCell>
                                                )}

                                                {/* Adjustment Amount Column */}
                                                {isFirstRow && visibleColumnConfigs.adjustment?.visible && (
                                                    <TableCell
                                                        rowSpan={rowSpan}
                                                        align="center"
                                                        className="rowspan-cell"
                                                        sx={{ py: 0.5, fontSize: '0.875rem', height: '45px', verticalAlign: 'middle' }}
                                                    >
                                                        <EditableAdjustmentCell
                                                            date={row.original.rowsData.find((l: any) => l.type === 'worklog')?.date_added
                                                                ?? row.original.rowsData[0].date_added}
                                                            currentAmount={rowData.daily_adjustment_amount}
                                                            addedBy={rowData.adjustment_added_by_name}
                                                            currency={currency}
                                                            isLocked={rowData.is_timesheet_paid === true}
                                                            onSave={onAdjustmentSave!}
                                                        />
                                                    </TableCell>
                                                )}

                                                {/* Payable Amount Column */}
                                                {isFirstRow && visibleColumnConfigs.payableAmount?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {rowData.payableAmount}
                                                    </TableCell>
                                                )}

                                                {/* Employee Notes Column */}
                                                {isFirstRow && visibleColumnConfigs.employeeNotes?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {rowData.employeeNotes}
                                                    </TableCell>
                                                )}

                                                {/* Action Column */}
                                                {visibleColumnConfigs.action?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        className="action-cell"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            textAlign: 'center',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {!isRowLocked && !log.is_working && (
                                                            <Button
                                                                size="small"
                                                                className="action-icon"
                                                                sx={{
                                                                    display: 'none',
                                                                    padding: 0,
                                                                    minWidth: '30px',
                                                                    width: '30px',
                                                                    height: '30px',
                                                                    background: 'none',
                                                                    '&:hover': {
                                                                        color: '#fc4b6c',
                                                                        background: 'none',
                                                                    },
                                                                }}
                                                                onClick={() => {
                                                                    if (log.is_expense) {
                                                                        onDeleteClick(log.expense_id, 'expense');
                                                                    } else if (log.is_leave) {
                                                                        onDeleteClick(log.user_leave_id, 'leave');
                                                                    } else {
                                                                        onDeleteClick(log.worklog_id, 'worklog');
                                                                    }
                                                                }}
                                                                aria-label="Delete record"
                                                            >
                                                                <IconTrash size={18}/>
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                });

                                const newSubRows = dateNewRecords.map(([recordKey, newRecord]) => (
                                    <NewRecordRow
                                        key={recordKey}
                                        recordKey={recordKey}
                                        newRecord={newRecord}
                                        shifts={shifts}
                                        projects={projects}
                                        isSaving={savingNewRecords.has(recordKey)}
                                        visibleColumnConfigs={visibleColumnConfigs}
                                        validateAndFormatTime={validateAndFormatTime}
                                        updateNewRecord={updateNewRecord}
                                        saveNewRecord={saveNewRecord}
                                        cancelNewRecord={cancelNewRecord}
                                    />
                                ));

                                return (
                                    <React.Fragment key={row.id}>
                                        {subRows}
                                        {newSubRows}
                                    </React.Fragment>
                                );
                            } else {
                                const dateNewRecords = Object.entries(newRecords).filter(
                                    ([_, rec]) => rec.date === rowData.date
                                );
                                const hasNewRecords = dateNewRecords.length > 0;
                                const isEmptyDay = !hasValidWorklogData(rowData);

                                const mainRow = (
                                    <TableRow
                                        key={row.id}
                                        sx={{
                                            height: '45px',
                                            minHeight: '45px',
                                            maxHeight: '45px',
                                            backgroundColor: isRowLocked ? 'rgba(244, 67, 54, 0.02)' : 'transparent',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: '#f4433605',
                                            },
                                            '&:hover .select-icon': {
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            },
                                            '&:hover .plus-icon': {
                                                display: isRowLocked ? 'none' : 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            },
                                            '&:hover .action-icon': {
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            },
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell: any) => {
                                            const { column } = cell;

                                            // Select column
                                            if (column.id === 'select' && row.original.rowType === 'day') {
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        <Box className="select-icon" sx={{
                                                            height: '100%',
                                                            display: isRowSelected ? 'flex' : 'none',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <CustomCheckbox
                                                                checked={isRowSelected}
                                                                onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                                                            />
                                                        </Box>
                                                    </TableCell>
                                                );
                                            }

                                            // Date column with add button
                                            if (column.id === 'date' && row.original.rowType === 'day' && !row.original.rowsData) {
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        <Box sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '100%',
                                                            position: 'relative'
                                                        }}>
                                                            <Typography variant="h6" sx={{ textAlign: 'center' }}>{row.original.date}</Typography>
                                                            {!isRowLocked && (
                                                                <Box className="plus-icon" sx={{
                                                                    display: 'none',
                                                                    height: '100%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    position: 'absolute',
                                                                    right: '8px',
                                                                }}>
                                                                    <IconButton
                                                                        onClick={() => startAddingNewRecord(row.original.date as string, projects as any, shifts as any)}
                                                                        size="small"
                                                                        sx={{
                                                                            padding: 0,
                                                                            minWidth: 'auto',
                                                                            minHeight: 'auto',
                                                                            width: '24px',
                                                                            height: '24px',
                                                                            '&:hover': { backgroundColor: 'transparent' }
                                                                        }}
                                                                        title="Add new record"
                                                                    >
                                                                        <IconPlus size={16} color="#1976d2"/>
                                                                    </IconButton>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                );
                                            }

                                            // Conflicts column for single row
                                            if (column.id === 'conflicts' && row.original.rowType === 'day') {
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle',
                                                            textAlign: 'center',
                                                            width: hasAnyConflictOrLeave ? '60px' : '0px',
                                                            minWidth: hasAnyConflictOrLeave ? '60px' : '0px',
                                                            maxWidth: hasAnyConflictOrLeave ? '60px' : '0px',
                                                            padding: hasAnyConflictOrLeave ? undefined : 0,
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        {(hasLeaveRequests || hasConflicts) && (
                                                            <Tooltip
                                                                title={`${conflictDaysCount + leaveRequestCount} Issue${conflictDaysCount + leaveRequestCount !== 1 ? 's' : ''}`}
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    aria-label={`${conflictDaysCount + leaveRequestCount} scheduling conflict${conflictDaysCount + leaveRequestCount !== 1 ? 's' : ''}`}
                                                                    onClick={(e) => setConflictAnchorEl(e.currentTarget)}
                                                                    sx={{
                                                                        p: 0,
                                                                        '&:hover': {
                                                                            backgroundColor: 'error.light',
                                                                            color: 'error.dark',
                                                                            opacity: 0.9
                                                                        }
                                                                    }}
                                                                >
                                                                    <IconExclamationCircle size={20}/>
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                );
                                            }

                                            // Inline new record inputs for empty days
                                            if (hasNewRecords && isEmptyDay && dateNewRecords.length === 1) {
                                                const [recordKey, newRecord] = dateNewRecords[0];
                                                const isSaving = savingNewRecords.has(recordKey);

                                                if (column.id === 'project') {
                                                    return (
                                                        <TableCell
                                                            key={cell.id}

                                                            align="center"
                                                            sx={{
                                                                py: 0.5,
                                                                width: '100%',
                                                                minHeight: '45px',
                                                            }}
                                                        >
                                                            <FormControl size="small" sx={{ minWidth: '100px', width: '100%', maxWidth: '100px' }}>
                                                                <Select
                                                                    value={newRecord.project_id || ''}
                                                                    onChange={(e) => {
                                                                        const newValue = e.target.value;
                                                                        updateNewRecord(recordKey, 'project_id', newValue);
                                                                        if (isNewRecordValid({ ...newRecord, project_id: newValue })) {
                                                                            saveNewRecord(recordKey);
                                                                        }
                                                                    }}
                                                                    disabled={isSaving}
                                                                    displayEmpty
                                                                    sx={{
                                                                        height: '32px',
                                                                        '& .MuiSelect-select': {
                                                                            fontSize: '0.75rem',
                                                                            py: '6px',
                                                                            px: '8px',
                                                                            textAlign: 'center',
                                                                        },
                                                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                                                    }}
                                                                >
                                                                    <MenuItem value="" disabled>Project</MenuItem>
                                                                    {projects.map((project) => (
                                                                        <MenuItem key={project.id} value={project.id}>
                                                                            {project.name}
                                                                        </MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                        </TableCell>
                                                    );
                                                }

                                                if (column.id === 'shift') {
                                                    return (
                                                        <TableCell
                                                            key={cell.id}
                                                            align="center"
                                                            sx={{
                                                                py: 0.5,
                                                                width: '100%',
                                                                minHeight: '45px',
                                                                padding: '6px',
                                                            }}
                                                        >
                                                            <FormControl size="small" sx={{ minWidth: '100px', width: '100%', maxWidth: '100px' }}>
                                                                <Select
                                                                    value={newRecord.shift_id || ''}
                                                                    onChange={(e) => {
                                                                        const newValue = e.target.value;
                                                                        updateNewRecord(recordKey, 'shift_id', newValue);
                                                                        if (isNewRecordValid({ ...newRecord, shift_id: newValue })) {
                                                                            saveNewRecord(recordKey);
                                                                        }
                                                                    }}
                                                                    disabled={isSaving}
                                                                    displayEmpty
                                                                    sx={{
                                                                        height: '32px',
                                                                        '& .MuiSelect-select': {
                                                                            fontSize: '0.75rem',
                                                                            py: '6px',
                                                                            px: '8px',
                                                                            textAlign: 'center',
                                                                        },
                                                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                                                    }}
                                                                >
                                                                    <MenuItem value="" disabled>Shift</MenuItem>
                                                                    {shifts.map((shift) => (
                                                                        <MenuItem key={shift.id} value={shift.id}>
                                                                            {shift.name}
                                                                        </MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                        </TableCell>
                                                    );
                                                }

                                                if (column.id === 'start' || column.id === 'end') {
                                                    const field = column.id;
                                                    const fieldValue = newRecord[field as keyof NewRecord] as string;
                                                    const isFieldValid = fieldValue && validateAndFormatTime(fieldValue) !== '';

                                                    return (
                                                        <TableCell
                                                            key={cell.id}
                                                            align="center"
                                                            sx={{
                                                                py: 0.5,
                                                            }}
                                                        >
                                                            <TextField
                                                                type="text"
                                                                value={fieldValue}
                                                                placeholder="HH:MM"
                                                                variant="outlined"
                                                                size="small"
                                                                onChange={(e) => {
                                                                    const raw = e.target.value.replace(/[^\d:]/g, '');
                                                                    updateNewRecord(recordKey, field as keyof NewRecord, raw);
                                                                }}
                                                                onBlur={() => {
                                                                    const formattedTime = validateAndFormatTime(fieldValue);
                                                                    updateNewRecord(recordKey, field as keyof NewRecord, formattedTime);
                                                                    if (isNewRecordValid({ ...newRecord, [field]: formattedTime })) {
                                                                        saveNewRecord(recordKey);
                                                                    }
                                                                }}
                                                                disabled={isSaving}
                                                                helperText={!isFieldValid && fieldValue ? 'Invalid time format' : ''}
                                                                sx={{
                                                                    width: '70px',
                                                                    '& .MuiInputBase-input': {
                                                                        fontSize: '0.75rem',
                                                                        textAlign: 'center'
                                                                    },
                                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#e0e0e0'
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                    );
                                                }
                                            }

                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle',
                                                        textAlign: 'center',
                                                    }}
                                                    className={column.id === 'action' ? 'action-cell' : ''}
                                                >
                                                    {column.id === 'action' ? (
                                                        hasValidWorklogData(rowData) ? (
                                                            <Button
                                                                size="small"
                                                                className="action-icon"
                                                                sx={{
                                                                    display: 'none',
                                                                    '&:hover': {
                                                                        color: '#fc4b6c',
                                                                    },
                                                                }}
                                                            >
                                                                <IconTrash size={18}/>
                                                            </Button>
                                                        ) : (
                                                            <Box sx={{ width: '30px', height: '30px' }} />
                                                        )
                                                    ) : (
                                                        flexRender(column.columnDef.cell, cell.getContext())
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );

                                return (
                                    <React.Fragment key={row.id}>
                                        {mainRow}
                                    </React.Fragment>
                                );
                            }
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <LocationMapDrawer
                open={locationDrawer.open}
                onClose={closeLocationDrawer}
                worklogId={locationDrawer.worklogId}
            />
            
            <Popover
                open={Boolean(conflictAnchorEl)}
                anchorEl={conflictAnchorEl}
                onClose={() => setConflictAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                sx={{
                    mt: 1,
                    '& .MuiPopover-paper': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        minWidth: '280px',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ mb: 1.5 }}
                    >
                        {conflictDaysCount + leaveRequestCount} unresolved issue{conflictDaysCount + leaveRequestCount !== 1 ? 's' : ''}
                    </Typography>
                    <Stack direction="column" spacing={1}>
                        {conflictDaysCount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconExclamationCircle size={18} color="#d32f2f" />
                                    <Typography variant="body2">
                                        {conflictDaysCount} Conflict{conflictDaysCount !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={handleConflicts}
                                    sx={{
                                        textTransform: 'none',
                                        color: 'primary.main',
                                        fontWeight: 500,
                                    }}
                                >
                                    Review
                                </Button>
                            </Box>
                        )}
                        {leaveRequestCount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconSun size={18} color="#32bf90" />
                                    <Typography variant="body2">
                                        {leaveRequestCount} Leave request{leaveRequestCount !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={handleRequests}
                                    sx={{
                                        textTransform: 'none',
                                        color: 'primary.main',
                                        fontWeight: 500,
                                    }}
                                >
                                    Review
                                </Button>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Popover>

            {/* Exclamation Popover */}
            <Popover
                open={Boolean(exclamationAnchorEl)}
                anchorEl={exclamationAnchorEl}
                onClose={() => {
                    setExclamationAnchorEl(null);
                    setSelectedWorklog(null);
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                sx={{
                    mt: 1,
                    '& .MuiPopover-paper': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        minWidth: '280px',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ mb: 1.5 }}
                    >
                        Worklog Issues
                    </Typography>
                    <Stack direction="column" spacing={1}>
                        {selectedWorklog?.is_requested && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconExclamationMark size={18} color="#d32f2f" />
                                    <Typography variant="body2">
                                        Pending Request
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setExclamationAnchorEl(null);
                                        setSelectedWorklog(null);
                                        handlePendingRequest();
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        color: 'primary.main',
                                        fontWeight: 500,
                                    }}
                                >
                                    Review
                                </Button>
                            </Box>
                        )}
                        {selectedWorklog?.is_penalty_appealed && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconExclamationCircle size={18} color="#ff9800" />
                                    <Typography variant="body2">
                                        Penalty Appeal ({selectedWorklog?.penalty_count || 1})
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setExclamationAnchorEl(null);
                                        if (selectedWorklog?.worklog_id) {
                                            openPenaltiesSidebar?.(selectedWorklog.worklog_id);
                                        }
                                        setSelectedWorklog(null);
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        color: 'primary.main',
                                        fontWeight: 500,
                                    }}
                                >
                                    Review
                                </Button>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Popover>
        </Box>
    );
};

export default TimeClockTable;
