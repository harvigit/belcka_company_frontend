import React, {useState} from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Typography,
    Button,
    Tooltip,
    Chip
} from '@mui/material';
import {flexRender} from '@tanstack/react-table';
import {
    IconTrash,
    IconPointFilled,
    IconMapPin,
    IconBrandAndroid,
    IconBrandApple,
    IconWorld,
} from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import EditableTimeCell from './EditableTimeCell';

import {
    DailyBreakdown,
    EditingWorklog,
    RecordType
} from '../types/timeClock';
import LocationMapDrawer from '@/app/components/apps/time-clock/components/LocationMapDrawer';

interface LocationDrawerState {
    open: boolean;
    worklogId: number | undefined;
}

interface TimeClockTableProps {
    table: any,
    currency: string,
    expandedWorklogsIds: string[],
    editingWorklogs: { [key: string]: EditingWorklog },
    savingWorklogs: Set<string>,
    formatHour: (val: string | number | null | undefined, isPricework?: boolean) => string,
    sanitizeDateTime: (dateTime: string) => string,
    validateAndFormatTime: (value: string) => string,
    hasValidWorklogData: (row: DailyBreakdown) => boolean,
    isRecordLocked: (log: any) => boolean,
    startEditingField: (worklogId: string, field: 'start' | 'end', log: any) => void,
    updateEditingField: (worklogId: string, field: keyof EditingWorklog, value: string) => void,
    cancelEditingField: (worklogId: string) => void,
    saveFieldChanges: (worklogId: string, originalLog: any) => void,
    onDeleteClick: (id: string, type: RecordType) => void,
}

const TimeClockTable: React.FC<TimeClockTableProps> = ({
                                                           table,
                                                           currency,
                                                           expandedWorklogsIds,
                                                           editingWorklogs,
                                                           savingWorklogs,
                                                           formatHour,
                                                           sanitizeDateTime,
                                                           validateAndFormatTime,
                                                           hasValidWorklogData,
                                                           isRecordLocked,
                                                           startEditingField,
                                                           updateEditingField,
                                                           cancelEditingField,
                                                           saveFieldChanges,
                                                           onDeleteClick,
                                                       }) => {
    const [locationDrawer, setLocationDrawer] = useState<LocationDrawerState>({
        open: false,
        worklogId: undefined,
    });

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
    const minTableWidth = Object.values(visibleColumnConfigs).reduce(
        (total, config) => total + (config.visible ? config.width : 0),
        0
    );

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
                        <IconMapPin size={14} style={{ color: '#1976d2' }} />
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
                    <IconMapPin size={14} style={{ color: '#1976d2' }}/>
                </Box>
            </Tooltip>
        );
    };

    return (
        <Box sx={{
            flex: 1,
            overflow: 'hidden',
            maxHeight: { xs: '420px'},
            position: 'relative'
        }}>
            <TableContainer sx={{
                height: '100%',
                width: '100%',
                overflowX: 'auto',
                overflowY: 'auto',
            }}>
                <Table
                    size="small"
                    stickyHeader
                    sx={{
                        tableLayout: 'fixed',
                        width: 'max-content',
                        minWidth: `${Math.max(minTableWidth, 860)}px`,
                        paddingBottom: '2rem',
                    }}
                >
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
                                            width: `${header.column.columnDef.size}px`,
                                            minWidth: `${header.column.columnDef.size || 100}px`,
                                            maxWidth: `${header.column.columnDef.size || 100}px`,
                                            overflow: 'hidden',
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            p: { xs: 0.75, md: 1 },
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <Typography sx={{color: '#203040', fontSize: { xs: '0.75rem', md: '0.875rem' }}}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>

                    <TableBody
                        sx={{
                            '& td, & th': {
                                whiteSpace: 'nowrap',
                                px: { xs: 0.75, md: 1 },
                            },
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
                            const isRowLocked = isRecordLocked(rowData);

                            // Day rows with multiple worklogs
                            if (row.original.rowsData) {
                                const worklogIds = row.original.rowsData.map((log: any) => log.worklog_id);
                                const expandedWorklogsCount = expandedWorklogsIds.filter((id) =>
                                    worklogIds.includes(id)
                                ).length;

                                const rowSpan = row.original.rowsData.length + expandedWorklogsCount;

                                const subRows = row.original.rowsData.map((log: any, index: number) => {
                                    const worklogId = log.is_expense ? `${row.id}-expense-${log.expense_id}-${index}` : log.is_leave ? `${row.id}-leave-${log.user_leave_id}-${index}` : `${row.id}-worklog-${log.worklog_id}`;
                                    const isFirstRow = index === 0;
                                    const isLogLocked = isRecordLocked(log) || log.is_timesheet_locked === true;

                                    const hasValue = rowData.daily_adjustment_amount !== undefined && rowData.daily_adjustment_amount !== null && rowData.daily_adjustment_amount !== 0;
                                    const isPositive = (rowData.daily_adjustment_amount ?? 0) > 0;

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
                                                            <Typography variant="h6"
                                                                        sx={{textAlign: 'center'}}>{rowData.date}</Typography>
                                                        </Box>
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
                                                        <Tooltip title={log.project_name} arrow placement="top">
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 0.6,
                                                            }}>
                                                                {getTruncatedName(log.project_name)}
                                                            </Box>
                                                        </Tooltip>
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
                                                        <Tooltip title={log.shift_name} arrow placement="top">
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 0.6,
                                                            }}>
                                                                {getTruncatedName(log.shift_name)}
                                                            </Box>
                                                        </Tooltip>
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
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '49px',
                                                            verticalAlign: 'middle',
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            color: log.is_penalty_edited ? '#ff0000' : 'inherit',
                                                            '&:hover': {color: '#1976d2'},
                                                        }}
                                                    >
                                                        {log.is_penalty_appealed && (
                                                            <Tooltip title={log.penalty_message} arrow placement="top">
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        marginLeft: '-15px',
                                                                    }}
                                                                >
                                                                    <IconPointFilled size={18}
                                                                                     style={{color: '#ff9800'}}/>
                                                                </Box>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip
                                                            title={log.penalty_message || ''}
                                                            arrow
                                                            placement="top"
                                                            disableHoverListener={!log.penalty_message}
                                                        >
                                                            <Box
                                                                sx={{cursor: log.penalty_message ? 'pointer' : 'default'}}>
                                                                {log.is_pricework ? '--' : formatHour(log?.penalty_hours ?? 0)}
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
                                                                '& .MuiTooltip-arrow': {color: '#1a1f29'},
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
                                                                <Tooltip title={tooltipTitle} arrow placement="top"
                                                                         sx={tooltipStyles}>
                                                                    {isMuiColor ? (
                                                                        <Chip {...chipProps}
                                                                              color={statusColorFromApi as any}/>
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
                                                            color: (rowData.isMoreThanWork || rowData.isLessThanWork) ? '#1976d2' : 'inherit'
                                                        }}
                                                    >
                                                        {rowData.dailyTotal}
                                                    </TableCell>
                                                )}

                                                {/* Net Payable Amount Column */}
                                                {isFirstRow && visibleColumnConfigs.netPayableAmount?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell"
                                                               sx={{
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
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            height: '45px',
                                                            verticalAlign: 'middle'
                                                        }}
                                                    >
                                                        <Tooltip
                                                            title={hasValue && rowData.adjustment_added_by_name ? `Adjustment added by ${rowData.adjustment_added_by_name}` : ''}
                                                            arrow
                                                            placement="top"
                                                            sx={{
                                                                '& .MuiTooltip-arrow': { color: '#1a1f29' },
                                                            }}
                                                            componentsProps={{
                                                                tooltip: {
                                                                    sx: {
                                                                        bgcolor: '#1a1f29',
                                                                        fontSize: '0.75rem',
                                                                    },
                                                                },
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    py: 0.5,
                                                                    fontSize: '0.875rem',
                                                                    minHeight: '32px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '2px',
                                                                    borderRadius: '4px',
                                                                    px: '8px',
                                                                }}
                                                            >
                                                                {hasValue && !isPositive && ('-')}
                                                                <Typography variant="body2">
                                                                    {hasValue ? `${currency}${Math.abs(rowData.daily_adjustment_amount!)}` : '--'}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    </TableCell>
                                                )}

                                                {/* Payable Amount Column */}
                                                {isFirstRow && visibleColumnConfigs.payableAmount?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell"
                                                               sx={{
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
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell"
                                                               sx={{
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
                                                                    display: { xs: 'flex', md: 'none' },
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

                                return (
                                    <React.Fragment key={row.id}>
                                        {subRows}
                                    </React.Fragment>
                                );
                            } else {
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
                                            const {column} = cell;

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
                                                            <Typography variant="h6"
                                                                        sx={{textAlign: 'center'}}>{row.original.date}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                );
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
                                                                    display: { xs: 'flex', md: 'none' },
                                                                    '&:hover': {
                                                                        color: '#fc4b6c',
                                                                    },
                                                                }}
                                                            >
                                                                <IconTrash size={18}/>
                                                            </Button>
                                                        ) : (
                                                            <Box sx={{width: '30px', height: '30px'}}/>
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
        </Box>
    );
};

export default TimeClockTable;
