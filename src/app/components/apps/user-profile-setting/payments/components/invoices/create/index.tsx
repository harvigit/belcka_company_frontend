import React, { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  InputLabel,
  Avatar,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

interface PayslipFormData {
  id: number;
  company_id: number | null;
  user_id: number | null;
  from_date: string;
  to_date: string;
  invoice_date: string;
  description?: string;
  file_name: File | null;
  invoice_number?: string;
}

interface CreateInvoiceProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: PayslipFormData;
  setFormData: React.Dispatch<React.SetStateAction<PayslipFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  isShow: boolean;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  isShow,
  companyId,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      setFormData((prev) => ({ ...prev, file_name: selectedFile }));
      setPreview(URL.createObjectURL(selectedFile));
    },
    onDropRejected: () => {
      toast.error("Please upload a valid PDF file");
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getUsers = useCallback(async () => {
    try {
      const res = await api.get(`user/list`);
      setUsers(res.data.info || []);
    } catch (error) {
      console.error("Failed to load users. Please try again.");
    } finally {
    }
  }, [open]);
  useEffect(() => {
    if (open) {
      setPreview(null);
      getUsers();
    }
  }, [open]);

  return (
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
        {/* Header */}
        <Box display="flex" alignItems="center" p={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Add Invoice
          </Typography>
        </Box>

        {/* Form */}
        <Box height="100%" px={2}>
          <form
            onSubmit={handleSubmit}
            className="address-form"
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          >
            {/* Form Inputs */}
            <Box className="form_inputs">
              <Typography variant="body2" mt={2}>
                Invoice Number
              </Typography>
              <CustomTextField
                type="text"
                name="invoice_number"
                fullWidth
                inputProps={{ maxLength: 50 }}
                value={formData.invoice_number}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                Invoice Date
              </Typography>
              <CustomTextField
                type="date"
                name="invoice_date"
                fullWidth
                value={formData.invoice_date}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                From Date
              </Typography>
              <CustomTextField
                type="date"
                name="from_date"
                fullWidth
                value={formData.from_date}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                To Date
              </Typography>
              <CustomTextField
                type="date"
                name="to_date"
                fullWidth
                value={formData.to_date}
                onChange={handleChange}
                inputProps={{
                  min: formData.from_date || undefined,
                }}
              />

              {isShow && (
                <>
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    User
                  </Typography>
                  <Select
                    fullWidth
                    value={formData.user_id}
                    onChange={(e) => {
                      setFormData((p) => ({
                        ...p,
                        user_id: Number(e.target.value),
                      }));
                    }}
                  >
                    <MenuItem disabled>Select User</MenuItem>
                    {users.map((a: any) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              )}
              <Typography variant="body2" gutterBottom mt={2}>
                Description
              </Typography>

              <TextField
                name="description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />

              {/* File Upload */}
              <InputLabel htmlFor="file-upload" sx={{ mt: 2 }}>
                Upload File
              </InputLabel>
              <Box mt={2} mb={2} textAlign="center">
                <Box
                  {...getRootProps()}
                  sx={{
                    width: 180,
                    height: 180,
                    mx: "auto",
                    border: "2px dashed",
                    borderColor: "primary.main",
                    borderRadius: 3,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      backgroundColor: "primary.light",
                    },
                  }}
                >
                  <input {...getInputProps()} accept=".png,.jpg,.jpeg,.pdf" />
                  {preview ? (
                    <Avatar
                      src={preview}
                      alt="Preview"
                      sx={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Typography fontSize="12px" color="primary.main">
                      Click or Drag File
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
            {/* Actions */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                mt: "auto",
                mb: 2,
              }}
            >
              <Button
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={isSaving}
                sx={{ borderRadius: 3 }}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                color="inherit"
                onClick={onClose}
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: "transparent",
                  borderRadius: 3,
                  color: "GrayText",
                }}
              >
                Close
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CreateInvoice;
