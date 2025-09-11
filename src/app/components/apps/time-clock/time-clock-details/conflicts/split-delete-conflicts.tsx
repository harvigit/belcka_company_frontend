import React, {useState, useMemo, useCallback} from 'react';
import {
    Box,
    Typography,
    Card,
    Button,
    Menu,
} from '@mui/material';
import {
    IconArrowsSplit,
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

interface SplitDeleteCaseProps {
    conflict: Conflict;
    index: number;
    fetchTimeClockData: (start: string, end: string) => Promise<void>;
    startDate: string;
    endDate: string;
}

interface SplitPreviewRow {
    user_id: number;
    worklog_id: number;
    shift_name: string;
    shift_id: number;
    formatted_date: string;
    date: string;
    start: string;
    end: string;
    total: string;
}

interface DeletePreviewRow {
    type: string;
    start: string;
    end: string;
    total: string;
}

const useMenuState = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuType, setMenuType] = useState<'delete' | null>(null);
    const [splitPreviewOpen, setSplitPreviewOpen] = useState(false);
    const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);

    const handleMenuClose = useCallback(() => {
        setAnchorEl(null);
        setMenuType(null);
        // Comment out these lines to test if they're the issue:
        // setSplitPreviewOpen(false);
        // setDeletePreviewOpen(false);
    }, []);

    const handleDeleteMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
        setMenuType('delete');
    }, []);

    const handleOpenDeletePreview = useCallback(() => {
        setAnchorEl(null);
        setMenuType(null);
        setDeletePreviewOpen(true);
    }, []);

    return {
        anchorEl,
        menuType,
        splitPreviewOpen,
        deletePreviewOpen,
        setSplitPreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleDeleteMenuOpen,
        handleOpenDeletePreview,
    };
};

const SplitDeleteCase: React.FC<SplitDeleteCaseProps> = ({
                                                            conflict,
                                                            index,
                                                            fetchTimeClockData,
                                                            startDate,  
                                                            endDate
                                                         }) => {
    const {
        anchorEl,
        menuType,
        splitPreviewOpen,
        deletePreviewOpen,
        setSplitPreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleDeleteMenuOpen,
        handleOpenDeletePreview,
    } = useMenuState();

    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);

    const splitData = useMemo(() => {

        const [item1, item2] = conflict.items;

        if (!item1.start || !item1.end || !item2.start || !item2.end) {
            return null;
        }

        const times = {
            start1: parseDT(item1.start),
            end1: parseDT(item1.end),
            start2: parseDT(item2.start),
            end2: parseDT(item2.end),
        };
        

        if (!Object.values(times).every(dt => dt.isValid)) {
            return null;
        }

        const {start1, end1, start2, end2} = times;
        

        // Check for complete containment first
        if (start1 <= start2 && end1 >= end2) {
            return {formatted_date: conflict.formatted_date, outerItem: item1, innerItem: item2};
        } else if (start2 <= start1 && end2 >= end1) {
            return {formatted_date: conflict.formatted_date, outerItem: item2, innerItem: item1};
        }

        // Check for any overlap (for debugging - you can decide how to handle partial overlaps)
        const hasOverlap = (start1 < end2 && start2 < end1);

        if (hasOverlap) {
            // For now, return null, but you could implement partial overlap handling
        }
        
        return null;
    }, [conflict.items, conflict.formatted_date]);

    const splitPreview = useMemo(() => {

        if (!splitData) {
            return null;
        }

        const {formatted_date, outerItem, innerItem} = splitData;

        const outerWorklogId = outerItem.worklog_id ? Number(outerItem.worklog_id) : 0;
        const innerWorklogId = innerItem.worklog_id ? Number(innerItem.worklog_id) : 0;
        const outerUserId = outerItem.user_id ? Number(outerItem.user_id) : 0;
        const innerUserId = innerItem.user_id ? Number(innerItem.user_id) : 0;
        

        if (!outerUserId || !innerUserId) {
            return null;
        }

        const times = {
            outerStart: parseDT(outerItem.start),
            outerEnd: parseDT(outerItem.end),
            innerStart: parseDT(innerItem.start),
            innerEnd: parseDT(innerItem.end),
        };
        

        if (!Object.values(times).every(dt => dt.isValid)) {
            return null;
        }

        const rows = [];

        // Build the rows...
        if (times.outerStart < times.innerStart) {
            rows.push({
                user_id: outerUserId,
                worklog_id: outerWorklogId,
                shift_name: outerItem.shift_name,
                shift_id: Number(outerItem.shift_id) || 0,
                formatted_date,
                date: outerItem.date,
                start: formatHM(times.outerStart),
                end: formatHM(times.innerStart),
                total: calcDiffHM(times.outerStart, times.innerStart),
            });
        }
        
        rows.push({
            user_id: innerUserId,
            worklog_id: innerWorklogId,
            shift_name: innerItem.shift_name,
            shift_id: Number(innerItem.shift_id) || 0,
            date: innerItem.date,
            formatted_date,
            start: formatHM(times.innerStart),
            end: formatHM(times.innerEnd),
            total: calcDiffHM(times.innerStart, times.innerEnd),
        });

        if (times.innerEnd < times.outerEnd) {
            rows.push({
                user_id: outerUserId,
                worklog_id: 0,
                shift_name: outerItem.shift_name,
                shift_id: Number(outerItem.shift_id) || 0,
                date: outerItem.date,
                formatted_date,
                start: formatHM(times.innerEnd),
                end: formatHM(times.outerEnd),
                total: calcDiffHM(times.innerEnd, times.outerEnd),
            });
        }
        
        return rows;
    }, [splitData]);

    const deletePreview = useMemo(() => {
        if (!selectedItem) return null;
        return [{
            type: selectedItem.shift_name,
            start: formatHM(parseDT(selectedItem.start)),
            end: formatHM(parseDT(selectedItem.end)),
            total: calcDiffHM(parseDT(selectedItem.start), parseDT(selectedItem.end)),
        }];
    }, [selectedItem]);

    const handleSplitClick = useCallback(() => {

        if (!splitData || !splitData.outerItem) {
            return;
        }
        
        
        setSelectedItem(splitData.outerItem);
        setSplitPreviewOpen(true);
        handleMenuClose();

        // Add a setTimeout to check state after React updates
        setTimeout(() => {
        }, 0);
    }, [splitData, handleMenuClose, splitPreviewOpen, selectedItem]);

    const handleDeletePreview = useCallback((worklogId: number) => {
        const itemToDelete = conflict.items.find(item => item.worklog_id === worklogId);
        if (itemToDelete) {
            setSelectedItem(itemToDelete);
            handleOpenDeletePreview();
        }
    }, [conflict.items, handleOpenDeletePreview]);

    const handleConfirmSplit = useCallback(async () => {
        if (!splitPreview || !selectedItem?.worklog_id) {
            handleMenuClose();
            return;
        }
        try {
            const response = await api.post('/time-clock/split-worklog', {
                split_data: splitPreview,
            });
            
            await fetchTimeClockData(startDate, endDate);
            
            if (!response.data.IsSuccess) {
                console.error('Failed to split worklog:', response.data.message);
            }
            
            handleMenuClose();
        } catch (error) {
            console.error('Error saving split action:', error);
            handleMenuClose();
        }
    }, [splitPreview, selectedItem, fetchTimeClockData, handleMenuClose]);

    const handleCancelSplit = useCallback(() => {
        setSplitPreviewOpen(false);
        setSelectedItem(null);
        handleMenuClose();
    }, [handleMenuClose]);

    const handleConfirmDelete = useCallback(async () => {
        if (!selectedItem?.worklog_id) {
            handleMenuClose();
            return;
        }
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
            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                <Button
                    size="small"
                    startIcon={<IconArrowsSplit size={16} />}
                    onClick={handleSplitClick}
                    variant="outlined"
                    color="primary"
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        px: 2,
                        py: 0.5,
                    }}
                >
                    Split Containing
                </Button>
                <Button
                    size="small"
                    startIcon={<IconTrash size={16}/>}
                    endIcon={anchorEl && menuType === 'delete' ? <IconChevronUp size={16}/> :
                        <IconChevronDown size={16}/>}
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
                open={Boolean(anchorEl) && menuType === 'delete' && !deletePreviewOpen}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        minWidth: '320px',
                        maxWidth: '400px',
                    },
                }}
                transformOrigin={{horizontal: 'left', vertical: 'top'}}
                anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
            >
                <Box sx={{p: 1}}>
                    <Typography variant="body2" sx={{
                        fontSize: '0.875rem',
                        mb: 1,
                        px: 1,
                        color: '#333',
                        fontWeight: 500,
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
                                '&:hover': {backgroundColor: '#D8E3F2'},
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Box sx={{flex: 1}}>
                                <Typography
                                    sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5, textTransform: 'capitalize'}}>
                                    {item.shift_name}
                                </Typography>
                                <Typography sx={{fontSize: '0.7rem', color: '#666'}}>
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
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        px: 2,
                                        py: 0.5,
                                        minWidth: '70px',
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                        </Box>
                    ))}
                </Box>
            </Menu>
            {splitPreviewOpen && (
                <Card sx={{
                    mt: 2,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    p: 2,
                    border: '1px solid #e0e0e0'
                }}>
                    <Typography variant="subtitle1" sx={{mb: 1.5, fontSize: '0.95rem', fontWeight: 700}}>
                        {conflict.formatted_date} • Split Preview
                    </Typography>
                    {splitPreview && splitPreview.length > 0 ? (
                        <>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                                px: 1,
                                mb: 1,
                                color: '#666',
                                fontSize: '0.78rem',
                                fontWeight: 600
                            }}>
                                <Box>Shift</Box>
                                <Box>Start</Box>
                                <Box>End</Box>
                                <Box>Total</Box>
                            </Box>
                            {splitPreview.map((r, idx) => (
                                <Box key={idx} sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                                    alignItems: 'center',
                                    px: 1,
                                    py: 0.75,
                                    borderRadius: '6px',
                                    mb: 1,
                                    backgroundColor: '#D8E3F2',
                                    color: '#000',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    textTransform: 'capitalize'
                                }}>
                                    <Box>{r.shift_name}</Box>
                                    <Box>{r.start}</Box>
                                    <Box>{r.end}</Box>
                                    <Box>{r.total}</Box>
                                </Box>
                            ))}
                        </>
                    ) : (
                        <Typography variant="body2" sx={{color: '#666', fontStyle: 'italic', p: 1}}>
                            No valid split preview available. Please check the shift data.
                        </Typography>
                    )}
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1}}>
                        <Button size="small" onClick={handleCancelSplit}
                                sx={{textTransform: 'none', fontSize: '0.85rem', color: '#666'}}>
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleConfirmSplit}
                            disabled={!splitPreview || splitPreview.length === 0}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.85rem',
                                backgroundColor: '#666',
                                color: '#fff',
                                borderRadius: '18px',
                                px: 2.5,
                                '&:hover': {backgroundColor: '#333'}
                            }}
                        >
                            Confirm split
                        </Button>
                    </Box>
                </Card>
            )}
            {deletePreviewOpen && (
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
                                border: '1px solid #ffcdd2',
                            }}
                        >
                            <Box>{r.type}</Box>
                            <Box>{r.start}</Box>
                            <Box>{r.end}</Box>
                            <Box>{r.total}</Box>
                        </Box>
                    ))}
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1}}>
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

export default SplitDeleteCase;
