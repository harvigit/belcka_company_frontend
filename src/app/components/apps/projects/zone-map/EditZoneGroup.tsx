'use client';

import React, { useMemo, useState } from 'react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import { IconTrash, IconX } from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

interface EditZoneGroupProps {
    group: {
        id: number;
        name: string;
        zones: { id: number; name: string }[];
    };
    allZones: { id: number; name: string }[];
    onUpdated: () => void;
    onDeleted: () => void;
    onCancel: () => void;
}

const EditZoneGroup = ({ group, allZones, onUpdated, onDeleted, onCancel }: EditZoneGroupProps) => {
    const [groupName, setGroupName] = useState(group.name);
    const [groupNameError, setGroupNameError] = useState('');
    const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>(
        group.zones.map((z) => z.id),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [zoneSearch, setZoneSearch] = useState('');

    const filteredZones = useMemo(() => {
        const s = zoneSearch.trim().toLowerCase();
        if (!s) return allZones;
        return allZones.filter((z) => z.name?.toLowerCase().includes(s));
    }, [allZones, zoneSearch]);

    const handleToggleZone = (id: number) => {
        setSelectedZoneIds((prev) =>
            prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id],
        );
    };

    const handleUpdate = async () => {
        if (!groupName.trim()) {
            setGroupNameError('The Group name field is required');
            return;
        }
        setGroupNameError('');
        setIsSaving(true);
        try {
            const payload = {
                group_id: group.id,
                name: groupName.trim(),
                zone_ids: selectedZoneIds,
            };
            const res = await api.put('work-zone/update-group', payload);
            if (res.data.IsSuccess) {
                toast.success(res.data.message || 'Zone group updated successfully!');
                onUpdated();
            } else {
                toast.error(res.data.message || 'Failed to update zone group.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update zone group.');
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await api.delete(`work-zone/delete-group?id=${group.id}`);
            if (res.data.IsSuccess) {
                toast.success(res.data.message || 'Zone group deleted successfully!');
                onDeleted();
            } else {
                toast.error(res.data.message || 'Failed to delete zone group.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete zone group.');
        }
        setIsDeleting(false);
        setDeleteConfirm(false);
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={true}
                onClose={onCancel}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 480,
                        padding: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#fff',
                    },
                }}
            >
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                        Edit Group
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                        {/* Delete icon button — opens centered confirm dialog */}
                        <IconButton
                            onClick={() => setDeleteConfirm(true)}
                            size="small"
                            sx={{
                                border: '1px solid #ffcdd2',
                                borderRadius: 1,
                                color: '#e53935',
                                '&:hover': { backgroundColor: '#ffebee' },
                            }}
                        >
                            <IconTrash size={18} />
                        </IconButton>
                        <IconButton onClick={onCancel}>
                            <IconX size={20} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Body */}
                <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                    {/* Group name */}
                    <Box mb={2}>
                        <TextField
                            fullWidth
                            label="Group name"
                            value={groupName}
                            onChange={(e) => {
                                setGroupName(e.target.value);
                                if (groupNameError) setGroupNameError('');
                            }}
                            error={Boolean(groupNameError)}
                            helperText={groupNameError}
                            sx={{ mt: 1 }}
                        />
                    </Box>

                    {/* Select Zones label */}
                    <Typography variant="body2" fontWeight={600} color="textSecondary" mb={1}>
                        Select Zones
                    </Typography>

                    {/* Zone list */}
                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                        <Box sx={{ maxHeight: 460, overflowY: 'auto' }}>
                            {filteredZones.length === 0 ? (
                                <Typography color="textSecondary" textAlign="center" py={3} variant="body2">
                                    No zones available.
                                </Typography>
                            ) : (
                                filteredZones.map((zone) => {
                                    const isChecked = selectedZoneIds.includes(zone.id);
                                    return (
                                        <Box
                                            key={zone.id}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            px={2}
                                            py={1.5}
                                            onClick={() => handleToggleZone(zone.id)}
                                            sx={{
                                                borderBottom: '1px solid #f5f5f5',
                                                cursor: 'pointer',
                                                '&:hover': { backgroundColor: '#f5f5f5' },
                                                '&:last-child': { borderBottom: 'none' },
                                            }}
                                        >
                                            <Typography variant="body2">{zone.name}</Typography>
                                            <CustomCheckbox
                                                checked={isChecked}
                                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    e.stopPropagation();
                                                    handleToggleZone(zone.id);
                                                }}
                                            />
                                        </Box>
                                    );
                                })
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Footer actions */}
                <Box display="flex" gap={2} mt={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpdate}
                        disabled={isSaving}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        {isSaving ? 'Updating...' : 'Update'}
                    </Button>
                    <Button variant="outlined" onClick={onCancel} sx={{ borderRadius: 2, px: 3 }}>
                        Cancel
                    </Button>
                </Box>
            </Drawer>

            {/* ── Centered Delete Confirmation Dialog ── */}
            <Dialog
                open={deleteConfirm}
                onClose={() => !isDeleting && setDeleteConfirm(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        px: 1,
                        py: 0.5,
                        minWidth: 360,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    },
                }}
            >
                {/* Dialog icon + title */}
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: '#ffebee',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <IconTrash size={20} color="#e53935" />
                    </Box>
                    <Typography variant="h6" fontWeight={600} fontSize={17}>
                        Delete Zone Group
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ pt: 0, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                        Are you sure you want to delete zone group{' '}
                        <Typography component="span" fontWeight={600} color="text.primary">
                            "{group.name}"
                        </Typography>
                        {' '}?
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setDeleteConfirm(false)}
                        disabled={isDeleting}
                        sx={{ borderRadius: 2, px: 3, textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        sx={{ borderRadius: 2, px: 3, textTransform: 'none' }}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default EditZoneGroup;
