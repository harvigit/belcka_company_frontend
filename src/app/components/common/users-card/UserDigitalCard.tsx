'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Avatar,
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    CircularProgress,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface ApiDigitalCardInfo {
    is_expired: boolean;
    user_id: number;
    user_code: string;
    company_name: string;
    company_logo: string;
    name: string;
    first_name: string;
    last_name: string;
    joined_on: string;
    trade_name: string;
    user_image: string;
    qr_code_url: string;
}

interface DigitalIDCardProps {
    open: boolean;
    onClose: () => void;
    userId: number;
    token?: string;
    isPublicView?: boolean;
}

const DigitalIDCard: React.FC<DigitalIDCardProps> = ({
                                                         open,
                                                         onClose,
                                                         userId,
                                                         token,
                                                         isPublicView = false
                                                     }) => {
    const [cardData, setCardData] = useState<ApiDigitalCardInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isExtraSmall = useMediaQuery('(max-width:375px)');

    useEffect(() => {
        if (!userId) {
            setError('User ID is required');
            setLoading(false);
            return;
        }

        const fetchCardData = async () => {
            console.log('Fetching card data...', { userId, token, isPublicView });
            setLoading(true);
            setError(null);

            try {
                let res;

                if (isPublicView && token) {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

                    res = await axios.get(`${apiUrl}user/view-digital-card`, {
                        params: { user_id: userId, token },
                    });
                } else {
                    const api = (await import('@/utils/axios')).default;
                    res = await api.get('/user/get-user-digital-card', {
                        params: { user_id: userId },
                    });
                }

                if (res.data?.IsSuccess) {
                    setCardData(res.data.info);
                } else {
                    setError(res.data?.message || 'Failed to load card');
                }
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to load card';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchCardData();
    }, [userId, token, isPublicView]);

    if (!open) return null;

    if (error) {
        return (
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        margin: isMobile ? '16px' : '32px',
                        width: isMobile ? 'calc(100% - 32px)' : '100%',
                    }
                }}
            >
                <DialogContent sx={{ padding: isMobile ? '16px' : '24px' }}>
                    <Box textAlign="center" py={isMobile ? 2 : 4}>
                        <CancelIcon sx={{ fontSize: isMobile ? 48 : 60, color: 'error.main', mb: 2 }} />
                        <Typography color="error" variant={isMobile ? 'body1' : 'h6'} fontWeight={600}>
                            {error}
                        </Typography>
                        <Typography color="text.secondary" variant="body2" mt={1} fontSize={isMobile ? '0.875rem' : '0.9rem'}>
                            The ID card link may be invalid or expired.
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    if (loading || !cardData) {
        return (
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        margin: isMobile ? '16px' : '32px',
                        width: isMobile ? 'calc(100% - 32px)' : '100%',
                    }
                }}
            >
                <DialogContent sx={{ padding: isMobile ? '16px' : '24px' }}>
                    <Box display="flex" justifyContent="center" alignItems="center" p={isMobile ? 2 : 4}>
                        <CircularProgress size={isMobile ? 32 : 40} />
                        <Typography ml={2} fontSize={isMobile ? '0.9rem' : '1rem'}>Loading card...</Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    margin: isMobile ? '8px' : '32px',
                    width: isMobile ? 'calc(100% - 16px)' : '100%',
                }
            }}
        >
            <DialogTitle sx={{
                padding: isMobile ? '12px 16px' : '16px 24px',
                fontSize: isMobile ? '1.1rem' : '1.25rem'
            }}>
                {cardData.name}&apos;s ID Card
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? '8px 16px 16px' : '16px 24px 24px' }}>
                <Box
                    ref={cardRef}
                    sx={{
                        backgroundColor: '#d4ebf7',
                        borderRadius: isMobile ? '12px' : '16px',
                        padding: isMobile ? '16px' : '24px',
                        border: isMobile ? '2px solid #4DA1FF' : '3px solid #4DA1FF',
                        maxWidth: '360px',
                        margin: '0 auto',
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: 'inset 0 0 30px #abcbdb',
                    }}
                >
                    <Stack>
                        <Stack direction="row" justifyContent="center" spacing={1}>
                            <Box
                                component="img"
                                src="/belcka.svg"
                                alt="Belcka Logo"
                                height={isMobile ? 28 : 35}
                            />
                        </Stack>
                    </Stack>

                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mt={isMobile ? 1.5 : 2}
                        spacing={isMobile ? 1 : 2}
                    >
                        <Box textAlign="left" flex={1} minWidth={0}>
                            <Typography
                                color="#25384b"
                                lineHeight={1.1}
                                fontSize={isExtraSmall ? '24px' : isMobile ? '28px' : '35px'}
                                fontWeight={700}
                                sx={{ wordBreak: 'break-word' }}
                            >
                                {cardData.first_name}
                            </Typography>
                            <Typography
                                color="#25384b"
                                lineHeight={1.1}
                                fontSize={isExtraSmall ? '24px' : isMobile ? '28px' : '35px'}
                                fontWeight={700}
                                my={isMobile ? 0.5 : 1}
                                sx={{ wordBreak: 'break-word' }}
                            >
                                {cardData.last_name}
                            </Typography>
                            {cardData.user_code && (
                                <Typography
                                    my={isMobile ? 0.5 : 1}
                                    fontSize={isMobile ? '12px' : '16px'}
                                    color="#25384b"
                                    fontWeight={300}
                                >
                                    USER CODE: {String(cardData.user_code)}
                                </Typography>
                            )}
                            <Typography
                                fontSize={isExtraSmall ? '16px' : isMobile ? '18px' : '22px'}
                                color="#25384b"
                                fontWeight={600}
                                sx={{ wordBreak: 'break-word' }}
                            >
                                {cardData.trade_name}
                            </Typography>
                        </Box>

                        <Avatar
                            src={cardData.user_image || '/images/users/user.png'}
                            sx={{
                                width: isExtraSmall ? '80px' : isMobile ? '100px' : '130px',
                                height: isExtraSmall ? '80px' : isMobile ? '100px' : '130px',
                                flexShrink: 0
                            }}
                        />
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" my={isMobile ? 0.5 : 1}>
                        <Box>
                            <Typography
                                fontSize={isMobile ? '10px' : '11px'}
                                color="#25384b"
                                fontWeight={300}
                            >
                                JOINED
                            </Typography>
                            <Typography fontSize={isMobile ? '12px' : '14px'}>
                                {cardData.joined_on}
                            </Typography>
                        </Box>
                    </Stack>

                    <Typography
                        my={isMobile ? 0.5 : 1}
                        fontWeight={700}
                        color="#25384b"
                        fontSize={isExtraSmall ? '16px' : isMobile ? '18px' : '22px'}
                        textAlign="left"
                        sx={{ wordBreak: 'break-word' }}
                    >
                        {cardData.company_name}
                    </Typography>

                    <Box mt={isMobile ? 1.5 : 2} display="flex" justifyContent="center">
                        <img
                            src={cardData.qr_code_url}
                            alt="QR Code"
                            width={isMobile ? 100 : 120}
                            height={isMobile ? 100 : 120}
                            style={{ objectFit: 'contain', borderRadius: 10 }}
                        />
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        alignItems="center"
                        mt={isMobile ? 1.5 : 2}
                    >
                        {!cardData.is_expired ? (
                            <>
                                <CheckCircleIcon sx={{ color: 'green', fontSize: isMobile ? 20 : 25 }} />
                                <Typography fontWeight={500} fontSize={isMobile ? '0.9rem' : '1rem'}>
                                    Active
                                </Typography>
                            </>
                        ) : (
                            <>
                                <CancelIcon sx={{ color: 'red', fontSize: isMobile ? 20 : 25 }} />
                                <Typography color="red" fontWeight={500} fontSize={isMobile ? '0.9rem' : '1rem'}>
                                    Inactive
                                </Typography>
                            </>
                        )}
                    </Stack>

                    <Typography
                        variant="caption"
                        mt={isMobile ? 1.5 : 2}
                        textAlign="center"
                        display="block"
                        color="#25384b"
                        fontSize={isMobile ? '12px' : '15px'}
                        fontWeight={500}
                    >
                        TIME IS MONEY. CONTROL IT.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default DigitalIDCard;
