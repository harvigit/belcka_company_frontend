"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Dialog,
} from "@mui/material";
import {
  IconFile,
  IconTrash,
  IconUpload,
  IconDeviceFloppy,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";

interface Props {
  companyId: number | null;
  productId?: number | null;
  attachments?: any[];
  onWorkUpdated?: () => void;
}

interface UploadedFile {
  file: File;
  preview?: string;
}

export default function ProductTechnicalInformation({
  companyId,
  productId,
  attachments = [],
  onWorkUpdated,
}: Props) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    isPdf: boolean;
    name: string;
  } | null>(null);

  const openPreview = (url: string, isPdf: boolean, name: string) => {
    setPreviewFile({
      url,
      isPdf,
      name,
    });
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  useEffect(() => {
    setExistingFiles(attachments);
  }, [attachments]);

  const hasChanges = uploadedFiles.length > 0 || deletedIds.length > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const valid = files.filter((file) => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      return [".jpg", ".jpeg", ".png", ".pdf"].includes(ext);
    });

    if (valid.length !== files.length) {
      toast.error("Only jpg, jpeg, png, pdf allowed");
    }

    const mapped = valid.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setUploadedFiles((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeUploaded = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExisting = (id: number) => {
    setDeletedIds((prev) => [...prev, id]);
    setExistingFiles((prev) => prev.filter((x) => x.id !== id));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (deletedIds.length > 0) {
        const res = await api.post("products/delete-attachments", {
          ids: deletedIds.join(","),
        });

        if (res.data.IsSuccess) {
          toast.success(res.data.message);
          onWorkUpdated?.();
        }
      }

      if (uploadedFiles.length > 0) {
        const formData = new FormData();

        formData.append("product_id", String(productId));

        uploadedFiles.forEach((item) => {
          formData.append("files", item.file);
        });

        const res = await api.post("products/attachments", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data.IsSuccess) {
          toast.success(res.data.message);
          onWorkUpdated?.();
        }
      }

      setDeletedIds([]);
      setUploadedFiles([]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const FileCard = ({ image, isPdf, name, onDelete }: any) => (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #eee",
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
      }}
    >
      <Box
        onClick={() => openPreview(image, isPdf, name)}
        sx={{
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fafafa",
        }}
      >
        {isPdf ? (
          <IconFile size={42} />
        ) : (
          <img
            src={image}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </Box>

      <Box p={1}>
        <Typography fontSize={12} noWrap title={name}>
          {name}
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        sx={{
          position: "absolute",
          top: 6,
          right: 6,
          bgcolor: "#fff",
        }}
      >
        <IconTrash size={16} color="red" />
      </IconButton>
    </Paper>
  );

  return (
    <Stack spacing={3} p={2}>
      <Typography fontWeight={700} fontSize={16}>
        Attachments
      </Typography>

      {/* Upload */}
      <Box>
        <input
          hidden
          id="upload-file"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileSelect}
        />

        <label htmlFor="upload-file">
          <Button
            component="span"
            variant="outlined"
            startIcon={<IconUpload size={18} />}
          >
            Upload Files
          </Button>
        </label>

        <Typography variant="caption" display="block" mt={1}>
          jpg, jpeg, png, pdf allowed
        </Typography>
      </Box>

      {/* Existing */}
      {existingFiles.length > 0 ? (
        <>
          <Divider />
          <Typography fontWeight={600}>Existing Files</Typography>

          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fill,minmax(160px,1fr))"
            gap={2}
          >
            {existingFiles.map((item: any) => (
              <FileCard
                key={item.id}
                image={item.image_url}
                isPdf={item.extension === "pdf"}
                name={item.doc_type || "Attachment"}
                onDelete={() => removeExisting(item.id)}
              />
            ))}
          </Box>
        </>
      ) : (
        <Typography textAlign="center" color="text.secondary">
          No attachments are found..
        </Typography>
      )}

      {/* New Uploads */}
      {uploadedFiles.length > 0 && (
        <>
          <Divider />
          <Typography fontWeight={600}>New Files</Typography>

          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fill,minmax(160px,1fr))"
            gap={2}
          >
            {uploadedFiles.map((item, index) => (
              <FileCard
                key={index}
                image={item.preview}
                isPdf={!item.preview}
                name={item.file.name}
                onDelete={() => removeUploaded(index)}
              />
            ))}
          </Box>
        </>
      )}

      {/* Save */}
      {hasChanges && (
        <Box pt={2}>
          <Button
            variant="contained"
            startIcon={loading ? null : <IconDeviceFloppy size={18} />}
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </Box>
      )}

      <Dialog
        open={previewOpen}
        onClose={closePreview}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        <IconButton
          onClick={closePreview}
          color="primary"
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1301,
            backgroundColor: "#fff",
            "&:hover": {
              backgroundColor: "#eee",
              color: "#1e4db7",
            },
          }}
        >
          <IconX />
        </IconButton>

        <Box
          sx={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={closePreview}
        >
          {previewFile?.isPdf ? (
            <iframe
              src={previewFile.url}
              width="100%"
              height="800px"
              style={{
                border: "none",
              }}
            />
          ) : (
            <img
              src={previewFile?.url}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          )}
        </Box>
      </Dialog>
    </Stack>
  );
}
