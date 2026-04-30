import React from 'react';
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
    IconMapPin
} from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import EditableTimeCell from './EditableTimeCell';

import {
    DailyBreakdown,
    EditingWorklog,
    RecordType
} from '../types/timeClock';

interface TimeClockTableProps {
    table: any,
    currency: string,
    selectedRows: Set<string>,
    expandedWorklogsIds: string[],
    editingWorklogs: { [key: string]: EditingWorklog },
    savingWorklogs: Set<string>,
    formatHour: (val: string | number | null | undefined, isPricework?: boolean) => string,
    sanitizeDateTime: (dateTime: string) => string,
    validateAndFormatTime: (value: string) => string,
    hasValidWorklogData: (row: DailyBreakdown) => boolean,
    isRecordLocked: (log: any) => boolean,
    handleRowSelect: (rowId: string, checked: boolean) => void,
    startEditingField: (worklogId: string, field: 'start' | 'end', log: any) => void,
    updateEditingField: (worklogId: string, field: keyof EditingWorklog, value: string) => void,
    cancelEditingField: (worklogId: string) => void,
    saveFieldChanges: (worklogId: string, originalLog: any) => void,
    onDeleteClick: (id: string, type: RecordType) => void,
}

const TimeClockTable: React.FC<TimeClockTableProps> = ({
                                                           table,
                                                           currency,
                                                           selectedRows,
                                                           expandedWorklogsIds,
                                                           editingWorklogs,
                                                           savingWorklogs,
                                                           formatHour,
                                                           sanitizeDateTime,
                                                           validateAndFormatTime,
                                                           hasValidWorklogData,
                                                           isRecordLocked,
                                                           handleRowSelect,
                                                           startEditingField,
                                                           updateEditingField,
                                                           cancelEditingField,
                                                           saveFieldChanges,
                                                           onDeleteClick,
                                                       }) => {
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

    const getTruncatedName = (name: string) => {
        if (!name || name == '--') return '--';
        const firstWord = name.trim().split(' ')[0];
        return firstWord.length > 10 ? firstWord.slice(0, 3) + '.' : firstWord + '.';
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
                <Table size="small" stickyHeader sx={{tableLayout: 'fixed', width: '100%', paddingBottom: '2rem'}}>
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
                                            padding: 0,
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            p: 1
                                        }}
                                    >
                                        <Typography sx={{color: '#203040'}}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </Typography>
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
                                                                {log.start_location && ( 
                                                                    <Tooltip
                                                                        title={log.start_location}
                                                                        arrow
                                                                        placement="top"
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                            <IconMapPin size={14} style={{ color: '#1976d2' }} />
                                                                        </Box>
                                                                    </Tooltip>
                                                                )}
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
                                                                {log.end_location && (
                                                                    <Tooltip
                                                                        title={log.end_location}
                                                                        arrow
                                                                        placement="top"
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                            <IconMapPin size={14} style={{ color: '#1976d2' }} />
                                                                        </Box>
                                                                    </Tooltip>
                                                                )}
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
                                                                    display: 'none',
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
        </Box>
    );
};

export default TimeClockTable;
