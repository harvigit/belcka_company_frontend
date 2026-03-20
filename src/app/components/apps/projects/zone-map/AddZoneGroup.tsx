'use client';

import React, { useMemo, useState } from 'react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import { Box, Button, Drawer, IconButton, TextField, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

interface AddZoneGroupProps {
    projectId: number | null;
    companyId: number | null;
    geofences: any[];
    onAdded: () => void;
    onCancel: () => void;
}

const AddZoneGroup = ({ projectId, companyId, geofences, onAdded, onCancel }: AddZoneGroupProps) => {
    const [groupName, setGroupName] = useState('');
    const [groupNameError, setGroupNameError] = useState('');
    const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [zoneSearch, setZoneSearch] = useState('');

    const filteredZones = useMemo(() => {
        const s = zoneSearch.trim().toLowerCase();
        if (!s) return geofences;
        return geofences.filter((z) => z.name?.toLowerCase().includes(s));
    }, [geofences, zoneSearch]);

    const handleToggleZone = (id: number) => {
        setSelectedZoneIds((prev) =>
            prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id],
        );
    };

    const handleSave = async () => {
        if (!groupName.trim()) {
            setGroupNameError('The Group name field is required');
            return;
        }
        setGroupNameError('');
        setIsSaving(true);
        try {
            const payload = {
                company_id: companyId,
                project_id: projectId,
                name: groupName.trim(),
                zone_ids: selectedZoneIds,
            };
            const res = await api.post('work-zone/add-group', payload);
            if (res.data.IsSuccess) {
                toast.success(res.data.message || 'Zone group created successfully!');
                onAdded();
                onCancel();
            }
        } catch (err) {
            console.error(err);
        }
        setIsSaving(false);
    };

    return (
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
                    Add Group
                </Typography>
                <IconButton onClick={onCancel}>
                    <IconX size={20} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {/* Group name */}
                <Box mb={2}>
                    <TextField
                        fullWidth
                        label="Group name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                    {groupNameError && (
                        <Typography variant="caption" sx={{ color: '#d32f2f', mt: 0.5, display: 'block' }}>
                            {groupNameError}
                        </Typography>
                    )}
                </Box>

                {/* Zone list */}
                <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
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
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Typography variant="body2">{zone.name}</Typography>
                                        </Box>
                                        <CustomCheckbox
                                            checked={isChecked}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
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
                    onClick={handleSave}
                    disabled={isSaving}
                    sx={{ borderRadius: 2, px: 4 }}
                >
                    {isSaving ? 'Adding...' : 'Add'}
                </Button>
                <Button variant="outlined" onClick={onCancel} sx={{ borderRadius: 2, px: 3 }}>
                    Cancel
                </Button>
            </Box>
        </Drawer>
    );
};

export default AddZoneGroup;
