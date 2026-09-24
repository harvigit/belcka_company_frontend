"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  DialogTitle,
  IconButton,
  LinearProgress,
  Modal,
  Typography,
} from "@mui/material";
import { FileDownload } from "@mui/icons-material";
import { IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import api from "@/utils/axios";
import toast from "react-hot-toast";

type ExcelImportModalProps = {
  open: boolean;
  onClose: () => void;
  importUrl: string;
  sampleHref: string;
  extraFormData?: Record<string, string | number | boolean | null | undefined>;
  saveLabel?: string;
  savingLabel?: string;
  onImported?: (data: any) => boolean | void;
  onSuccess?: () => void;
};

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  open,
  onClose,
  importUrl,
  sampleHref,
  extraFormData,
  saveLabel = "Save",
  savingLabel = "Importing...",
  onImported,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isImport, setIsImport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setIsImport(false);
    setUploadProgress(0);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (isImport) return;
    resetState();
    onClose();
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    onDrop: (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;
      setFile(selectedFile);
      setPreview(selectedFile.name);
    },
  });

  const downloadSampleFile = () => {
    const link = document.createElement("a");
    link.href = sampleHref;
    link.download = "sample-file.xlsx";
    link.click();
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsImport(true);
    setUploadProgress(0);
    setIsProcessing(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.entries(extraFormData || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        formData.append(key, String(value));
      });

      const res = await api.post(importUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percent);
            if (percent === 100) setIsProcessing(true);
          }
        },
      });

      if (res.data?.IsSuccess === false) {
        toast.error(res.data.message || "Import failed");
        return;
      }

      const skipDefaultClose = onImported?.(res.data) === true;
      if (skipDefaultClose) {
        setIsImport(false);
        return;
      }

      toast.success(res.data.message);
      onSuccess?.();
      setTimeout(() => {
        resetState();
        onClose();
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setIsImport(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} disableEscapeKeyDown>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          p: 3,
          borderRadius: 2,
          boxShadow: 24,
          width: 400,
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Typography color="GrayText" fontWeight={700}>
            Upload Your File
          </Typography>
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 10,
              backgroundColor: "transparent",
            }}
          >
            <IconX size={40} />
          </IconButton>
        </DialogTitle>
        <Box
          {...getRootProps()}
          sx={{
            width: 350,
            height: 100,
            mt: 2,
            border: "2px dashed",
            borderColor: "primary.main",
            borderRadius: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            "&:hover": {
              backgroundColor: "primary.light",
            },
          }}
        >
          <input {...getInputProps()} accept=".xls,.xlsx" />
          {preview ? (
            preview
          ) : (
            <Typography fontSize="12px" color="primary.main">
              Click or Drag File
            </Typography>
          )}
        </Box>
        <Typography fontSize="12px" color="text.secondary">
          Upload Excel Files
        </Typography>
        {isImport && (
          <Box sx={{ mt: 2 }}>
            {!isProcessing ? (
              <>
                <Typography variant="body2" mb={1}>
                  Uploading... {uploadProgress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ height: 8, borderRadius: 5 }}
                />
              </>
            ) : (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={18} />
                <Typography variant="body2">Processing file...</Typography>
              </Box>
            )}
          </Box>
        )}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "end" }}>
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              downloadSampleFile();
            }}
            style={{
              width: "100%",
              color: "#1e4db7",
              textTransform: "none",
              display: "flex",
              alignItems: "center",
              justifyItems: "center",
            }}
          >
            <FileDownload />
            Download Sample File
          </Link>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              disabled={isImport}
              onClick={handleImport}
            >
              {isImport ? savingLabel : saveLabel}
            </Button>
            <Button variant="outlined" onClick={handleClose} color="error">
              Cancel
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default ExcelImportModal;
