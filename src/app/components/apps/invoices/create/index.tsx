"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconCloudUpload, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import TiptapEditor from "@/app/(DashboardLayout)/forms/form-tiptap/TiptapEditor";
import {
  InvoiceDocument,
  InvoiceRow,
} from "@/app/components/apps/invoices/list/mockData";
import { ResourceOption } from "./mockData";

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  invoice?: InvoiceRow | null;
  onSaved?: () => void;
};

const emptyForm = {
  project_id: null as number | null,
  address_id: null as number | null,
  ordered_by: null as number | null,
  supplier_manual: "",
  supplier_id: null as number | null,
  expected_delivery_date: "",
  description: "",
  note: "",
  total_excl_vat: "",
  total_incl_vat: "",
  credit_note_amount: "",
  documentFiles: [] as File[],
};

const parseDateForInput = (dateStr?: string) => {
  if (!dateStr || dateStr === "-") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[/-]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr;
};

const toEditorHtml = (value?: string) => {
  if (!value) return "";
  if (value.includes("<")) return value;
  return `<p>${value}</p>`;
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const SECTION_TITLE_SX = {
  fontWeight: 700,
  color: "primary.main",
  mb: 2.5,
  fontSize: "1rem",
};

const CARD_SX = {
  bgcolor: "#fff",
  borderRadius: 2,
  border: "1px solid #eef0f4",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  p: { xs: 2, sm: 3 },
  mb: 2.5,
};

const FieldLabel = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <Typography variant="body2" fontWeight={500} gutterBottom sx={{ mb: 0.75 }}>
    {children}
    {required && (
      <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>
        *
      </Box>
    )}
  </Typography>
);

const CurrencyField = ({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) => (
  <Box className="form_inputs">
    <FieldLabel required={required}>{label}</FieldLabel>
    <CustomTextField
      fullWidth
      placeholder="0.00"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        if (!/^\d*\.?\d{0,2}$/.test(next)) return;
        onChange(next);
      }}
      InputProps={{
        startAdornment: (
          <Typography
            sx={{ mr: 0.75, color: "text.secondary", fontWeight: 500 }}
          >
            £
          </Typography>
        ),
      }}
    />
  </Box>
);

const CreateInvoice = ({
  open,
  onClose,
  mode = "create",
  invoice = null,
  onSaved,
}: Props) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id ? Number(user.company_id) : null;

  const [formData, setFormData] = useState(emptyForm);
  const [dragOver, setDragOver] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [initialDescription, setInitialDescription] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [projects, setProjects] = useState<ResourceOption[]>([]);
  const [addresses, setAddresses] = useState<ResourceOption[]>([]);
  const [orderedByOptions, setOrderedByOptions] = useState<ResourceOption[]>(
    [],
  );
  const [suppliers, setSuppliers] = useState<ResourceOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState<InvoiceDocument[]>(
    [],
  );
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>(
    [],
  );
  const isEdit = mode === "edit";

  const filteredAddresses = useMemo(() => {
    if (!formData.project_id) return addresses;
    return addresses.filter((a) => a.project_id === formData.project_id);
  }, [addresses, formData.project_id]);

  const loadResources = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await api.get(
        `po-invoices/get-resources?company_id=${companyId}`,
      );
      if (res.data?.IsSuccess) {
        setProjects(res.data.info?.projects || []);
        setAddresses(res.data.info?.addresses || []);
        setOrderedByOptions(res.data.info?.ordered_by || []);
        setSuppliers(res.data.info?.suppliers || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load form resources");
    }
  }, [companyId]);

  useEffect(() => {
    if (!open) return;
    loadResources();

    if (isEdit && invoice) {
      const descriptionHtml = toEditorHtml(invoice.description);
      const noteHtml = toEditorHtml(invoice.note);
      setFormData({
        project_id: invoice.project_id ?? null,
        address_id: invoice.address_id ?? null,
        ordered_by: invoice.ordered_by ?? null,
        supplier_manual: invoice.supplier_id
          ? ""
          : invoice.supplier_manual ||
            (invoice.supplier !== "-" ? invoice.supplier : "") ||
            "",
        supplier_id: invoice.supplier_id ?? null,
        expected_delivery_date: parseDateForInput(invoice.expectedDeliveryDate),
        description: descriptionHtml,
        note: noteHtml,
        total_excl_vat:
          invoice.totalExclVat != null ? String(invoice.totalExclVat) : "",
        total_incl_vat:
          invoice.totalInclVat != null ? String(invoice.totalInclVat) : "",
        credit_note_amount:
          invoice.creditNoteAmount != null
            ? String(invoice.creditNoteAmount)
            : "",
        documentFiles: [],
      });
      setExistingDocuments(invoice.documents || []);
      setRemovedAttachmentIds([]);
      setInitialDescription(descriptionHtml);
      setInitialNote(noteHtml);
    } else {
      setFormData(emptyForm);
      setExistingDocuments([]);
      setRemovedAttachmentIds([]);
      setInitialDescription("");
      setInitialNote("");
    }
    setEditorKey((k) => k + 1);
    setDragOver(false);
  }, [open, isEdit, invoice, loadResources]);

  const handleClose = () => {
    setFormData(emptyForm);
    setExistingDocuments([]);
    setRemovedAttachmentIds([]);
    setDragOver(false);
    onClose();
  };

  const addFiles = useCallback((incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    if (!list.length) return;
    setFormData((prev) => ({
      ...prev,
      documentFiles: [...prev.documentFiles, ...list],
    }));
  }, []);

  const removeNewFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documentFiles: prev.documentFiles.filter((_, i) => i !== index),
    }));
  };

  const removeExistingDocument = (doc: InvoiceDocument) => {
    if (doc.id > 0) {
      setRemovedAttachmentIds((prev) =>
        prev.includes(doc.id) ? prev : [...prev, doc.id],
      );
    }
    setExistingDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const validate = () => {
    if (!formData.project_id) return "Project is required!";
    if (!formData.address_id) return "Delivery address is required!";
    if (!formData.ordered_by) return "Ordered by is required!";

    const hasPreselect = !!formData.supplier_id;
    const hasManual = !!formData.supplier_manual.trim();
    if (!hasPreselect && !hasManual) {
      return "Please select a supplier or enter a manual supplier name!";
    }
    if (hasPreselect && hasManual) {
      return "Use either Supplier (Preselect) or Supplier (Manual), not both!";
    }

    if (!formData.expected_delivery_date) {
      return "Expected delivery date is required!";
    }
    if (!stripHtml(formData.description)) return "Description is required!";

    const excl = Number(formData.total_excl_vat);
    const incl = Number(formData.total_incl_vat);
    if (formData.total_excl_vat === "" || !Number.isFinite(excl)) {
      return "Total amount (excl. VAT) is required!";
    }
    if (formData.total_incl_vat === "" || !Number.isFinite(incl)) {
      return "Total amount (incl. VAT) is required!";
    }
    if (excl < 0 || incl < 0) {
      return "Total amounts cannot be negative!";
    }

    if (formData.credit_note_amount !== "") {
      const credit = Number(formData.credit_note_amount);
      if (!Number.isFinite(credit) || credit < 0) {
        return "Please enter a valid credit note amount!";
      }
    }

    const totalDocs = existingDocuments.length + formData.documentFiles.length;
    if (totalDocs === 0) return "At least one document file is required!";

    return null;
  };

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("Company not found");
      return;
    }
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("company_id", String(companyId));
      fd.append("project_id", String(formData.project_id));
      fd.append("address_id", String(formData.address_id));
      fd.append("ordered_by", String(formData.ordered_by));
      if (formData.supplier_id) {
        fd.append("supplier_id", String(formData.supplier_id));
      } else {
        fd.append("supplier_manual", formData.supplier_manual.trim());
      }
      fd.append("expected_delivery_date", formData.expected_delivery_date);
      fd.append("description", formData.description);
      fd.append("note", formData.note || "");
      fd.append("total_excl_vat", formData.total_excl_vat);
      fd.append("total_incl_vat", formData.total_incl_vat);
      if (formData.credit_note_amount) {
        fd.append("credit_note_amount", formData.credit_note_amount);
      }
      formData.documentFiles.forEach((file) => {
        fd.append("files", file);
      });
      if (removedAttachmentIds.length > 0) {
        fd.append(
          "removed_attachment_ids",
          JSON.stringify(removedAttachmentIds),
        );
      }
      if (isEdit && invoice?.id) {
        fd.append("id", String(invoice.id));
      }

      const endpoint = isEdit ? "po-invoices/update" : "po-invoices/create";
      const res = await api.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Saved successfully");
        onSaved?.();
        handleClose();
      } else {
        toast.error(res.data?.message || "Failed to save invoice");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save invoice",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          height: "95vh",
          boxShadow: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        p={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={handleClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            {isEdit ? "Edit Invoice" : "Create Invoice"}
          </Typography>
        </Box>
        <IconButton onClick={handleClose}>
          <IconX />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 2, md: 4 },
          py: 2,
          bgcolor: "#f5f6f8",
        }}
      >
        <form
          className="task-form"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        >
          <Box sx={CARD_SX}>
            <Typography sx={SECTION_TITLE_SX}>Order Information</Typography>
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              }}
              gap={2.5}
            >
              <Box className="form_inputs">
                <FieldLabel required>Project</FieldLabel>
                <Autocomplete
                  fullWidth
                  options={projects}
                  value={
                    projects.find((p) => p.id === formData.project_id) || null
                  }
                  getOptionLabel={(o) => o.name}
                  getOptionKey={(o) => String(o.id)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      project_id: value?.id ?? null,
                      address_id: null,
                    }))
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select project" />
                  )}
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel required>Delivery Address</FieldLabel>
                <Autocomplete
                  fullWidth
                  options={filteredAddresses}
                  value={
                    filteredAddresses.find(
                      (a) => a.id === formData.address_id,
                    ) || null
                  }
                  getOptionLabel={(o) => o.name}
                  getOptionKey={(o) => String(o.id)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      address_id: value?.id ?? null,
                    }))
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select address" />
                  )}
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel required>Ordered By</FieldLabel>
                <Autocomplete
                  fullWidth
                  options={orderedByOptions}
                  value={
                    orderedByOptions.find(
                      (u) => u.id === formData.ordered_by,
                    ) || null
                  }
                  getOptionLabel={(o) => o.name}
                  getOptionKey={(o) => String(o.id)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      ordered_by: value?.id ?? null,
                    }))
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select user" />
                  )}
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel>Supplier (Manual)</FieldLabel>
                <CustomTextField
                  fullWidth
                  placeholder="Enter supplier name"
                  value={formData.supplier_manual}
                  disabled={!!formData.supplier_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplier_manual: e.target.value,
                      supplier_id: null,
                    }))
                  }
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel>Supplier (Preselect)</FieldLabel>
                <Autocomplete
                  fullWidth
                  options={suppliers}
                  value={
                    suppliers.find((s) => s.id === formData.supplier_id) || null
                  }
                  getOptionLabel={(o) => o.name}
                  getOptionKey={(o) => String(o.id)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplier_id: value?.id ?? null,
                      supplier_manual: "",
                    }))
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select supplier"
                    />
                  )}
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel required>Expected Delivery Date</FieldLabel>
                <CustomTextField
                  type="date"
                  fullWidth
                  value={formData.expected_delivery_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      expected_delivery_date: e.target.value,
                    }))
                  }
                  onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {
                      // ignore
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={CARD_SX}>
            <Typography sx={SECTION_TITLE_SX}>Order Details</Typography>

            <Box
              display="grid"
              gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
              gap={2.5}
              mb={2.5}
            >
              <Box>
                <FieldLabel required>Description</FieldLabel>
                <Box
                  className="custom_tiptap_editor"
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    bgcolor: "#fff",
                    "& .MuiTiptap-FieldContainer-root": { minHeight: 140 },
                  }}
                >
                  {open && (
                    <TiptapEditor
                      key={`create-invoice-description-${editorKey}`}
                      content={initialDescription}
                      onChange={(html: string) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: html,
                        }))
                      }
                    />
                  )}
                </Box>
              </Box>

              <Box>
                <FieldLabel>Note</FieldLabel>
                <Box
                  className="custom_tiptap_editor"
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    bgcolor: "#fff",
                    "& .MuiTiptap-FieldContainer-root": { minHeight: 140 },
                  }}
                >
                  {open && (
                    <TiptapEditor
                      key={`create-invoice-note-${editorKey}`}
                      content={initialNote}
                      onChange={(html: string) =>
                        setFormData((prev) => ({ ...prev, note: html }))
                      }
                    />
                  )}
                </Box>
              </Box>
            </Box>

            <Box
              display="grid"
              gridTemplateColumns={{
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              }}
              gap={2.5}
              mb={2.5}
            >
              <CurrencyField
                label="Total Amount (Excl. VAT)"
                required
                value={formData.total_excl_vat}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, total_excl_vat: value }))
                }
              />
              <CurrencyField
                label="Total Amount (Incl. VAT)"
                required
                value={formData.total_incl_vat}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, total_incl_vat: value }))
                }
              />
              <CurrencyField
                label="Credit Note Amount"
                value={formData.credit_note_amount}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    credit_note_amount: value,
                  }))
                }
              />
            </Box>
          </Box>

          <Box sx={CARD_SX}>
            <Typography sx={SECTION_TITLE_SX}>Document Upload</Typography>
            <Box
              component="label"
              onDragOver={(e: React.DragEvent) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 4,
                px: 2,
                border: "1px dashed",
                borderColor: dragOver ? "primary.main" : "#d0d5dd",
                borderRadius: 2,
                bgcolor: dragOver ? "action.selected" : "#fafbfc",
                cursor: "pointer",
                transition: "all 0.18s",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <input
                type="file"
                hidden
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  bgcolor: "#E6F1FB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 0.5,
                }}
              >
                <IconCloudUpload size={24} color="#185FA5" />
              </Box>
              <Typography variant="body2" fontWeight={600}>
                Upload Documents (Invoice, Quote, or Receipt){" "}
                <Box component="span" sx={{ color: "error.main" }}>
                  *
                </Box>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Drag & drop files here or click to browse (multiple allowed)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, JPG, PNG up to 10MB each
              </Typography>
            </Box>
            <Box
              mt={2}
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(250px, 1fr))",
                gap: 2,
              }}
            >
              {[...existingDocuments, ...formData.documentFiles].map(
                (item: any, index) => {
                  const isExisting = "id" in item;

                  return (
                    <Box
                      key={
                        isExisting
                          ? `existing-${item.id}`
                          : `new-${item.name}-${index}`
                      }
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        border: "1px solid #eef0f4",
                        borderRadius: 2,
                        bgcolor: "#fff",
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="body2"
                        component={isExisting && item.url ? "a" : "span"}
                        href={isExisting ? item.url : undefined}
                        target="_blank"
                        rel="noreferrer"
                        noWrap
                        sx={{
                          flex: 1,
                          mr: 1,
                          color:
                            isExisting && item.url
                              ? "primary.main"
                              : "text.primary",
                          textDecoration:
                            isExisting && item.url ? "underline" : "none",
                        }}
                      >
                        {isExisting
                          ? item.original_name || item.file
                          : item.name}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={() =>
                          isExisting
                            ? removeExistingDocument(item)
                            : removeNewFile(index - existingDocuments.length)
                        }
                      >
                        <IconX size={16} />
                      </IconButton>
                    </Box>
                  );
                },
              )}
            </Box>
          </Box>
        </form>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          p: 2,
          mt: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "start",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            color="primary"
            variant="contained"
            size="large"
            disabled={saving}
            onClick={handleSubmit}
            sx={{ borderRadius: 3, minWidth: 100 }}
          >
            {isEdit ? "Update" : "Save"}
          </Button>
          <Button
            color="inherit"
            onClick={handleClose}
            variant="contained"
            size="large"
            disabled={saving}
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              color: "GrayText",
              minWidth: 100,
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CreateInvoice;
