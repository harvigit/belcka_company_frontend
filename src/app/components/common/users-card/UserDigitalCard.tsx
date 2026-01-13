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
}

interface DigitalIDCardProps {
    open: boolean;
    onClose: () => void;
    userId: number;
    token?: string;
    isPublicView?: boolean;
}

const CARD_WIDTH = 360;
const CARD_HEIGHT = 560;

const DigitalIDCard: React.FC<DigitalIDCardProps> = ({open, onClose, userId, token, isPublicView = false}) => {
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
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to load card',
                );
            } finally {
                setLoading(false);
            }
        };

        fetchCardData();
    }, [userId, token, isPublicView]);

    const convertImageToBase64 = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(url); // Fallback to original URL
            img.src = url;
        });
    };

    const handleDownloadPdf = async () => {
        if (!cardRef.current || !cardData) return;

        try {
            // Pre-load and convert all images to base64
            const logoImg = await convertImageToBase64('/belcka.svg');
            const userImg = await convertImageToBase64(cardData.user_image || '/images/users/user.png');
            const qrImg = await convertImageToBase64(cardData.qr_code_url);

            // Temporarily replace images with base64
            const cardElement = cardRef.current;
            const logoElement = cardElement.querySelector('img[alt="Belcka Logo"]') as HTMLImageElement;
            const avatarElement = cardElement.querySelector('.MuiAvatar-img') as HTMLImageElement;
            const qrElement = cardElement.querySelector('img[alt="QR Code"]') as HTMLImageElement;

            const originalLogoSrc = logoElement?.src;
            const originalAvatarSrc = avatarElement?.src;
            const originalQrSrc = qrElement?.src;

            if (logoElement) logoElement.src = logoImg;
            if (avatarElement) avatarElement.src = userImg;
            if (qrElement) qrElement.src = qrImg;

            await new Promise((res) => setTimeout(res, 300));

            const canvas = await html2canvas(cardElement, {
                scale: 3,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#d4ebf7',
                logging: false,
                imageTimeout: 0,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                windowWidth: CARD_WIDTH,
                windowHeight: CARD_HEIGHT,
            });

            // Restore original images
            if (logoElement && originalLogoSrc) logoElement.src = originalLogoSrc;
            if (avatarElement && originalAvatarSrc) avatarElement.src = originalAvatarSrc;
            if (qrElement && originalQrSrc) qrElement.src = originalQrSrc;

            // Generate PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [CARD_WIDTH, CARD_HEIGHT],
            });

            pdf.addImage(imgData, 'PNG', 0, 0, CARD_WIDTH, CARD_HEIGHT);
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

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    margin: { xs: '16px', sm: '32px' },
                    maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>{cardData.name}&apos;s ID Card</DialogTitle>

            <DialogContent sx={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                p: { xs: 2, sm: 3 }
            }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flex: 1,
                        overflow: 'hidden',
                        mb: 2
                    }}
                >
                    <Box
                        ref={cardRef}
                        sx={{
                            width: '100%',
                            maxWidth: `${CARD_WIDTH}px`,
                            aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`,
                            backgroundColor: '#d4ebf7',
                            borderRadius: '12px',
                            padding: { xs: '16px', sm: '24px' },
                            border: '3px solid #4DA1FF',
                            fontFamily: 'Inter, sans-serif',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Logo */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: { xs: '24px', sm: '32px' },
                            }}
                        >
                            <img
                                src="/belcka.svg"
                                alt="Belcka Logo"
                                style={{
                                    height: 'clamp(24px, 5vw, 32px)',
                                    width: 'auto',
                                    objectFit: 'contain',
                                    display: 'block',
                                }}
                            />
                        </Box>

                        {/* User Info */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: { xs: '12px', sm: '16px' },
                                alignItems: 'center',
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{
                                    fontSize: { xs: '20px', sm: '26px' },
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    wordBreak: 'break-word'
                                }}>
                                    {cardData.first_name}
                                </Typography>
                                <Typography sx={{
                                    fontSize: { xs: '20px', sm: '26px' },
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    wordBreak: 'break-word'
                                }}>
                                    {cardData.last_name}
                                </Typography>

                                <Typography sx={{
                                    fontSize: { xs: '10px', sm: '12px' },
                                    marginTop: '8px'
                                }}>
                                    USER CODE: {cardData.user_code}
                                </Typography>

                                <Typography sx={{
                                    fontSize: { xs: '14px', sm: '16px' },
                                    fontWeight: 600,
                                    wordBreak: 'break-word'
                                }}>
                                    {cardData.trade_name}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    width: { xs: '70px', sm: '90px' },
                                    height: { xs: '70px', sm: '90px' },
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                }}
                            >
                                <img
                                    className="MuiAvatar-img"
                                    src={cardData.user_image || '/images/users/user.png'}
                                    alt="User"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Company */}
                        <Typography sx={{
                            fontWeight: 700,
                            fontSize: { xs: '12px', sm: '14px' },
                            wordBreak: 'break-word'
                        }}>
                            {cardData.company_name}
                        </Typography>

                        {/* QR */}
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Box
                                sx={{
                                    background: '#fff',
                                    padding: { xs: '6px', sm: '8px' },
                                    borderRadius: '4px',
                                }}
                            >
                                <img
                                    src={cardData.qr_code_url}
                                    alt="QR Code"
                                    style={{
                                        width: 'clamp(100px, 20vw, 120px)',
                                        height: 'clamp(100px, 20vw, 120px)',
                                        display: 'block',
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Status */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: '8px',
                                alignItems: 'center',
                            }}
                        >
                            {!cardData.is_expired ? (
                                <>
                                    <CheckCircleIcon sx={{ fontSize: { xs: '18px', sm: '20px' }, color: '#4caf50' }} />
                                    <Typography sx={{ fontSize: { xs: '12px', sm: '14px' } }}>Active</Typography>
                                </>
                            ) : (
                                <>
                                    <CancelIcon sx={{ fontSize: { xs: '18px', sm: '20px' }, color: '#f44336' }} />
                                    <Typography sx={{ fontSize: { xs: '12px', sm: '14px' }, color: '#f44336' }}>
                                        Inactive
                                    </Typography>
                                </>
                            )}
                        </Box>

                        {/* Footer */}
                        <Typography
                            sx={{
                                textAlign: 'center',
                                fontWeight: 600,
                                fontSize: { xs: '11px', sm: '13px' },
                            }}
                        >
                            TIME IS MONEY. CONTROL IT.
                        </Typography>
                    </Box>
                </Box>

                {/* Download */}
                { !isPublicView &&
                    <Box display="flex" justifyContent="flex-end">
                        <Button
                            onClick={handleDownloadPdf}
                            variant="contained"
                            color="primary"
                            size="medium"
                        >
                            Save PDF
                        </Button>
                    </Box>
                }
            </DialogContent>
        </Dialog>
    );
};

export default DigitalIDCard;
