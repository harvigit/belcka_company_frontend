"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
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
  project_manual: "",
  address_id: null as number | null,
  address_manual: "",
  ordered_by: null as number | null,
  supplier_id: null as number | null,
  invoice_id: "",
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

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CARD_SX = {
  bgcolor: "#fff",
  borderRadius: 2,
  border: "1px solid #eef0f4",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  p: { xs: 2, sm: 3 },
  mb: 2.5,
};

const REMOVE_DOC_BTN_SX = {
  position: "absolute",
  top: -6,
  right: -6,
  width: 22,
  height: 22,
  minWidth: 22,
  minHeight: 22,
  maxWidth: 22,
  maxHeight: 22,
  padding: "0 !important",
  margin: 0,
  lineHeight: 0,
  fontSize: 0,
  borderRadius: "50%",
  aspectRatio: "1 / 1",
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  appearance: "none",
  WebkitAppearance: "none",
  bgcolor: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
  color: "#d32f2f",
  zIndex: 2,
  cursor: "pointer",
  "&:hover": {
    bgcolor: "#fff",
    color: "#b71c1c",
  },
  "& svg": {
    width: 12,
    height: 12,
    display: "block",
    flexShrink: 0,
  },
} as const;

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
        if (!/^\d*\.?\d{0,5}$/.test(next)) return;
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
    return addresses;
  }, [addresses]);

  const loadResources = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await api.get(
        `po-invoices/get-resources?company_id=${companyId}`,
      );
      if (res.data?.IsSuccess) {
        setProjects(res.data.info?.projects || []);
        setAddresses(res.data.info?.parentAddresses || []);
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
      setFormData({
        project_id: invoice.project_id ?? null,
        project_manual: invoice.project_id
          ? ""
          : invoice.projectManual ||
            (invoice.project !== "-" ? invoice.project : "") ||
            "",
        address_id: invoice.address_id ?? null,
        address_manual: invoice.address_id
          ? ""
          : invoice.addressManual || (invoice.deliveryAddress !== "-" ? invoice.deliveryAddress : "") || "",
        ordered_by: invoice.ordered_by ?? null,
        supplier_id: invoice.supplier_id ?? null,
        invoice_id: invoice.invoiceId || "",
        expected_delivery_date: parseDateForInput(invoice.expectedDeliveryDate),
        description: stripHtml(invoice.description || ""),
        note: stripHtml(invoice.note || ""),
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
    } else {
      setFormData(emptyForm);
      setExistingDocuments([]);
      setRemovedAttachmentIds([]);
    }
    setDragOver(false);
  }, [open, isEdit, invoice, loadResources]);

  const handleClose = () => {
    setFormData(emptyForm);
    setExistingDocuments([]);
    setRemovedAttachmentIds([]);
    setDragOver(false);
    onClose();
  };

  const addFiles = useCallback(
    async (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const list = Array.from(incoming);
      if (!list.length) return;

      setFormData((prev) => ({
        ...prev,
        documentFiles: [...prev.documentFiles, ...list],
      }));

      if (
        list.length === 1 &&
        existingDocuments.length === 0 &&
        formData.documentFiles.length === 0
      ) {
        const toastId = toast.loading("Scanning document...");
        try {
          const fd = new FormData();
          fd.append("file_name", list[0]);
          if (companyId) {
            fd.append("company_id", String(companyId));
          }
          const res = await api.post("po-invoices/ocr-scan", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (res.data) {
            toast.success("Document scanned", { id: toastId });

            const {
              amount,
              total_excl_vat,
              invoice_number,
              supplier,
              supplier_id,
              date,
              description,
              ordered_by,
            } = res.data;

            setFormData((prev) => {
              const next = { ...prev };
              if (amount && !prev.total_incl_vat) next.total_incl_vat = amount;
              if (total_excl_vat && !prev.total_excl_vat)
                next.total_excl_vat = total_excl_vat;
              if (invoice_number && !prev.invoice_id)
                next.invoice_id = invoice_number;
              if (date && !prev.expected_delivery_date)
                next.expected_delivery_date = date;
              if (description && !prev.description)
                next.description = description;
              if (ordered_by && !prev.ordered_by)
                next.ordered_by = ordered_by;
              if (supplier_id && !prev.supplier_id)
                next.supplier_id = supplier_id;
              return next;
            });

            if (supplier && !supplier_id) {
              const lowerSupplier = supplier.toLowerCase();
              // Find matching supplier
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
    [existingDocuments.length, formData.documentFiles.length, suppliers],
  );

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
    if (!formData.invoice_id.trim()) return "Invoice Id is required!";
    if (!formData.project_id && !formData.project_manual.trim()) {
      return "Project is required!";
    }
    if (!formData.address_id && !formData.address_manual.trim()) {
      return "Address is required!";
    }
    if (!formData.ordered_by) return "Ordered by is required!";
    if (!formData.supplier_id) return "Supplier is required!";

    if (!formData.expected_delivery_date) {
      return "Date is required!";
    }

    const incl = Number(formData.total_incl_vat);
    const excl = Number(formData.total_excl_vat);
    if (formData.total_incl_vat === "" || !Number.isFinite(incl)) {
      return "Total amount (incl. VAT) is required!";
    }
    if (formData.total_excl_vat === "" || !Number.isFinite(excl)) {
      return "Total amount (excl. VAT) is required!";
    }
    if (excl < 0 || incl < 0) {
      return "Total amounts cannot be negative!";
    }

    if (!stripHtml(formData.description)) return "Description is required!";

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
      if (formData.project_id) {
        fd.append("project_id", String(formData.project_id));
      } else {
        fd.append("project_manual", formData.project_manual.trim());
      }
      if (formData.address_id) {
        fd.append("address_id", String(formData.address_id));
      } else {
        fd.append("address_manual", formData.address_manual.trim());
      }
      fd.append("ordered_by", String(formData.ordered_by));
      fd.append("supplier_id", String(formData.supplier_id));
      fd.append("invoice_id", formData.invoice_id.trim());
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
          onPaste={(e) => {
            const items = e.clipboardData?.files;
            if (items && items.length > 0) {
              const validFiles = Array.from(items).filter(
                (f) =>
                  f.type.startsWith("image/") || f.type === "application/pdf"
              );
              if (validFiles.length > 0) {
                e.preventDefault();
                addFiles(validFiles);
              }
            }
          }}
        >
          <Box sx={CARD_SX}>
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              }}
              gap={2.5}
              alignItems="start"
            >
              <Box className="form_inputs">
                <FieldLabel required>Invoice ID</FieldLabel>
                <CustomTextField
                  fullWidth
                  placeholder="Enter invoice id"
                  value={formData.invoice_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      invoice_id: e.target.value,
                    }))
                  }
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel required>Project</FieldLabel>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={projects}
                  value={
                    formData.project_id
                      ? projects.find((p) => p.id === formData.project_id) ||
                        null
                      : formData.project_manual || null
                  }
                  getOptionLabel={(o) =>
                    typeof o === "string" ? o : o.name || ""
                  }
                  getOptionKey={(o) =>
                    typeof o === "string" ? o : String(o.id)
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
                  onChange={(_, value) => {
                    if (typeof value === "string") {
                      const match = projects.find(
                        (p) =>
                          p.name.toLowerCase() === value.trim().toLowerCase(),
                      );
                      setFormData((prev) => ({
                        ...prev,
                        project_id: match?.id ?? null,
                        project_manual: match ? "" : value,
                        address_id: null,
                      }));
                      return;
                    }
                    if (value && typeof value === "object") {
                      setFormData((prev) => ({
                        ...prev,
                        project_id: value.id,
                        project_manual: "",
                        address_id: null,
                      }));
                      return;
                    }
                    setFormData((prev) => ({
                      ...prev,
                      project_id: null,
                      project_manual: "",
                      address_id: null,
                    }));
                  }}
                  onInputChange={(_, value, reason) => {
                    if (reason !== "input") return;
                    const match = projects.find(
                      (p) =>
                        p.name.toLowerCase() === value.trim().toLowerCase(),
                    );
                    setFormData((prev) => ({
                      ...prev,
                      project_id: match?.id ?? null,
                      project_manual: match ? "" : value,
                      address_id:
                        match?.id && match.id === prev.project_id
                          ? prev.address_id
                          : null,
                    }));
                  }}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select or type project"
                    />
                  )}
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel required>Address</FieldLabel>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={filteredAddresses}
                  value={
                    formData.address_id
                      ? filteredAddresses.find((a) => a.id === formData.address_id) || null
                      : formData.address_manual || null
                  }
                  getOptionLabel={(o) =>
                    typeof o === "string" ? o : o.name || ""
                  }
                  getOptionKey={(o) =>
                    typeof o === "string" ? o : String(o.id)
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
                  onChange={(_, value) => {
                    if (typeof value === "string") {
                      const match = filteredAddresses.find(
                        (a) => a.name.toLowerCase() === value.trim().toLowerCase(),
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
                    const match = filteredAddresses.find(
                      (a) => a.name.toLowerCase() === value.trim().toLowerCase(),
                    );
                    setFormData((prev) => ({
                      ...prev,
                      address_id: match?.id ?? null,
                      address_manual: match ? "" : value,
                    }));
                  }}
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select or type address" />
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
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props as any;
                    return (
                      <Box
                        component="li"
                        key={key}
                        {...optionProps}
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Avatar
                          src={
                            option.user_thumb_image ||
                            option.user_image ||
                            "/images/users/user.png"
                          }
                          alt={option.name}
                          sx={{ width: 28, height: 28, fontSize: "12px" }}
                        >
                          {option.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography component="span" variant="body2">
                          {option.name}
                        </Typography>
                      </Box>
                    );
                  }}
                  renderInput={(params) => {
                    const selected = orderedByOptions.find(
                      (u) => u.id === formData.ordered_by,
                    );
                    return (
                      <CustomTextField
                        {...params}
                        placeholder="Select user"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: selected ? (
                            <>
                              <Avatar
                                src={
                                  selected.user_thumb_image ||
                                  selected.user_image ||
                                  "/images/users/user.png"
                                }
                                alt={selected.name}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  fontSize: "11px",
                                  ml: 0.5,
                                  mr: 0.5,
                                }}
                              >
                                {selected.name?.[0]?.toUpperCase()}
                              </Avatar>
                              {params.InputProps.startAdornment}
                            </>
                          ) : (
                            params.InputProps.startAdornment
                          ),
                        }}
                      />
                    );
                  }}
                />
              </Box>

              <Box className="form_inputs">
                <FieldLabel required>Supplier</FieldLabel>
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
                <FieldLabel required>Date</FieldLabel>
                <CustomTextField
                  type="date"
                  fullWidth
                  placeholder="dd/mm/yyyy"
                  value={formData.expected_delivery_date}
                  onFocus={(e: any) => e.target.showPicker()}
                  onClick={(e: any) =>
                    (e.target as HTMLInputElement).showPicker()
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      expected_delivery_date: e.target.value,
                    }))
                  }
                />
              </Box>

              <CurrencyField
                label="Total Amount (Incl. VAT)"
                required
                value={formData.total_incl_vat}
                onChange={(value) => {
                  const val = value.toString();

                  if (/^\d{0,6}(\.\d{0,5})?$/.test(val)) {
                    setFormData((prev) => ({
                      ...prev,
                      total_incl_vat: val,
                    }));
                  }
                }}
              />
              <CurrencyField
                label="Total Amount (Excl. VAT)"
                required
                value={formData.total_excl_vat}
                onChange={(value) => {
                  const val = value.toString();

                  if (/^\d{0,6}(\.\d{0,5})?$/.test(val)) {
                    setFormData((prev) => ({
                      ...prev,
                      total_excl_vat: val,
                    }));
                  }
                }}
              />

              <Box className="form_inputs">
                <FieldLabel required>Description</FieldLabel>
                <CustomTextField
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </Box>

              <CurrencyField
                label="Credit Note Amount"
                value={formData.credit_note_amount}
                onChange={(value) => {
                  const val = value.toString();

                  if (/^\d{0,6}(\.\d{0,5})?$/.test(val)) {
                    setFormData((prev) => ({
                      ...prev,
                      credit_note_amount: val,
                    }));
                  }
                }}
              />

              <Box className="form_inputs">
                <FieldLabel>Credit Note Description</FieldLabel>
                <CustomTextField
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Enter credit note description"
                  value={formData.note}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              </Box>

              <Box className="form_inputs" sx={{ height: "100%" }}>
                <FieldLabel>Upload Document</FieldLabel>
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
                    border: `2px dashed ${dragOver ? "#1565c0" : "#1976d2"}`,
                    borderRadius: 2,
                    px: 2,
                    py: 2.5,
                    minHeight: 96,
                    height: "calc(100% - 28px)",
                    textAlign: "center",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: dragOver
                      ? "rgba(25, 118, 210, 0.04)"
                      : "transparent",
                    boxSizing: "border-box",
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
                  <Typography color="text.secondary">
                    Drag & drop or paste images & PDFs
                  </Typography>
                </Box>
              </Box>
            </Box>

            {(existingDocuments.length > 0 ||
              formData.documentFiles.length > 0) && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  mt: 2,
                }}
              >
                {existingDocuments.map((doc) => (
                  <Box
                    key={`existing-${doc.id}`}
                    sx={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        bgcolor: "#f5f5f5",
                      }}
                    >
                      {doc.url &&
                      (doc.url.toLowerCase().includes(".pdf") ||
                        doc.type === "application/pdf") ? (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="caption">PDF</Typography>
                        </Box>
                      ) : (
                        <Box
                          component="img"
                          src={doc.url || doc.thumb || ""}
                          alt={doc.original_name || doc.file}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      )}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      aria-label="Remove document"
                      onClick={() => removeExistingDocument(doc)}
                      sx={REMOVE_DOC_BTN_SX}
                    >
                      <IconX size={12} stroke={2.5} />
                    </Box>
                  </Box>
                ))}

                {formData.documentFiles.map((file, index) => (
                  <Box
                    key={`new-${file.name}-${index}`}
                    sx={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        bgcolor: "#f5f5f5",
                      }}
                    >
                      {file.type === "application/pdf" ? (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="caption">PDF</Typography>
                        </Box>
                      ) : (
                        <Box
                          component="img"
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      )}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      aria-label="Remove document"
                      onClick={() => removeNewFile(index)}
                      sx={REMOVE_DOC_BTN_SX}
                    >
                      <IconX size={12} stroke={2.5} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
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
