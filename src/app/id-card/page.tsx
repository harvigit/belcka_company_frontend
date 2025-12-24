'use client';

import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import DigitalIDCard from '@/app/components/common/users-card/UserDigitalCard';

export default function IDCardPage() {
    const searchParams = useSearchParams();
    const userId = searchParams?.get('user_id');

    if (!userId) {
        return (
            <Typography align="center" mt={8}>
                User ID is missing
            </Typography>
        );
    }

    return (
        <Box p={2} display="flex" justifyContent="center">
            <DigitalIDCard
                open={true}
                onClose={() => {}}
                userId={Number(userId)}
            />
        </Box>
    );
}
