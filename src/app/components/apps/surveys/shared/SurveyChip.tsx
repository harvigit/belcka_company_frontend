"use client";

import React from "react";
import { Chip, ChipProps } from "@mui/material";
import { WARN_BG, WARN_BORDER, WARN_TEXT } from "./colors";

/** MUI Chip for the survey screens: a warning chip gets dark amber text, as the theme's yellow is hard to read. */
const SurveyChip = React.forwardRef<HTMLDivElement, ChipProps>(function SurveyChip({ color, variant, sx, ...rest }, ref) {
  if (color !== "warning") return <Chip ref={ref} color={color} variant={variant} sx={sx} {...rest} />;
  const warn =
    variant === "outlined"
      ? { color: WARN_TEXT, borderColor: WARN_BORDER, bgcolor: "#fff", "& .MuiChip-icon": { color: WARN_TEXT } }
      : { color: WARN_TEXT, bgcolor: WARN_BG, border: `1px solid ${WARN_BORDER}`, "& .MuiChip-icon": { color: WARN_TEXT } };
  return <Chip ref={ref} variant={variant} sx={[warn, ...(Array.isArray(sx) ? sx : [sx])]} {...rest} />;
});

export default SurveyChip;
