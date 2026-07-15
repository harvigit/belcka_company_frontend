import React, { useCallback, useEffect, useState } from "react";
import {
    Drawer, Box, IconButton, Typography, Button, InputLabel,
    Avatar, Select, MenuItem, Dialog, DialogTitle, DialogContent,
    Stack, Chip, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/utils/axios";

interface AmountMatch {
    label: string;
    value: string;
}

interface PayslipFormData {
    id: number;
    company_id: number | null;
    user_id: number | null;
    from_date: string;
    to_date: string;
    payment_date?: string;
    amount?: string;
    payslip_number?: string;
    file_name: File | null;
    existing_pdf?: string;
    existing_image?: string;
}

interface EditPayslipProps {
    open: boolean;
    onClose: () => void;
    formData: PayslipFormData;
    setFormData: React.Dispatch<React.SetStateAction<PayslipFormData>>;
    handleSubmit: (e: React.FormEvent) => void;
    isSaving: boolean;
    isShow: boolean;
    payslip: any;
    companyId: number | null;
}

const toDateInputValue = (value?: string | null): string => {
    if (!value) return "";

    const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const displayMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (displayMatch) {
        const [, day, month, year] = displayMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const EditPayslip: React.FC<EditPayslipProps> = ({
                                                     open, onClose, formData, setFormData,
                                                     handleSubmit, isSaving, payslip, isShow,
                                                 }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    // OCR state
    const [isScanning, setIsScanning] = useState(false);
    const [ocrMatches, setOcrMatches] = useState<AmountMatch[]>([]);
    const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
    // Edit starts with amountConfirmed=true since existing payslip already has amount
    const [amountConfirmed, setAmountConfirmed] = useState(true);

    const getUsers = useCallback(async () => {
        try {
            const res = await api.get(`user/list`);
            setUsers(res.data.info || []);
        } catch (error) {
            console.error("Failed to load users.");
        }
    }, []);

    // Pre-fill the form when drawer opens
    useEffect(() => {
        if (open && payslip) {
            setFormData({
                id: payslip.id,
                company_id: payslip.company_id,
                user_id: payslip.user_id,
                from_date: toDateInputValue(payslip.fromDate ?? payslip.from_date),
                to_date: toDateInputValue(payslip.toDate ?? payslip.to_date),
                payment_date: toDateInputValue(payslip.payment_date),
                amount: payslip.amount || "",
                payslip_number: payslip.payslip_number || "",
                file_name: null,
                existing_pdf: payslip.pdf_url || undefined,
                existing_image: payslip.image_url || undefined,
            });

            setPreview(payslip.image_url || null);
            // Reset OCR state — existing amount is already confirmed
            setOcrMatches([]);
            setOcrDialogOpen(false);
            setAmountConfirmed(true); // existing payslip already has amount
            setIsScanning(false);
            getUsers();
        }
    }, [open, payslip]);

    const runOcrScan = async (file: File) => {
        setIsScanning(true);
        setAmountConfirmed(false);
        setFormData((prev) => ({ ...prev, amount: "" }));

        try {
            const fd = new FormData();
            fd.append("file_name", file);

            const res = await api.post("payslips/ocr-scan", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const { amount, matches }: { amount: string | null; matches: AmountMatch[] } = res.data;

            if (matches.length >= 2) {
                // 2+ matches (same or different values) → always show dialog
                setOcrMatches(matches);
                setOcrDialogOpen(true);

            } else {
                // 0 matches → amount="0"  |  1 match → amount=detected value
                setFormData((prev) => ({ ...prev, amount: amount ?? "0" }));
                setAmountConfirmed(true);

                if (matches.length === 0) {
                    toast("No amount detected, saving with 0.", { icon: "ℹ️" });
                } else {
                    toast.success(`Amount detected: ${amount}`);
                }
            }
        } catch (e) {
            console.error("OCR scan failed", e);
            // On error: keep existing amount, don't block save
            setFormData((prev) => ({ ...prev, amount: payslip?.amount || "0" }));
            setAmountConfirmed(true);
            toast.error("OCR scan failed, keeping previous amount.");
        } finally {
            setIsScanning(false);
        }
    };

    const { getRootProps, getInputProps, open: openFileDialog } = useDropzone({
        accept: {
            "image/jpeg": [".jpeg", ".jpg"],
            "image/png": [".png"],
            "application/pdf": [".pdf"],
        },
        multiple: false,
        onDrop: (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;

            setFormData((prev) => ({
                ...prev,
                file_name: file,
                existing_pdf: undefined,
                existing_image: undefined,
            }));

            setPreview(URL.createObjectURL(file));
            runOcrScan(file); // trigger OCR on new file
        },
        onDropRejected: () => {
            toast.error("Please upload a valid file (PDF or image)");
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Guard submit
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isScanning) {
            toast.error("Please wait, scanning file...");
            return;
        }
        if (!amountConfirmed) {
            // 2+ matches and user hasn't picked yet — re-open dialog
            setOcrDialogOpen(true);
            toast.error("Please select an amount to continue.");
            return;
        }

        handleSubmit(e);
    };

    const isPdfPreview = formData.file_name?.type === "application/pdf" ||
        (!formData.file_name && Boolean(formData.existing_pdf));
    const pdfPreviewUrl = isPdfPreview
        ? (formData.file_name ? preview : formData.existing_pdf)
        : null;

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                sx={{
                    width: 480,
                    "& .MuiDrawer-paper": { width: 480, backgroundColor: "#f9f9f9" },
                }}
            >
                <Box display="flex" flexDirection="column" height="100%">
                    {/* Header */}
                    <Box display="flex" alignItems="center" p={1}>
                        <IconButton onClick={onClose}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" fontWeight={700}>
                            Edit Payslip
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box height="100%" px={2}>
                        <form
                            onSubmit={handleFormSubmit}
                            className="address-form"
                            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                        >
                            <Typography variant="body2" mt={2}>From Date</Typography>
                            <CustomTextField
                                type="date" name="from_date" fullWidth
                                value={formData.from_date} onChange={handleChange}
                                onFocus={(e: any) => e.target.showPicker()}
                                onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
                            />

                            <Typography variant="body2" mt={2}>To Date</Typography>
                            <CustomTextField
                                type="date" name="to_date" fullWidth
                                value={formData.to_date} onChange={handleChange}
                                inputProps={{ min: formData.from_date || undefined }}
                                onFocus={(e: any) => e.target.showPicker()}
                                onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
                            />

                            {isShow && (
                                <>
                                    <Typography variant="body2" sx={{ mt: 2 }}>User</Typography>
                                    <Select
                                        fullWidth
                                        value={formData.user_id}
                                        onChange={(e) =>
                                            setFormData((p) => ({ ...p, user_id: Number(e.target.value) }))
                                        }
                                    >
                                        <MenuItem disabled>Select User</MenuItem>
                                        {users.map((u: any) => (
                                            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}

                            {/* File Upload */}
                            <InputLabel sx={{ mt: 2 }}>Upload File</InputLabel>
                            <Box mt={2} mb={1} textAlign="center">
                                <Box
                                    {...getRootProps()}
                                    sx={{
                                        width: 180, height: 180, mx: "auto",
                                        border: "2px dashed", borderColor: "primary.main",
                                        borderRadius: 3, cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        "&:hover": { backgroundColor: "primary.light" },
                                    }}
                                >
                                    <input {...getInputProps()} />
                                    {isScanning ? (
                                        <Stack alignItems="center" spacing={1}>
                                            <CircularProgress size={32} />
                                            <Typography fontSize="11px" color="textSecondary">
                                                Scanning...
                                            </Typography>
                                        </Stack>
                                    ) : isPdfPreview ? (
                                        <Stack
                                            alignItems="center"
                                            spacing={1}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (pdfPreviewUrl) {
                                                    window.open(pdfPreviewUrl, "_blank", "noopener,noreferrer");
                                                }
                                            }}
                                            sx={{ px: 2, maxWidth: "100%" }}
                                        >
                                            <PictureAsPdfIcon color="error" sx={{ fontSize: 56 }} />
                                            <Typography
                                                fontSize="12px"
                                                color="primary.main"
                                                textAlign="center"
                                                sx={{ wordBreak: "break-word" }}
                                            >
                                                {formData.file_name?.name || "View uploaded PDF"}
                                            </Typography>
                                        </Stack>
                                    ) : preview ? (
                                        <Avatar src={preview} alt="Preview" sx={{ width: "100%", height: "100%" }} />
                                    ) : (
                                        <Typography fontSize="12px" color="primary.main">
                                            Click or Drag File
                                        </Typography>
                                    )}
                                </Box>
                                {(preview || formData.existing_pdf || formData.existing_image) && (
                                    <Button
                                        type="button"
                                        variant="outlined"
                                        size="small"
                                        startIcon={<CloudUploadIcon />}
                                        onClick={openFileDialog}
                                        disabled={isScanning || isSaving}
                                        sx={{ mt: 1.5 }}
                                    >
                                        Replace uploaded file
                                    </Button>
                                )}
                            </Box>

                            {/* Amount display — read only, set by OCR or existing value */}
                            {formData.amount && amountConfirmed && (
                                <Box
                                    mt={1} mb={1} px={2} py={1.5}
                                    sx={{
                                        backgroundColor: "#f0fdf4",
                                        border: "1px solid #86efac",
                                        borderRadius: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        Amount
                                    </Typography>
                                    <Chip
                                        label={formData.amount}
                                        color="success"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            )}

                            {/* Actions */}
                            <Box sx={{ display: "flex", justifyContent: "start", gap: 2, mt: "auto", mb: 2 }}>
                                <Button
                                    color="primary" variant="contained" size="large" type="submit"
                                    disabled={isSaving || isScanning}
                                    sx={{ borderRadius: 3 }}
                                >
                                    {isSaving ? "Saving..." : isScanning ? "Scanning..." : "Save"}
                                </Button>
                                <Button
                                    color="inherit" onClick={onClose} variant="contained" size="large"
                                    sx={{ backgroundColor: "transparent", borderRadius: 3, color: "GrayText" }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Drawer>

            {/* OCR Amount Picker Dialog — only when 2+ matches found on new file upload */}
            <Dialog
                open={ocrDialogOpen}
                onClose={() => {}}
                maxWidth="xs"
                fullWidth
                disableEscapeKeyDown
            >
                <DialogTitle>
                    <Typography fontWeight={700}>Select Payslip Amount</Typography>
                    <Typography variant="body2" color="textSecondary" mt={0.5}>
                        Multiple amounts were detected. You must select one to continue.
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} mt={1}>
                        {ocrMatches.map((match, i) => (
                            <Button
                                key={i}
                                variant="outlined"
                                fullWidth
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, amount: match.value }));
                                    setAmountConfirmed(true);
                                    setOcrDialogOpen(false);
                                    toast.success(`Amount set: ${match.value}`);
                                }}
                                sx={{
                                    justifyContent: "space-between",
                                    px: 2.5, py: 1.5,
                                    borderRadius: 2,
                                    borderColor: "divider",
                                    "&:hover": { borderColor: "primary.main", backgroundColor: "primary.50" },
                                }}
                            >
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {match.label}
                                </Typography>
                                <Typography variant="body1" color="primary" fontWeight={700}>
                                    {match.value}
                                </Typography>
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default EditPayslip;
