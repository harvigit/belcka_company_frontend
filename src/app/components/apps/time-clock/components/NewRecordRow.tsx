import React from 'react';
import { TableRow, TableCell, FormControl, Select, MenuItem, TextField, Button, Stack } from '@mui/material';
import {NewRecord, Shift, Project} from '@/app/components/apps/time-clock/types/timeClock';

interface NewRecordRowProps {
    recordKey: string;
    newRecord: NewRecord;
    shifts: Shift[];
    projects: Project[];
    isSaving: boolean;
    visibleColumnConfigs: any;
    validateAndFormatTime: (value: string) => string;
    updateNewRecord: (recordKey: string, field: keyof NewRecord, value: string | number) => void;
    saveNewRecord: (recordKey: string) => void;
    cancelNewRecord: (recordKey: string) => void;
}

const NewRecordRow: React.FC<NewRecordRowProps> = ({
                                                       recordKey,
                                                       newRecord,
                                                       shifts,
                                                       projects,
                                                       isSaving,
                                                       visibleColumnConfigs,
                                                       validateAndFormatTime,
                                                       updateNewRecord,
                                                       saveNewRecord,
                                                       cancelNewRecord,
                                                   }) => {


    return (
        <TableRow
            key={recordKey}
            sx={{
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                '& td': { textAlign: 'center' },
            }}
        >
            {visibleColumnConfigs.exclamation?.visible && <TableCell align="center" sx={{ py: 0.5 }}></TableCell>}
            {visibleColumnConfigs.expander?.visible && <TableCell align="center" sx={{ py: 0.5 }}></TableCell>}
            
            {visibleColumnConfigs.project?.visible && (
                <>
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
                </>
            )}

            {visibleColumnConfigs.shift?.visible && (
                <TableCell align="center" sx={{ py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '45px' }}>
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
            )}

            {['start', 'end'].map((field) =>
                    visibleColumnConfigs[field]?.visible && (
                        <TableCell key={field} align="center" sx={{ py: 0.5 }}>
                            <TextField
                                type="text"
                                value={newRecord[field as keyof NewRecord] as string}
                                placeholder="HH:MM"
                                variant="outlined"
                                size="small"
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d:]/g, '');
                                    updateNewRecord(recordKey, field as keyof NewRecord, raw);
                                }}
                                onBlur={() => {
                                    const formattedTime = validateAndFormatTime(newRecord[field as keyof NewRecord] as string);
                                    updateNewRecord(recordKey, field as keyof NewRecord, formattedTime);
                                }}
                                disabled={isSaving}
                                sx={{
                                    width: '70px',
                                    '& .MuiInputBase-input': { fontSize: '0.875rem', textAlign: 'center' },
                                }}
                            />
                        </TableCell>
                    )
            )}

            {visibleColumnConfigs.totalHours?.visible && (
                <TableCell align="center" sx={{ py: 0.5 }}>
                    <Stack direction="row" justifyContent="center" spacing={1} alignItems="center">
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
                    </Stack>
                </TableCell>
            )}

            {visibleColumnConfigs.priceWorkAmount?.visible && (
                <TableCell align="center" sx={{ py: 0.5 }}>
                    <Stack direction="row" justifyContent="center" spacing={1} alignItems="center">
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => cancelNewRecord(recordKey)}
                            disabled={isSaving}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}
                        >
                            Cancel
                        </Button>
                    </Stack>
                </TableCell>
            )}
        </TableRow>
    );
};
export default NewRecordRow;
