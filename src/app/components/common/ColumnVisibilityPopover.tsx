"use client";
import React, { useState } from "react";
import {
  Box,
  FormControlLabel,
  FormGroup,
  Popover,
  TextField,
} from "@mui/material";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

type ColumnVisibilityPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  table: any;
  excludedColumns?: string[];
};

const columnLabel = (col: any) =>
  col.columnDef.meta?.label ||
  (typeof col.columnDef.header === "string" &&
  col.columnDef.header.trim() !== ""
    ? col.columnDef.header
    : col.id
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str: string) => str.toUpperCase())
        .trim());

const ColumnVisibilityPopover: React.FC<ColumnVisibilityPopoverProps> = ({
  open,
  anchorEl,
  onClose,
  table,
  excludedColumns = ["select"],
}) => {
  const [search, setSearch] = useState("");

  const columnOptions = table
    .getAllLeafColumns()
    .filter((col: any) => {
      if (excludedColumns.includes(col.id)) return false;
      return col.id.toLowerCase().includes(search.toLowerCase());
    });
  const allSelected =
    columnOptions.length > 0 &&
    columnOptions.every((col: any) => col.getIsVisible());
  const someSelected = columnOptions.some((col: any) => col.getIsVisible());

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => {
        setSearch("");
        onClose();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{
        sx: {
          width: 280,
          mt: 1,
          p: 1,
          borderRadius: 2,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
          border: "1px solid #e5e7eb",
          maxHeight: "min(420px, calc(100vh - 140px))",
          overflow: "hidden",
        },
      }}
    >
      <TextField
        size="small"
        placeholder="Search columns..."
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{
          mb: 1,
          "& .MuiInputBase-root": {
            borderRadius: 1.5,
            backgroundColor: "#fff",
          },
        }}
      />
      <Box
        sx={{
          maxHeight: "calc(min(420px, calc(100vh - 140px)) - 64px)",
          overflowY: "auto",
          pr: 0.5,
        }}
      >
        <FormGroup sx={{ gap: 0.25 }}>
          <FormControlLabel
            control={
              <CustomCheckbox
                size="small"
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                disabled={columnOptions.length === 0}
                onChange={(e) => {
                  e.stopPropagation();
                  columnOptions.forEach((col: any) =>
                    col.toggleVisibility(e.target.checked),
                  );
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ p: 0.5, mr: 1 }}
              />
            }
            sx={{
              m: 0,
              px: 0.75,
              py: 0.375,
              width: "100%",
              borderRadius: 1.5,
              alignItems: "center",
              textTransform: "none",
              borderBottom: "1px solid #eef2f7",
              mb: 0.25,
              "&:hover": { backgroundColor: "#f8fafc" },
              "& .MuiFormControlLabel-label": {
                fontSize: "14px",
                lineHeight: 1.35,
                whiteSpace: "nowrap",
                fontWeight: 600,
              },
            }}
            onClick={(e) => e.stopPropagation()}
            label="Select All"
          />
          {columnOptions.map((col: any) => (
            <FormControlLabel
              key={col.id}
              control={
                <CustomCheckbox
                  size="small"
                  checked={col.getIsVisible()}
                  onChange={(e) => {
                    e.stopPropagation();
                    col.getToggleVisibilityHandler()(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ p: 0.5, mr: 1 }}
                />
              }
              sx={{
                m: 0,
                px: 0.75,
                py: 0.375,
                width: "100%",
                borderRadius: 1.5,
                alignItems: "center",
                textTransform: "none",
                "&:hover": { backgroundColor: "#f8fafc" },
                "& .MuiFormControlLabel-label": {
                  fontSize: "14px",
                  lineHeight: 1.35,
                  whiteSpace: "nowrap",
                },
              }}
              onClick={(e) => e.stopPropagation()}
              label={columnLabel(col)}
            />
          ))}
        </FormGroup>
      </Box>
    </Popover>
  );
};

export default ColumnVisibilityPopover;
