'use client';

import { useSearchParams } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import DigitalIDCard from '@/app/components/common/users-card/UserDigitalCard';
import { Suspense } from 'react';

function IDCardContent() {
    const searchParams = useSearchParams();
    const userId = searchParams?.get('user_id');
    const token = searchParams?.get('token');

    console.log('IDCardContent rendering:', { userId, token });

    if (!userId) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="100vh"
                p={3}
            >
                <Typography variant="h5" color="error" gutterBottom>
                    Invalid Link
                </Typography>
                <Typography color="text.secondary">
                    User ID is missing from the URL
                </Typography>
            </Box>
        );
    }

    if (!token) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="100vh"
                p={3}
            >
                <Typography variant="h5" color="error" gutterBottom>
                    Access Denied
                </Typography>
                <Typography color="text.secondary">
                    Authentication token is missing
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
            p={2}
            sx={{ backgroundColor: '#f5f5f5' }}
        >
            <DigitalIDCard
                open={true}
                onClose={() => {}}
                userId={Number(userId)}
                token={token}
                isPublicView={true}
            />
        </Box>
    );
}

export default function IDCardPage() {
    return (
        <Suspense fallback={
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        }>
            <IDCardContent />
        </Suspense>
    );
}
