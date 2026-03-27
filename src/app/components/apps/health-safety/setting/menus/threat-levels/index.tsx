'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Card,
    CardContent,
    Typography,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions, InputAdornment,
} from '@mui/material';
import {
    IconPlus,
    IconTrash,
    IconAlertOctagon,
    IconX,
    IconPencil, IconSearch,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';

interface ThreatLevel {
    id: number;
    title: string;
    enabled: boolean;
}

interface Props {
    companyId: number;
}

const ThreatLevelList: React.FC<Props> = ({companyId}) => {
    const [items, setItems] = useState<ThreatLevel[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Add/Edit dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [titleInput, setTitleInput] = useState('');
    const [titleError, setTitleError] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete dialog
    const [deleteTargetId, setDeleteTargetId] = useState<number | undefined>(undefined);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Fetch data
    const fetchData = async () => {
        try {
            const response = await api.get('/threat-levels/get', {
                params: { company_id: companyId }
            });
            if (response.data?.IsSuccess) {
                const transformed: ThreatLevel[] = response.data.info.map((item: any) => ({
                    id: item.id,
                    title: item.title || item.name || '',
                    enabled: Boolean(item.status),
                }));
                setItems(transformed);
            }
        } catch (error) {
            console.error('Error fetching threat levels:', error);
        }
    };

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
    }, [companyId]);

    // Dialog handlers
    const openAddDialog = () => {
        setSelectedId(undefined);
        setTitleInput('');
        setTitleError('');
        setDialogOpen(true);
    };

    const openEditDialog = (item: ThreatLevel) => {
        setSelectedId(item.id);
        setTitleInput(item.title);
        setTitleError('');
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setTitleInput('');
        setTitleError('');
        setSelectedId(undefined);
    };

    // Save (Add + Edit)
    const handleSave = async () => {
        if (!titleInput.trim()) {
            setTitleError('Threat level title is required');
            return;
        }

        setSaving(true);

        try {
            const payload: any = {
                title: titleInput.trim(),
                company_id: companyId
            };

            // If edit
            if (selectedId) {
                payload.threat_level_id = selectedId;
            }

            const response = await api.post('/store-threat-levels', payload);

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                closeDialog();
                fetchData();
            } else {
                toast.error(response.data?.message || 'Failed to save');
            }
        } catch {
        } finally {
            setSaving(false);
        }
    };

    // Delete
    const confirmDelete = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setDeleteTargetId(id);
        setOpenDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTargetId) return;

        setDeleting(true);

        try {
            const response = await api.delete(`/delete-threat-level/${deleteTargetId}`);

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                setOpenDeleteModal(false);
                setDeleteTargetId(undefined);
                fetchData();
            } else {
                toast.error(response.data?.message || 'Delete failed');
            }
        } catch {
            toast.error('Error deleting threat level');
        } finally {
            setDeleting(false);
        }
    };

    const filteredItems = items.filter((h) =>
        h.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Toolbar */}
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', maxWidth: 600, mx: 'auto' }}>
                    <TextField
                        placeholder="Search..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        // sx={{ width: 180 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconSearch size={16} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Button
                        variant="outlined"
                        onClick={openAddDialog}
                        startIcon={<IconPlus size={14} />}
                        sx={{ borderRadius: '10px' }}
                    >
                        Add Level
                    </Button>
                </Box>
            </Box>

            {/* List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                    {filteredItems.map((item) => (
                        <Card key={item.id} sx={{ width: '100%', maxWidth: 600 }}>
                            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconAlertOctagon size={16} color="#d32f2f" />
                                    <Typography fontWeight={500}>
                                        {item.title}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton onClick={() => openEditDialog(item)}>
                                        <IconPencil size={16} />
                                    </IconButton>

                                    <IconButton color="error" onClick={(e) => confirmDelete(e, item.id)}>
                                        <IconTrash size={18} />
                                    </IconButton>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredItems.length === 0 && (
                        <Typography sx={{ color: 'text.secondary', py: 4 }}>
                            {searchQuery ? `No results for "${searchQuery}"` : 'No threat levels found'}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {selectedId ? 'Edit Threat Level' : 'Add Threat Level'}
                    <IconButton onClick={closeDialog}>
                        <IconX size={18} />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Typography variant="subtitle2" mb={0.75} fontWeight={600}>Threat Level Title</Typography>
                    <CustomTextField
                        placeholder="Enter title..."
                        value={titleInput}
                        onChange={(e: any) => {
                            setTitleInput(e.target.value);
                            setTitleError('');
                        }}
                        onKeyDown={(e: any) => e.key === 'Enter' && handleSave()}
                        fullWidth
                        size="small"
                        error={!!titleError}
                        helperText={titleError}
                        inputProps={{
                            style: { textAlign: 'left' }
                        }}
                    />
                </DialogContent>

                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving || !titleInput.trim()}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
                <DialogTitle>Delete Threat Level</DialogTitle>

                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenDeleteModal(false)}>Cancel</Button>
                    <Button color="error" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ThreatLevelList;
