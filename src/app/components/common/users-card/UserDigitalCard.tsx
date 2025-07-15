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
import api from '@/utils/axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface ApiDigitalCardInfo {
    id: number;
    user_id: number;
    company_name: string;
    company_logo: string;
    name: string;
    first_name: string;
    last_name: string;
    joined_on: string;
    valid_until?: string;
    trade_name: string;
    user_image: string;
    qr_code_url: string;
    is_working: boolean;
}

interface DigitalIDCardProps {
    open: boolean;
    onClose: () => void;
    user: ApiDigitalCardInfo | null;
}

const DigitalIDCard: React.FC<DigitalIDCardProps> = ({ open, onClose, user }) => {
    const [cardData, setCardData] = useState<ApiDigitalCardInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchCardData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                // noinspection JSAnnotator
                const res = await api.get('/user/get-user-digital-card', {
                    params: { user_id: user.id },
                });
                if (res.data?.IsSuccess) {
                    setCardData(res.data.info);
                } else {
                    setCardData(null);
                }
            } catch (err) {
                console.error('Failed to fetch digital card', err);
            } finally {
                setLoading(false);
            }
        };

        if (open && user) fetchCardData();
    }, [open, user]);

    const handleDownloadPDF = async () => {
        if (!cardRef.current) return;
        const canvas = await html2canvas(cardRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = 180;
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, 'PNG', 15, 20, width, height);
        pdf.save(`${cardData?.name}_ID_Card.pdf`);
    };

    if (!cardData) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cardData.name}&apos;s ID Card</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
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
                                boxShadow: 'inset 0 0 30px #abcbdb'
                                    
                            }}
                        >
                            <Stack>
                                <Stack direction="row" justifyContent="center" spacing={1}>
                                    <Box
                                        component="img"
                                        src="/images/logos/belcka-logo.png"
                                        alt="Belcka Logo"
                                        height={70}
                                    />
                                </Stack>
                            </Stack>
                            
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                                <Box textAlign="left">
                                    <Typography color="#25384b" lineHeight={1} fontSize="25px" fontWeight={700}>
                                        {cardData.first_name}
                                    </Typography>
                                    <Typography color="#25384b" lineHeight={1} fontSize="25px" fontWeight={700}>
                                        {cardData.last_name}
                                    </Typography>
                                    <Typography  mt={1} fontSize="16px" color="#25384b" fontWeight={300}>
                                        USER ID: {String(cardData.user_id)}
                                    </Typography>
                                    <Typography fontSize="20px" color="#25384b" fontWeight={600} mt={0.5}>
                                        {cardData.trade_name}
                                    </Typography>
                                </Box>

                                <Avatar
                                    src={cardData.user_image || '/images/users/user.png'}
                                    sx={{ width: '40%', height: '130px' }}
                                />
                            </Stack>
                            
                            <Stack direction="row" justifyContent="space-between" mt={2}>
                                {/*<Box>*/}
                                {/*    <Typography fontSize="11px" color="text.secondary">*/}
                                {/*        VALID UNTIL*/}
                                {/*    </Typography>*/}
                                {/*    <Typography fontSize="14px">*/}
                                {/*        {cardData.valid_until || '31 Dec 2025'}*/}
                                {/*    </Typography>*/}
                                {/*</Box>*/}
                                <Box>
                                    <Typography fontSize="11px" color="#25384b" fontWeight={300}>
                                        JOINED
                                    </Typography>
                                    <Typography fontSize="14px">{cardData.joined_on}</Typography>
                                </Box>
                            </Stack>
                            
                            <Typography mt={2} fontWeight={700} color="#25384b" fontSize="22px" textAlign="left">
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
                                {cardData.is_working ? (
                                    <>
                                        <CheckCircleIcon sx={{ color: 'green', fontSize: 20 }} />
                                        <Typography fontWeight={500}>
                                            Active
                                        </Typography>
                                    </>
                                ) : (
                                    <>
                                        <CancelIcon sx={{ color: 'red', fontSize: 20 }} />
                                        <Typography color="red" fontWeight={500}>
                                            Inactive
                                        </Typography>
                                    </>
                                )}
                            </Stack>
                            
                            <Typography
                                variant="caption"
                                mt={2}
                                textAlign="center"
                                display="block"
                                color="#25384b"
                            >
                                TIME IS MONEY. CONTROL IT.
                            </Typography>
                        </Box>

                        <Box mt={3} display="flex" justifyContent="flex-end">
                            <Button onClick={handleDownloadPDF} variant="contained" color="primary">
                                Save PDF
                            </Button>
                        </Box>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DigitalIDCard;
