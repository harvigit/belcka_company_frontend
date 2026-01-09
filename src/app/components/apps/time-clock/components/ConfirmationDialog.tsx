import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
} from '@mui/material';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    conflictCount: number;
    actionType: 'lock' | 'unlock' | 'paid' | 'delete';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({open, onClose, onConfirm, title, message, conflictCount, actionType}) => {
    const getActionColor = () => {
        switch (actionType) {
            case 'lock':
                return 'success';
            case 'unlock':
                return 'error';
            case 'paid':
                return 'primary';
            default:
                return 'primary';
        }
    };

    const getActionText = () => {
        switch (actionType) {
            case 'lock':
                return 'Lock';
            case 'unlock':
                return 'Unlock';
            case 'paid':
                return 'Mark as Paid';
            default:
                return 'Confirm';
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    p: 1,
                },
            }}
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconAlertTriangle size={24} color="#f97316" />
                    <Typography variant="h6" fontWeight={600}>
                        {title}
                    </Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ py: 1 }}>
                    <Typography variant="body1" color="textSecondary" mb={2}>
                        {message}
                    </Typography>
                    {conflictCount > 0 && (
                        <Box
                            sx={{
                                backgroundColor: '#FEE2E2',
                                borderLeft: '4px solid #DC2626',
                                p: 2,
                                borderRadius: 1,
                            }}
                        >
                            <Typography variant="body2" color="#DC2626" fontWeight={600}>
                                Warning: {conflictCount} record{conflictCount !== 1 ? 's' : ''} with conflicts detected
                            </Typography>
                            {/*<Typography variant="body2" color="#DC2626" mt={0.5}>*/}
                            {/*    These records have scheduling conflicts that should be resolved first.*/}
                            {/*</Typography>*/}
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color={getActionColor()}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    {getActionText()} Anyway
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
