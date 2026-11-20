"use client";
import React from "react";
import { createTheme, Theme, ThemeProvider } from "@mui/material/styles";

type ChipColor = "primary" | "secondary" | "success" | "error" | "warning" | "info";
const COLORS: ChipColor[] = ["primary", "secondary", "success", "error", "warning", "info"];

// Text colour for a soft badge in light mode: dark enough to read on the pale background.
const LIGHT_TEXT: Record<ChipColor, (t: Theme) => string> = {
  primary: (t) => t.palette.primary.main,
  secondary: () => "#c2552f",
  success: (t) => t.palette.success.dark,
  error: () => "#d6304f",
  warning: () => "#a35f00",
  info: () => "#0277bd",
};

/**
 * Vehicles module look: every coloured badge (Overdue, Due soon, Active, permits...) is a soft
 * badge — light background, darker text — the same light colours as the tiles, so the screens
 * don't mix bright filled badges with pale cards. Applies to dialogs and drawers too.
 */
const fleetTheme = (outer: Theme) => {
  const dark = outer.palette.mode === "dark";
  const filled = Object.fromEntries(
    COLORS.map((c) => {
      const key = `filled${c[0].toUpperCase()}${c.slice(1)}`;
      return [
        key,
        {
          backgroundColor: outer.palette[c].light,
          color: dark ? outer.palette[c].main : LIGHT_TEXT[c](outer),
          "& .MuiChip-icon, & .MuiChip-deleteIcon": { color: "inherit" },
          "&.MuiChip-clickable:hover": { backgroundColor: outer.palette[c].light, filter: "brightness(0.96)" },
        },
      ];
    }),
  );
  return createTheme(outer, {
    components: {
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          ...filled,
        },
      },
    },
  });
};

const FleetTheme: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={fleetTheme}>{children}</ThemeProvider>
);

export default FleetTheme;
