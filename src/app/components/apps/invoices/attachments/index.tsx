"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardMedia,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconFileTypePdf } from "@tabler/icons-react";
import api from "@/utils/axios";
import AttachmentLightbox from "@/app/components/common/AttachmentLightbox";
import { InvoiceDocument, mapInvoiceApiRow } from "../list/mockData";

type Props = {
  invoiceId: number;
  companyId: number;
  onClose: () => void;
};

const isPdfAttachment = (doc: InvoiceDocument) =>
  doc.type === "application/pdf" ||
  !!doc.file?.toLowerCase().endsWith(".pdf") ||
  !!doc.url?.toLowerCase().includes(".pdf") ||
  !!doc.original_name?.toLowerCase().endsWith(".pdf");

const InvoiceAttachments = ({ invoiceId, companyId, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<InvoiceDocument[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (invoiceId > 0 && companyId > 0) {
      fetchDocuments();
    }
  }, [invoiceId, companyId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `po-invoices/detail?company_id=${companyId}&id=${invoiceId}`,
      );
      if (res.data?.IsSuccess && res.data.info) {
        const mapped = mapInvoiceApiRow(res.data.info);
        setDocuments(mapped.documents || []);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error(error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700} ml={1}>
            Attachments
          </Typography>
        </Box>
      </Box>

      {documents.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
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
                    sm: "calc(33.33% - 11px)",
                    md: "calc(25% - 12px)",
                  },
                }}
              >
                <Card
                  sx={{
                    cursor: doc.url ? "pointer" : "default",
                    "&:hover": {
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => openAttachment(doc)}
                >
                  {previewSrc ? (
                    <CardMedia
                      component="img"
                      height="140"
                      image={previewSrc}
                      alt={
                        doc.original_name || doc.file || `Attachment ${doc.id}`
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
                      <IconFileTypePdf size={48} color="#d32f2f" />
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
        <Typography variant="body2" color="text.secondary" py={2}>
          No attachments found
        </Typography>
      )}

      <AttachmentLightbox
        open={lightboxOpen}
        index={lightboxIndex}
        slides={lightboxSlides}
        onClose={() => setLightboxOpen(false)}
      />
    </Box>
  );
};

export default InvoiceAttachments;
