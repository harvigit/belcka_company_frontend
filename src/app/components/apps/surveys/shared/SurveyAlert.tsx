"use client";

import React from "react";
import { Alert, AlertProps } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

// Dark text for each severity: the theme's standard Alert uses the light main colour on a light background, which is hard to read.
const TEXT: Record<NonNullable<AlertProps["severity"]>, string> = {
  warning: "#7A4A00",
  error: "#A3261B",
  info: "#1E4A7A",
  success: "#14613C",
};

/** MUI Alert with readable colours for the survey screens: dark text, a soft border and a coloured left edge. */
const SurveyAlert = React.forwardRef<HTMLDivElement, AlertProps>(function SurveyAlert({ severity = "info", variant, sx, ...rest }, ref) {
  const theme = useTheme();
  if (variant && variant !== "standard") return <Alert ref={ref} severity={severity} variant={variant} sx={sx} {...rest} />;
  const main = theme.palette[severity].main;
  return (
    <Alert
      ref={ref}
      severity={severity}
      sx={[
        {
          color: TEXT[severity],
          bgcolor: alpha(main, 0.1),
          border: `1px solid ${alpha(main, 0.35)}`,
          borderLeft: `4px solid ${main}`,
          "& .MuiAlert-icon": { color: `${main} !important`, opacity: 1 },
          "& .MuiAlert-message": { fontWeight: 500, lineHeight: 1.5 },
          "& .MuiAlert-message b": { fontWeight: 700 },
          "& .MuiAlert-action": { color: TEXT[severity], pt: 0 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
});

export default SurveyAlert;
