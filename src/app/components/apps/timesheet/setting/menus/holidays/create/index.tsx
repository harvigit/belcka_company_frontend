'use client';

import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Grid, Popover } from '@mui/material';
import toast from 'react-hot-toast';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import api from '@/utils/axios';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import { AxiosResponse } from 'axios';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isValid } from 'date-fns';

interface Props {
    open: boolean;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

const AddHoliday = ({ open, onClose, onWorkUpdated }: Props) => {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    const [startAnchorEl, setStartAnchorEl] = useState<HTMLElement | null>(null);
    const [endAnchorEl, setEndAnchorEl] = useState<HTMLElement | null>(null);
    
    const today = new Date();today.setHours(0, 0, 0, 0);

    const formatDate = (date: Date | undefined) => date && isValid(date) ? format(date, 'dd/MM/yyyy') : '';
    
    const totalDays =
        startDate && endDate && isValid(startDate) && isValid(endDate) && startDate <= endDate
            ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : null;

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) { toast.error('Holiday title is required!'); return; }
        if (!startDate) { toast.error('Start date is required!'); return; }
        if (!endDate) { toast.error('End date is required!'); return; }
        if (startDate > endDate) { toast.error('Start date cannot be after end date!'); return; }

        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
            };

            const response: AxiosResponse<any> = await api.post('holiday/add', payload);

            if (response.data.IsSuccess) {
                toast.success(response.data.message);
                onWorkUpdated?.();
                onClose();
                setTitle('');
                setStartDate(undefined);
                setEndDate(undefined);
            } else {
                toast.error(response.data.message || 'Failed to add holiday');
            }
        } catch (error) {
            console.error('Error adding holiday:', error);
            toast.error('Something went wrong!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Grid size={{ xs: 12, lg: 12 }}>
                <form onSubmit={handleAddHoliday}>
                    <Stack spacing={3} mb={3}>
                        {/* Title */}
                        <Box>
                            <Typography variant="caption">Holiday Title</Typography>
                            <CustomTextField
                                variant="outlined"
                                fullWidth
                                placeholder="Holiday title"
                                value={title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setTitle(e.target.value)
                                }
                            />
                        </Box>

                        {/* Start Date & End Date */}
                        <Box display="flex" gap={3}>
                            {/* Start Date */}
                            <Box flex={1}>
                                <Typography variant="caption">Start Date</Typography>
                                <Box onClick={(e) => setStartAnchorEl(e.currentTarget)}>
                                    <CustomTextField
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Select start date"
                                        value={formatDate(startDate)}
                                        inputProps={{ readOnly: true, style: { cursor: 'pointer' } }}
                                    />
                                </Box>
                                <Popover
                                    open={Boolean(startAnchorEl)}
                                    anchorEl={startAnchorEl}
                                    onClose={() => setStartAnchorEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                    PaperProps={{
                                        sx: { mt: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', borderRadius: '8px' },
                                    }}
                                >
                                    <DayPicker
                                        mode="single"
                                        selected={startDate}
                                        onSelect={(date) => {
                                            setStartDate(date);
                                            if (endDate && date && endDate < date) {
                                                setEndDate(undefined);
                                            }
                                            setStartAnchorEl(null);
                                        }}
                                        showOutsideDays
                                        defaultMonth={startDate ?? today}
                                        disabled={{ before: today }}
                                    />
                                </Popover>
                            </Box>

                            {/* End Date */}
                            <Box flex={1}>
                                <Typography variant="caption">End Date</Typography>
                                <Box onClick={(e) => setEndAnchorEl(e.currentTarget)}>
                                    <CustomTextField
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Select end date"
                                        value={formatDate(endDate)}
                                        inputProps={{ readOnly: true, style: { cursor: 'pointer' } }}
                                    />
                                </Box>
                                <Popover
                                    open={Boolean(endAnchorEl)}
                                    anchorEl={endAnchorEl}
                                    onClose={() => setEndAnchorEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                    PaperProps={{
                                        sx: { mt: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', borderRadius: '8px' },
                                    }}
                                >
                                    <DayPicker
                                        mode="single"
                                        selected={endDate}
                                        onSelect={(date) => {
                                            setEndDate(date);
                                            setEndAnchorEl(null);
                                        }}
                                        showOutsideDays
                                        defaultMonth={endDate ?? startDate ?? today}
                                        disabled={{ before: startDate ?? today }}
                                    />
                                </Popover>
                            </Box>
                        </Box>

                        {/* Total days preview */}
                        {totalDays !== null && (
                            <Typography variant="caption" color="textSecondary">
                                Total Days: <strong>{totalDays}</strong>
                            </Typography>
                        )}
                    </Stack>

                    <Button
                        color="primary"
                        variant="contained"
                        size="large"
                        type="submit"
                        disabled={loading}
                        sx={{ width: '30%' }}
                    >
                        {loading ? 'Saving...' : 'Add Holiday'}
                    </Button>
                </form>
            </Grid>
        </Box>
    );
};

export default AddHoliday;
