"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { ExpenseStatus } from "../types";

const STATUS_STYLES: Record<
  ExpenseStatus,
  { bg: string; color: string; label: string }
> = {
  approved: {
    bg: "#E8F8EF",
    color: "#1B7A45",
    label: "Approved",
  },
  pending: {
    bg: "#FFF4E5",
    color: "#C47A00",
    label: "Pending",
  },
  rejected: {
    bg: "#FDECEC",
    color: "#C62828",
    label: "Rejected",
  },
  sent: {
    bg: "#E8F1FC",
    color: "#1E4DB7",
    label: "Sent",
  },
};

type Props = {
  status: ExpenseStatus;
};

const ExpenseStatusBadge = ({ status }: Props) => {
  const style = STATUS_STYLES[status];

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.35,
        borderRadius: "999px",
        bgcolor: style.bg,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.4,
          color: style.color,
          whiteSpace: "nowrap",
        }}
      >
        {style.label}
      </Typography>
    </Box>
  );
};

export default ExpenseStatusBadge;
