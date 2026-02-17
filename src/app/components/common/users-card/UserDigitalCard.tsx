'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Typography,
    CircularProgress,
    Button,
} from '@mui/material';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    valid_until?: string;
}

interface DigitalIDCardProps {
    open: boolean;
    onClose: () => void;
    userId: number;
    token?: string;
    isPublicView?: boolean;
}

const CARD_WIDTH  = 500;
const CARD_HEIGHT = 320;

const DigitalIDCard: React.FC<DigitalIDCardProps> = ({open, onClose, userId, token, isPublicView = false}) => {
    const [cardData, setCardData] = useState<ApiDigitalCardInfo | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string | null>(null);

    const cardRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!userId) {
            setError('User ID is required');
            setLoading(false);
            return;
        }

        const fetchCardData = async () => {
            setLoading(true);
            setError(null);
            try {
                let res;
                if (isPublicView && token) {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/';
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
                setError(err.response?.data?.message || err.message || 'Failed to load card');
            } finally {
                setLoading(false);
            }
        };

        fetchCardData();
    }, [userId, token, isPublicView]);

    const convertImageToBase64 = (url: string): Promise<string> =>
        new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width  = img.width;
                canvas.height = img.height;
                canvas.getContext('2d')?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(url);
            img.src = url;
        });

    const handleDownloadPdf = async () => {
        if (!cardRef.current || !cardData) return;
        try {
            const [logoImg, userImg, qrImg] = await Promise.all([
                convertImageToBase64('/belcka.svg'),
                convertImageToBase64(cardData.user_image || '/images/users/user.png'),
                convertImageToBase64(cardData.qr_code_url),
            ]);

            const el          = cardRef.current;
            const logoEl      = el.querySelector('img[alt="Belcka Logo"]')  as HTMLImageElement;
            const avatarEl    = el.querySelector('img[alt="User"]')         as HTMLImageElement;
            const qrEl        = el.querySelector('img[alt="QR Code"]')      as HTMLImageElement;

            const origLogo   = logoEl?.src;
            const origAvatar = avatarEl?.src;
            const origQr     = qrEl?.src;

            if (logoEl)   logoEl.src   = logoImg;
            if (avatarEl) avatarEl.src = userImg;
            if (qrEl)     qrEl.src     = qrImg;

            await new Promise((r) => setTimeout(r, 300));

            const canvas = await html2canvas(el, {
                scale: 3,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
                imageTimeout: 0,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                windowWidth: CARD_WIDTH,
                windowHeight: CARD_HEIGHT,
            });

            if (logoEl   && origLogo)   logoEl.src   = origLogo;
            if (avatarEl && origAvatar) avatarEl.src = origAvatar;
            if (qrEl     && origQr)     qrEl.src     = origQr;

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CARD_HEIGHT, CARD_WIDTH] });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, CARD_WIDTH, CARD_HEIGHT);
            pdf.save(`${cardData.first_name}_${cardData.last_name}_ID_Card.pdf`);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (!open) return null;

    if (error) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogContent>
                    <Box textAlign="center" py={4}>
                        <CancelIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                        <Typography color="error" variant="h6" fontWeight={600}>{error}</Typography>
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

    const validUntilDisplay = cardData.valid_until
        ? new Date(cardData.valid_until).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
        })
        : null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    margin: { xs: '12px', sm: '32px' },
                    maxHeight: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 64px)' },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>{cardData.name}&apos;s ID Card</DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        overflow: 'auto',
                    }}
                >
                    <Box
                        ref={cardRef}
                        sx={{
                            width: `${CARD_WIDTH}px`,
                            height: `${CARD_HEIGHT}px`,
                            minWidth: `${CARD_WIDTH}px`,  
                            borderRadius: '20px',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            padding: '32px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '32px',
                            fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                minWidth: 0,
                            }}
                        >
                            {/* Avatar */}
                            <Box
                                sx={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '3px solid #f0f0f0',
                                    backgroundColor: '#e5e7eb',
                                    mb: '16px',
                                }}
                            >
                                <img
                                    src={cardData.user_image || '/images/users/user.png'}
                                    alt="User"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                            </Box>

                            {/* USER ID */}
                            <Typography
                                sx={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.04em', mb: '6px' }}
                            >
                                USER ID: {cardData.user_code}
                            </Typography>

                            {/* Full Name */}
                            <Typography
                                sx={{ fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: 1.2, mb: '10px', wordBreak: 'break-word' }}
                            >
                                {cardData.first_name} {cardData.last_name}
                            </Typography>

                            {/* Role / Trade */}
                            <Typography
                                sx={{ fontSize: '16px', fontWeight: 600, color: '#374151', mb: '4px' }}
                            >
                                {cardData.trade_name}
                            </Typography>

                            {/* Company */}
                            <Typography
                                sx={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}
                            >
                                {cardData.company_name}
                            </Typography>

                            {/* Spacer */}
                            <Box sx={{ flex: 1 }} />

                            {/* Valid Until */}
                            {validUntilDisplay && (
                                <Typography
                                    sx={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.02em' }}
                                >
                                    VALID UNTIL {validUntilDisplay}
                                </Typography>
                            )}
                        </Box>

                        {/* RIGHT COLUMN */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                flexShrink: 0,
                                width: '140px',
                            }}
                        >
                            {/* Belcka Logo */}
                            <img
                                src="/belcka.svg"
                                alt="Belcka Logo"
                                style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }}
                            />

                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                {/* QR Code */}
                                <Box
                                    sx={{
                                        background: '#fff',
                                        padding: '5px',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    <img
                                        src={cardData.qr_code_url}
                                        alt="QR Code"
                                        style={{ width: '110px', height: '110px', display: 'block' }}
                                    />
                                </Box>

                                {/* Active / Inactive */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {!cardData.is_expired ? (
                                        <>
                                            <CheckCircleIcon sx={{ fontSize: '22px', color: '#22c55e' }} />
                                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                                                Active
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <CancelIcon sx={{ fontSize: '22px', color: '#ef4444' }} />
                                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#ef4444' }}>
                                                Inactive
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* ── Save PDF button ── */}
                {!isPublicView && (
                    <Box display="flex" justifyContent="flex-end">
                        <Button onClick={handleDownloadPdf} variant="contained" color="primary" size="medium">
                            Save PDF
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DigitalIDCard;
