import React from 'react';
import { Box, TextField } from '@mui/material';
import {EditingWorklog} from '@/app/components/apps/time-clock/types/timeClock';

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

    if (isEditing && !isLocked) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '32px' }}>
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
                        width: '70px',
                        '& .MuiInputBase-root': { height: '32px' },
                        '& .MuiInputBase-input': { fontSize: '0.875rem', textAlign: 'center', p: '6px 8px' }
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
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLocked ? 0.6 : 1,
                '&:hover': !isLocked ? { borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.04)' } : {},
            }}
            title={isLocked ? 'This worklog is locked and cannot be edited' : 'Click to edit'}
        >
            {sanitizeDateTime(currentValue)}
        </Box>
    );
};

export default EditableTimeCell;
