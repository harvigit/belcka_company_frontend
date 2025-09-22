import React, { useMemo } from 'react';
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
} from '@mui/material';
import { flexRender, ColumnDef } from '@tanstack/react-table';
import { IconChevronDown, IconChevronRight, IconExclamationMark, IconPlus, IconTrash } from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import CheckLogRows from '../time-clock-details/check-log-list';
import EditableTimeCell from './EditableTimeCell';
import EditableShiftCell from './EditableShiftCell';
import EditableProjectCell from './EditableProjectCell';
import NewRecordRow from './NewRecordRow';
import { DailyBreakdown, EditingWorklog, NewRecord, Shift, Project } from '@/app/components/apps/time-clock/types/timeClock';

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
    startAddingNewRecord: (date: string) => void;
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
                                                           onDeleteClick
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

    return (
        <Box sx={{ flex: 1, overflow: 'auto', paddingBottom: selectedRows.size > 0 ? '80px' : '0px' }}>
            <TableContainer sx={{ overflowY: 'hidden' }}>
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
                                            zIndex: 10,
                                            width: `${header.column.columnDef.size || 100}px`,
                                            minWidth: `${header.column.columnDef.size || 100}px`,
                                            maxWidth: `${header.column.columnDef.size || 100}px`,
                                        }}
                                    >
                                        <Typography>{flexRender(header.column.columnDef.header, header.getContext())}</Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>

                    <TableBody>
                        {table.getRowModel().rows.map((row: any) => {
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

                            // Collect new records for this date
                            const dateNewRecords = Object.entries(newRecords).filter(
                                ([_, rec]) => rec.date === rowData.date
                            );
                            const hasRecords = hasValidWorklogData(rowData) || dateNewRecords.length > 0;

                            // Day rows with multiple worklogs
                            if (row.original.rowsData) {
                                const worklogIds = row.original.rowsData.map((log: any) => log.worklog_id);
                                const expandedWorklogsCount = expandedWorklogsIds.filter((id) =>
                                    worklogIds.includes(id)
                                ).length;
                                const rowSpan = row.original.rowsData.length + expandedWorklogsCount + dateNewRecords.length;

                                const subRows = row.original.rowsData.map((log: any, index: number) => {
                                    const worklogId = `${row.id}-${log.worklog_id}`;
                                    const isWorklogExpanded = expandedWorklogsIds.includes(log.worklog_id);
                                    const isFirstRow = index === 0;
                                    const isLogLocked = isRecordLocked(log);

                                    return (
                                        <>
                                            <TableRow
                                                key={log.worklog_id}
                                                sx={{
                                                    '& td': { textAlign: 'center' },
                                                    backgroundColor: isLogLocked ? 'rgba(244, 67, 54, 0.02)' : 'transparent',
                                                    cursor: 'pointer',
                                                    '&:hover .action-icon': {
                                                        display: 'block',
                                                        padding: 0
                                                    },
                                                }}
                                            >
                                                {isFirstRow && visibleColumnConfigs.select?.visible && (
                                                    <TableCell
                                                        rowSpan={rowSpan}
                                                        align="center"
                                                        className="rowspan-cell"
                                                        sx={{ width: `${visibleColumnConfigs.select.width}px`, py: 0.5 }}
                                                    >
                                                        <CustomCheckbox
                                                            checked={selectedRows.has(`row-${row.index}`)}
                                                            onChange={(e) => handleRowSelect(`row-${row.index}`, e.target.checked)}
                                                        />
                                                    </TableCell>
                                                )}

                                                {isFirstRow && visibleColumnConfigs.date?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                            <Typography variant='h4'>{rowData.date}</Typography>
                                                            <IconButton
                                                                onClick={() => startAddingNewRecord(rowData.date as string)}
                                                                size="small"
                                                                sx={{ '&:hover': { backgroundColor: 'transparent' } }}
                                                                title="Add new record"
                                                            >
                                                                <IconPlus size={16} color="#1976d2" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.exclamation?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {log.is_requested ? (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={handlePendingRequest}
                                                                aria-label="error"
                                                                sx={{ '&:hover': { backgroundColor: 'transparent', color: '#fc4b6c' } }}
                                                            >
                                                                <IconExclamationMark size={18} />
                                                            </IconButton>
                                                        ) : null}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.expander?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {log.user_checklogs && log.user_checklogs.length > 0 ? (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleWorklogToggle(log.worklog_id)}
                                                                aria-label={isWorklogExpanded ? 'Collapse' : 'Expand'}
                                                            >
                                                                {isWorklogExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                                                            </IconButton>
                                                        ) : null}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.project?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {(log.user_checklogs && log.user_checklogs.length > 0) || isLogLocked ? (
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

                                                {visibleColumnConfigs.shift?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {log.is_pricework || isLogLocked ? (
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
                                                        )}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.start?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {log.is_pricework || isLogLocked ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isLogLocked ? 0.6 : 1
                                                            }}>
                                                                {sanitizeDateTime(log.start)}
                                                            </Box>
                                                        ) : (
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
                                                        )}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.end?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {log.is_pricework || isLogLocked ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isLogLocked ? 0.6 : 1
                                                            }}>
                                                                {sanitizeDateTime(log.end)}
                                                            </Box>
                                                        ) : (
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
                                                        )}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.totalHours?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            color: log.is_edited ? '#ff0000' : 'inherit'
                                                        }}
                                                    >
                                                        {log.is_pricework ? '--' : formatHour(log.total_hours)}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.priceWorkAmount?.visible && (
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {`${currency}${log.pricework_amount || 0}`}
                                                    </TableCell>
                                                )}

                                                {isFirstRow && visibleColumnConfigs.dailyTotal?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {rowData.dailyTotal}
                                                    </TableCell>
                                                )}

                                                {isFirstRow && visibleColumnConfigs.payableAmount?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {rowData.payableAmount}
                                                    </TableCell>
                                                )}

                                                {isFirstRow && visibleColumnConfigs.employeeNotes?.visible && (
                                                    <TableCell rowSpan={rowSpan} align="center" className="rowspan-cell" sx={{ py: 0.5, fontSize: '0.875rem' }}>
                                                        {rowData.employeeNotes}
                                                    </TableCell>
                                                )}

                                                {visibleColumnConfigs.action?.visible && (
                                                    <TableCell
                                                        align="center"
                                                        className="action-cell"
                                                        sx={{
                                                            py: 0.5,
                                                            fontSize: '0.875rem',
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
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
                                                            <IconTrash size={18} />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>

                                            {isWorklogExpanded && (
                                                <CheckLogRows
                                                    logs={log.user_checklogs}
                                                    currency={currency}
                                                    formatHour={formatHour}
                                                    visibleColumnConfigs={visibleColumnConfigs}
                                                    getVisibleCellsLength={6}
                                                    isMultiRow={true}
                                                />
                                            )}
                                        </>
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
                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            key={row.id}
                                            sx={{
                                                backgroundColor: isRecordLocked(row.original)
                                                    ? 'rgba(244, 67, 54, 0.02)'
                                                    : 'transparent',
                                                cursor: 'pointer',
                                                '&:hover .action-icon': {
                                                    display: 'block', // Show icon when row is hovered
                                                },
                                            }}
                                        >
                                            {row.getVisibleCells().map((cell: any) => {
                                                const { column } = cell;
                                                const dateNewRecords = Object.entries(newRecords).filter(
                                                    ([_, rec]) => rec.date === row.original.date
                                                );
                                                const hasNewRecords = dateNewRecords.length > 0;
                                                const isEmptyDay = !hasValidWorklogData(row.original);

                                                // Date column with add button
                                                if (column.id === 'date' && row.original.rowType === 'day' && !row.original.rowsData) {
                                                    return (
                                                        <TableCell
                                                            key={cell.id}
                                                            sx={{
                                                                py: 0.5,
                                                                fontSize: '0.875rem',
                                                                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                                textAlign: 'center',
                                                                verticalAlign: 'middle',
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Typography variant='h4'>{row.original.date}</Typography>
                                                                {!hasNewRecords && (
                                                                    <IconButton
                                                                        onClick={() => startAddingNewRecord(row.original.date as string)}
                                                                        size="small"
                                                                        sx={{ '&:hover': { backgroundColor: 'transparent' } }}
                                                                        title="Add new record"
                                                                    >
                                                                        <IconPlus size={16} color="#1976d2" />
                                                                    </IconButton>
                                                                )}
                                                            </Box>
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
                                                                        value={newRecord.project_id}
                                                                        onChange={(e) => updateNewRecord(recordKey, 'project_id', e.target.value)}
                                                                        disabled={isSaving}
                                                                        displayEmpty
                                                                        sx={{
                                                                            height: '32px',
                                                                            '& .MuiSelect-select': { fontSize: '0.875rem', py: '6px', px: '8px', textAlign: 'center' },
                                                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                                                        }}
                                                                    >
                                                                        <MenuItem value="">Select Project</MenuItem>
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
                                                                sx={{ py: 0.5, textAlign: 'center', verticalAlign: 'middle' }}
                                                            >
                                                                <FormControl size="small" sx={{ minWidth: '100px', width: '100%', maxWidth: '100px' }}>
                                                                    <Select
                                                                        value={newRecord.shift_id}
                                                                        onChange={(e) => updateNewRecord(recordKey, 'shift_id', e.target.value)}
                                                                        disabled={isSaving}
                                                                        displayEmpty
                                                                        sx={{
                                                                            height: '32px',
                                                                            '& .MuiSelect-select': { fontSize: '0.875rem', py: '6px', px: '8px', textAlign: 'center' },
                                                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                                                        }}
                                                                    >
                                                                        <MenuItem value="">Select Shift</MenuItem>
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
                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                sx={{ py: 0.5, textAlign: 'center', verticalAlign: 'middle' }}
                                                            >
                                                                <TextField
                                                                    type="text"
                                                                    value={newRecord[column.id as keyof NewRecord] as string}
                                                                    placeholder="HH:MM"
                                                                    variant="outlined"
                                                                    size="small"
                                                                    onChange={(e) => {
                                                                        const raw = e.target.value.replace(/[^\d:]/g, '');
                                                                        updateNewRecord(recordKey, column.id as keyof NewRecord, raw);
                                                                    }}
                                                                    onBlur={() => {
                                                                        const formattedTime = validateAndFormatTime(newRecord[column.id as keyof NewRecord] as string);
                                                                        updateNewRecord(recordKey, column.id as keyof NewRecord, formattedTime);
                                                                    }}
                                                                    disabled={isSaving}
                                                                    sx={{
                                                                        width: '70px',
                                                                        '& .MuiInputBase-input': { fontSize: '0.875rem', textAlign: 'center' },
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (column.id === 'totalHours') {
                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                sx={{ py: 0.5, textAlign: 'center', verticalAlign: 'middle' }}
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    color="primary"
                                                                    onClick={() => saveNewRecord(recordKey)}
                                                                    disabled={isSaving || !newRecord.shift_id || !newRecord.start || !newRecord.end}
                                                                    sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}
                                                                >
                                                                    {isSaving ? 'Saving...' : 'Save'}
                                                                </Button>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (column.id === 'priceWorkAmount') {
                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                sx={{ py: 0.5, textAlign: 'center', verticalAlign: 'middle' }}
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    onClick={() => cancelNewRecord(recordKey)}
                                                                    disabled={isSaving}
                                                                    sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (column.id === 'project') {
                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                sx={{ py: 0.5, fontSize: '0.875rem', textAlign: 'center', verticalAlign: 'middle' }}
                                                            >
                                                                --
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
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                            height: '45px',
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
                                                                    <IconTrash size={18} />
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

                                        {row.getIsExpanded() &&
                                            row.original.userChecklogs &&
                                            row.original.userChecklogs.length > 0 && (
                                                <CheckLogRows
                                                    logs={row.original.userChecklogs || []}
                                                    currency={currency}
                                                    formatHour={formatHour}
                                                    visibleColumnConfigs={visibleColumnConfigs}
                                                    getVisibleCellsLength={row.getVisibleCells().length}
                                                />
                                            )}
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
