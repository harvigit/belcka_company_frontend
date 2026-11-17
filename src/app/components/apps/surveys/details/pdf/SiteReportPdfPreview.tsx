"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Dialog, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { IconDownload, IconPhoto, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";

/** Fetches the site survey report PDF (built by the API) as a blob. */
export const fetchSiteReportPdf = async (surveyId: string | number): Promise<Blob> => {
  const res = await api.get(`surveys/${surveyId}/site-report-pdf`, { responseType: "blob", skipToast: true } as any);
  return new Blob([res.data], { type: "application/pdf" });
};

export const siteReportFileName = (reference?: string | null) =>
  `${(reference || "Survey").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_")}-Site-Report.pdf`;

export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

type SiteReportPdfPreviewProps = {
  open: boolean;
  surveyId: string | number;
  reference?: string | null;
  onClose: () => void;
};

// Shows the photographic site survey report (cover, summary, room photos) as the real PDF.
export default function SiteReportPdfPreview({ open, surveyId, reference, onClose }: SiteReportPdfPreviewProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    let objectUrl: string | null = null;
    setBlob(null);
    setUrl(null);
    setError("");
    fetchSiteReportPdf(surveyId)
      .then((pdf) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(pdf);
        setBlob(pdf);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError("Couldn't generate the site survey report. Please try again.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, surveyId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: "92vh", display: "flex", flexDirection: "column", borderRadius: "12px", overflow: "hidden" } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}
      >
        <Box sx={{ display: "flex", color: "primary.main" }}>
          <IconPhoto size={22} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            Site survey report preview
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {reference || `Survey #${surveyId}`} · Rooms, photos and condition of every element
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconDownload size={18} />}
          onClick={() => blob && saveBlob(blob, siteReportFileName(reference))}
          disabled={!blob}
          sx={{ fontWeight: 700, borderRadius: "8px", whiteSpace: "nowrap" }}
        >
          Download PDF
        </Button>
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <IconX size={20} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, bgcolor: "#525659" }}>
        {url ? (
          <iframe title="Site survey report" src={url} style={{ width: "100%", height: "100%", border: 0 }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ height: "100%", color: "#fff" }}>
            {error ? (
              <Typography>{error}</Typography>
            ) : (
              <>
                <CircularProgress size={28} sx={{ color: "#fff" }} />
                <Typography fontSize={14}>Generating report with photos...</Typography>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}
