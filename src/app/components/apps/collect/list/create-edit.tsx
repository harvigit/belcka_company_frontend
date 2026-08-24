"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Grid } from "@mui/system";
import { IconTrash, IconX } from "@tabler/icons-react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useDropzone } from "react-dropzone";
import api from "@/utils/axios";
import Image from "next/image";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

export interface CollectFormData {
  id: number;
  company_id: any;
  project_id: number | null;
  address_id: number | null;
  address_manual?: string | null;
  supplier_id: number | null;
  inc_tax?: number | null;
  excl_tax?: number | null;
  total?: number | null;
}

interface CollectAddEditProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  isEdit?: boolean;
  collectId?: number | null;
  onSuccess: () => void;
}

type GalleryImage = {
  src: string;
  isExisting?: boolean;
  type?: string;
};

const CollectAddEdit: React.FC<CollectAddEditProps> = ({
  open,
  companyId,
  onClose,
  isEdit,
  collectId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CollectFormData>({
    id: 0,
    company_id: companyId,
    project_id: null,
    address_id: null,
    address_manual: null,
    supplier_id: null,
    inc_tax: null,
    excl_tax: null,
    total: null,
  });

  const [projects, setProjects] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<GalleryImage | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchResources();
    }
  }, [open, companyId]);

  useEffect(() => {
    if (open && isEdit && collectId) {
      fetchCollect();
    } else if (open && !isEdit) {
      // Reset form for add
      setFormData({
        id: 0,
        company_id: companyId,
        project_id: null,
        address_id: null,
        address_manual: null,
        supplier_id: null,
        inc_tax: null,
        excl_tax: null,
        total: null,
      });
      setFile(null);
      setFilePreview(null);
      setScannedData(null);
      setItems([]);
    }
  }, [open, isEdit, collectId]);

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `po-invoices/get-resources?company_id=${companyId}`,
      );
      if (res.data && res.data.info) {
        setProjects(res.data.info.projects || []);
        setAddresses(res.data.info.parentAddresses || []);
        setSuppliers(res.data.info.suppliers || []);
      }
    } catch (err) {
      console.error("Failed to fetch resources", err);
    }
  };

  const fetchCollect = async () => {
    if (!collectId || fetching) return;
    setFetching(true);
    try {
      const res = await api.get(
        `po-collect/detail?company_id=${companyId}&id=${collectId}`,
      );
      if (res.data && res.data.info) {
        const item = res.data.info;
        setFormData({
          id: item.id,
          company_id: companyId,
          project_id: item.project_id || null,
          address_id: item.address_id || null,
          address_manual: item.address_manual || null,
          supplier_id: item.supplier_id || null,
          inc_tax: item.inc_tax !== undefined ? item.inc_tax : null,
          excl_tax: item.excl_tax !== undefined ? item.excl_tax : null,
          total: item.total !== undefined ? item.total : null,
        });
        if (item.poItems && item.poItems.length > 0) {
          setItems(item.poItems);
        } else {
          setItems([]);
        }
        if (item.image) {
          setFilePreview({
            src: item.image,
            isExisting: true,
            type: item.image.toLowerCase().endsWith(".pdf")
              ? "application/pdf"
              : "image/jpeg",
          });
        } else {
          setFilePreview(null);
        }
        setFile(null);
      }
    } catch (err) {
      console.error("Failed to fetch collect detail", err);
    } finally {
      setFetching(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [], "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files && files.length > 0) {
        const selectedFile = files[0];
        setFile(selectedFile);
        setFilePreview({
          src: URL.createObjectURL(selectedFile),
          isExisting: false,
          type: selectedFile.type,
        });

        const toastId = toast.loading("Scanning document...");
        try {
          const fd = new FormData();
          fd.append("file_name", selectedFile);
          if (companyId) {
            fd.append("company_id", String(companyId));
          }
          const res = await api.post("po-collect/ocr-scan", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (res.data) {
            toast.success("Document scanned successfully", { id: toastId });
            setScannedData(res.data);
            if (res.data.items) setItems(res.data.items);

            if (
              res.data.inc_tax !== undefined ||
              res.data.excl_tax !== undefined
            ) {
              setFormData((prev) => ({
                ...prev,
                inc_tax: res.data.inc_tax ?? prev.inc_tax,
                excl_tax: res.data.excl_tax ?? prev.excl_tax,
              }));
            }

            const { supplier, supplier_id } = res.data;
            if (supplier_id) {
              setFormData((prev) => ({ ...prev, supplier_id }));
            } else if (supplier) {
              const lowerSupplier = supplier.toLowerCase();
              const match = suppliers.find((s) => {
                const sName = s.name.toLowerCase();
                return (
                  sName.includes(lowerSupplier) || lowerSupplier.includes(sName)
                );
              });
              if (match) {
                setFormData((prev) =>
                  prev.supplier_id ? prev : { ...prev, supplier_id: match.id },
                );
              }
            }
          } else {
            toast.dismiss(toastId);
          }
        } catch (e) {
          toast.dismiss(toastId);
          console.error("OCR Scan failed", e);
        }
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          payload.append(key, String(value));
        }
      });

      if (file) {
        payload.append("file", file);
      }
      if (items.length > 0) {
        const payloadItems = items.map((it: any) => {
          if (it.id) {
            return {
              id: it.id,
            };
          }
          return it;
        });
        payload.append("items", JSON.stringify(payloadItems));
      }

      const endpoint = isEdit ? "po-collect/update" : "po-collect/create";
      const result = await api.post(endpoint, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (result.data?.IsSuccess) {
        toast.success(result.data.message);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 500, md: 600 },
          borderRadius: 0,
          boxShadow: "none",
        },
      }}
      ModalProps={{
        disableEscapeKeyDown: isSaving,
      }}
    >
      <Box
        p={3}
        pt={2}
        height="100%"
        overflow="auto"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          ml={-2}
          mb={1}
        >
          <Box display="flex" alignItems="center">
            <IconButton onClick={onClose} disabled={isSaving}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              {isEdit ? "Edit Collect" : "Add Collect"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} disabled={isSaving}>
            <IconX />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <form
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
            onSubmit={handleSubmit}
          >
            <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1, pb: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" gutterBottom>
                    Project
                  </Typography>
                  <Autocomplete
                    options={projects}
                    getOptionLabel={(option) => option.name || ""}
                    value={
                      projects.find((p) => p.id === formData.project_id) || null
                    }
                    onChange={(_, value) =>
                      setFormData((prev) => ({
                        ...prev,
                        project_id: value?.id ?? null,
                      }))
                    }
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select Project" />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" gutterBottom>
                    Address
                  </Typography>
                  <Autocomplete
                    freeSolo
                    options={addresses}
                    getOptionLabel={(option) =>
                      typeof option === "string" ? option : option.name || ""
                    }
                    getOptionKey={(option) =>
                      typeof option === "string" ? option : String(option.id)
                    }
                    isOptionEqualToValue={(a, b) => {
                      if (typeof a === "string" || typeof b === "string") {
                        return (
                          (typeof a === "string" ? a : a.name) ===
                          (typeof b === "string" ? b : b.name)
                        );
                      }
                      return a.id === b.id;
                    }}
                    value={
                      formData.address_id
                        ? addresses.find((a) => a.id === formData.address_id) ||
                          null
                        : formData.address_manual || null
                    }
                    onChange={(_, value) => {
                      if (typeof value === "string") {
                        const match = addresses.find(
                          (a) =>
                            a.name.toLowerCase() === value.trim().toLowerCase(),
                        );
                        setFormData((prev) => ({
                          ...prev,
                          address_id: match?.id ?? null,
                          address_manual: match ? "" : value,
                        }));
                        return;
                      }
                      if (value && typeof value === "object") {
                        setFormData((prev) => ({
                          ...prev,
                          address_id: value.id,
                          address_manual: "",
                        }));
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        address_id: null,
                        address_manual: "",
                      }));
                    }}
                    onInputChange={(_, value, reason) => {
                      if (reason !== "input") return;
                      const match = addresses.find(
                        (a) =>
                          a.name.toLowerCase() === value.trim().toLowerCase(),
                      );
                      setFormData((prev) => ({
                        ...prev,
                        address_id: match?.id ?? null,
                        address_manual: match ? "" : value,
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select Address" />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" gutterBottom>
                    Supplier
                  </Typography>
                  <Autocomplete
                    options={suppliers}
                    getOptionLabel={(option) => option.name || ""}
                    value={
                      suppliers.find((s) => s.id === formData.supplier_id) ||
                      null
                    }
                    onChange={(_, value) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier_id: value?.id ?? null,
                      }))
                    }
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select Supplier" />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" gutterBottom>
                    Incl. Tax
                  </Typography>

                  <CustomTextField
                    fullWidth
                    value={formData.inc_tax ?? ""}
                    onChange={(e: any) => {
                      const value = e.target.value;

                      // Numbers only, maximum 2 decimal places
                      if (!/^\d*\.?\d{0,2}$/.test(value)) {
                        return;
                      }

                      // Maximum allowed: 10000.10
                      if (value !== "" && Number(value) > 10000.1) {
                        return;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        inc_tax: value,
                      }));
                    }}
                    placeholder="0.00"
                  />
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" gutterBottom>
                    Excl. Tax
                  </Typography>

                  <CustomTextField
                    fullWidth
                    value={formData.excl_tax ?? ""}
                    onChange={(e: any) => {
                      const value = e.target.value;

                      // Numbers only, maximum 2 decimal places
                      if (!/^\d*\.?\d{0,2}$/.test(value)) {
                        return;
                      }

                      // Maximum allowed: 10000.10
                      if (value !== "" && Number(value) > 10000.1) {
                        return;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        excl_tax: value,
                      }));
                    }}
                    placeholder="0.00"
                  />
                </Grid>

                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" gutterBottom mb={1}>
                    File (Image / PDF)
                  </Typography>
                  <Box
                    {...getRootProps()}
                    sx={{
                      width: "100%",
                      minHeight: 140,
                      border: "2px dashed",
                      borderColor: "primary.main",
                      borderRadius: 2,
                      cursor: "pointer",
                      p: 2,
                      mb: 2,
                    }}
                  >
                    <input {...getInputProps()} />

                    {filePreview ? (
                      <Box
                        sx={{
                          position: "relative",
                          width: 120,
                          height: 120,
                          overflow: "hidden",
                          borderRadius: 1,
                        }}
                      >
                        {filePreview.type === "application/pdf" ||
                        filePreview.src?.toLowerCase().endsWith(".pdf") ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            height="100%"
                            bgcolor="#f5f5f5"
                          >
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color="textSecondary"
                            >
                              PDF
                            </Typography>
                          </Box>
                        ) : (
                          <Image
                            src={filePreview.src}
                            alt="Preview"
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        )}
                        <IconButton
                          color="error"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            backgroundColor: "#fff",
                            "&:hover": {
                              backgroundColor: "#fff",
                              color: "red",
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setFilePreview(null);
                          }}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          height: 140,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="body2" color="textSecondary">
                          Click or Drag to upload image/pdf
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
              {(scannedData || (items && items.length > 0)) && (
                <Box
                  mt={2}
                  p={2}
                  bgcolor="#f8f9fa"
                  borderRadius={2}
                  border="1px solid #eef0f4"
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Scanned Data Preview
                  </Typography>
                  {scannedData?.supplier && (
                    <Typography variant="body2">
                      <strong>Supplier:</strong> {scannedData.supplier}
                    </Typography>
                  )}
                  {scannedData?.amount && (
                    <Typography variant="body2">
                      <strong>Amount:</strong> {scannedData.amount}
                    </Typography>
                  )}
                  {scannedData?.date && (
                    <Typography variant="body2">
                      <strong>Date:</strong> {scannedData.date}
                    </Typography>
                  )}
                  {items && items.length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2">
                        <strong>Items ({items.length}):</strong>
                      </Typography>
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ mt: 1 }}
                      >
                        <Table size="small">
                          <TableHead sx={{ bgcolor: "background.default" }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Qty
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Description
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                Unit Price
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                Total
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((it: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{it.qty || "-"}</TableCell>
                                <TableCell>
                                  {it.description || it.item_name || "-"}
                                </TableCell>
                                <TableCell align="right">
                                  {it.unit_price || it.price || "-"}
                                </TableCell>
                                <TableCell align="right">
                                  {it.total || it.line_total || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Sticky Footer */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                // borderTop: "1px solid",
                // borderColor: "divider",
                position: "sticky",
                bottom: 0,
                bgcolor: "background.paper",
                zIndex: 10,
              }}
            >
              <Button
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={isSaving}
                sx={{ borderRadius: 3, minWidth: 120 }}
              >
                {isSaving
                  ? isEdit
                    ? "Updating..."
                    : "Saving..."
                  : isEdit
                    ? "Update"
                    : "Save"}
              </Button>
              <Button
                color="inherit"
                onClick={onClose}
                variant="contained"
                size="large"
                disabled={isSaving}
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

export default CollectAddEdit;
