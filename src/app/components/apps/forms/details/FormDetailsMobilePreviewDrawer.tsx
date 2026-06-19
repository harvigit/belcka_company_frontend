import React from 'react';
import { Box, Button, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { IconEdit, IconX } from '@tabler/icons-react';
import MobilePreview from '../list/MobilePreview';
import { DetailsForm } from './formDetailsTypes';

const FormDetailsMobilePreviewDrawer = ({
    form,
    open,
    onClose,
    onEdit,
}: {
    form: DetailsForm;
    open: boolean;
    onClose: () => void;
    onEdit: () => void;
}) => (
    <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
            '& .MuiDrawer-paper': {
                width: { xs: '100%', sm: 420, md: 500 },
                maxWidth: '100%',
                bgcolor: '#fff',
                display: 'flex',
                flexDirection: 'column',
            },
        }}
    >
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <IconButton size="small" onClick={onClose} aria-label="Close preview">
                    <IconX size={18} />
                </IconButton>
                <Typography fontWeight={600} color="text.secondary">
                    Mobile Preview
                </Typography>
            </Stack>
            
            <Button
                variant="outlined"
                size="small"
                startIcon={<IconEdit size={16} />}
                onClick={onEdit}
                sx={{ borderRadius: 999, textTransform: 'none' }}
            >
                Edit
            </Button>
        </Stack>

        <Box
            sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                px: { xs: 2, sm: 3 },
                py: { xs: 3, md: 8 },
            }}
        >
            <MobilePreview title={form.name || ''} fields={form.fields || []} />
        </Box>
    </Drawer>
);

export default FormDetailsMobilePreviewDrawer;
