import React from 'react';
import { Box, Divider, IconButton, Stack, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { AdjustmentActivity } from '@/app/components/apps/time-clock/types/timeClock';

interface AdjustmentActivitySidebarProps {
    activities: AdjustmentActivity[];
    currency: string;
    onClose: () => void;
}

const formatActivityAmount = (amount: number, currency: string) =>
    `${amount < 0 ? '-' : '+'}${currency}${Math.abs(amount).toFixed(2)}`;

const formatUpdatedAmount = (amount: number, currency: string) =>
    `${amount < 0 ? '-' : ''}${currency}${Math.abs(amount).toFixed(2)}`;

const formatActivityDateTime = (value: string | Date) => {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
        return { date: '--', time: '--' };
    }

    return {
        date: dateValue.toLocaleDateString(),
        time: dateValue.toLocaleTimeString(),
    };
};

const AdjustmentActivitySidebar: React.FC<AdjustmentActivitySidebarProps> = ({
    activities,
    currency,
    onClose,
}) => {
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            <Box
                sx={{
                    px: 3,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #eef2f6',
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        Adjustment Activity
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        {activities.length} record{activities.length === 1 ? '' : 's'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#5b6574' }}>
                    <IconX size={20} />
                </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
                {activities.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No adjustment activity found.
                    </Typography>
                ) : (
                    <Stack divider={<Divider flexItem />} spacing={0}>
                        {activities.map((activity, index) => {
                            const { date, time } = formatActivityDateTime(activity.occurred_at);
                            const deltaColor = activity.delta_amount < 0 ? '#d32f2f' : '#2e7d32';
                            const totalColor = activity.updated_amount < 0 ? '#d32f2f' : '#2e7d32';
                            const activityNote = activity.note;

                            return (
                                <Box
                                    key={`${activity.actor_name}-${activity.occurred_at}-${index}`}
                                    sx={{
                                        py: 2,
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                    }}
                                >
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#203040' }}>
                                            {activity.actor_name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
                                            {date}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                                            {time}
                                        </Typography>
                                        {activityNote && (
                                            <Box sx={{ mt: 1.25 }}>
                                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
                                                    Note
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ mt: 0.25, color: '#203040', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                >
                                                    {activityNote}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 700, color: deltaColor, mb: 0.5 }}
                                        >
                                            {formatActivityAmount(activity.delta_amount, currency)}
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            spacing={0.5}
                                            justifyContent="flex-end"
                                            alignItems="center"
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                Total Amount:
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                sx={{ fontWeight: 700, color: totalColor }}
                                            >
                                                {formatUpdatedAmount(activity.updated_amount, currency)}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Box>
        </Box>
    );
};

export default AdjustmentActivitySidebar;
