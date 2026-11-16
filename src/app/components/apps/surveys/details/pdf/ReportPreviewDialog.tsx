"use client";

import React from "react";
import { Box, Button, CircularProgress, Dialog, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { IconDownload, IconPrinter, IconX } from "@tabler/icons-react";
import { printElement } from "./surveyPdfExport";

type ReportPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** id of the rendered document inside the dialog, printed on its own by "Print". */
  printTargetId: string;
  onDownload: () => void;
  downloading?: boolean;
  downloadLabel?: string;
  children: React.ReactNode;
};

// Full-height preview of a printable survey document: the page scrolls inside the dialog body,
// with Print / Download / Close always visible in the header.
export default function ReportPreviewDialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  printTargetId,
  onDownload,
  downloading = false,
  downloadLabel = "Download PDF",
  children,
}: ReportPreviewDialogProps) {
  const handlePrint = () => {
    const element = document.getElementById(printTargetId);
    if (element) void printElement(element, title);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: "92vh", display: "flex", flexDirection: "column", borderRadius: "12px", overflow: "hidden" } }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}
      >
        {icon && <Box sx={{ display: "flex", color: "primary.main" }}>{icon}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<IconPrinter size={18} />}
          onClick={handlePrint}
          sx={{ display: { xs: "none", sm: "inline-flex" }, borderRadius: "8px" }}
        >
          Print
        </Button>
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <IconDownload size={18} />}
          onClick={onDownload}
          disabled={downloading}
          sx={{ fontWeight: 700, borderRadius: "8px", whiteSpace: "nowrap" }}
        >
          {downloading ? "Generating..." : downloadLabel}
        </Button>
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <IconX size={20} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Scrollable page area */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", bgcolor: "#e9edf2", py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 3 } }}>
        <Box
          sx={{
            width: 794,
            mx: "auto",
            bgcolor: "#ffffff",
            borderRadius: "4px",
            boxShadow: "0 1px 3px rgba(15,23,42,0.08), 0 12px 32px -8px rgba(15,23,42,0.18)",
          }}
        >
          {children}
        </Box>
      </Box>
    </Dialog>
  );
}
