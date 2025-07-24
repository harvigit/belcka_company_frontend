import { Box, Button, IconButton, Popover, TextField, Typography, Snackbar } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import React, {useState, useEffect, useMemo} from 'react';
import { TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import api from '@/utils/axios';
import { AxiosResponse } from 'axios';

type ShiftEdit = {
    IsSuccess: boolean;
};

const ShiftEditPopover = ({ popoverOpen, setPopoverOpen, setSelectedWorklog, selectedWorklog }) => {
    
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);

    const [note, setNote] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [openSnackbar, setOpenSnackbar] = useState(false);


    useEffect(() => {
        if (selectedWorklog) {
            setStartTime(selectedWorklog.formatted_work_start_time);
            setEndTime(selectedWorklog.formatted_work_end_time);
        }
    }, [selectedWorklog]);

    const formatHour = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '-';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const handleClose = () => {
        setPopoverOpen(false);
        setSelectedWorklog(null);
    };

    const handleSubmitShiftUpdate = async () => {
        const worklogData = {
            user_worklog_id: selectedWorklog.id,
            user_id: selectedWorklog.user_id,
            start_time: startTime,
            end_time: endTime,
            note: note,
        };

        try {
            const response: AxiosResponse<ShiftEdit> = await api.post('/request-worklog-change',  worklogData);
            if (response.data.IsSuccess) {
                setSuccessMessage('User work time change requesterd successfully!');
                setOpenSnackbar(true);
                handleClose();
            } else {
                setErrorMessage(response.data.message || 'Failed to update shift');
                setOpenSnackbar(true);
            }
        } catch (error) {
            console.error('Error during the API call:', error);
            setErrorMessage('An error occurred while updating the shift');
            setOpenSnackbar(true);
        }
    };

    const startTimeObj = useMemo(() => {
        if (!startTime) return null;

        const fullDateTime = `${selectedWorklog.date_added} ${startTime}`;
        const parsed = dayjs(fullDateTime, 'YYYY-MM-DD HH:mm');
        
        return parsed.isValid() ? parsed : null;
    }, [startTime]);

    const endTimeObj = useMemo(() => {
        if (!endTime) return null;

        const fullDateTime = `${selectedWorklog.date_added} ${endTime}`;
        const parsed = dayjs(fullDateTime, 'YYYY-MM-DD HH:mm');

        return parsed.isValid() ? parsed : null;
    }, [endTime]);
    
    return (
        <>
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
                        {/* Cancel Icon */}
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
                            sx={{
                                fontWeight: 600,
                                fontSize: '1rem',
                                mb: 3,
                            }}
                        >
                            Edit My Shift
                        </Typography>

                        {/* Shift Time Pickers */}
                        <Box display="flex" justifyContent="space-between" gap={2} mb={2}>
                            {/* Start Shift */}
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
                                    onChange={(newValue: Date | null) => {
                                        setStartTime(newValue.format('HH:mm'));
                                    }}
                                    renderInput={(params) => <TextField {...params} />}
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

                            {/* Stop Shift */}
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
                                    Stop Shift
                                </Box>
                                <TimePicker
                                    value={endTimeObj}
                                    onChange={(newValue: Date | null) => {
                                        setEndTime(newValue.format('HH:mm'));
                                    }}
                                    renderInput={(params) => <TextField {...params} />}
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

                        {/* Break Info */}
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
                            {selectedWorklog?.break_log?.length > 0 ? (
                                selectedWorklog.break_log.map((breakItem, index) => (
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
                                ))
                            ) : (
                                <Typography sx={{ color: '#555' }}>
                                    No break logs available.
                                </Typography>
                            )}
                        </Box>

                        {/* Total Hours */}
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

                        {/* Note Input */}
                        <TextField
                            label="Note (Optional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            fullWidth
                            sx={{ mb: 2 }}
                        />

                        {/* Submit Button */}
                        <Box display="flex" justifyContent="flex-end">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSubmitShiftUpdate}
                                disabled={!startTime || !endTime}
                                sx={{ textTransform: 'none', borderRadius: '10px' }}
                            >
                                Submit
                            </Button>
                        </Box>
                    </Box>
                </LocalizationProvider>
            </Popover>

            {/* Snackbar for success or error */}
            <Snackbar
                open={openSnackbar}
                onClose={() => setOpenSnackbar(false)}
                autoHideDuration={6000}
                message={errorMessage || successMessage}
                severity={errorMessage ? 'error' : 'success'}
            />
        </>
    );
};

export default ShiftEditPopover;
