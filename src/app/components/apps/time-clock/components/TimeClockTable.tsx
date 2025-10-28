import React, { useMemo, useState, useEffect } from 'react';
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
    Popover
} from '@mui/material';
import { flexRender } from '@tanstack/react-table';
import {
    IconExclamationMark,
    IconExclamationCircle,
    IconPlus,
    IconTrash,
    IconSun,
} from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import EditableTimeCell from './EditableTimeCell';
import EditableShiftCell from './EditableShiftCell';
import EditableProjectCell from './EditableProjectCell';
import NewRecordRow from './NewRecordRow';
import {
    DailyBreakdown,
    EditingWorklog,
    NewRecord,
    Shift,
    Project
} from '@/app/components/apps/time-clock/types/timeClock';

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
    onDeleteClick: (worklogId: string) => void;
    conflictsByDate?: { [key: string]: number };
    openConflictsSideBar?: () => Promise<void>;
    openChecklogsSidebar?: (worklogId: number) => Promise<void>;
    leaveRequestCount: number;
    leaveRequestByDate?: { [key: string]: number };
    openLeaveRequestsSideBar?: () => Promise<void>;
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
                                                           leaveRequestCount,
                                                           leaveRequestByDate,
                                                           openLeaveRequestsSideBar,
                                                       }) => {
    const [conflictAnchorEl, setConflictAnchorEl] = useState<HTMLElement | null>(null);

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

    const handleConflicts = () => {
        setConflictAnchorEl(null);
        openConflictsSideBar?.();
    };

    const handleRequests = () => {
        setConflictAnchorEl(null);
        openLeaveRequestsSideBar?.();
    };

    const leaveDaysCount = useMemo(() => {
        if (!leaveRequestByDate) return 0;
        return Object.keys(leaveRequestByDate).filter(date => leaveRequestByDate[date] > 0).length;
    }, [leaveRequestByDate]);

    const isNewRecordValid = (newRecord: NewRecord) => {
        return (
            !!newRecord.shift_id &&
            !!newRecord.start &&
            !!newRecord.end &&
            validateAndFormatTime(newRecord.start) !== '' &&
            validateAndFormatTime(newRecord.end) !== ''
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
                maxHeight: '100%',
                overflow: 'auto',
            }}>
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead>
                        {table.getHeaderGroups().map((hg: any) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((header: any) => (
                                    <TableCell
                                        key={header.id}
                                        sx={{
                                            backgroundColor: '#fafafa',
                                            fontSize: '0.875rem',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 999,
                                            width: `${header.column.columnDef.size || 100}px`,
                                            minWidth: `${header.column.columnDef.size || 100}px`,
                                            maxWidth: `${header.column.columnDef.size || 100}px`,
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
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
                                                        display: 'inline-block',
                                                        padding: '2px 6px',
                                                    }}
                                                >
                                                    {conflictDaysCount}
                                                </Typography>
                                            ) : null
                                        ) : (
                                            <Typography>{flexRender(header.column.columnDef.header, header.getContext())}</Typography>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>

                    <TableBody>
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
                                                backgroundColor: '#f0f0f0',
                                                fontWeight: 600,
                                                textAlign: 'center',
                                                py: 1.5,
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
                            const hasLeaves = leaveRequestByDate && leaveRequestByDate[rowData.date] > 0;

                            // Day rows with multiple worklogs
                            if (row.original.rowsData) {
                                const worklogIds = row.original.rowsData.map((log: any) => log.worklog_id);
                                const expandedWorklogsCount = expandedWorklogsIds.filter((id) =>
                                    worklogIds.includes(id)
                                ).length;
                                const rowSpan = row.original.rowsData.length + expandedWorklogsCount + dateNewRecords.length;

                                const subRows = row.original.rowsData.map((log: any, index: number) => {
                                    const worklogId = `${row.id}-${log.worklog_id}`;
                                    const isFirstRow = index === 0;
                                    const isLogLocked = isRecordLocked(log);

                                    return (
                                        <React.Fragment key={log.worklog_id}>
                                            <TableRow
                                                sx={{
                                                    height: '45px',
                                                    minHeight: '45px',
                                                    maxHeight: '45px',
                                                    '& td': { textAlign: 'center', verticalAlign: 'middle' },
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
                                                        display: 'flex',
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
                                                            py: 0.5,
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
                                                            width: `${visibleColumnConfigs.date.width}px`,
                                                        }}
                                                    >
                                                        <Box sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 1,
                                                            height: '100%'
                                                        }}>
                                                            <Typography variant="h4" sx={{ textAlign: 'center' }}>{rowData.date}</Typography>
                                                            {!isLogLocked && !hasRecords && (
                                                                <Box className="plus-icon" sx={{
                                                                    display: 'none',
                                                                    height: '100%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}>
                                                                    <IconButton
                                                                        onClick={() => startAddingNewRecord(rowData.date as string, projects as any, shifts as any)}
                                                                        size="small"
                                                                        sx={{
                                                                            paddingY: 0,
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
                                                        {(hasLeaves || hasConflicts) && (
                                                            <Tooltip
                                                                title={`${conflictDaysCount + leaveDaysCount} Issue${conflictDaysCount + leaveDaysCount !== 1 ? 's' : ''}`}
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    aria-label={`${conflictDaysCount + leaveDaysCount} scheduling conflict${conflictDaysCount + leaveDaysCount !== 1 ? 's' : ''}`}
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

                                                {/* Exclamation Column */}
                                                {visibleColumnConfigs.exclamation?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {log.is_requested ? (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={handlePendingRequest}
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
                                                        {isLogLocked ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isLogLocked ? 0.6 : 1
                                                            }}>
                                                                {log.project_name || '--'}
                                                            </Box>
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
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                }}
                                                            >
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
                                                                    {log.leave_name || '--'}
                                                                </Box>
                                                            </Box>
                                                        ) : (
                                                            log.is_pricework || isLogLocked ? (
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    opacity: isLogLocked ? 0.6 : 1
                                                                }}>
                                                                    {log.shift_name || '--'}
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
                                                            )
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
                                                        {log.is_leave || log.is_pricework || isLogLocked ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isLogLocked ? 0.6 : 1,
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
                                                            </Box>
                                                        )}
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
                                                        {log.is_leave || log.is_pricework || isLogLocked ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isLogLocked ? 0.6 : 1,
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
                                                            color: (log.isMoreThanWork || log.isLessThanWork) ? '#1976d2' : (log.is_edited ? '#ff0000' : 'inherit')
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

                                                {/* Pricework Amount Column */}
                                                {visibleColumnConfigs.priceWorkAmount?.visible && (
                                                    <TableCell align="center" sx={{
                                                        py: 0.5,
                                                        fontSize: '0.875rem',
                                                        height: '45px',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        {`${currency}${log.pricework_amount || 0}`}
                                                    </TableCell>
                                                )}

                                                {/* Check ins Column */}
                                                {visibleColumnConfigs.checkins?.visible && (
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
                                                            color: (hasLeaves || hasConflicts) ? '#fc4b6c' : ((rowData.isMoreThanWork || rowData.isLessThanWork) ? '#1976d2' : 'inherit')
                                                        }}
                                                    >
                                                        {rowData.dailyTotal}
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
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        <Button
                                                            size="small"
                                                            className="action-icon"
                                                            sx={{
                                                                display: 'none',
                                                                padding: 0,
                                                                width: '30px',
                                                                height: '30px',
                                                                background: 'none',
                                                                '&:hover': {
                                                                    color: '#fc4b6c',
                                                                    background: 'none',
                                                                },
                                                            }}
                                                            onClick={() => onDeleteClick(log.worklog_id)}
                                                            aria-label="Delete worklog"
                                                        >
                                                            <IconTrash size={18}/>
                                                        </Button>
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
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
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
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        <Box sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 1,
                                                            height: '100%'
                                                        }}>
                                                            <Typography variant="h4" sx={{ textAlign: 'center' }}>{row.original.date}</Typography>
                                                            {!isRowLocked && (
                                                                <Box className="plus-icon" sx={{
                                                                    display: 'none',
                                                                    height: '100%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}>
                                                                    <IconButton
                                                                        onClick={() => startAddingNewRecord(row.original.date as string, projects as any, shifts as any)}
                                                                        size="small"
                                                                        sx={{ '&:hover': { backgroundColor: 'transparent' } }}
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
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        {(hasLeaves || hasConflicts) && (
                                                            <Tooltip
                                                                title={`${conflictDaysCount + leaveDaysCount} Issue${conflictDaysCount + leaveDaysCount !== 1 ? 's' : ''}`}
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    aria-label={`${conflictDaysCount + leaveDaysCount} scheduling conflict${conflictDaysCount + leaveDaysCount !== 1 ? 's' : ''}`}
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
                                                        <TableCell align="center" sx={{ py: 0.5, width: '100%', minHeight: '45px' }}>
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
                                                            align="center"
                                                            sx={{
                                                                py: 0.5,
                                                                width: '100%',
                                                                minHeight: '45px',
                                                                padding: '6px'
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
                                                        <TableCell key={cell.id} align="center" sx={{ py: 0.5 }}>
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
                                                        borderBottom: '1px solid rgba(224, 224, 224, 1)',
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

            {/* Conflicts Popover */}
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
                        {conflictDaysCount + leaveDaysCount} unresolved issue{conflictDaysCount + leaveDaysCount !== 1 ? 's' : ''}
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
                        {leaveDaysCount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconSun size={18} color="#32bf90" />
                                    <Typography variant="body2">
                                        {leaveDaysCount} Leave request{leaveDaysCount !== 1 ? 's' : ''}
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
        </Box>
    );
};

export default TimeClockTable;
