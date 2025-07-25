import {
    Box,
    Button,
    IconButton,
    Popover,
    TextField,
    Typography,
    CircularProgress,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import api from '@/utils/axios';
import { AxiosResponse } from 'axios';
import { Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';

type ShiftEdit = {
    IsSuccess: boolean;
    message?: string;
};

interface ShiftEditPopoverProps {
    popoverOpen: boolean;
    setPopoverOpen: Dispatch<SetStateAction<boolean>>;
    setSelectedWorklog: Dispatch<SetStateAction<any>>;
    selectedWorklog: any;
}

const ShiftEditPopover: React.FC<ShiftEditPopoverProps> = ({
                                                               popoverOpen,
                                                               setPopoverOpen,
                                                               setSelectedWorklog,
                                                               selectedWorklog,
                                                           }) => {
    const [startTime, setStartTime] = useState<string | null>(null);
    const [endTime, setEndTime] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialData, setInitialData] = useState<any>(null);

    const submitBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (selectedWorklog) {
            setStartTime(selectedWorklog.formatted_work_start_time);
            setEndTime(selectedWorklog.formatted_work_end_time);
            setNote(selectedWorklog.note || '');
            setInitialData({
                startTime: selectedWorklog.formatted_work_start_time,
                endTime: selectedWorklog.formatted_work_end_time,
                note: selectedWorklog.note || '',
            });
        }
    }, [selectedWorklog]);

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '-';
        const num = parseFloat(val.toString());
        if (isNaN(num)) return '-';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const handleClose = (): void => {
        setPopoverOpen(false);
        setSelectedWorklog(null);
    };

    const handleSubmitShiftUpdate = async (): Promise<void> => {
        if (isSubmitting || !selectedWorklog?.id || !selectedWorklog?.user_id) return;

        if (submitBtnRef.current) submitBtnRef.current.disabled = true;
        setIsSubmitting(true);

        const worklogData = {
            user_worklog_id: selectedWorklog.id,
            user_id: selectedWorklog.user_id,
            start_time: startTime,
            end_time: endTime,
            note: note,
        };

        setInitialData({
            startTime,
            endTime,
            note,
        });

        try {
            const response: AxiosResponse<ShiftEdit> = await api.post('/request-worklog-change', worklogData);
            
            if (response.data.IsSuccess) {
                toast.success(response.data.message || 'Operation successful');
                
                handleClose();
            } else {
                toast.error(response.data.message || 'Operation unsuccessful');
            }
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
            if (submitBtnRef.current) submitBtnRef.current.disabled = false;
        }
    };

    const startTimeObj = useMemo(() => {
        if (!startTime || !selectedWorklog?.date_added) return null;
        const fullDateTime = `${selectedWorklog.date_added} ${startTime}`;
        const parsed = dayjs(fullDateTime, 'YYYY-MM-DD HH:mm');
        return parsed.isValid() ? parsed : null;
    }, [startTime, selectedWorklog?.date_added]);

    const endTimeObj = useMemo(() => {
        if (!endTime || !selectedWorklog?.date_added) return null;
        const fullDateTime = `${selectedWorklog.date_added} ${endTime}`;
        const parsed = dayjs(fullDateTime, 'YYYY-MM-DD HH:mm');
        return parsed.isValid() ? parsed : null;
    }, [endTime, selectedWorklog?.date_added]);

    const hasChanges = startTime !== initialData?.startTime || endTime !== initialData?.endTime;

    return (
        <Popover
            open={popoverOpen}
            onClose={handleClose}
            anchorReference="none"
            PaperProps={{
                sx: {
                    position: 'fixed',
                    top: '30%',
                    left: '25%',
                    transform: 'translate(-50%, -50%)',
                    p: 2,
                    borderRadius: 3,
                    boxShadow: 10,
                    minWidth: 150,
                    width: '50%',
                    backgroundColor: '#fff',
                },
            }}
        >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box position="relative">
                    <IconButton
                        onClick={handleClose}
                        size="small"
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <IconX size={18} />
                    </IconButton>

                    <Typography
                        variant="subtitle1"
                        align="center"
                        sx={{ fontWeight: 600, fontSize: '1rem', mb: 3 }}
                    >
                        Edit My Shift
                    </Typography>

                    <Box display="flex" justifyContent="space-between" gap={2} mb={2}>
                        {/* Start Shift Picker */}
                        <Box
                            sx={{
                                flex: 1,
                                backgroundColor: '#f9f9f9',
                                borderRadius: '16px',
                                p: 2,
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid #e0e0e0',
                                position: 'relative',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#fff',
                                    px: 1.5,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: '#666',
                                    borderRadius: '8px',
                                    boxShadow: 1,
                                }}
                            >
                                Start Shift
                            </Box>
                            <TimePicker
                                value={startTimeObj}
                                onChange={(newValue) => {
                                    if (newValue) {
                                        setStartTime(newValue.format('HH:mm'));
                                    }
                                }}
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: {
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

                        {/* End Shift Picker */}
                        <Box
                            sx={{
                                flex: 1,
                                backgroundColor: '#f9f9f9',
                                borderRadius: '16px',
                                p: 2,
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid #e0e0e0',
                                position: 'relative',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#fff',
                                    px: 1.5,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: '#666',
                                    borderRadius: '8px',
                                    boxShadow: 1,
                                }}
                            >
                                End Shift
                            </Box>
                            <TimePicker
                                value={endTimeObj}
                                onChange={(newValue) => {
                                    if (newValue) {
                                        setEndTime(newValue.format('HH:mm'));
                                    }
                                }}
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: {
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

                    {selectedWorklog?.break_log?.length > 0 && (
                        <Box
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            sx={{
                                backgroundColor: '#f9f9f9',
                                borderRadius: '12px',
                                border: '1px solid #e0e0e0',
                                px: 2,
                                py: 1.5,
                                mb: 2,
                                fontSize: '0.9rem',
                            }}
                        >
                            {selectedWorklog.break_log.map((breakItem: any, index: number) => (
                                <Box
                                    key={index}
                                    display="flex"
                                    justifyContent="space-between"
                                    width="100%"
                                    py={0.5}
                                >
                                    <Typography sx={{ color: '#555' }}>
                                        Break ({breakItem?.break_start_time || '--'} -{' '}
                                        {breakItem?.break_end_time || '--'})
                                    </Typography>
                                    <Typography sx={{ fontWeight: 600 }}>
                                        {breakItem?.duration || '00:00'}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                            backgroundColor: '#f0f0f0',
                            borderTop: '1px solid #ccc',
                            borderRadius: '10px',
                            px: 2,
                            py: 1.2,
                            mb: 3,
                        }}
                    >
                        <Typography sx={{ fontWeight: 600 }}>Total hours:</Typography>
                        <Typography sx={{ fontWeight: 700 }}>
                            {formatHour(selectedWorklog?.worklog_payable_hours) || '00:00'}
                        </Typography>
                    </Box>

                    <TextField
                        label="Note (Optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                    />

                    <Box display="flex" justifyContent="flex-end">
                        <Button
                            ref={submitBtnRef}
                            variant="contained"
                            color="primary"
                            onClick={handleSubmitShiftUpdate}
                            disabled={isSubmitting || !hasChanges || !startTime || !endTime}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {isSubmitting ? (
                                <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                            ) : (
                                'Submit'
                            )}
                        </Button>
                    </Box>
                </Box>
            </LocalizationProvider>
        </Popover>
    );
};

export default ShiftEditPopover;
