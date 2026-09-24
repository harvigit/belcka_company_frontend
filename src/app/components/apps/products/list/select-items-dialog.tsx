"use client";
import React from "react";
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

type SelectItemsDialogProps = {
  open: boolean;
  title: string;
  options: any[];
  value: any[];
  onChange: (value: any[]) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  loading?: boolean;
  placeholder?: string;
  className?: string;
};

const SelectItemsDialog: React.FC<SelectItemsDialogProps> = ({
  open,
  title,
  options,
  value,
  onChange,
  onClose,
  onSubmit,
  loading = false,
  placeholder,
  className,
}) => (
  <Dialog
    open={open}
    onClose={() => {
      if (!loading) onClose();
    }}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Autocomplete
        multiple
        className={className}
        options={options || []}
        getOptionLabel={(option) => option.name}
        value={Array.isArray(value) ? value : []}
        onChange={(_, newValue) => onChange(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={value.length === 0 ? placeholder : ""}
          />
        )}
        size="small"
        sx={{ width: 400 }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="error" disabled={loading}>
        Cancel
      </Button>
      <Button
        onClick={onSubmit}
        variant="contained"
        color="primary"
        disabled={loading}
        startIcon={
          loading ? <CircularProgress size={14} color="inherit" /> : null
        }
      >
        {loading ? "Saving..." : "Submit"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default SelectItemsDialog;
