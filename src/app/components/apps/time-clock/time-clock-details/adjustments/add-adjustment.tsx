"use client";

import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    FormControl,
    IconButton,
    InputAdornment,
    Typography,
} from '@mui/material';
import { IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import { endOfWeek, format, isSameDay, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';

interface AddAdjustmentProps {
    onClose: () => void;
    userId: number;
    initialFrom?: Date | null;
    initialTo?: Date | null;
    onDataRefresh?: () => Promise<void> | void;
}

const normalizeWeekRange = (date: Date) => ({
    from: startOfWeek(date, { weekStartsOn: 1 }),
    to: endOfWeek(date, { weekStartsOn: 1 }),
});

const AddAdjustment: React.FC<AddAdjustmentProps> = ({
                                                         onClose,
                                                         userId,
                                                         initialFrom,
                                                         initialTo,
                                                         onDataRefresh,
                                                     }) => {
    const defaultWeek = useMemo(() => {
        const baseDate = initialFrom ?? new Date();
        return normalizeWeekRange(baseDate);
    }, [initialFrom]);

    const [range, setRange] = useState<{ from: Date | null; to: Date | null }>(() => {
        if (initialFrom && initialTo) {
            return normalizeWeekRange(initialFrom);
        }
        return defaultWeek;
    });
    const [amount, setAmount] = useState('');
    const [isNegative, setIsNegative] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const rangeLabel = useMemo(() => {
        if (!range.from || !range.to) return '';
        return `${format(range.from, 'dd MMM yyyy')} - ${format(range.to, 'dd MMM yyyy')}`;
    }, [range]);

    const handleRangeChange = (nextRange: { from: Date | null; to: Date | null }) => {
        if (!nextRange.from) {
            setRange({ from: null, to: null });
            return;
        }

        const normalized = normalizeWeekRange(nextRange.from);
        setRange(normalized);
        setError(null);
    };

    const validateWeekRange = () => {
        if (!range.from || !range.to) {
            return 'Week range is required.';
        }

        const normalized = normalizeWeekRange(range.from);
        if (!isSameDay(normalized.from, range.from) || !isSameDay(normalized.to, range.to)) {
            return 'Adjustment range must be a full Monday to Sunday week.';
        }

        return null;
    };

    const handleToggleSign = () => {
        setIsNegative((prevIsNegative) => {
            const nextIsNegative = !prevIsNegative;

            setAmount((prevAmount) => {
                if (!prevAmount || prevAmount === '-') {
                    return nextIsNegative ? '-' : '';
                }

                const isCurrentlyNegative = prevAmount.startsWith('-');
                if (nextIsNegative && !isCurrentlyNegative) {
                    return `-${prevAmount}`;
                }
                if (!nextIsNegative && isCurrentlyNegative) {
                    return prevAmount.slice(1);
                }
                return prevAmount;
            });

            return nextIsNegative;
        });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (/^-?\d{0,8}(\.\d{0,2})?$/.test(raw) || raw === '' || raw === '-') {
            setAmount(raw);
            setIsNegative(raw.startsWith('-'));
        }
    };

    const handleSubmit = async () => {
        setError(null);

        const rangeError = validateWeekRange();
        if (rangeError) {
            setError(rangeError);
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (Number.isNaN(parsedAmount)) {
            setError('Adjustment amount is required.');
            return;
        }

        try {
            setSaving(true);
            const response = await api.post('/time-clock/adjustment-amount', {
                user_id: userId,
                start_date: format(range.from!, 'dd/MM/yyyy'),
                end_date: format(range.to!, 'dd/MM/yyyy'),
                adjustment_amount: parsedAmount,
            });

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                await onDataRefresh?.();
                onClose();
                return;
            }

            setError(response.data?.message || 'Failed to save adjustment.');
        } catch (submitError: any) {
            setError(
                submitError?.response?.data?.message ||
                submitError?.message ||
                'Failed to save adjustment.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            <Box
                sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight={600}>
                        Add Adjustment
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Weekly adjustment
                    </Typography>
                </Box>
                <IconButton onClick={onClose}>
                    <IconX size={20} />
                </IconButton>
            </Box>

            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <FormControl>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Week Range
                    </Typography>
                    
                    <Box
                        sx={{
                            '& input': {
                                textAlign: 'left !important',
                            },
                            '& .MuiInputBase-input': {
                                textAlign: 'left !important',
                            },
                            '& .MuiInputBase-root': {
                                justifyContent: 'flex-start',
                            },
                            '& .MuiTypography-root': {
                                textAlign: 'left',
                            },
                        }}
                    >
                        <DateRangePickerBox
                            from={range.from}
                            to={range.to}
                            onChange={handleRangeChange}
                            payrollCycle="1_week"
                        />
                    </Box>

                    {rangeLabel && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            {rangeLabel}
                        </Typography>
                    )}
                </FormControl>

                <FormControl fullWidth>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Adjustment Amount
                    </Typography>
                    <CustomTextField
                        value={amount}
                        placeholder="Enter plus or minus amount"
                        onChange={handleAmountChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconButton
                                        size="small"
                                        onClick={handleToggleSign}
                                        aria-label={isNegative ? 'Switch to positive amount' : 'Switch to negative amount'}
                                        edge="start"
                                        sx={{ p: 0.5 }}
                                    >
                                        {isNegative ? <IconMinus size={16} /> : <IconPlus size={16} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </FormControl>
            </Box>

            <Box
                sx={{
                    mt: 'auto',
                    px: 3,
                    py: 2.5,
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1.5,
                }}
            >
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                    Save
                </Button>
            </Box>
        </Box>
    );
};

export default AddAdjustment;
