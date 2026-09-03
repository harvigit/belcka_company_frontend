"use client";

import React, { useState } from "react";
import {
  Box,
  Chip,
  ClickAwayListener,
  Popper,
  Typography,
} from "@mui/material";
import {
  prepareDisplayDiffs,
  type DiffEntry,
  type DisplayDiff,
} from "@/utils/diffDisplay";

const chipSx = {
  height: 18,
  fontSize: 10,
  "& .MuiChip-label": { px: 1 },
};

const oldChipSx = {
  ...chipSx,
  bgcolor: "#FFEBEE",
  color: "#C62828",
  "& .MuiChip-label": { px: 1, textDecoration: "line-through" },
};

const newChipSx = {
  ...chipSx,
  bgcolor: "#E8F5E9",
  color: "#2E7D32",
  fontWeight: 700,
};

function ValueChip({
  value,
  tone = "new",
}: {
  value: any;
  tone?: "old" | "new";
}) {
  return (
    <Chip
      size="small"
      label={String(value)}
      sx={tone === "old" ? oldChipSx : newChipSx}
    />
  );
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
              <ValueChip value={diff.new} tone="new" />
            </>
          ) : diff.old != null && diff.new == null ? (
            <>
              {" - removed "}
              <ValueChip value={diff.old} tone="old" />
            </>
          ) : String(diff.old) === String(diff.new) ? (
            <>
              {" - "}
              <ValueChip value={diff.new} tone="new" />
            </>
          ) : (
            <>
              {" - changed from "}
              <ValueChip value={diff.old} tone="old" />
              {" to "}
              <ValueChip value={diff.new} tone="new" />
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (!rows.length) return null;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box
        width="100%"
        position="relative"
        data-diff-open={open ? "true" : "false"}
        sx={{ zIndex: open ? 20 : 1 }}
      >
        <Box
          ref={setAnchorEl}
          display="flex"
          alignItems="center"
          sx={{ cursor: "pointer", width: "fit-content" }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          <Typography fontSize={12} color="primary" fontWeight={600}>
            {open ? "Hide Changes" : "View Changes"}
          </Typography>
        </Box>
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-start"
          disablePortal
          sx={{ zIndex: 21 }}
        >
          <Box
            mt={0.5}
            p={1}
            minWidth={220}
            maxWidth={320}
            bgcolor="#fff"
            borderRadius={2}
            border="1px solid #e2e8f0"
            boxShadow="0px 8px 24px rgba(15, 23, 42, 0.12)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <DiffChangeRows rows={rows} />
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
