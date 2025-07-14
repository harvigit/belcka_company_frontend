"use client";
import React, { useEffect, useState, useRef } from "react";
import {
    Avatar,
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    Stack,
    Typography,
    CircularProgress,
    Button,
} from "@mui/material";
import { TeamList } from "@/types/team";
import api from "@/utils/axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ApiDigitalCardInfo {
    user_id: number;
    company_name: string;
    company_logo: string;
    name: string;
    joined_on: string;
    trade_name: string;
    user_image: string;
    qr_code_url: string;
    is_working: boolean;
}

interface DigitalIDCardProps {
    open: boolean;
    onClose: () => void;
    user: TeamList | null;
}

const DigitalIDCard: React.FC<DigitalIDCardProps> = ({ open, onClose, user }) => {
    const [cardData, setCardData] = useState<ApiDigitalCardInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        const fetchCardData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const res = await api.get("/user/get-user-digital-card", {
                    params: { user_id: user.id },
                });

                if (res.data?.IsSuccess) {
                    setCardData(res.data.info);
                } else {
                    setCardData(null);
                }
            } catch (err) {
                console.error("Failed to fetch digital card", err);
            } finally {
                setLoading(false);
            }
        };

        if (open && user?.id) {
            fetchCardData();
        }
    }, [open, user]);

    const handleDownloadPDF = async () => {
        if (!cardRef.current) return;

        const canvas = await html2canvas(cardRef.current);
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const width = 180;
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, "PNG", 15, 20, width, height);
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
                                p: 2,
                                borderRadius: 2,
                                backgroundColor: "#EAF2F9",
                                textAlign: "center",
                            }}
                        >
                            <Avatar
                                src={cardData.user_image || "/images/users/user.png"}
                                alt={cardData.name}
                                sx={{ width: 100, height: 100, mx: "auto", mb: 1 }}
                            />
                            <Typography variant="h6">{cardData.name}</Typography>
                            <Typography variant="body2" color="textSecondary">
                                USER ID: {String(cardData.user_id).padStart(5, "0")}
                            </Typography>
                            <Typography
                                variant="subtitle1"
                                sx={{ mt: 1, fontWeight: "bold", color: "#000" }}
                            >
                                {cardData.trade_name}
                            </Typography>

                            <Grid container spacing={2} mt={2} justifyContent="center">
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">
                                        JOINED
                                    </Typography>
                                    <Typography variant="body2">{cardData.joined_on}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">
                                        COMPANY
                                    </Typography>
                                    <Typography variant="body2">{cardData.company_name}</Typography>
                                </Grid>
                            </Grid>

                            <Box mt={2}>
                                <img
                                    src={cardData.qr_code_url}
                                    alt="QR Code"
                                    width={100}
                                    height={100}
                                    style={{ objectFit: "contain" }}
                                />
                            </Box>

                            <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="center"
                                alignItems="center"
                                mt={2}
                            >
                                <Box
                                    width={10}
                                    height={10}
                                    borderRadius="50%"
                                    bgcolor={cardData.is_working ? "green" : "red"}
                                />
                                <Typography
                                    color={cardData.is_working ? "green" : "red"}
                                    fontSize="14px"
                                >
                                    {cardData.is_working ? "Active" : "Inactive"}
                                </Typography>
                            </Stack>

                            <Typography
                                variant="caption"
                                color="textSecondary"
                                mt={2}
                                display="block"
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
