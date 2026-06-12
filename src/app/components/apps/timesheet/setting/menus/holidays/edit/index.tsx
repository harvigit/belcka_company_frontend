'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Box, Button, Stack, Typography, Grid, Popover} from '@mui/material';
import toast from 'react-hot-toast';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import {AxiosResponse} from 'axios';
import {format, parseISO, isValid} from 'date-fns';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface Props {
    open: boolean;
    id: number;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

const parseSafeDate = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date();

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/').map(Number);
        const d = new Date(year, month - 1, day);
        return isValid(d) ? d : new Date();
    }

    const cleaned = dateStr.split('T')[0];
    const parsed = parseISO(cleaned);
    return isValid(parsed) ? parsed : new Date();
};

const EditHoliday = ({open, id, onClose, onWorkUpdated}: Props) => {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    const [startAnchorEl, setStartAnchorEl] = useState<HTMLElement | null>(null);
    const [endAnchorEl, setEndAnchorEl] = useState<HTMLElement | null>(null);

    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDate = (date: Date | undefined) => date && isValid(date) ? format(date, 'dd/MM/yyyy') : '';

    const totalDays =
        startDate && endDate && isValid(startDate) && isValid(endDate) && startDate <= endDate
            ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : null;

    const fetchHoliday = useCallback(async () => {
        if (!id || !user.company_id) return;
        try {
            const res: AxiosResponse<any> = await api.get(
                `holiday/get?company_id=${user.company_id}&history_id=${id}`,
            );
            if (res.data?.info) {
                const holiday = res.data.info[0];
                
                setTitle(holiday.title ?? '');
                setStartDate(parseSafeDate(holiday.start_date));
                setEndDate(parseSafeDate(holiday.end_date));
            }
        } catch (err) {
            console.error('Failed to fetch holiday', err);
        }
    }, [id, user.company_id]);

    useEffect(() => {
        if (open && id) fetchHoliday();
    }, [open, id]);

    const handleEditHoliday = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) { toast.error('Holiday title is required!'); return; }
        if (!startDate) { toast.error('Please select a start date!'); return; }
        if (!endDate) { toast.error('Please select an end date!'); return; }
        if (startDate > endDate) { toast.error('Start date cannot be after end date!'); return; }

        setLoading(true);
        try {
            const payload = {
                id,
                title: title.trim(),
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
            };

            const response: AxiosResponse<any> = await api.post('holiday/edit', payload);

            if (response.data.IsSuccess) {
                toast.success(response.data.message);
                onWorkUpdated?.();
                onClose();
            } else {
                toast.error(response.data.message || 'Failed to update holiday');
            }
        } catch (error) {
            console.error('Error editing holiday:', error);
            toast.error('Something went wrong!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Grid size={{xs: 12, lg: 12}}>
                <form onSubmit={handleEditHoliday}>
                    <Stack spacing={3} mb={3}>

                        {/* Title */}
                        <Box>
                            <Typography variant="caption" fontWeight={500} color="text.secondary">
                                Holiday Title
                            </Typography>
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
                                <Typography variant="caption" fontWeight={500} color="text.secondary">
                                    Start Date
                                </Typography>
                                <Box onClick={(e) => setStartAnchorEl(e.currentTarget)}>
                                    <CustomTextField
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Select start date"
                                        value={formatDate(startDate)}
                                        inputProps={{readOnly: true, style: {cursor: 'pointer'}}}
                                    />
                                </Box>
                                <Popover
                                    open={Boolean(startAnchorEl)}
                                    anchorEl={startAnchorEl}
                                    onClose={() => setStartAnchorEl(null)}
                                    anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                                    transformOrigin={{vertical: 'top', horizontal: 'left'}}
                                    PaperProps={{
                                        sx: {mt: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', borderRadius: '8px'},
                                    }}
                                >
                                    <DayPicker
                                        mode="single"
                                        selected={startDate}
                                        onSelect={(date) => {
                                            setStartDate(date);
                                            // Reset end date if it's before the new start date
                                            if (endDate && date && endDate < date) {
                                                setEndDate(undefined);
                                            }
                                            setStartAnchorEl(null);
                                        }}
                                        showOutsideDays
                                        defaultMonth={startDate ?? today}
                                        disabled={{before: today}}
                                    />
                                </Popover>
                            </Box>

                            {/* End Date */}
                            <Box flex={1}>
                                <Typography variant="caption" fontWeight={500} color="text.secondary">
                                    End Date
                                </Typography>
                                <Box onClick={(e) => setEndAnchorEl(e.currentTarget)}>
                                    <CustomTextField
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Select end date"
                                        value={formatDate(endDate)}
                                        inputProps={{readOnly: true, style: {cursor: 'pointer'}}}
                                    />
                                </Box>
                                <Popover
                                    open={Boolean(endAnchorEl)}
                                    anchorEl={endAnchorEl}
                                    onClose={() => setEndAnchorEl(null)}
                                    anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                                    transformOrigin={{vertical: 'top', horizontal: 'left'}}
                                    PaperProps={{
                                        sx: {mt: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', borderRadius: '8px'},
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
                                        disabled={{before: startDate ?? today}}
                                    />
                                </Popover>
                            </Box>
                        </Box>

                        {/* Total Days */}
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
                        sx={{width: '30%'}}
                    >
                        {loading ? 'Saving...' : 'Update Holiday'}
                    </Button>
                </form>
            </Grid>
        </Box>
    );
};

export default EditHoliday;
