import React from 'react';
import { Box, Stack, Avatar, Typography, Button } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import {TimeClock} from '../time-clock';

interface TimeClockHeaderProps {
    timeClock: TimeClock;
    allUsers: TimeClock[];
    currentUserIndex: number;
    startDate: Date | null;
    endDate: Date | null;
    pendingRequestCount: number;
    totalConflicts: number;
    onPreviousUser: () => void;
    onNextUser: () => void;
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    onPendingRequest: () => void;
    onConflicts: () => void;
}

const TimeClockHeader: React.FC<TimeClockHeaderProps> = ({
                                                             timeClock,
                                                             allUsers,
                                                             currentUserIndex,
                                                             startDate,
                                                             endDate,
                                                             pendingRequestCount,
                                                             totalConflicts,
                                                             onPreviousUser,
                                                             onNextUser,
                                                             onDateRangeChange,
                                                             onPendingRequest,
                                                             onConflicts,
                                                         }) => {
    const canGoToPrevious = currentUserIndex > 0;
    const canGoToNext = currentUserIndex >= 0 && currentUserIndex < allUsers.length - 1;

    return (
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Navigation Row */}
            {allUsers.length > 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    {canGoToPrevious ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                px: 2,
                                py: 1,
                                borderRadius: '25px',
                                backgroundColor: 'white',
                                border: '2px solid #e0e0e0',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={onPreviousUser}
                        >
                            <IconChevronLeft size={20} color="#8b8a8a" />
                            <Avatar
                                src={allUsers[currentUserIndex - 1]?.user_thumb_image}
                                alt={allUsers[currentUserIndex - 1]?.user_name}
                                sx={{ width: 28, height: 28, mx: 1 }}
                            />
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                {allUsers[currentUserIndex - 1]?.user_name}
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '200px' }} />
                    )}

                    {canGoToNext ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                px: 2,
                                py: 1,
                                borderRadius: '25px',
                                backgroundColor: 'white',
                                border: '2px solid #e0e0e0',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={onNextUser}
                        >
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                {allUsers[currentUserIndex + 1]?.user_name}
                            </Typography>
                            <Avatar
                                src={allUsers[currentUserIndex + 1]?.user_thumb_image}
                                alt={allUsers[currentUserIndex + 1]?.user_name}
                                sx={{ width: 28, height: 28, mx: 1 }}
                            />
                            <IconChevronRight size={20} color="#8b8a8a" />
                        </Box>
                    ) : (
                        <Box sx={{ width: '200px' }} />
                    )}
                </Box>
            )}

            {/* Main Header Content */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={timeClock.user_thumb_image} alt={timeClock.user_name} sx={{ width: 40, height: 40 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {timeClock.user_name}
                        </Typography>
                        <Typography color="textSecondary" variant="body2">
                            {timeClock.trade_name}
                        </Typography>
                    </Box>
                    <Stack mt={3} mx={2} mb={3} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                        <DateRangePickerBox from={startDate} to={endDate} onChange={onDateRangeChange} />
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={1}>
                    {totalConflicts > 0 && (
                        <Button
                            variant="outlined"
                            sx={{
                                borderRadius: '50px',
                                borderColor: '#f28b82',
                                px: 1.5,
                                py: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                textTransform: 'none',
                                '&:hover': { backgroundColor: 'transparent', borderColor: '#f28b82' },
                            }}
                            onClick={onConflicts}
                        >
                            <Box
                                sx={{
                                    backgroundColor: '#e53935',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    width: 20,
                                    height: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                }}
                            >
                                {totalConflicts}
                            </Box>
                            <Typography sx={{ fontWeight: 600, color: '#e53935', fontSize: '14px' }}>
                                Conflicts
                            </Typography>
                        </Button>
                    )}

                    {pendingRequestCount > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            sx={{
                                px: 2,
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    borderColor: 'inherit',
                                    boxShadow: 'none',
                                    color: '#fdc90f',
                                },
                            }}
                            onClick={onPendingRequest}
                        >
                            <Typography sx={{ ml: 0.5, fontWeight: 600 }}>
                                Pending Requests ({pendingRequestCount})
                            </Typography>
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
};
export default TimeClockHeader;
