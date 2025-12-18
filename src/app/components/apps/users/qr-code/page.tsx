'use client';

import {
    Avatar,
    Box,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserQrPage() {
    const searchParams = useSearchParams();

    const userId = searchParams?.get('user_id') ?? null;
    const companyId = searchParams?.get('company_id') ?? null;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !companyId) {
            setLoading(false);
            return;
        }

        fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/user/qr-code?user_id=${userId}&company_id=${companyId}`
        )
            .then(res => res.json())
            .then(res => {
                if (!res.IsSuccess) return;

                setUser({
                    id: res.info.id,
                    name: res.info.user_name,
                    email: res.info.email,
                    phone: res.info.phone_with_extension,
                    trade: res.info.trade_name,
                    company_name: res.info.company_name,
                    photo: res.info.user_image,
                });
            })
            .finally(() => setLoading(false));
    }, [userId, companyId]);

    if (loading) {
        return (
            <Box minHeight="100vh" display="flex" justifyContent="center" alignItems="center">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Box mt={5} textAlign="center">
                <Typography color="error">Invalid or expired QR code</Typography>
            </Box>
        );
    }

    return (
        <Box minHeight="100vh" display="flex" justifyContent="center" alignItems="center">
            <Card sx={{ maxWidth: 420, width: '100%' }}>
                <CardContent>
                    <Stack alignItems="center">
                        <Avatar src={user.photo || undefined} sx={{ width: 120, height: 120 }} />
                        <Typography mt={2}><b>ID:</b> {user.id}</Typography>
                    </Stack>

                    <Divider sx={{ my: 3 }} />

                    <Typography><b>Name:</b> {user.name}</Typography>
                    <Typography><b>Company:</b> {user.company_name}</Typography>
                    <Typography><b>Trade:</b> {user.trade}</Typography>
                    <Typography><b>Email:</b> {user.email}</Typography>
                    <Typography><b>Phone:</b> {user.phone}</Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
