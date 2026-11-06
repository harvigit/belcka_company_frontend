"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { IconDownload, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";

export type PdfPreviewSource = {
  name: string;
  /** Saved form to preview. */
  id?: number;
  /** Unsaved fields from the editor; previewed instead of the saved form when given. */
  fields?: unknown[];
};

type PdfPreviewProps = {
  /** What to preview; null closes the dialog. */
  form: PdfPreviewSource | null;
  onClose: () => void;
};

// Shows the paper-style PDF of a property detail inside the app, with a download button.
const SurveyFormPdfPreview = ({ form, onClose }: PdfPreviewProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form) return;
    let objectUrl: string | null = null;
    let active = true;
    setUrl(null);
    setError("");
    const config = { responseType: "blob", skipToast: true } as any;
    const request = form.fields
      ? api.post("survey-forms/preview-pdf", { name: form.name, fields: form.fields }, config)
      : api.get("survey-forms/pdf", { ...config, params: { form_id: form.id } });
    request
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError("Couldn't generate the PDF. Please try again.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [form]);

  const download = () => {
    if (!url || !form) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.name.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_") || "Inspection_Form"}.pdf`;
    link.click();
  };

  return (
    <Dialog
      open={Boolean(form)}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: "92vh", display: "flex", flexDirection: "column" } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        px={2.5}
        py={1.5}
        sx={{ borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {form?.name || "Untitled form"}
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            {form?.fields ? "Preview of your current changes (not saved yet)" : "PDF preview (blank form)"}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<IconDownload size={18} />} onClick={download} disabled={!url}>
          Download
        </Button>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <IconX size={20} />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, bgcolor: "#525659" }}>
        {url ? (
          <iframe title="Property detail PDF" src={url} style={{ width: "100%", height: "100%", border: 0 }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ height: "100%", color: "#fff" }}>
            {error ? (
              <Typography>{error}</Typography>
            ) : (
              <>
                <CircularProgress size={28} sx={{ color: "#fff" }} />
                <Typography fontSize={14}>Generating PDF...</Typography>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Dialog>
  );
};

export default SurveyFormPdfPreview;
