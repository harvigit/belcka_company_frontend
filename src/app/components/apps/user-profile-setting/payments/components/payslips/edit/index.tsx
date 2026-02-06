import React, { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  InputLabel,
  Avatar,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/utils/axios";

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

const EditPayslip: React.FC<EditPayslipProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  payslip,
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

      setFormData((prev) => ({
        ...prev,
        file_name: selectedFile,
        existing_pdf: undefined,
        existing_image: undefined,
      }));

      setPreview(URL.createObjectURL(selectedFile));
    },
    onDropRejected: () => {
      toast.error("Please upload a valid file (PDF or image)");
    },
  });
  const getUsers = useCallback(async () => {
    try {
      const res = await api.get(`user/list`);
      setUsers(res.data.info || []);
    } catch (error) {
      console.error("Failed to load users. Please try again.");
    } finally {
    }
  }, [open]);

  // Pre-fill the form when drawer opens
  useEffect(() => {
    if (open && payslip) {
      setFormData({
        id: payslip.id,
        company_id: payslip.company_id,
        user_id: payslip.user_id,
        from_date: payslip.from_date
          ? dayjs(payslip.from_date).format("YYYY-MM-DD")
          : "",
        to_date: payslip.to_date
          ? dayjs(payslip.to_date).format("YYYY-MM-DD")
          : "",
        payment_date: payslip.payment_date
          ? dayjs(payslip.payment_date).format("YYYY-MM-DD")
          : "",
        amount: payslip.amount || "",
        payslip_number: payslip.payslip_number || "",
        file_name: null,
        existing_pdf: payslip.pdf || undefined,
        existing_image: payslip.image || undefined,
      });

      // Show preview for existing file
      setPreview(payslip.image || null);
      getUsers();
    }
  }, [open, payslip, setFormData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
            onSubmit={handleSubmit}
            className="address-form"
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          >
            {/* From Date */}
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

            {/* To Date */}
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
                <input {...getInputProps()} />
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

export default EditPayslip;
