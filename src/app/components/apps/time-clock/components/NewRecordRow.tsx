import React, {useEffect, useState} from 'react';
import {
    TableRow,
    TableCell,
    FormControl,
    Select,
    MenuItem,
    TextField,
} from '@mui/material';
import {NewRecord, Shift, Project} from '@/app/components/apps/time-clock/types/timeClock';
import {DateTime} from 'luxon';

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
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const [blurredFields, setBlurredFields] = useState<{ start: boolean; end: boolean }>({start: false, end: false});

    const isRowEmpty = !newRecord.shift_id && !newRecord.start && !newRecord.end;
    if (isRowEmpty) {
        return null;
    }

   useEffect(() => {
        if (!newRecord.project_id && projects.length > 0) {
            updateNewRecord(recordKey, 'project_id', projects[0].id);
        }
        if (!newRecord.shift_id && shifts.length > 0) {
            updateNewRecord(recordKey, 'shift_id', shifts[0].id);
        }
    }, [
        newRecord.project_id,
        newRecord.shift_id,
        projects,
        shifts,
        recordKey,
        updateNewRecord
    ]);


    const handleBlur = (field: 'start' | 'end') => {
        const formattedTime = validateAndFormatTime((newRecord[field] as string) || '');
        updateNewRecord(recordKey, field, formattedTime);
        setBlurredFields((prev) => ({...prev, [field]: true}));
    };

    useEffect(() => {
    if (isSaving) return;
        const { shift_id, start, end } = newRecord;
        const allFilled =
            shift_id &&
            start &&
            end &&
            blurredFields.start &&
            blurredFields.end;

        if (allFilled) {
            const formattedStart = validateAndFormatTime(start);
            const formattedEnd = validateAndFormatTime(end);
            const parsedDate = DateTime.fromFormat(newRecord.date, 'ccc d/M');

            const valid =
                timeRegex.test(formattedStart) &&
                timeRegex.test(formattedEnd) &&
                parsedDate.isValid;

            if (valid) {
                saveNewRecord(recordKey);
            }
        }
    }, [
        newRecord.shift_id,
        newRecord.start,
        newRecord.end,
        newRecord.date,
        blurredFields.start,
        blurredFields.end,
        isSaving,
        recordKey,
        saveNewRecord,
        validateAndFormatTime
    ]);

    return (
        <TableRow
            key={recordKey}
            sx={{
                '& td': {textAlign: 'center'},
            }}
        >
            {visibleColumnConfigs.exclamation?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5,
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important'
                    }}
                >
                </TableCell>
            )}
            {visibleColumnConfigs.expander?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5,
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important'
                    }}
                >
                </TableCell>
            )}
            
            {visibleColumnConfigs.project?.visible && (
                <TableCell align="center" sx={{
                    py: 0.5,
                    width: '100%',
                    minHeight: '45px',
                    borderBottom: '1px solid rgba(224, 224, 224, 1) !important',
                }}>
                    <FormControl size="small" sx={{minWidth: '100px', width: '100%', maxWidth: '100px'}}>
                        <Select
                            value={newRecord.project_id || ''}
                            onChange={(e) => updateNewRecord(recordKey, 'project_id', e.target.value)}
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
                                '& .MuiOutlinedInput-notchedOutline': {borderColor: '#e0e0e0'},
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
            )}

            {visibleColumnConfigs.shift?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: '45px',
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important',
                    }}
                >
                    <FormControl size="small" sx={{minWidth: '100px', width: '100%', maxWidth: '100px'}}>
                        <Select
                            value={newRecord.shift_id || ''}
                            onChange={(e) => updateNewRecord(recordKey, 'shift_id', e.target.value)}
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
                                '& .MuiOutlinedInput-notchedOutline': {borderColor: '#e0e0e0'},
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
            )}

            {['start', 'end'].map(
                (field) =>
                    visibleColumnConfigs[field]?.visible && (
                        <TableCell key={field} align="center"
                                   sx={{py: 0.5, borderBottom: '1px solid rgba(224, 224, 224, 1) !important',}}>
                            <TextField
                                type="text"
                                value={(newRecord[field as keyof NewRecord] as string) || ''}
                                placeholder="HH:MM"
                                variant="outlined"
                                size="small"
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d:]/g, '');
                                    updateNewRecord(recordKey, field as keyof NewRecord, raw);
                                }}
                                onBlur={() => handleBlur(field as 'start' | 'end')}
                                disabled={isSaving}
                                sx={{
                                    width: '70px',
                                    '& .MuiInputBase-input': {fontSize: '0.75rem', textAlign: 'center'},
                                }}
                            />
                        </TableCell>
                    )
            )}

            {visibleColumnConfigs.totalHours?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5,
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important'
                    }}
                > --
                </TableCell>
            )}

            {visibleColumnConfigs.priceWorkAmount?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5, 
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important'
                    }}
                >--
                </TableCell>
            )}

            {visibleColumnConfigs.checkIns?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5,
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important'
                    }}
                >--
                </TableCell>
            )}

            {visibleColumnConfigs.action?.visible && (
                <TableCell
                    align="center"
                    sx={{
                        py: 0.5,
                        borderBottom: '1px solid rgba(224, 224, 224, 1) !important'
                    }}
                >--
                </TableCell>
            )}
        </TableRow>
    );
};

export default NewRecordRow;
