import React, { useState, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Card,
    Button,
    Menu,
} from '@mui/material';
import {
    IconTrash,
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import {
    Conflict,
    ConflictItem,
    parseDT,
    formatHM,
    calcDiffHM,
} from './conflicts';

interface DeleteOnlyCaseProps {
    conflict: Conflict;
    index: number;
    fetchTimeClockData: (start: string, end: string) => Promise<void>;
    startDate: string;
    endDate: string;
}

interface DeletePreviewRow {
    type: string;
    start: string;
    end: string;
    total: string;
}

const useMenuState = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);

    const handleMenuClose = useCallback(() => {
        setAnchorEl(null);
        setDeletePreviewOpen(false);
    }, []);

    const handleDeleteMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    }, []);

    const handleOpenDeletePreview = useCallback(() => {
        setAnchorEl(null);
        setDeletePreviewOpen(true);
    }, []);

    return {
        anchorEl,
        deletePreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleDeleteMenuOpen,
        handleOpenDeletePreview,
    };
};

const DeleteOnlyCase: React.FC<DeleteOnlyCaseProps> = ({
                                                           conflict,
                                                           index, 
                                                           fetchTimeClockData, 
                                                           startDate, 
                                                           endDate
                                                       }) => {
    const {
        anchorEl,
        deletePreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleDeleteMenuOpen,
        handleOpenDeletePreview,
    } = useMenuState();

    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);

    const deletePreview = useMemo(() => {
        if (!selectedItem) return null;
        return [{
            type: selectedItem.shift_name,
            start: formatHM(parseDT(selectedItem.start)),
            end: formatHM(parseDT(selectedItem.end)),
            total: calcDiffHM(parseDT(selectedItem.start), parseDT(selectedItem.end))
        }];
    }, [selectedItem]);

    const handleDeletePreview = useCallback((worklogId: number) => {
        const itemToDelete = conflict.items.find(item => item.worklog_id === worklogId);
        if (itemToDelete) {
            setSelectedItem(itemToDelete);
            handleOpenDeletePreview();
        }
    }, [conflict.items, handleOpenDeletePreview]);

    const handleConfirmDelete = useCallback(async () => {
        if (!selectedItem?.worklog_id) return;
        try {
            await api.post('/time-clock/delete-worklog', {
                worklog_id: selectedItem.worklog_id,
            });
            
            await fetchTimeClockData(startDate, endDate);
            
            handleMenuClose();
        } catch (error) {
            console.error('Error saving delete action:', error);
            handleMenuClose();
        }
    }, [selectedItem, fetchTimeClockData, handleMenuClose]);

    const handleCancelDelete = useCallback(() => {
        setDeletePreviewOpen(false);
        setSelectedItem(null);
        handleMenuClose();
    }, [handleMenuClose]);

    return (
        <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                    size="small"
                    startIcon={<IconTrash size={16} />}
                    endIcon={anchorEl ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    onClick={handleDeleteMenuOpen}
                    variant="outlined"
                    color="error"
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        px: 2,
                        py: 0.5,
                    }}
                >
                    Delete
                </Button>
            </Box>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && !deletePreviewOpen}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        minWidth: '320px',
                        maxWidth: '400px'
                    }
                }}
                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
                <Box sx={{ p: 1 }}>
                    <Typography variant="body2" sx={{
                        fontSize: '0.875rem',
                        mb: 1,
                        px: 1,
                        color: '#333',
                        fontWeight: 500
                    }}>
                        Select which shift to delete:
                    </Typography>
                    {conflict.items.map((item, i) => (
                        <Box
                            key={i}
                            sx={{
                                fontSize: '0.8rem',
                                py: 1.5,
                                px: 1,
                                borderRadius: '6px',
                                mx: 0.5,
                                mb: 0.5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                '&:hover': { backgroundColor: '#D8E3F2' }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, mb: 0.5, textTransform: 'capitalize' }}>
                                    {item.shift_name}
                                </Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>
                                    {item.start} → {item.end}
                                </Typography>
                            </Box>
                            {item.worklog_id && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleDeletePreview(item.worklog_id!)}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        px: 2,
                                        py: 0.5,
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                        </Box>
                    ))}
                </Box>
            </Menu>
            {deletePreviewOpen && (
                <Card sx={{
                    mt: 2,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    p: 2,
                    border: '1px solid #e0e0e0'
                }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, fontSize: '0.95rem', fontWeight: 700 }}>
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
                        <Box>Type</Box>
                        <Box>Start</Box>
                        <Box>End</Box>
                        <Box>Total</Box>
                    </Box>
                    {deletePreview?.map((r, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                                alignItems: 'center',
                                px: 1,
                                py: 0.75,
                                borderRadius: '6px',
                                mb: 1,
                                backgroundColor: '#ffebee',
                                color: '#000',
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                border: '1px solid #ffcdd2'
                            }}
                        >
                            <Box>{r.type}</Box>
                            <Box>{r.start}</Box>
                            <Box>{r.end}</Box>
                            <Box>{r.total}</Box>
                        </Box>
                    ))}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                        <Button
                            size="small"
                            onClick={handleCancelDelete}
                            sx={{ textTransform: 'none', fontSize: '0.85rem', color: '#666' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={handleConfirmDelete}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                borderRadius: '6px',
                                px: 2,
                                py: 0.5,
                            }}
                        >
                            Confirm delete
                        </Button>
                    </Box>
                </Card>
            )}
        </>
    );
};

export default DeleteOnlyCase;
