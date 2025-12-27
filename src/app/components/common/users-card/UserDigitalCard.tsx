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
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogContent>
                    <Box textAlign="center" py={4}>
                        <CancelIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                        <Typography color="error" variant="h6">
                            {error}
                        </Typography>
                        <Typography color="text.secondary" variant="body2" mt={1}>
                            The ID card link may be invalid or expired.
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    if (loading || !cardData) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogContent>
                    <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                        <CircularProgress />
                        <Typography ml={2}>Loading card...</Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cardData.name}&apos;s ID Card</DialogTitle>
            <DialogContent>
                <Box
                    ref={cardRef}
                    sx={{
                        backgroundColor: '#d4ebf7',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '3px solid #4DA1FF',
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
                                height={35}
                            />
                        </Stack>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                        <Box textAlign="left">
                            <Typography color="#25384b" lineHeight={1} fontSize="35px" fontWeight={700}>
                                {cardData.first_name}
                            </Typography>
                            <Typography color="#25384b" lineHeight={1} fontSize="35px" fontWeight={700} my={1}>
                                {cardData.last_name}
                            </Typography>
                            {cardData.user_code && (
                                <Typography my={1} fontSize="16px" color="#25384b" fontWeight={300}>
                                    USER CODE: {String(cardData.user_code)}
                                </Typography>
                            )}
                            <Typography fontSize="22px" color="#25384b" fontWeight={600}>
                                {cardData.trade_name}
                            </Typography>
                        </Box>

                        <Avatar
                            src={cardData.user_image || '/images/users/user.png'}
                            sx={{ width: '40%', height: '130px' }}
                        />
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" my={1}>
                        <Box>
                            <Typography fontSize="11px" color="#25384b" fontWeight={300}>
                                JOINED
                            </Typography>
                            <Typography fontSize="14px">{cardData.joined_on}</Typography>
                        </Box>
                    </Stack>

                    <Typography my={1} fontWeight={700} color="#25384b" fontSize="22px" textAlign="left">
                        {cardData.company_name}
                    </Typography>

                    <Box mt={2} display="flex" justifyContent="center">
                        <img
                            src={cardData.qr_code_url}
                            alt="QR Code"
                            width={120}
                            height={120}
                            style={{ objectFit: 'contain', borderRadius: 10 }}
                        />
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" mt={2}>
                        {!cardData.is_expired ? (
                            <>
                                <CheckCircleIcon sx={{ color: 'green', fontSize: 25 }} />
                                <Typography fontWeight={500}>Active</Typography>
                            </>
                        ) : (
                            <>
                                <CancelIcon sx={{ color: 'red', fontSize: 25 }} />
                                <Typography color="red" fontWeight={500}>Inactive</Typography>
                            </>
                        )}
                    </Stack>

                    <Typography
                        variant="caption"
                        mt={2}
                        textAlign="center"
                        display="block"
                        color="#25384b"
                        fontSize="15px"
                    >
                        TIME IS MONEY. CONTROL IT.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default DigitalIDCard;
