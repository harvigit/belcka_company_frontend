"use client";
import React from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type ListConfirmDialogProps = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "error" | "primary";
  confirmVariant?: "outlined" | "contained";
  loading?: boolean;
  loadingLabel?: string;
};

const ListConfirmDialog: React.FC<ListConfirmDialogProps> = ({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "error",
  confirmVariant = "outlined",
  loading = false,
  loadingLabel,
}) => (
  <Dialog
    open={open}
    onClose={() => {
      if (!loading) onClose();
    }}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography color="textSecondary">{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button
        onClick={onClose}
        variant="outlined"
        color="primary"
        disabled={loading}
      >
        {cancelLabel}
      </Button>
      <Button
        onClick={onConfirm}
        variant={confirmVariant}
        color={confirmColor}
        disabled={loading}
        startIcon={
          loading ? <CircularProgress size={14} color="inherit" /> : null
        }
      >
        {loading ? loadingLabel || confirmLabel : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ListConfirmDialog;
