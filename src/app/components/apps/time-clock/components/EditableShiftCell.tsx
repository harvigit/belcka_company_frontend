import React from 'react';
import { Box, FormControl, Select, MenuItem } from '@mui/material';
import {Shift} from '@/app/components/apps/time-clock/types/timeClock';

interface EditableShiftCellProps {
    worklogId: string;
    currentShiftId: number | string;
    currentShiftName: string;
    log: any;
    shifts: Shift[];
    editingShifts: { [key: string]: { shift_id: number | string; editingField: 'shift' } };
    savingWorklogs: Set<string>;
    startEditingShift: (worklogId: string, currentShiftId: number | string, log: any) => void;
    updateEditingShift: (worklogId: string, shiftId: number | string) => void;
    saveShiftChanges: (worklogId: string, originalLog: any) => void;
    cancelEditingShift: (worklogId: string) => void;
}

const EditableShiftCell: React.FC<EditableShiftCellProps> = ({
                                                                 worklogId,
                                                                 currentShiftId,
                                                                 currentShiftName,
                                                                 log,
                                                                 shifts,
                                                                 editingShifts,
                                                                 savingWorklogs,
                                                                 startEditingShift,
                                                                 updateEditingShift,
                                                                 saveShiftChanges,
                                                                 cancelEditingShift,
                                                             }) => {
    const editingData = editingShifts[worklogId];
    const isEditing = editingData && editingData.editingField === 'shift';
    const isSaving = savingWorklogs.has(worklogId);
    const isLocked = log?.status === 6 || log?.status === '6';

    if (isEditing && !isLocked) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '32px' }}>
                <FormControl size="small" sx={{ minWidth: '100px', width: '100%', maxWidth: '100px' }}>
                    <Select
                        value={editingData.shift_id || ''}
                        onChange={(e) => updateEditingShift(worklogId, e.target.value)}
                        onBlur={() => saveShiftChanges(worklogId, log)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                saveShiftChanges(worklogId, log);
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditingShift(worklogId);
                            }
                        }}
                        autoFocus
                        disabled={isSaving}
                        sx={{
                            height: '32px',
                            '& .MuiSelect-select': { fontSize: '0.875rem', py: '6px', px: '8px', textAlign: 'center' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }
                        }}
                    >
                        {shifts.map((shift) => (
                            <MenuItem key={shift.id} value={shift.id}>
                                {shift.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        );
    }

    return (
        <Box
            onClick={() => !isLocked && startEditingShift(worklogId, currentShiftId, log)}
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
            title={isLocked ? 'This worklog is locked and cannot be edited' : 'Click to edit shift'}
        >
            {currentShiftName || '--'}
        </Box>
    );
}; 
export default EditableShiftCell;
