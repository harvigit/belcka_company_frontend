import React, { useCallback, useEffect, useState } from "react";
import {
    Drawer, Box, IconButton, Typography, Button, InputLabel,
    Avatar, TextField, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, Stack, Chip, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { fetchUserListWeb } from "@/utils/userListWeb";

interface AmountMatch {
    label: string;
    value: string;
}

interface InvoiceFormData {
    id: number;
    company_id: number | null;
    user_id: number | null;
    from_date: string;
    to_date: string;
    invoice_date: string;
    description?: string;
    file: File | null;
    invoice_number?: string;
    amount?: string;
}

interface CreateInvoiceProps {
    open: boolean;
    companyId: number | null;
    onClose: () => void;
    formData: InvoiceFormData;
    setFormData: React.Dispatch<React.SetStateAction<InvoiceFormData>>;
    handleSubmit: (e: React.FormEvent) => void;
    isSaving: boolean;
    isShow: boolean;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({
                                                         open, onClose, formData, setFormData,
                                                         handleSubmit, isSaving, isShow,
                                                     }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    // OCR state
    const [isScanning, setIsScanning] = useState(false);
    const [ocrMatches, setOcrMatches] = useState<AmountMatch[]>([]);
    const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
    const [amountConfirmed, setAmountConfirmed] = useState(false);

    useEffect(() => {
        if (open) {
            setPreview(null);
            setOcrMatches([]);
            setOcrDialogOpen(false);
            setAmountConfirmed(false);
            setIsScanning(false);
            getUsers();
        }
    }, [open]);

    const getUsers = useCallback(async () => {
        try {
            const res = await fetchUserListWeb(formData.company_id);
            const rawUsers = res.data.info || [];
            setUsers(
                rawUsers.map((u: any) => ({
                    ...u,
                    id: Number(u.id),
                    name: u.name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
                })),
            );
        } catch (error) {
            console.error("Failed to load users.");
        }
    }, [formData.company_id]);

    const runOcrScan = async (file: File) => {
        setIsScanning(true);
        setAmountConfirmed(false);
        setFormData((prev) => ({ ...prev, amount: "" }));

        try {
            const fd = new FormData();
            fd.append("file", file); // note: "file" not "file_name" for invoices

            const res = await api.post("bookkeeper-invoices/ocr-scan", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const { amount, matches }: { amount: string | null; matches: AmountMatch[] } = res.data;

            if (matches.length >= 2) {
                // 2+ matches → always show dialog
                setOcrMatches(matches);
                setOcrDialogOpen(true);

            } else {
                // 0 matches → "0"  |  1 match → detected value
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
            setFormData((prev) => ({ ...prev, amount: "0" }));
            setAmountConfirmed(true);
            toast.error("OCR scan failed, amount set to 0.");
        } finally {
            setIsScanning(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/heic": [".heic"],
            "image/webp": [".webp"],
            "application/pdf": [".pdf"],
        },
        multiple: false,
        onDrop: (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;

            setFormData((prev: any) => ({ ...prev, file }));

            const ext = file.name.split(".").pop()?.toLowerCase();
            setPreview(ext === "pdf" ? "/icons/pdf-icon.png" : URL.createObjectURL(file));

            runOcrScan(file);
        },
        onDropRejected: () => toast.error("Please upload a valid file (PDF, JPG, PNG, WEBP, HEIC)"),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isScanning) {
            toast.error("Please wait, scanning file...");
            return;
        }
        if (!formData.file) {
            toast.error("Please upload an invoice file.");
            return;
        }
        if (!amountConfirmed) {
            if (ocrMatches.length >= 2) {
                setOcrDialogOpen(true);
                toast.error("Please select an amount to continue.");
            } else {
                toast.error("No valid amount detected. Please upload a valid invoice.");
            }
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
                <Box height="100%" overflow="auto" display="flex" flexDirection="column">
                    <Box display="flex" alignItems="center" p={1}>
                        <IconButton onClick={onClose}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" fontWeight={700}>
                            Add Invoice
                        </Typography>
                    </Box>

                    <Box height="100%" px={2}>
                        <form
                            onSubmit={handleFormSubmit}
                            className="address-form"
                            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                        >
                            <Box className="form_inputs">
                                <Typography variant="body2" mt={2}>Invoice Number</Typography>
                                <CustomTextField
                                    type="text" name="invoice_number" fullWidth
                                    inputProps={{ maxLength: 50 }}
                                    value={formData.invoice_number}
                                    onChange={handleChange}
                                />

                                <Typography variant="body2" mt={2}>Invoice Date</Typography>
                                <CustomTextField
                                    type="date" name="invoice_date" fullWidth
                                    value={formData.invoice_date} onChange={handleChange}
                                    onFocus={(e: any) => e.target.showPicker()}
                                    onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
                                />

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

                                <Typography variant="body2" gutterBottom mt={2}>Description</Typography>
                                <TextField
                                    name="description" fullWidth multiline rows={3}
                                    value={formData.description} onChange={handleChange}
                                />

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
                                        <input {...getInputProps()} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" />
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

                                {/* Detected amount — read only */}
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

            {/* OCR Amount Picker Dialog */}
            <Dialog
                open={ocrDialogOpen}
                onClose={() => {}}
                maxWidth="xs"
                fullWidth
                disableEscapeKeyDown
            >
                <DialogTitle>
                    <Typography fontWeight={700}>Select Invoice Amount</Typography>
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
                {/* No cancel — user MUST pick */}
            </Dialog>
        </>
    );
};

export default CreateInvoice;
