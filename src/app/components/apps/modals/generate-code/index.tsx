"use client";
import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const GenerateCodeDialog: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Generate Code</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to generate a new code?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Yes, Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GenerateCodeDialog;
