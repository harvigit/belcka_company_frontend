import React, { useState } from 'react';
import { Box, FormControl, Select, MenuItem, Tooltip } from '@mui/material';
import api from '@/utils/axios';
import toast from 'react-hot-toast';

// Same look & behaviour as the time-clock EditableShiftCell: plain text that turns
// into an inline select on click. Used in the users list and the time-clock list.
interface EditableGroupCellProps {
    userId: number;
    companyId?: number | string | null;
    groupId: number | null;
    groupName: string | null;
    groups: { id: number; name: string }[];
    canEdit: boolean;
    onUpdated: (userId: number, groupId: number | null, groupName: string | null) => void;
}

const NO_GROUP = '';

const EditableGroupCell: React.FC<EditableGroupCellProps> = ({
    userId,
    companyId,
    groupId,
    groupName,
    groups,
    canEdit,
    onUpdated,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const getTruncatedName = (name: string | null) => {
        if (!name) return '--';
        const maxLength = 15;
        return name.length > maxLength ? name.slice(0, maxLength - 3) + '..' : name;
    };

    const save = async (value: number | typeof NO_GROUP) => {
        const newGroupId = value === NO_GROUP ? null : Number(value);
        if (newGroupId === groupId) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            const res = await api.put('user-groups/set-user-group', {
                company_id: companyId,
                user_id: userId,
                group_id: newGroupId,
            });
            if (res.data?.IsSuccess) {
                toast.success(res.data.message);
                onUpdated(userId, res.data.info.group_id, res.data.info.group_name);
            }
        } catch (err) {
            console.error('Failed to update user group', err);
        }
        setIsSaving(false);
        setIsEditing(false);
    };

    if (isEditing && canEdit) {
        return (
            // Stop clicks (including on the portalled menu) from reaching clickable table rows.
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '32px' }}
            >
                <FormControl size="small" sx={{ minWidth: '120px', width: '100%', maxWidth: '140px' }}>
                    <Select
                        value={groupId ?? NO_GROUP}
                        displayEmpty
                        defaultOpen
                        onChange={(e) => save(e.target.value as number | typeof NO_GROUP)}
                        onClose={() => !isSaving && setIsEditing(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                setIsEditing(false);
                            }
                        }}
                        autoFocus
                        disabled={isSaving}
                        sx={{
                            height: '32px',
                            '& .MuiSelect-select': { fontSize: '0.875rem', py: '6px', px: '8px' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                        }}
                    >
                        <MenuItem value={NO_GROUP}>
                            <em>No group</em>
                        </MenuItem>
                        {groups.map((group) => (
                            <MenuItem key={group.id} value={group.id}>
                                {group.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        );
    }

    return (
        <Tooltip
            title={canEdit ? groupName || 'Click to select group' : groupName || ''}
            arrow
            placement="top"
        >
            <Box
                onClick={(e) => {
                    if (!canEdit) return;
                    e.stopPropagation();
                    setIsEditing(true);
                }}
                sx={{
                    py: 0.5,
                    fontSize: '0.875rem',
                    cursor: canEdit ? 'pointer' : 'default',
                    minHeight: '32px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    px: '8px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'clip',
                    maxWidth: '100%',
                    '&:hover': canEdit
                        ? {
                            borderColor: '#1976d2',
                            boxShadow: '0 0 0 1px #1976d2',
                        }
                        : {},
                }}
            >
                {getTruncatedName(groupName)}
            </Box>
        </Tooltip>
    );
};

export default EditableGroupCell;
