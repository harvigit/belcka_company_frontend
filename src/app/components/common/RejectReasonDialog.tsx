"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type RejectReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title?: string;
  message?: React.ReactNode;
  loading?: boolean;
};

const MAX_REASON_LENGTH = 500;

const RejectReasonDialog: React.FC<RejectReasonDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const showError = touched && !trimmedReason;

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleConfirm = () => {
    setTouched(true);
    if (!trimmedReason || loading) return;
    onConfirm(trimmedReason);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ m: 0, position: "relative" }}>
        {title ?? t("Reject Request")}
        <IconButton
          aria-label={t("Close")}
          onClick={handleClose}
          disabled={loading}
          sx={{ position: "absolute", right: 12, top: 8 }}
        >
          <IconX size={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography color="textSecondary">
            {message ?? t("Please explain why this request is being rejected.")}
          </Typography>
          <TextField
            label={t("Rejection note")}
            placeholder={t("Write a reject note...")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            error={showError}
            helperText={showError ? t("Rejection note is required") : " "}
            inputProps={{ maxLength: MAX_REASON_LENGTH }}
            required
            autoFocus
            fullWidth
            multiline
            minRows={3}
            disabled={loading}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={handleClose} disabled={loading}>
          {t("Cancel")}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={loading || !trimmedReason}
        >
          {loading ? t("Rejecting...") : t("Reject")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RejectReasonDialog;
