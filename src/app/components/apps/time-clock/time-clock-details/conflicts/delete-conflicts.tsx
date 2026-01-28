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
    startDate: string;
    endDate: string;
    onClose: () => void;
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

const DeleteOnlyCase: React.FC<DeleteOnlyCaseProps> = ({conflict, index, onClose, startDate, endDate}) => {
    const {
        anchorEl,
        deletePreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleDeleteMenuOpen,
        handleOpenDeletePreview,
    } = useMenuState();

    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const deletePreview = useMemo<DeletePreviewRow[] | null>(() => {
        if (!selectedItem) return null;

        const label = selectedItem.is_leave ? selectedItem.leave_name || 'Leave' : selectedItem.shift_name;

        return [{
            type: label,
            start: formatHM(parseDT(selectedItem.start)),
            end: formatHM(parseDT(selectedItem.end)),
            total: calcDiffHM(parseDT(selectedItem.start), parseDT(selectedItem.end))
        }];
    }, [selectedItem]);


    const handleDeletePreview = useCallback((item: ConflictItem) => {
        setSelectedItem(item);
        handleOpenDeletePreview();
    }, [handleOpenDeletePreview]);

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

            handleMenuClose();
            onClose(); // Close the sidebar on success
        } catch (error) {
            console.error('Error deleting item:', error);
            handleMenuClose();
        } finally {
            setIsLoading(false);
        }
    }, [selectedItem, handleMenuClose, onClose, startDate, endDate, isLoading]);

    const handleCancelDelete = useCallback(() => {
        setDeletePreviewOpen(false);
        setSelectedItem(null);
        handleMenuClose();
    }, [handleMenuClose, setDeletePreviewOpen]);

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
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: '0.875rem',
                            mb: 1,
                            px: 1,
                            color: '#333',
                            fontWeight: 500
                        }}
                    >
                        Select which record to delete:
                    </Typography>

                    {conflict.items.map((item, i) => {
                        const label = item.is_leave ? item.leave_name || 'Leave' : item.shift_name;

                        return (
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
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, mb: 0.5 }}>
                                        {label}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>
                                        {item.start} → {item.end}
                                    </Typography>
                                </Box>

                                {(item.worklog_id || item.user_leave_id) && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={() => handleDeletePreview(item)}
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
                        );
                    })}
                </Box>
            </Menu>

            {deletePreviewOpen && (
                <Card
                    sx={{
                        mt: 2,
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        p: 2,
                        border: '1px solid #e0e0e0'
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{ mb: 1.5, fontSize: '0.95rem', fontWeight: 700 }}
                    >
                        {conflict.formatted_date} • Delete Preview
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                            px: 1,
                            mb: 1,
                            color: '#666',
                            fontSize: '0.78rem',
                            fontWeight: 600
                        }}
                    >
                        <Box>Type</Box>
                        <Box>Start</Box>
                        <Box>End</Box>
                        <Box>Total</Box>
                    </Box>

                    {deletePreview?.map((row, idx) => (
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
                            <Box>{row.type}</Box>
                            <Box>{row.start}</Box>
                            <Box>{row.end}</Box>
                            <Box>{row.total}</Box>
                        </Box>
                    ))}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                        <Button
                            size="small"
                            onClick={handleCancelDelete}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.85rem',
                                color: '#666'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={handleConfirmDelete}
                            disabled={isLoading}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                borderRadius: '6px',
                                px: 2,
                                py: 0.5,
                            }}
                        >
                            {isLoading ? 'Processing...' : 'Confirm delete'}
                        </Button>
                    </Box>
                </Card>
            )}
        </>
    );
};

export default DeleteOnlyCase;
