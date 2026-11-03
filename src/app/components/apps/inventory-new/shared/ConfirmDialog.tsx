import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmColor?: "error" | "primary" | "success";
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "Remove",
  confirmColor = "error",
  busy,
  onClose,
  onConfirm,
  children,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography color="textSecondary">{message}</Typography>
      {children}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="outlined" color="primary">
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        variant="outlined"
        color={confirmColor}
        disabled={busy}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
