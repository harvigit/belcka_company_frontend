'use client'
import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const ConfirmDialog = ({
  open,
  title,
  content,
  onClose,
  onConfirm
}: {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClose = (
    event: object,
    reason: 'backdropClick' | 'escapeKeyDown'
  ) => {
    // Prevent closing on outside click or ESC key
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
    onClose();
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={handleClose}
      aria-labelledby="responsive-dialog-title"
      BackdropProps={{
        style: {
          opacity: 1,
        },
      }}
    >
      <DialogTitle id="responsive-dialog-title">{t(title)}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t(content)}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={onConfirm} autoFocus color="error">
          {t('Delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
