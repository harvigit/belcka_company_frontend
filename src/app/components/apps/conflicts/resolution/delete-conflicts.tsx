import React, {useState, useMemo, useCallback} from 'react';
import {Box, Typography, Card, Button, Menu} from '@mui/material';
import {IconTrash, IconChevronDown, IconChevronUp} from '@tabler/icons-react';
import api from '@/utils/axios';
import {Conflict, ConflictItem, parseDT} from '../sections/timesheet-conflicts';
import {DateTime} from 'luxon';

export const formatHM = (dt: DateTime): string => dt.toFormat('HH:mm');

export const calcDiffHM = (start: DateTime, end: DateTime): string => {
    const diff = end.diff(start, ['hours', 'minutes']);
    const h = Math.floor(diff.hours);
    const m = Math.floor(diff.minutes);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

interface DeleteOnlyCaseProps {
    conflict: Conflict;
    index: number;
    startDate: string;
    endDate: string;
    onClose: () => void;
}

interface PreviewRow {
    type: string;
    start: string;
    end: string;
    total: string;
}

const DeleteOnlyCase: React.FC<DeleteOnlyCaseProps> = ({conflict, onClose}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const openMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    }, []);

    const closeMenu = useCallback(() => {
        setAnchorEl(null);
    }, []);

    // Delete preview row
    const deletePreview = useMemo((): PreviewRow[] | null => {
        if (!selectedItem) return null;
        const label = selectedItem.is_leave
            ? (selectedItem.leave_name || 'Leave')
            : selectedItem.shift_name;
        const s = parseDT(selectedItem.start);
        const e = parseDT(selectedItem.end);
        if (!s.isValid || !e.isValid) return null;
        return [{type: label, start: formatHM(s), end: formatHM(e), total: calcDiffHM(s, e)}];
    }, [selectedItem]);

    const handleOpenDeletePreview = useCallback((item: ConflictItem) => {
        setSelectedItem(item);
        setDeletePreviewOpen(true);
        closeMenu();
    }, [closeMenu]);

    // Confirm delete 
    const handleConfirmDelete = useCallback(async () => {
        if (!selectedItem || isLoading) return;
        setIsLoading(true);
        try {
            if (selectedItem.is_leave && selectedItem.user_leave_id) {
                await api.post('/user-leaves/delete-leave', {
                    user_leave_id: selectedItem.user_leave_id,
                });
            } else if (selectedItem.worklog_id) {
                await api.post('/time-clock/delete-worklog', {
                    worklog_id: selectedItem.worklog_id,
                });
            }
            setDeletePreviewOpen(false);
            setSelectedItem(null);
            onClose(); // ← notify parent: conflict resolved
        } catch (error) {
            console.error('Error deleting item:', error);
            setDeletePreviewOpen(false);
            setSelectedItem(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedItem, isLoading, onClose]);

    const handleCancelDelete = useCallback(() => {
        setDeletePreviewOpen(false);
        setSelectedItem(null);
    }, []);

    // Render 
    return (
        <>
            {/* Delete button */}
            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<IconTrash size={16}/>}
                    endIcon={anchorEl ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                    onClick={openMenu}
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        px: 2,
                        py: 0.5
                    }}
                >
                    Delete
                </Button>
            </Box>

            {/* Select which record to delete */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && !deletePreviewOpen}
                onClose={closeMenu}
                PaperProps={{
                    sx: {
                        mt: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        minWidth: 320,
                        maxWidth: 400
                    }
                }}
                transformOrigin={{horizontal: 'left', vertical: 'top'}}
                anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
            >
                <Box sx={{p: 1}}>
                    <Typography variant="body2"
                                sx={{fontSize: '0.875rem', mb: 1, px: 1, color: '#333', fontWeight: 500}}>
                        Select which record to delete:
                    </Typography>
                    {conflict.items.map((item: ConflictItem, i: React.Key | null | undefined) => {
                        const label = item.is_leave ? (item.leave_name || 'Leave') : item.shift_name;
                        const canDelete = Boolean(item.worklog_id || item.user_leave_id);
                        return (
                            <Box
                                key={i}
                                sx={{
                                    py: 1.5, px: 1, borderRadius: '6px', mx: 0.5, mb: 0.5,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    '&:hover': {backgroundColor: '#D8E3F2'},
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Box sx={{flex: 1}}>
                                    <Typography sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5}}>
                                        {label}
                                    </Typography>
                                    <Typography sx={{fontSize: '0.7rem', color: '#666'}}>
                                        {item.start} → {item.end}
                                    </Typography>
                                </Box>
                                {canDelete && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={() => handleOpenDeletePreview(item)}
                                        sx={{
                                            textTransform: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            borderRadius: '6px',
                                            px: 2,
                                            py: 0.5
                                        }}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Menu>

            {/* Delete preview card */}
            {deletePreviewOpen && deletePreview && (
                <Card sx={{
                    mt: 2,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    p: 2,
                    border: '1px solid #e0e0e0'
                }}>
                    <Typography variant="subtitle1" sx={{mb: 1.5, fontSize: '0.95rem', fontWeight: 700}}>
                        {conflict.formatted_date} • Delete Preview
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                        px: 1,
                        mb: 1,
                        color: '#666',
                        fontSize: '0.78rem',
                        fontWeight: 600
                    }}>
                        <Box>Type</Box><Box>Start</Box><Box>End</Box><Box>Total</Box>
                    </Box>
                    {deletePreview.map((row, idx) => (
                        <Box key={idx} sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                            alignItems: 'center',
                            px: 1,
                            py: 0.75,
                            borderRadius: '6px',
                            mb: 1,
                            backgroundColor: '#ffebee',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            border: '1px solid #ffcdd2'
                        }}>
                            <Box>{row.type}</Box><Box>{row.start}</Box><Box>{row.end}</Box><Box>{row.total}</Box>
                        </Box>
                    ))}
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1}}>
                        <Button size="small" onClick={handleCancelDelete}
                                sx={{textTransform: 'none', fontSize: '0.85rem', color: '#666'}}>
                            Cancel
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={handleConfirmDelete}
                                disabled={isLoading} sx={{
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            px: 2,
                            py: 0.5
                        }}>
                            {isLoading ? 'Processing…' : 'Confirm delete'}
                        </Button>
                    </Box>
                </Card>
            )}
        </>
    );
};

export default DeleteOnlyCase;
