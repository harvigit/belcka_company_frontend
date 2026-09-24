"use client";
import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";

type ListFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  children: React.ReactNode;
};

const ListFiltersDialog: React.FC<ListFiltersDialogProps> = ({
  open,
  onClose,
  onClear,
  onApply,
  children,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
      Filters
      <IconButton
        aria-label="close"
        onClick={onClose}
        size="large"
        sx={{
          position: "absolute",
          right: 12,
          top: 8,
          color: (theme) => theme.palette.grey[900],
          backgroundColor: "transparent",
          zIndex: 10,
          width: 50,
          height: 50,
        }}
      >
        <IconX size={40} style={{ width: 40, height: 40 }} />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <Stack spacing={2} mt={1}>
        {children}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClear} color="inherit">
        Clear
      </Button>
      <Button variant="contained" onClick={onApply}>
        Apply
      </Button>
    </DialogActions>
  </Dialog>
);

export default ListFiltersDialog;
