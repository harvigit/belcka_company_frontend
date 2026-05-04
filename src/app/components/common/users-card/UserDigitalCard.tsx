'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    Typography,
    CircularProgress,
    Button,
    IconButton,
} from '@mui/material';
import axios from 'axios';
import CloseIcon from '@mui/icons-material/Close';
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

const CARD_WIDTH  = 480;
const CARD_HEIGHT = 300;

const DigitalIDCard: React.FC<DigitalIDCardProps> = ({
    open,
    onClose,
    userId,
    token,
    isPublicView = false
}) => {
    const [cardData, setCardData] = useState<ApiDigitalCardInfo | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string | null>(null);

    const cardRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const computeScale = () => {
            const padding   = window.innerWidth < 600 ? 0 : 96;
            const available = window.innerWidth - padding;
            setScale(Math.min(1, available / CARD_WIDTH));
        };
        computeScale();
        window.addEventListener('resize', computeScale);
        return () => window.removeEventListener('resize', computeScale);
    }, []);

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
                setError(
                    err.response?.data?.message || err.message || 'Failed to load card',
                );
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
            const [userImg, logoImg, qrImg] = await Promise.all([
                convertImageToBase64(cardData.user_image || '/images/users/user.png'),
                convertImageToBase64(cardData.company_logo),
                convertImageToBase64(cardData.qr_code_url),
            ]);

            const el       = cardRef.current;
            const avatarEl = el.querySelector('img[alt="User"]')         as HTMLImageElement;
            const logoEl   = el.querySelector('img[alt="Company Logo"]') as HTMLImageElement;
            const qrEl     = el.querySelector('img[alt="QR Code"]')      as HTMLImageElement;

            const origAvatar = avatarEl?.src;
            const origLogo   = logoEl?.src;
            const origQr     = qrEl?.src;

            if (avatarEl) avatarEl.src = userImg;
            if (logoEl)   logoEl.src   = logoImg;
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

            if (avatarEl && origAvatar) avatarEl.src = origAvatar;
            if (logoEl   && origLogo)   logoEl.src   = origLogo;
            if (qrEl     && origQr)     qrEl.src     = origQr;

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [CARD_HEIGHT, CARD_WIDTH],
            });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, CARD_WIDTH, CARD_HEIGHT);
            pdf.save(`${cardData.first_name}_${cardData.last_name}_ID_Card.pdf`);
        } catch {
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (!open) return null;

    if (error) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogContent>
                    <Box textAlign="center" py={4}>
                        <Typography color="error" variant="h6" fontWeight={600}>
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

    const scaledWidth  = CARD_WIDTH  * scale;
    const scaledHeight = CARD_HEIGHT * scale;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    margin: { xs: '16px', sm: '32px' },
                    width: { xs: 'calc(100% - 32px)', sm: 'auto' },
                    maxWidth: { xs: '100%', sm: '680px' },
                    borderRadius: '12px',
                    alignSelf: 'center',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 3,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography fontWeight={600} fontSize={15} color="text.primary">
                    {cardData.first_name} {cardData.last_name}&apos;s Digital ID Card
                </Typography>
                <IconButton onClick={onClose} size="small" aria-label="Close">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <DialogContent
                sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: `${scaledWidth}px`,
                            height: `${scaledHeight}px`,
                            flexShrink: 0,
                            position: 'relative',
                        }}
                    >
                        <Box
                            ref={cardRef}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                transformOrigin: 'top left',
                                transform: `scale(${scale})`,
                                width: `${CARD_WIDTH}px`,
                                height: `${CARD_HEIGHT}px`,
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                padding: '24px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '24px',
                                fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-start',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: '80px',
                                        height: '80px',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        backgroundColor: '#e5e7eb',
                                        mb: '12px',
                                    }}
                                >
                                    <img
                                        src={cardData.user_image || '/images/users/user.png'}
                                        alt="User"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                        }}
                                    />
                                </Box>

                                <Typography
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: 400,
                                        color: '#6b7280',
                                        mb: '10px',
                                    }}
                                >
                                    ID : {cardData.user_code}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: '22px',
                                        fontWeight: 700,
                                        color: '#111827',
                                        lineHeight: 1.2,
                                        mb: '6px',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {cardData.first_name} {cardData.last_name}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: '14px',
                                        fontWeight: 400,
                                        color: '#6b7280',
                                        mb: '6px',
                                    }}
                                >
                                    {cardData.trade_name}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: '26px',
                                        fontWeight: 600,
                                        color: '#374151',
                                    }}
                                >
                                    {cardData.company_name}
                                </Typography>
                            </Box>
                            
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
                                <Box
                                    sx={{
                                        width: '100px',
                                        height: '100px',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        mb: '10px',
                                        objectFit: 'cover',
                                    }}
                                >
                                    <img
                                        src={cardData.company_logo}
                                        alt="Company Logo"
                                        style={{ width: '100%', height: '100%', display: 'block' }}
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        background: '#fff',
                                        padding: '4px',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                    }}
                                >
                                    <img
                                        src={cardData.qr_code_url}
                                        alt="QR Code"
                                        style={{
                                            width: '110px',
                                            height: '110px',
                                            display: 'block',
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {!isPublicView && (
                    <Box display="flex" justifyContent="flex-end">
                        <Button
                            onClick={handleDownloadPdf}
                            variant="contained"
                            color="primary"
                            size="medium"
                            sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
                        >
                            Save as PDF
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DigitalIDCard;
