import React, { useState } from 'react';
import { Avatar, Box, Button, IconButton, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { IconArchive, IconArrowLeft, IconClipboardList, IconDots, IconEdit, IconEye, IconSettings } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { DetailsForm } from './formDetailsTypes';
import { fullName, statusChip } from './formDetailsHelpers';

const FormDetailsHeader = ({
    form,
    onBack,
    onEdit,
    onPreview,
    onEditPublishSettings,
    onArchive,
    archiveLoading = false,
}: {
    form: DetailsForm;
    onBack: () => void;
    onEdit: () => void;
    onPreview: () => void;
    onEditPublishSettings: () => void;
    onArchive: () => void;
    archiveLoading?: boolean;
}) => {
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

    const closeMenu = () => setMenuAnchorEl(null);

    return (
        <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                sx={{ p: 2 }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
                    <Tooltip title="Back">
                        <IconButton onClick={onBack}>
                            <IconArrowLeft size={20} />
                        </IconButton>
                    </Tooltip>
                    
                    <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                        <IconClipboardList size={22} />
                    </Avatar>
                    
                    <Box minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="h5" fontWeight={700} noWrap>
                                {form.name || 'Untitled form'}
                            </Typography>
                            {statusChip(form.status)}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            Created {form.created_at ? dayjs(form.created_at).format('DD/MM/YYYY') : '-'} by {fullName(form.createdBy)}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Button variant="outlined" startIcon={<IconEye size={18} />} onClick={onPreview}>
                        Preview
                    </Button>
                    <Button variant="outlined" startIcon={<IconEdit size={18} />} onClick={onEdit}>
                        Edit form
                    </Button>

                    <IconButton
                        onClick={(event) => setMenuAnchorEl(event.currentTarget)}
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                        <IconDots size={20} />
                    </IconButton>
                    
                    <Menu
                        anchorEl={menuAnchorEl}
                        open={Boolean(menuAnchorEl)}
                        onClose={closeMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: {
                                mt: 1,
                                minWidth: 210,
                                borderRadius: 2,
                                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)',
                                border: '1px solid',
                                borderColor: 'divider',
                            },
                        }}
                    >
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                onEditPublishSettings();
                            }}
                            sx={{ gap: 1.25, fontSize: 14, py: 1.1 }}
                        >
                            <IconSettings size={18} />
                            Edit Publish Setting
                        </MenuItem>
                        
                        <MenuItem
                            disabled={archiveLoading}
                            onClick={() => {
                                closeMenu();
                                onArchive();
                            }}
                            sx={{ gap: 1.25, fontSize: 14, py: 1.1 }}
                        >
                            <IconArchive size={18} />
                            {archiveLoading ? 'Archiving...' : 'Archive'}
                        </MenuItem>
                    </Menu>
                </Stack>
            </Stack>
        </Paper>
    );
};

export default FormDetailsHeader;
