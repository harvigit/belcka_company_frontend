import React, { useCallback, useEffect, useState } from "react";
import {
    Drawer, Box, IconButton, Typography, Button, InputLabel,
    Avatar, Select, MenuItem, Stack, CircularProgress, Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

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
}

interface CreatePayslipProps {
    open: boolean;
    companyId: number | null;
    onClose: () => void;
    formData: PayslipFormData;
    setFormData: React.Dispatch<React.SetStateAction<PayslipFormData>>;
    handleSubmit: (e: React.FormEvent) => void;
    isSaving: boolean;
    isShow: boolean;
}

const ALLOWED_PAYSLIP_AMOUNT_LABELS = new Set(["Net Total", "Net Payment", "Total Net", "Net"]);

const CreatePayslip: React.FC<CreatePayslipProps> = ({
                                                         open, onClose, formData, setFormData,
                                                         handleSubmit, isSaving, isShow,
                                                     }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    // OCR state
    const [isScanning, setIsScanning] = useState(false);
    const [amountConfirmed, setAmountConfirmed] = useState(false);

    // Reset all OCR state when drawer opens/closes
    useEffect(() => {
        if (open) {
            setPreview(null);
            setAmountConfirmed(false);
            getUsers();
        }
    }, [open]);

    const getUsers = useCallback(async () => {
        try {
            const res = await api.get(`user/list`);
            setUsers(res.data.info || []);
        } catch (error) {
            console.error("Failed to load users.");
        }
    }, []);

    // Called when file is dropped
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

            const { matches }: { amount: string | null; matches: AmountMatch[] } = res.data;
            const selectedMatch = matches.find((match) => ALLOWED_PAYSLIP_AMOUNT_LABELS.has(match.label));
            const selectedAmount = selectedMatch?.value ?? "";

            setFormData((prev) => ({ ...prev, amount: selectedAmount }));
            setAmountConfirmed(true);

            if (selectedMatch) {
                toast.success(`Amount detected: ${selectedAmount}`);
            } else {
                toast("No allowed payslip amount detected.", { icon: "ℹ️" });
            }

        } catch (e) {
            console.error("OCR scan failed", e);
            setFormData((prev) => ({ ...prev, amount: "" }));
            setAmountConfirmed(true);
            toast.error("OCR scan failed, amount left blank.");
        } finally {
            setIsScanning(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            "image/jpeg": [".jpeg", ".jpg"],
            "image/png": [".png"],
            "application/pdf": [".pdf"],
        },
        multiple: false,
        onDrop: (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;
            setFormData((prev) => ({ ...prev, file_name: file, amount: "" }));
            setPreview(URL.createObjectURL(file));
            runOcrScan(file);
        },
        onDropRejected: () => toast.error("Please upload a valid image or PDF file"),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Guard submit: block if no amount confirmed
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isScanning) {
            toast.error("Please wait, scanning file...");
            return;
        }
        if (!formData.file_name) {
            toast.error("Please upload a payslip file.");
            return;
        }
        if (!amountConfirmed) {
            toast.error("Please wait until amount scan is complete.");
            return;
        }

        handleSubmit(e);
    };

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
                            Add Payslip
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box height="100%" px={2}>
                        <form
                            onSubmit={handleFormSubmit}
                            className="address-form"
                            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                        >
                            <Box className="form_inputs">
                                <Box display="flex" gap={2} mt={2}>
                                    <Box flex={1}>
                                        <Typography variant="body2">From Date</Typography>
                                        <CustomTextField
                                            type="month" name="from_date" fullWidth
                                            value={formData.from_date} onChange={handleChange}
                                            onFocus={(e: any) => e.target.showPicker()}
                                            onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
                                        />
                                    </Box>

                                    <Box flex={1}>
                                        <Typography variant="body2">To Date</Typography>
                                        <CustomTextField
                                            type="month" name="to_date" fullWidth
                                            value={formData.to_date} onChange={handleChange}
                                            inputProps={{ min: formData.from_date || undefined }}
                                            onFocus={(e: any) => e.target.showPicker()}
                                            onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
                                        />
                                    </Box>
                                </Box>

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
                                            position: "relative",
                                        }}
                                    >
                                        <input {...getInputProps()} accept=".png,.jpg,.jpeg,.pdf" />
                                        {isScanning ? (
                                            <Stack alignItems="center" spacing={1}>
                                                <CircularProgress size={32} />
                                                <Typography fontSize="11px" color="textSecondary">
                                                    Scanning...
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
                                </Box>

                                {/* Amount display — read only, set by OCR */}
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
                                            Detected Amount
                                        </Typography>
                                        <Chip
                                            label={formData.amount}
                                            color="success"
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                )}
                            </Box>

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

        </>
    );
};

export default CreatePayslip;
