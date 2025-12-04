import React, { useState } from 'react';
import { Box, TextField, Tooltip } from '@mui/material';
import { IconPointFilled } from '@tabler/icons-react';

interface EditingWorklog {
    editingField?: 'start' | 'end' | 'shift';
    start?: string;
    end?: string;
}

interface EditableTimeCellProps {
    worklogId: string;
    field: 'start' | 'end';
    currentValue: string;
    log: any;
    editingWorklogs: { [key: string]: EditingWorklog };
    savingWorklogs: Set<string>;
    sanitizeDateTime: (dateTime: string) => string;
    validateAndFormatTime: (value: string) => string;
    updateEditingField: (worklogId: string, field: keyof EditingWorklog, value: string) => void;
    startEditingField: (worklogId: string, field: 'start' | 'end', log: any) => void;
    cancelEditingField: (worklogId: string) => void;
    saveFieldChanges: (worklogId: string, originalLog: any) => void;
}

const EditableTimeCell: React.FC<EditableTimeCellProps> = ({
                                                               worklogId,
                                                               field,
                                                               currentValue,
                                                               log,
                                                               editingWorklogs,
                                                               savingWorklogs,
                                                               sanitizeDateTime,
                                                               validateAndFormatTime,
                                                               updateEditingField,
                                                               startEditingField,
                                                               cancelEditingField,
                                                               saveFieldChanges,
                                                           }) => {
    const editingData = editingWorklogs[worklogId];
    const isEditing = editingData && editingData.editingField === field;
    const isSaving = savingWorklogs.has(worklogId);
    const isLocked = log?.status === 6 || log?.status === '6';

    const isEdited = field === 'start' ? !!log?.start_time_edited_by : !!log?.end_time_edited_by;
    const editedByName = field === 'start' ? log?.start_time_edited_by_name : log?.end_time_edited_by_name;
    const editedAt = field === 'start' ? log?.start_time_edited_at : log?.end_time_edited_at;

    const isConflictResolved = log?.is_conflict_resolved;
    const conflictResolvedBy = log?.conflict_resolved_by_name ?? null;

    const [isIconHovered, setIsIconHovered] = useState(false);

    const tooltipStyles = {
        '& .MuiTooltip-arrow': { color: '#1a1f29' },
    };

    if (isEditing && !isLocked) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'fit-content',
                    minHeight: '32px',
                    px: '8px',
                    position: 'relative',
                }}
            >
                {isEdited && (
                    <Tooltip
                        title={`Modified by ${editedByName} on ${editedAt}`}
                        arrow
                        placement="top"
                        sx={tooltipStyles}
                    >
                        <Box
                            component="span"
                            sx={{
                                position: 'absolute',
                                left: '-10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                zIndex: 1,
                                '&:hover': {
                                    cursor: 'pointer',
                                },
                            }}
                            onMouseEnter={() => setIsIconHovered(true)}
                            onMouseLeave={() => setIsIconHovered(false)}
                        >
                            <IconPointFilled size={18} style={{ color: '#ff9800' }} />
                        </Box>
                    </Tooltip>
                )}
                <TextField
                    type="text"
                    value={editingData[field] || ''}
                    placeholder="HH:MM"
                    variant="outlined"
                    size="small"
                    onChange={(e) => updateEditingField(worklogId, field, e.target.value)}
                    onBlur={() => {
                        const inputValue = editingData[field] || '';
                        const formattedTime = validateAndFormatTime(inputValue);
                        const originalValue = sanitizeDateTime(currentValue);

                        if (formattedTime && formattedTime !== originalValue) {
                            updateEditingField(worklogId, field, formattedTime);
                            saveFieldChanges(worklogId, log);
                        } else {
                            cancelEditingField(worklogId);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const inputValue = editingData[field] || '';
                            const formattedTime = validateAndFormatTime(inputValue);
                            const originalValue = sanitizeDateTime(currentValue);

                            if (formattedTime && formattedTime !== originalValue) {
                                updateEditingField(worklogId, field, formattedTime);
                                saveFieldChanges(worklogId, log);
                            } else {
                                cancelEditingField(worklogId);
                            }
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditingField(worklogId);
                        }
                    }}
                    autoFocus
                    disabled={isSaving}
                    sx={{
                        width: 'auto',
                        minWidth: '60px',
                        '& .MuiInputBase-root': {
                            height: '32px',
                            fontSize: '0.875rem',
                            borderRadius: '4px',
                        },
                        '& .MuiInputBase-input': {
                            p: '6px 8px',
                            textAlign: 'center',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isSaving ? 'grey.500' : '#1976d2',
                        },
                    }}
                />
            </Box>
        );
    }

    const cellContent = (
        <Box
            onClick={() => !isLocked && startEditingField(worklogId, field, log)}
            sx={{
                py: 0.5,
                fontSize: '0.875rem',
                cursor: isLocked ? 'not-allowed' : 'text',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLocked ? 0.6 : 1,
                borderRadius: '4px',
                px: '8px',
                position: 'relative',
                color: isConflictResolved ? '#d32f2f' : 'inherit',
                '&:hover': !isLocked
                    ? {
                        borderColor: '#1976d2',
                        boxShadow: '0 0 0 1px #1976d2',
                    }
                    : {},
            }}
        >
            {isEdited && (
                <Tooltip
                    title={`Modified by ${editedByName} on ${editedAt}`}
                    arrow
                    placement="top"
                    sx={tooltipStyles}
                >
                    <Box
                        component="span"
                        sx={{
                            position: 'absolute',
                            left: '-10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            zIndex: 1,
                            '&:hover': {
                                cursor: 'pointer',
                            },
                        }}
                        onMouseEnter={() => setIsIconHovered(true)}
                        onMouseLeave={() => setIsIconHovered(false)}
                    >
                        <IconPointFilled size={18} style={{ color: '#ff9800' }} />
                    </Box>
                </Tooltip>
            )}
            {sanitizeDateTime(currentValue)}
        </Box>
    );

    // Determine tooltip content
    let tooltipTitle = '';
    if (isConflictResolved && conflictResolvedBy) {
        tooltipTitle = `Conflict resolved by ${conflictResolvedBy}`;
    } else if (isLocked) {
        tooltipTitle = 'This worklog is locked and cannot be edited';
    }

    return isEdited && editedByName && editedAt ? (
        <Tooltip
            title={isIconHovered ? '' : tooltipTitle}
            arrow
            placement="top"
            sx={tooltipStyles}
        >
            <Box title={isLocked ? 'This worklog is locked and cannot be edited' : ''}>
                {cellContent}
            </Box>
        </Tooltip>
    ) : (
        <Tooltip
            title={tooltipTitle}
            arrow
            placement="top"
            sx={tooltipStyles}
        >
            <Box title={isLocked ? 'This worklog is locked and cannot be edited' : ''}>
                {cellContent}
            </Box>
        </Tooltip>
    );
};

export default EditableTimeCell;
