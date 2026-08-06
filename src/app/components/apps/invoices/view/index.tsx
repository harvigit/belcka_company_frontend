"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardMedia,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconFileTypePdf } from "@tabler/icons-react";
import api from "@/utils/axios";
import AttachmentLightbox from "@/app/components/common/AttachmentLightbox";
import {
  InvoiceDocument,
  InvoiceRow,
  mapInvoiceApiRow,
} from "../list/mockData";

type Props = {
  open: boolean;
  invoiceId: number | null;
  companyId: number | null;
  onClose: () => void;
  onEdit?: (invoice: InvoiceRow) => void;
};

const stripHtml = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const formatMoney = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "-";
  return `£${Number(amount).toFixed(2)}`;
};

const isPdfAttachment = (doc: InvoiceDocument) =>
  doc.type === "application/pdf" ||
  !!doc.file?.toLowerCase().endsWith(".pdf") ||
  !!doc.url?.toLowerCase().includes(".pdf") ||
  !!doc.original_name?.toLowerCase().endsWith(".pdf");

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={500} sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
      {value?.trim() ? value : "-"}
    </Typography>
  </Box>
);

const InvoiceView = ({
  open,
  invoiceId,
  companyId,
  onClose,
  onEdit,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!open || !invoiceId || !companyId) {
      setInvoice(null);
      return;
    }
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `po-invoices/detail?company_id=${companyId}&id=${invoiceId}`,
        );
        if (res.data?.IsSuccess && res.data.info) {
          setInvoice(mapInvoiceApiRow(res.data.info));
        } else {
          setInvoice(null);
        }
      } catch (error) {
        console.error(error);
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [open, invoiceId, companyId]);

  const documents = invoice?.documents || [];

  const imageAttachments = useMemo(
    () => documents.filter((doc) => !isPdfAttachment(doc)),
    [documents],
  );

  const lightboxSlides = useMemo(
    () =>
      imageAttachments.map((doc) => ({
        src: doc.url || "",
        alt: doc.original_name || doc.file || `Attachment ${doc.id}`,
        downloadFilename:
          doc.original_name ||
          doc.file ||
          `invoice-attachment-${doc.id}.jpg`,
      })),
    [imageAttachments],
  );

  const openAttachment = (doc: InvoiceDocument) => {
    if (!doc.url) return;
    if (isPdfAttachment(doc)) {
      window.open(doc.url, "_blank");
      return;
    }
    const index = imageAttachments.findIndex((item) => item.id === doc.id);
    if (index < 0) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 420 } },
      }}
    >
      <Box p={2} height="100%" display="flex" flexDirection="column">
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} ml={1}>
            Invoice Details
          </Typography>
        </Box>

        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={240}
          >
            <CircularProgress />
          </Box>
        ) : !invoice ? (
          <Typography variant="body2" color="text.secondary" py={2}>
            Invoice not found
          </Typography>
        ) : (
          <Box sx={{ overflowY: "auto", flex: 1, pr: 0.5 }}>
            <Stack spacing={2}>
              <DetailRow label="Project" value={invoice.project} />
              <DetailRow
                label="Delivery Address"
                value={invoice.deliveryAddress}
              />
              <DetailRow label="Ordered By" value={invoice.orderedBy} />
              <DetailRow label="Supplier" value={invoice.supplier} />
              <DetailRow
                label="Expected Delivery Date"
                value={invoice.expectedDeliveryDate}
              />
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr 1fr" }} gap={2}>
                <DetailRow
                  label="Total Amount (Excl. VAT)"
                  value={formatMoney(invoice.totalExclVat)}
                />
                <DetailRow
                  label="Total Amount (Incl. VAT)"
                  value={formatMoney(invoice.totalInclVat)}
                />
                <DetailRow
                  label="Description"
                  value={stripHtml(invoice.description) || "-"}
                />
              </Box>
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                <DetailRow label="Note" value={stripHtml(invoice.note) || "-"} />
                <DetailRow
                  label="Credit Note Amount"
                  value={formatMoney(invoice.creditNoteAmount)}
                />
              </Box>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Attachments ({documents.length})
            </Typography>

            {documents.length > 0 ? (
              <Grid container spacing={2}>
                {documents.map((doc) => {
                  const isPdf = isPdfAttachment(doc);
                  const previewSrc = isPdf
                    ? doc.thumb || ""
                    : doc.url || doc.thumb || "";
                  return (
                    <Grid  key={doc.id} style={{ position: "relative" }}>
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt={doc.original_name || doc.file || `Attachment ${doc.id}`}
                          width={80}
                          height={80}
                          style={{ objectFit: "cover", borderRadius: 4, cursor: doc.url ? "pointer" : "default" }}
                          onClick={() => openAttachment(doc)}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            bgcolor: "#f5f5f5",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: doc.url ? "pointer" : "default"
                          }}
                          onClick={() => openAttachment(doc)}
                        >
                          <Typography variant="caption">PDF</Typography>
                        </Box>
                      )}
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No attachments found
              </Typography>
            )}

            {onEdit && (
              <Box mt={3}>
                <Typography
                  component="button"
                  onClick={() => {
                    onEdit(invoice);
                    onClose();
                  }}
                  sx={{
                    border: "none",
                    background: "none",
                    color: "primary.main",
                    cursor: "pointer",
                    fontWeight: 600,
                    p: 0,
                  }}
                >
                  Edit Invoice
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <AttachmentLightbox
        open={lightboxOpen}
        index={lightboxIndex}
        slides={lightboxSlides}
        onClose={() => setLightboxOpen(false)}
      />
    </Drawer>
  );
};

export default InvoiceView;
