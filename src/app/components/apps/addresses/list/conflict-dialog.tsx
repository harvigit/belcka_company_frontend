"use client";
import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type AddressConflictDialogProps = {
  open: boolean;
  postcode?: string;
  onClose: () => void;
  onVerify: () => void;
};

const AddressConflictDialog: React.FC<AddressConflictDialogProps> = ({
  open,
  postcode,
  onClose,
  onVerify,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ color: "error.main", fontWeight: 500 }}>
      Conflict Detected
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1">
        This address under postcode <b>{postcode || ""}</b> are still awaiting
        verification. Please verify them to continue.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button
        variant="contained"
        onClick={(e) => {
          e.stopPropagation();
          onVerify();
        }}
      >
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default AddressConflictDialog;
