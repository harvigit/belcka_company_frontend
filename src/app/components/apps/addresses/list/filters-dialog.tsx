"use client";
import React from "react";
import { MenuItem, TextField } from "@mui/material";
import ListFiltersDialog from "@/app/components/common/ListFiltersDialog";

export type AddressListFilters = {
  status: string;
  has_cases: string;
};

type AddressFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  tempFilters: AddressListFilters;
  setTempFilters: React.Dispatch<React.SetStateAction<AddressListFilters>>;
  statusOptions: string[];
  onClear: () => void;
  onApply: () => void;
};

const AddressFiltersDialog: React.FC<AddressFiltersDialogProps> = ({
  open,
  onClose,
  tempFilters,
  setTempFilters,
  statusOptions,
  onClear,
  onApply,
}) => (
  <ListFiltersDialog
    open={open}
    onClose={onClose}
    onClear={onClear}
    onApply={onApply}
  >
    <TextField
      select
      label="Status"
      value={tempFilters.status}
      onChange={(e) =>
        setTempFilters({ ...tempFilters, status: e.target.value })
      }
      fullWidth
    >
      <MenuItem value="">All</MenuItem>
      {statusOptions.map((statusItem, i) => (
        <MenuItem key={i} value={statusItem}>
          {statusItem}
        </MenuItem>
      ))}
    </TextField>
    <TextField
      select
      label="Case"
      value={tempFilters.has_cases}
      onChange={(e) =>
        setTempFilters({
          ...tempFilters,
          has_cases: e.target.value,
        })
      }
      fullWidth
    >
      <MenuItem value="">All</MenuItem>
      <MenuItem value="with_cases">With Cases</MenuItem>
      <MenuItem value="without_cases">Without Cases</MenuItem>
    </TextField>
  </ListFiltersDialog>
);

export default AddressFiltersDialog;
