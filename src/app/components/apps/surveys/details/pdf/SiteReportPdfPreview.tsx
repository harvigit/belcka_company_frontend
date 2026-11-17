"use client";

import React, { useEffect, useState } from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { IconPhoto } from "@tabler/icons-react";
import ReportPreviewDialog from "./ReportPreviewDialog";
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
    <ReportPreviewDialog
      open={open}
      onClose={onClose}
      title="Site survey report"
      subtitle={`${reference || `Survey #${surveyId}`} · Rooms, photos and condition of every element`}
      icon={<IconPhoto size={22} />}
      onDownload={() => blob && saveBlob(blob, siteReportFileName(reference))}
      downloadDisabled={!blob}
      paper={false}
    >
      {url ? (
        <iframe title="Site survey report" src={url} style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
      ) : (
        <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ height: "100%", color: "text.secondary" }}>
          {error ? (
            <Typography color="error.main">{error}</Typography>
          ) : (
            <>
              <CircularProgress size={28} />
              <Typography fontSize={14}>Generating report with photos...</Typography>
            </>
          )}
        </Stack>
      )}
    </ReportPreviewDialog>
  );
}
