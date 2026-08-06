"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

type Props = {
  label: string;
};

const ExpenseCategoryBadge = ({ label }: Props) => {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.35,
        borderRadius: "999px",
        bgcolor: "#F3EEFF",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.4,
          color: "#6D28D9",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default ExpenseCategoryBadge;
