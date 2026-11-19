"use client";
import React from "react";
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

// Small label + value tile used across the vehicle page.
export const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ label, value, sub }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
    <Typography
      variant="caption"
      color="textSecondary"
      sx={{ textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}
    >
      {label}
    </Typography>
    {/* divs, not <h6>/<span>: value and sub can hold chips or progress bars */}
    <Typography component="div" variant="h6" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
      {value}
    </Typography>
    {sub && (
      <Typography component="div" variant="caption" color="textSecondary">
        {sub}
      </Typography>
    )}
  </Paper>
);

// Section heading with optional actions on the right.
export const Section: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, children }) => (
  <Box>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ sm: "center" }}
      spacing={1}
      mb={1.5}
    >
      <Box>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {actions}
        </Stack>
      )}
    </Stack>
    {children}
  </Box>
);

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

// Plain history table for the vehicle tabs.
export function RecordTable<T extends { id: number | string }>({
  columns,
  rows,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  empty: string;
}) {
  if (!rows.length) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}
      >
        <Typography color="textSecondary">{empty}</Typography>
      </Paper>
    );
  }
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell
                key={c.header}
                align={c.align}
                sx={{ py: 1.25, whiteSpace: "nowrap" }}
              >
                <Typography variant="subtitle2">{c.header}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              {columns.map((c) => (
                <TableCell
                  key={c.header}
                  align={c.align}
                  sx={{ py: 1.25, fontVariantNumeric: "tabular-nums" }}
                >
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
