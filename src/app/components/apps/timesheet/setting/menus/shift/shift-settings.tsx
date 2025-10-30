'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    TextField,
    Typography,
    Button,
    Switch,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import api from '@/utils/axios';
import { IconHelp, IconX } from '@tabler/icons-react';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import IOSSwitch from '@/app/components/common/IOSSwitch';

interface ShiftBreak {
    id?: number;
    start: string;
    end: string;
}

interface ShiftDetails {
    id: number;
    company_id: number;
    shift_name: string;
    is_pricework: boolean;
    workDays: boolean[];
    dayLength: number[];
    start_time: string;
    end_time: string;
    is_archive: boolean;
    status: boolean;
    shift_breaks: ShiftBreak[];
    default_start_time: string;
    default_end_time: string;
}

interface ShiftSettingProps {
    shiftId?: number;
    onSaveSuccess: () => void;
    onClose: () => void;
}

const parseTimeString = (timeString: string | null): Dayjs | null => {
    if (!timeString) return null;
    const parsed = dayjs(timeString, 'HH:mm');
    return parsed.isValid() ? parsed : null;
};

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const DAY_NAMES = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
] as const;

interface WorkDaySelectorProps {
    workDays: boolean[];
    dayLength: number[];
    onDayClick: (index: number) => void;
    onDayLengthChange: (index: number, value: string) => void;
}

interface ShiftPayload {
    shift_id: number | null;
    shift_name: string;
    is_pricework: boolean;
    days: any;
    start_time: string;
    end_time: string;
    shift_breaks: any;
    is_archive: boolean;
    status: boolean;
    company_id: string | number;
    default_start_time: string;
    default_end_time: string;
    deleted_break_ids?: number[];
}

const WorkDaySelector = React.memo<WorkDaySelectorProps>(
    ({ workDays, dayLength, onDayClick, onDayLengthChange }) => {
        const selectedCount = useMemo(() => workDays.filter(Boolean).length, [workDays]);

        return (
            <Box display="flex" gap={3} sx={{ height: 90 }}>
                {DAYS.map((day, index) => {
                    const isSelected = workDays[index];
                    const canToggle = selectedCount > 1 || !isSelected;

                    return (
                        <Box
                            key={index}
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ width: 32 }}
                        >
                            <Box
                                onClick={() => canToggle && onDayClick(index)}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: isSelected ? '#1976d2' : '#e0e0e0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isSelected ? 'white' : '#666',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: canToggle ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        backgroundColor: isSelected
                                            ? '#1565c0'
                                            : canToggle
                                                ? '#d5d5d5'
                                                : '#e0e0e0',
                                    },
                                }}
                                title={
                                    canToggle
                                        ? `Click to toggle ${DAY_NAMES[index]}`
                                        : 'At least one day must be selected'
                                }
                            >
                                {day}
                            </Box>
                            <Typography
                                sx={{ backgroundColor: '#d3d3d3', width: '1px', height: '26px' }}
                            />
                            <TextField
                                type="text"
                                value={dayLength[index]}
                                onChange={(e) => onDayLengthChange(index, e.target.value)}
                                size="small"
                                disabled={!isSelected}
                                sx={{
                                    width: 32,
                                    '& .MuiOutlinedInput-root': { height: 32, fontSize: '0.75rem' },
                                    '& .MuiOutlinedInput-input': { textAlign: 'center', padding: '4px 2px' },
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        WebkitTextFillColor: '#666',
                                        backgroundColor: '#f5f5f5',
                                    },
                                }}
                                inputProps={{ min: 0, max: 24 }}
                            />
                        </Box>
                    );
                })}
            </Box>
        );
    }
);

WorkDaySelector.displayName = 'WorkDaySelector';

const ShiftSetting: React.FC<ShiftSettingProps> = ({ shiftId, onSaveSuccess, onClose }) => {
    const isNewShift = !shiftId;

    const [shiftDetail, setShiftDetail] = useState<ShiftDetails>({
        id: 0,
        company_id: 0,
        shift_name: '',
        is_pricework: false,
        workDays: [true, true, true, true, true, false, false],
        dayLength: Array(7).fill(8),
        start_time: '09:00',
        end_time: '17:00',
        is_archive: false,
        status: true,
        shift_breaks: [],
        default_start_time: '08:00',
        default_end_time: '17:00',
    });
    const [breaksEnabled, setBreaksEnabled] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [deletedBreakIds, setDeletedBreakIds] = useState<number[]>([]);

    useEffect(() => {
        if (!isNewShift) {
            const fetchShiftSettings = async () => {
                try {
                    const response = await api.get(`/setting/get-shift-details`, {
                        params: { shift_id: shiftId },
                    });
                    if (response.data?.IsSuccess) {
                        const data = response.data.info;

                        const daysMap: Record<string, number> = {
                            monday: 0,
                            tuesday: 1,
                            wednesday: 2,
                            thursday: 3,
                            friday: 4,
                            saturday: 5,
                            sunday: 6,
                        };
                        const workDays = Array(7).fill(false);
                        data.days.forEach((d: any) => {
                            const idx = daysMap[d.name.toLowerCase()];
                            if (idx !== undefined) {
                                workDays[idx] = d.status;
                            }
                        });
                        const dayLength = Array(7).fill(8);
                        const shiftBreaks = data.shift_breaks
                            ? data.shift_breaks.map((b: any) => ({
                                id: b.id,
                                start: b.break_start_time,
                                end: b.break_end_time,
                            }))
                            : [];
                        setShiftDetail({
                            id: data.id,
                            company_id: data.company_id,
                            shift_name: data.name || '',
                            is_pricework: data.is_pricework || false,
                            workDays,
                            dayLength,
                            start_time: data.start_time || '09:00',
                            end_time: data.end_time || '17:00',
                            is_archive: data.is_archive || false,
                            status: data.status || true,
                            shift_breaks: shiftBreaks,
                            default_start_time: data.default_start_time || '08:00',
                            default_end_time: data.default_end_time || '17:00',
                        });
                        setBreaksEnabled(shiftBreaks.length > 0);
                    } else {
                        setErrorMessage('Failed to load shift settings');
                    }
                } catch (error) {
                    setErrorMessage('Failed to load shift settings');
                }
            };

            fetchShiftSettings();
        }
    }, [shiftId, isNewShift]);

    const startTimeObj = useMemo(() => parseTimeString(shiftDetail.default_start_time), [shiftDetail.default_start_time]);
    const endTimeObj = useMemo(() => parseTimeString(shiftDetail.default_end_time), [shiftDetail.default_end_time]);

    const updateShiftSettings = useCallback((updates: Partial<ShiftDetails>) => {
        setShiftDetail((prev) => ({ ...prev, ...updates }));
    }, []);

    const handleInputChange = (field: keyof ShiftDetails) => (value: string | boolean | number) => {
        updateShiftSettings({ [field]: value });
    };

    const handleTimeChange = (field: 'start_time' | 'end_time') => (newValue: Dayjs | null) => {
        updateShiftSettings({
            [field]: newValue ? newValue.format('HH:mm') : shiftDetail[field],
        });
    };

    const handleBreakChange = (index: number, field: 'start' | 'end', value: Dayjs | null) => {
        const updatedBreaks = [...shiftDetail.shift_breaks];
        const newTime = value ? value.format('HH:mm') : '';
        updatedBreaks[index] = {
            ...updatedBreaks[index],
            [field]: newTime,
        };

        const breakItem = updatedBreaks[index];
        if (breakItem.start && breakItem.end && breakItem.start === breakItem.end) {
            setErrorMessage('Break start time and end time cannot be the same');
            return;
        }

        updateShiftSettings({ shift_breaks: updatedBreaks });
    };

    const addBreak = () => {
        let newStartTime = 13;
        let newEndTime = 14;

        while (
            shiftDetail.shift_breaks.some(
                (b) => b.start === `${String(newStartTime).padStart(2, '0')}:00`
            )
            ) {
            newStartTime++;
            newEndTime++;

            if (newStartTime >= 24) {
                newStartTime = 0;
                newEndTime = 1;
                break;
            }
        }

        const formattedStart = `${String(newStartTime).padStart(2, '0')}:00`;
        const formattedEnd = `${String(newEndTime).padStart(2, '0')}:00`;

        updateShiftSettings({
            shift_breaks: [...shiftDetail.shift_breaks, { start: formattedStart, end: formattedEnd }],
        });
    };

    const removeBreak = (index: number) => {
        const breakToRemove = shiftDetail.shift_breaks[index];

        if (breakToRemove.id) {
            setDeletedBreakIds((prev) => [...prev, breakToRemove.id!]);
        }

        updateShiftSettings({
            shift_breaks: shiftDetail.shift_breaks.filter((_, i) => i !== index),
        });
    };

    const handleBreaksToggle = () => {
        setBreaksEnabled((prev) => {
            if (prev) {
                updateShiftSettings({ shift_breaks: [] });
            } else {
                updateShiftSettings({ shift_breaks: [{ start: '13:00', end: '14:00' }] });
            }
            return !prev;
        });
    };

    const handleSave = async () => {
        try {
            if (breaksEnabled && shiftDetail.shift_breaks.length > 0) {
                const invalidBreak = shiftDetail.shift_breaks.find(
                    (b) => b.start && b.end && b.start === b.end
                );
                if (invalidBreak) {
                    setErrorMessage('Break start time and end time cannot be the same');
                    return;
                }

                for (let i = 0; i < shiftDetail.shift_breaks.length; i++) {
                    for (let j = i + 1; j < shiftDetail.shift_breaks.length; j++) {
                        const break1 = shiftDetail.shift_breaks[i];
                        const break2 = shiftDetail.shift_breaks[j];

                        if (break1.start === break2.start) {
                            setErrorMessage(`Breaks cannot have the same start time`);
                            return;
                        }

                        if (break1.end === break2.end) {
                            setErrorMessage(`Breaks cannot have the same end time`);
                            return;
                        }

                        const start1 = dayjs(break1.start, 'HH:mm');
                        const end1 = dayjs(break1.end, 'HH:mm');
                        const start2 = dayjs(break2.start, 'HH:mm');
                        const end2 = dayjs(break2.end, 'HH:mm');

                        if (
                            (start2.isAfter(start1) && start2.isBefore(end1)) ||
                            (end2.isAfter(start1) && end2.isBefore(end1)) ||
                            (start1.isAfter(start2) && start1.isBefore(end2)) ||
                            (end1.isAfter(start2) && end1.isBefore(end2)) ||
                            (start1.isSame(start2) && end1.isSame(end2))
                        ) {
                            setErrorMessage(`Break times cannot overlap (${break1.start}-${break1.end} and ${break2.start}-${break2.end})`);
                            return;
                        }
                    }
                }
            }

            const days = DAY_NAMES.map((fullName, idx) => ({
                name: fullName.toLowerCase(),
                status: shiftDetail.workDays[idx],
                day_length: shiftDetail.dayLength[idx],
            }));

            const shift_breaks = shiftDetail.shift_breaks.map((b) => ({
                id: b.id || null,
                break_start_time: b.start,
                break_end_time: b.end,
            }));

            const payload: ShiftPayload = {
                shift_id: isNewShift ? null : (shiftId as number),
                shift_name: shiftDetail.shift_name,
                is_pricework: shiftDetail.is_pricework,
                days,
                start_time: shiftDetail.start_time,
                end_time: shiftDetail.end_time,
                shift_breaks,
                is_archive: shiftDetail.is_archive,
                status: shiftDetail.status,
                company_id: shiftDetail.company_id,
                default_start_time: shiftDetail.default_start_time,
                default_end_time: shiftDetail.default_end_time,
                deleted_break_ids: deletedBreakIds,
            };

            const response = await api.post('/setting/save-shift-setting', payload);

            if (response.data?.IsSuccess) {
                setDeletedBreakIds([]);
                onSaveSuccess();
            } else {
                setErrorMessage(response.data?.message || 'Failed to save shift settings');
            }
        } catch (error) {
            setErrorMessage('Error saving shift settings. Please try again.');
        }
    };

    const handleDayClick = useCallback(
        (index: number) => {
            const selectedCount = shiftDetail.workDays.filter(Boolean).length;
            const isSelected = shiftDetail.workDays[index];
            if (selectedCount === 1 && isSelected) return;
            const updatedWorkDays = shiftDetail.workDays.map((w, i) => (i === index ? !w : w));
            updateShiftSettings({ workDays: updatedWorkDays });
        },
        [shiftDetail.workDays, updateShiftSettings]
    );

    const handleDayLengthChange = useCallback(
        (index: number, value: string) => {
            const newValue = Math.max(0, Math.min(24, parseInt(value) || 0));
            const updatedDayLength = shiftDetail.dayLength.map((l, i) =>
                i === index ? newValue : l
            );
            updateShiftSettings({ dayLength: updatedDayLength });
        },
        [shiftDetail.dayLength, updateShiftSettings]
    );

    const handleDefaultTimeChange = useCallback(
        (field: 'default_start_time' | 'default_end_time') => (newValue: Dayjs | null) => {
            updateShiftSettings({ [field]: newValue ? newValue.format('HH:mm') : null });
        },
        [updateShiftSettings]
    );

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box
                    sx={{
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        bgcolor: '#fff',
                        flexShrink: 0,
                    }}
                >
                    <Typography variant="h6">{isNewShift ? 'Add Shift' : 'Edit Shift'}</Typography>
                    <IconButton color="inherit" onClick={onClose}>
                        <IconX size="21" />
                    </IconButton>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        bgcolor: '#f5f5f5',
                        p: 2,
                        '&::-webkit-scrollbar': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#ccc',
                            borderRadius: '4px',
                        },
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: '#fff',
                            borderRadius: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            mb: 2,
                        }}
                    >
                        <TextField
                            label="Shift Name"
                            value={shiftDetail.shift_name}
                            onChange={(e) => handleInputChange('shift_name')(e.target.value)}
                            fullWidth
                            variant="outlined"
                            size="small"
                            sx={{
                                mb: 1,
                                '& .MuiInputBase-input': {
                                    textAlign: 'left !important',
                                },
                            }}
                        />
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            bgcolor: '#fff',
                            borderRadius: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            mb: 2,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                            <Typography sx={{ width: '80px', flexShrink: 0 }} variant="body2">Start Shift</Typography>
                            <TimePicker
                                value={dayjs(shiftDetail.start_time, 'HH:mm')}
                                onChange={handleTimeChange('start_time')}
                                ampm={false}
                                format="HH:mm"
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        sx: {
                                            width: '150px',
                                            '& .MuiSvgIcon-root': {
                                                width: '18px',
                                                height: '18px',
                                            },
                                            '& .MuiFormHelperText-root': {
                                                display: 'none',
                                            },
                                        },
                                    },
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ width: '80px', flexShrink: 0 }} variant="body2">End Shift</Typography>
                            <TimePicker
                                value={dayjs(shiftDetail.end_time, 'HH:mm')}
                                onChange={handleTimeChange('end_time')}
                                ampm={false}
                                format="HH:mm"
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        sx: {
                                            width: '150px',
                                            '& .MuiSvgIcon-root': {
                                                width: '18px',
                                                height: '18px',
                                            },
                                            '& .MuiFormHelperText-root': {
                                                display: 'none',
                                            },
                                        },
                                    },
                                }}
                            />
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            bgcolor: '#fff',
                            borderRadius: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            mb: 2,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Breaks</Typography>
                            <IOSSwitch
                                checked={breaksEnabled}
                                onChange={handleBreaksToggle}
                                color="primary"
                            />
                        </Box>
                        {breaksEnabled && (
                            <>
                                {shiftDetail.shift_breaks.map((breakItem, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 2,
                                            mb: 2,
                                            p: 2,
                                            border: '1px solid #e0e0e0',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Box sx={{ flex: 1 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 2,
                                                }}
                                            >
                                                <Typography sx={{ width: '80px', flexShrink: 0 }} variant="body2">Start Break</Typography>
                                                <TimePicker
                                                    value={dayjs(breakItem.start, 'HH:mm')}
                                                    onChange={(value) => handleBreakChange(index, 'start', value)}
                                                    ampm={false}
                                                    format="HH:mm"
                                                    viewRenderers={{
                                                        hours: renderTimeViewClock,
                                                        minutes: renderTimeViewClock,
                                                        seconds: renderTimeViewClock,
                                                    }}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small',
                                                            sx: {
                                                                width: '150px',
                                                                '& .MuiSvgIcon-root': {
                                                                    width: '18px',
                                                                    height: '18px',
                                                                },
                                                                '& .MuiFormHelperText-root': {
                                                                    display: 'none',
                                                                },
                                                            },
                                                        },
                                                    }}
                                                />
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography sx={{ width: '80px', flexShrink: 0 }} variant="body2">End Break</Typography>
                                                <TimePicker
                                                    value={dayjs(breakItem.end, 'HH:mm')}
                                                    onChange={(value) => handleBreakChange(index, 'end', value)}
                                                    ampm={false}
                                                    format="HH:mm"
                                                    viewRenderers={{
                                                        hours: renderTimeViewClock,
                                                        minutes: renderTimeViewClock,
                                                        seconds: renderTimeViewClock,
                                                    }}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small',
                                                            sx: {
                                                                width: '150px',
                                                                '& .MuiSvgIcon-root': {
                                                                    width: '18px',
                                                                    height: '18px',
                                                                },
                                                                '& .MuiFormHelperText-root': {
                                                                    display: 'none',
                                                                },
                                                            },
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                        <IconButton
                                            onClick={() => removeBreak(index)}
                                            color="error"
                                            size="small"
                                            sx={{ mt: 1 }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Button variant="text" onClick={addBreak} sx={{ color: '#1976d2' }}>
                                    + Add another break
                                </Button>
                            </>
                        )}
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            bgcolor: '#fff',
                            borderRadius: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            mb: 2,
                        }}
                    >
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Select Days
                        </Typography>
                        <WorkDaySelector
                            workDays={shiftDetail.workDays}
                            dayLength={shiftDetail.dayLength}
                            onDayClick={handleDayClick}
                            onDayLengthChange={handleDayLengthChange}
                        />
                    </Box>
                </Box>
            </LocalizationProvider>

            <Box
                sx={{
                    bgcolor: '#fff',
                    p: 2,
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                    textAlign: 'right',
                    flexShrink: 0,
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                >
                    Save
                </Button>
            </Box>

            <Snackbar
                open={!!errorMessage}
                autoHideDuration={6000}
                onClose={() => setErrorMessage(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ShiftSetting;
