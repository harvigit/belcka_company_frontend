'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import api from '@/utils/axios';
import DigitalIDCard from '@/app/components/common/users-card/UserDigitalCard';

export default function IDCardPage() {
    const searchParams = useSearchParams();
    const userId = searchParams?.get('user_id');

    const [cardData, setCardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchCard = async () => {
            try {
                const res = await api.get('/user/get-user-digital-card', {
                    params: { user_id: userId },
                });

                if (res.data?.IsSuccess) {
                    setCardData(res.data.info);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCard();
    }, [userId]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" mt={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (!cardData) {
        return (
            <Typography align="center" mt={8}>
                ID Card not found
            </Typography>
        );
    }

    return (
        <Box p={2} display="flex" justifyContent="center">
            {/* reuse same UI */}
            <DigitalIDCard
                open={true}
                onClose={() => {}}
                user={cardData}
            />
        </Box>
    );
}
