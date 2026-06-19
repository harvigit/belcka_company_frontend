import React from 'react';
import {Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography} from '@mui/material';
import { IconArchive, IconX } from '@tabler/icons-react';

const FormDetailsArchiveConfirmDialog = ({
    open,
    formName,
    loading,
    onClose,
    onConfirm,
}: {
    open: boolean;
    formName: string;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) => (
    <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
            sx: {
                width: 465,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: 1,
                boxShadow: '0 18px 45px rgba(15, 23, 42, 0.26)',
            },
        }}
        BackdropProps={{
            sx: {
                bgcolor: 'rgba(0, 0, 0, 0.45)',
            },
        }}
    >
        <DialogTitle>
            <IconButton
                aria-label="close"
                onClick={onClose}
                disabled={loading}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
            >
                <IconX size={20} />
            </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ px: { xs: 3, sm: 3 } }}>
            <Stack alignItems="center" textAlign="center">
                <Box sx={{ position: 'relative', color: '#B9C0C8' }}>
                    <IconArchive size={52} stroke={1.5} />
                </Box>
               
                <Typography color="textSecondary" fontWeight={500}>
                    {formName || 'This form'} will be excluded from mobile app content. All the data will remain available.
                </Typography>
                
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={onConfirm}
                    disabled={loading}
                    sx={{ mt: 2 }}
                >
                    {loading ? 'Archiving...' : 'Archive'}
                </Button>
            </Stack>
        </DialogContent>
    </Dialog>
);

export default FormDetailsArchiveConfirmDialog;
