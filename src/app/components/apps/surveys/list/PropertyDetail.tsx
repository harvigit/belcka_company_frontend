"use client";

import React from "react";
import { Box, Button, Chip, Grid, Stack, Typography } from "@mui/material";
import { IconEye, IconFileTypePdf } from "@tabler/icons-react";
import { PdAiStatus, PdSection, countItems, fileSize } from "./types";

// Property detail: the PDF card and the details AI read from it (read only).

export const AiStatusChip: React.FC<{ status: PdAiStatus; details?: PdSection[] | null }> = ({ status, details }) => {
  if (status === "done") {
    const n = countItems(details);
    return <Chip size="small" color="success" variant="outlined" label={n ? `AI read ${n} ${n === 1 ? "detail" : "details"}` : "AI found no details"} />;
  }
  if (status === "no_key") return <Chip size="small" color="warning" variant="outlined" label="AI not set up yet" />;
  if (status === "failed") return <Chip size="small" color="error" variant="outlined" label="AI could not read it" />;
  return null;
};

export const PdFileCard: React.FC<{
  name: string;
  size?: number | null;
  url?: string | null;
  status: PdAiStatus;
  details?: PdSection[] | null;
  actions?: React.ReactNode;
}> = ({ name, size, url, status, details, actions }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={1.5}
    alignItems={{ sm: "center" }}
    sx={{ p: 1.5, border: "1px solid", borderColor: "grey.200", borderRadius: 2, backgroundColor: "background.paper" }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" flex={1} minWidth={0}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "error.main",
          backgroundColor: "error.light",
        }}
      >
        <IconFileTypePdf size={22} />
      </Box>
      <Box minWidth={0}>
        <Typography className="f-14" fontWeight={600} noWrap title={name}>
          {name}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
          {size ? (
            <Typography variant="caption" color="textSecondary">
              {fileSize(size)}
            </Typography>
          ) : null}
          <AiStatusChip status={status} details={details} />
        </Stack>
      </Box>
    </Stack>
    <Stack direction="row" spacing={1} flexShrink={0}>
      {url && (
        <Button size="small" variant="outlined" color="inherit" startIcon={<IconEye size={16} />} href={url} target="_blank" rel="noopener noreferrer">
          View PDF
        </Button>
      )}
      {actions}
    </Stack>
  </Stack>
);

export const PdDetails: React.FC<{ details: PdSection[] | null }> = ({ details }) =>
  details?.length ? (
    <Stack spacing={1.5}>
      {details.map((s, i) => (
        <Box key={`${s.section}${i}`} sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 2, backgroundColor: "background.paper", overflow: "hidden" }}>
          <Typography className="f-14" fontWeight={700} sx={{ px: 1.5, py: 1, backgroundColor: "grey.100" }}>
            {s.section}
          </Typography>
          <Grid container>
            {s.items.map((it, j) => (
              <Grid key={`${it.label}${j}`} size={{ xs: 12, sm: 6 }} sx={{ px: 1.5, py: 1, borderTop: "1px solid", borderColor: "grey.100" }}>
                <Typography variant="caption" color="textSecondary" display="block">
                  {it.label}
                </Typography>
                <Typography className="f-14" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {it.value}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Stack>
  ) : (
    <Box sx={{ p: 3, textAlign: "center", border: "1px dashed", borderColor: "grey.300", borderRadius: 2 }}>
      <Typography color="textSecondary" className="f-14">
        No details to show. Please check the PDF itself.
      </Typography>
    </Box>
  );
