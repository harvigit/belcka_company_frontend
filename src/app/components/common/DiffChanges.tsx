"use client";

import React, { useState } from "react";
import { Box, Chip, Collapse, Typography } from "@mui/material";
import {
  prepareDisplayDiffs,
  type DiffEntry,
  type DisplayDiff,
} from "@/utils/diffDisplay";

const chipSx = {
  height: 18,
  fontSize: 10,
  bgcolor: "#E8F5E9",
  color: "#2E7D32",
  "& .MuiChip-label": { px: 1 },
};

function ValueChip({ value }: { value: any }) {
  return <Chip size="small" label={String(value)} sx={chipSx} />;
}

function DiffChangeRows({ rows }: { rows: DisplayDiff[] }) {
  return (
    <>
      {rows.map((diff, i) => (
        <Typography
          key={`${diff.key}-${i}`}
          fontSize={11}
          color="text.secondary"
          mt={i > 0 ? 0.75 : 0}
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.5,
          }}
        >
          <Typography
            component="span"
            fontSize={11}
            fontWeight={600}
            sx={{ textTransform: "uppercase" }}
          >
            {diff.label}
          </Typography>
          {diff.old == null && diff.new != null ? (
            <>
              {" - added as "}
              <ValueChip value={diff.new} />
            </>
          ) : diff.old != null && diff.new == null ? (
            <>
              {" - removed "}
              <ValueChip value={diff.old} />
            </>
          ) : (
            <>
              {" - changed from "}
              <ValueChip value={diff.old} />
              {" to "}
              <ValueChip value={diff.new} />
            </>
          )}
        </Typography>
      ))}
    </>
  );
}

export function DiffChangeLines({ diffs }: { diffs?: DiffEntry[] | null }) {
  const rows = prepareDisplayDiffs(diffs);
  if (!rows.length) return null;
  return (
    <Box mt={0.5}>
      <DiffChangeRows rows={rows} />
    </Box>
  );
}

export default function DiffChanges({ diffs }: { diffs?: DiffEntry[] | null }) {
  const rows = prepareDisplayDiffs(diffs);
  const [open, setOpen] = useState(false);

  if (!rows.length) return null;

  return (
    <Box width="100%">
      <Box
        display="flex"
        alignItems="center"
        sx={{ cursor: "pointer", width: "fit-content" }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <Typography fontSize={12} color="primary" fontWeight={600}>
          {open ? "Hide Changes" : "View Changes"}
        </Typography>
      </Box>
      <Collapse in={open}>
        <Box
          mt={0.5}
          p={1}
          bgcolor="#f8fafc"
          borderRadius={2}
          border="1px solid #e2e8f0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <DiffChangeRows rows={rows} />
        </Box>
      </Collapse>
    </Box>
  );
}
