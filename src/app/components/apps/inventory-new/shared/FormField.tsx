import React from "react";
import { Box, Typography } from "@mui/material";

// Label above a form control, matching the inventory drawers.
const FormField: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <Box>
    <Typography color="#1a1a1a" mb={0.5}>
      {label}
    </Typography>
    {children}
    {hint && (
      <Typography variant="caption" color="textSecondary">
        {hint}
      </Typography>
    )}
  </Box>
);

export default FormField;
