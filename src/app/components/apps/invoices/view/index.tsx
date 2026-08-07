"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import {
  IconBuildingStore,
  IconCalendar,
  IconFileText,
  IconHash,
  IconMapPin,
  IconReceipt,
  IconUser,
} from "@tabler/icons-react";
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

const InfoBlock = ({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) => (
  <Box>
    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
      {icon}
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
    {children || (
      <Typography
        variant="body1"
        fontWeight={500}
        sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
      >
        {value?.trim() ? value : "-"}
      </Typography>
    )}
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

  const displayInvoiceId = invoice?.invoiceId?.trim() || "-";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 460 },
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box p={2} height="100%" display="flex" flexDirection="column">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center">
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700} ml={1}>
              Invoice Details
            </Typography>
          </Box>
          {invoice && onEdit && (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                onEdit(invoice);
                onClose();
              }}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
            >
              Edit
            </Button>
          )}
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
            <Box mb={1.5}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {formatMoney(invoice.totalInclVat)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Incl. VAT · Excl. VAT {formatMoney(invoice.totalExclVat)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <IconHash size={16} color="#666" />
              <Typography variant="body2" fontWeight={600}>
                Invoice ID: {displayInvoiceId}
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Stack spacing={2.5}>
                  <InfoBlock
                    icon={<IconFileText size={18} color="#666" />}
                    label="Project"
                    value={invoice.project}
                  />
                  <InfoBlock
                    icon={<IconBuildingStore size={18} color="#666" />}
                    label="Supplier"
                    value={invoice.supplier}
                  />
                  <InfoBlock
                    icon={<IconCalendar size={18} color="#666" />}
                    label="Date"
                    value={invoice.expectedDeliveryDate}
                  />
                </Stack>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Stack spacing={2.5}>
                  <InfoBlock
                    icon={<IconUser size={18} color="#666" />}
                    label="Ordered By"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        src={
                          invoice.orderedByImage || "/images/users/user.png"
                        }
                        alt={invoice.orderedBy}
                        sx={{ width: 28, height: 28, fontSize: "12px" }}
                      >
                        {invoice.orderedBy?.[0]?.toUpperCase()}
                      </Avatar>
                      <Typography
                        variant="body1"
                        fontWeight={500}
                        sx={{ wordBreak: "break-word" }}
                      >
                        {invoice.orderedBy?.trim() ? invoice.orderedBy : "-"}
                      </Typography>
                    </Stack>
                  </InfoBlock>
                  <InfoBlock
                    icon={<IconReceipt size={18} color="#666" />}
                    label="Credit Amt"
                    value={formatMoney(invoice.creditNoteAmount)}
                  />
                </Stack>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box mb={3}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <IconMapPin size={18} color="#666" />
                <Typography variant="caption" color="text.secondary">
                  Address
                </Typography>
              </Stack>
              <Typography
                variant="body1"
                fontWeight={500}
                sx={{ wordBreak: "break-word" }}
              >
                {invoice.deliveryAddress?.trim()
                  ? invoice.deliveryAddress
                  : "-"}
              </Typography>
            </Box>

            <Box mb={3}>
              <Typography
                variant="caption"
                color="text.secondary"
                mb={0.5}
                display="block"
              >
                Description
              </Typography>
              <Typography
                variant="body1"
                fontWeight={500}
                sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
              >
                {stripHtml(invoice.description) || "-"}
              </Typography>
            </Box>

            {stripHtml(invoice.note) && (
              <Box mb={3}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  mb={0.5}
                  display="block"
                >
                  Credit Note Description
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
                >
                  {stripHtml(invoice.note)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography
              variant="caption"
              color="text.secondary"
              mb={1}
              display="block"
            >
              Attachments ({documents.length})
            </Typography>

            {documents.length > 0 ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {documents.map((doc) => {
                  const isPdf = isPdfAttachment(doc);
                  const previewSrc = isPdf
                    ? doc.thumb || ""
                    : doc.url || doc.thumb || "";
                  return (
                    <Box
                      key={doc.id}
                      sx={{
                        width: {
                          xs: "calc(50% - 8px)",
                          sm: "calc(50% - 8px)",
                        },
                      }}
                    >
                      <Card
                        sx={{
                          cursor: doc.url ? "pointer" : "default",
                          "&:hover": doc.url ? { boxShadow: 3 } : undefined,
                          bgcolor: "#fff",
                        }}
                        onClick={() => openAttachment(doc)}
                      >
                        {previewSrc ? (
                          <CardMedia
                            component="img"
                            height="140"
                            image={previewSrc}
                            alt={
                              doc.original_name ||
                              doc.file ||
                              `Attachment ${doc.id}`
                            }
                            sx={{ objectFit: "cover" }}
                          />
                        ) : (
                          <Box
                            height={140}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bgcolor="#f5f5f5"
                          >
                            <Typography variant="caption" fontWeight={600}>
                              PDF
                            </Typography>
                          </Box>
                        )}
                      </Card>
                      {(doc.original_name || doc.file) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          display="block"
                          mt={0.5}
                          title={doc.original_name || doc.file || ""}
                        >
                          {doc.original_name || doc.file}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" py={1}>
                No attachments found
              </Typography>
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
