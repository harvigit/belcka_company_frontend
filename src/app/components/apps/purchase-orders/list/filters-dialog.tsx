"use client";
import React from "react";
import { MenuItem, TextField } from "@mui/material";
import ListFiltersDialog from "@/app/components/common/ListFiltersDialog";

export type PurchaseOrderFilters = {
  status: string;
};

type PurchaseOrderFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  tempFilters: PurchaseOrderFilters;
  setTempFilters: React.Dispatch<React.SetStateAction<PurchaseOrderFilters>>;
  normalizeStatus: (value?: string | number | null) => string;
  onClear: () => void;
  onApply: () => void;
};

const PurchaseOrderFiltersDialog: React.FC<PurchaseOrderFiltersDialogProps> = ({
  open,
  onClose,
  tempFilters,
  setTempFilters,
  normalizeStatus,
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
      value={tempFilters.status || "all"}
      onChange={(e) =>
        setTempFilters({
          ...tempFilters,
          status: normalizeStatus(e.target.value),
        })
      }
      fullWidth
    >
      <MenuItem value="all">All</MenuItem>
      {tempFilters.status &&
        tempFilters.status !== "all" &&
        !["1", "2", "3", "4", "5"].includes(tempFilters.status) && (
          <MenuItem value={tempFilters.status}>{tempFilters.status}</MenuItem>
        )}
      <MenuItem value="1">Partially Delivered</MenuItem>
      <MenuItem value="2">Upcoming</MenuItem>
      <MenuItem value="3">Processing</MenuItem>
      <MenuItem value="4">Cancelled</MenuItem>
      <MenuItem value="5">On stock</MenuItem>
    </TextField>
  </ListFiltersDialog>
);

export default PurchaseOrderFiltersDialog;
