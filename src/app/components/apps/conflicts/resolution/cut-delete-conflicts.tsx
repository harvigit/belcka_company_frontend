import React, {useState, useMemo, useCallback} from 'react';
import {Box, Typography, Card, Button, Menu} from '@mui/material';
import {IconScissors, IconTrash, IconChevronDown, IconChevronUp} from '@tabler/icons-react';
import api from '@/utils/axios';
import {Conflict, ConflictItem, parseDT} from '../sections/timesheet-conflicts';
import {DateTime} from 'luxon';

interface CutDeleteCaseProps {
    conflict: Conflict;
    index: number;
    startDate: string;
    endDate: string;
    onClose: () => void;
}

interface PreviewRow {
    shift_name: string;
    start: string;
    end: string;
    total: string;
    worklog_id?: number;
    user_id?: number;
}

export const formatHM = (dt: DateTime): string => dt.toFormat('HH:mm');

export const calcDiffHM = (start: DateTime, end: DateTime): string => {
    const diff = end.diff(start, ['hours', 'minutes']);
    const h = Math.floor(diff.hours);
    const m = Math.floor(diff.minutes);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

const CutDeleteCase: React.FC<CutDeleteCaseProps> = ({
                                                         conflict,
                                                         onClose,
                                                     }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuType, setMenuType] = useState<'cut' | 'delete' | null>(null);
    const [cutPreviewOpen, setCutPreviewOpen] = useState(false);
    const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // ── Menu helpers ──────────────────────────────────────────────────────────
    const openMenu = useCallback((e: React.MouseEvent<HTMLElement>, type: 'cut' | 'delete') => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
        setMenuType(type);
    }, []);

    const closeMenu = useCallback(() => {
        setAnchorEl(null);
        setMenuType(null);
    }, []);

    // ── Derived: which worklog is longer ──────────────────────────────────────
    const longerWorklog = useMemo((): ConflictItem | null => {
        if (conflict.items.length !== 2) return null;
        const [a, b] = conflict.items.map((item) => ({
            item,
            start: parseDT(item.start),
            end: parseDT(item.end),
        }));
        if (!a.start.isValid || !a.end.isValid || !b.start.isValid || !b.end.isValid) return null;
        const durationA = a.end.diff(a.start, 'minutes').minutes;
        const durationB = b.end.diff(b.start, 'minutes').minutes;
        return durationA >= durationB ? a.item : b.item;
    }, [conflict.items]);

    // ── Cut preview rows ──────────────────────────────────────────────────────
    const cutPreview = useMemo((): PreviewRow[] | null => {
        if (!selectedItem || conflict.items.length !== 2) return null;

        const shorterItem = conflict.items.find(
            (item) => item.worklog_id !== selectedItem.worklog_id
        );
        if (!shorterItem) return null;

        const s1 = parseDT(selectedItem.start);
        const e1 = parseDT(selectedItem.end);
        const s2 = parseDT(shorterItem.start);
        const e2 = parseDT(shorterItem.end);

        if (!s1.isValid || !e1.isValid || !s2.isValid || !e2.isValid) return null;

        const rows: PreviewRow[] = [];

        if (s1 < s2) {
            rows.push({
                shift_name: selectedItem.shift_name,
                start: formatHM(s1),
                end: formatHM(s2),
                total: calcDiffHM(s1, s2),
                worklog_id: selectedItem.worklog_id,
                user_id: selectedItem.user_id,
            });
        }

        if (e2 < e1) {
            rows.push({
                shift_name: selectedItem.shift_name,
                start: formatHM(e2),
                end: formatHM(e1),
                total: calcDiffHM(e2, e1),
                worklog_id: selectedItem.worklog_id,
                user_id: selectedItem.user_id,
            });
        }

        rows.push({
            shift_name: shorterItem.shift_name,
            start: formatHM(s2),
            end: formatHM(e2),
            total: calcDiffHM(s2, e2),
            worklog_id: shorterItem.worklog_id,
            user_id: shorterItem.user_id,
        });

        // Sort chronologically
        rows.sort((a, b) => {
            const ta = parseDT(a.start);
            const tb = parseDT(b.start);
            if (!ta.isValid || !tb.isValid) return 0;
            return ta < tb ? -1 : 1;
        });

        return rows;
    }, [selectedItem, conflict.items]);

    // ── Delete preview row ────────────────────────────────────────────────────
    const deletePreview = useMemo((): PreviewRow[] | null => {
        if (!selectedItem) return null;
        const s = parseDT(selectedItem.start);
        const e = parseDT(selectedItem.end);
        if (!s.isValid || !e.isValid) return null;
        return [{shift_name: selectedItem.shift_name, start: formatHM(s), end: formatHM(e), total: calcDiffHM(s, e)}];
    }, [selectedItem]);

    // ── Handlers: open previews ───────────────────────────────────────────────
    const handleOpenCutPreview = useCallback((worklogId: number) => {
        const item = conflict.items.find((i) => i.worklog_id === worklogId);
        if (!item) return;
        setSelectedItem(item);
        setCutPreviewOpen(true);
        closeMenu();
    }, [conflict.items, closeMenu]);

    const handleOpenDeletePreview = useCallback((worklogId: number) => {
        const item = conflict.items.find((i) => i.worklog_id === worklogId);
        if (!item) return;
        setSelectedItem(item);
        setDeletePreviewOpen(true);
        closeMenu();
    }, [conflict.items, closeMenu]);

    // ── Confirm cut ───────────────────────────────────────────────────────────
    const handleConfirmCut = useCallback(async () => {
        if (!cutPreview || !selectedItem?.worklog_id || isLoading) return;
        setIsLoading(true);
        try {
            const cutData = cutPreview
                .filter((r) => r.worklog_id)
                .map((r) => ({
                    user_id: r.user_id,
                    worklog_id: r.worklog_id,
                    start_time: r.start,
                    end_time: r.end,
                    total_time: r.total,
                }));
            await api.post('/time-clock/cut-worklog', {cut_data: cutData});
            setCutPreviewOpen(false);
            setSelectedItem(null);
            onClose(); // ← notify parent: conflict resolved
        } catch (error) {
            console.error('Error cutting worklog:', error);
            setCutPreviewOpen(false);
            setSelectedItem(null);
        } finally {
            setIsLoading(false);
        }
    }, [cutPreview, selectedItem, isLoading, onClose]);

    // ── Confirm delete ────────────────────────────────────────────────────────
    const handleConfirmDelete = useCallback(async () => {
        if (!selectedItem?.worklog_id || isLoading) return;
        setIsLoading(true);
        try {
            await api.post('/time-clock/delete-worklog', {worklog_id: selectedItem.worklog_id});
            setDeletePreviewOpen(false);
            setSelectedItem(null);
            onClose(); // ← notify parent: conflict resolved
        } catch (error) {
            console.error('Error deleting worklog:', error);
            setDeletePreviewOpen(false);
            setSelectedItem(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedItem, isLoading, onClose]);

    // ── Cancel helpers ────────────────────────────────────────────────────────
    const handleCancelCut = useCallback(() => {
        setCutPreviewOpen(false);
        setSelectedItem(null);
    }, []);

    const handleCancelDelete = useCallback(() => {
        setDeletePreviewOpen(false);
        setSelectedItem(null);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Action buttons */}
            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<IconScissors size={16}/>}
                    endIcon={anchorEl && menuType === 'cut' ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                    onClick={(e) => openMenu(e, 'cut')}
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        px: 2,
                        py: 0.5
                    }}
                >
                    Cut start/end
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<IconTrash size={16}/>}
                    endIcon={anchorEl && menuType === 'delete' ? <IconChevronUp size={16}/> :
                        <IconChevronDown size={16}/>}
                    onClick={(e) => openMenu(e, 'delete')}
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

            {/* Cut menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && menuType === 'cut'}
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
                <Box sx={{p: 2}}>
                    <Typography variant="body2" sx={{fontSize: '0.875rem', mb: 2, color: '#333', fontWeight: 500}}>
                        Cut the overlapping hours from the longer worklog:
                    </Typography>
                    {longerWorklog ? (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 1.5, borderRadius: '6px', border: '1px solid #D8E3F2', backgroundColor: '#D8E3F2',
                        }}>
                            <Box sx={{display: 'flex', alignItems: 'center', flex: 1, gap: 1}}>
                                <Typography variant="body2" sx={{fontSize: '0.8rem', color: '#666'}}>Cut
                                    from</Typography>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#333',
                                    textTransform: 'capitalize'
                                }}>
                                    {longerWorklog.shift_name}
                                </Typography>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.75rem',
                                    color: '#666',
                                    bgcolor: '#fff',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0'
                                }}>
                                    {longerWorklog.start} – {longerWorklog.end}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => longerWorklog.worklog_id && handleOpenCutPreview(longerWorklog.worklog_id)}
                                disabled={!longerWorklog.worklog_id}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    px: 2,
                                    py: 0.5,
                                    minWidth: 60,
                                    ml: 2
                                }}
                            >
                                Cut
                            </Button>
                        </Box>
                    ) : (
                        <Typography variant="body2" sx={{color: '#666', fontStyle: 'italic'}}>
                            No valid worklog found for cutting.
                        </Typography>
                    )}
                </Box>
            </Menu>

            {/* Delete menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && menuType === 'delete' && !deletePreviewOpen}
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
                        Select which shift to delete:
                    </Typography>
                    {conflict.items.map((item, i) => (
                        <Box
                            key={i}
                            sx={{
                                py: 1.5, px: 1, borderRadius: '6px', mx: 0.5, mb: 0.5,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                '&:hover': {backgroundColor: '#f5f5f5'},
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
                                    onClick={() => handleOpenDeletePreview(item.worklog_id!)}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        px: 2,
                                        py: 0.5,
                                        minWidth: 70
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                        </Box>
                    ))}
                </Box>
            </Menu>

            {/* Cut preview card */}
            {cutPreviewOpen && cutPreview && (
                <Card sx={{
                    mt: 2,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    p: 2,
                    border: '1px solid #e0e0e0'
                }}>
                    <Typography variant="subtitle1" sx={{mb: 1.5, fontSize: '0.95rem', fontWeight: 700}}>
                        {conflict.formatted_date} • Cut Preview
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
                        <Box>Shift</Box><Box>Start</Box><Box>End</Box><Box>Total</Box>
                    </Box>
                    {cutPreview.map((r, idx) => (
                        <Box key={idx} sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                            alignItems: 'center',
                            px: 1,
                            py: 0.75,
                            borderRadius: '6px',
                            mb: 1,
                            backgroundColor: '#D8E3F2',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            border: '1px solid #e0e0e0'
                        }}>
                            <Box>{r.shift_name}</Box><Box>{r.start}</Box><Box>{r.end}</Box><Box>{r.total}</Box>
                        </Box>
                    ))}
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1}}>
                        <Button size="small" variant="outlined" color="error" onClick={handleCancelCut}
                                sx={{textTransform: 'none', fontSize: '0.85rem'}}>
                            Cancel
                        </Button>
                        <Button size="small" variant="contained" color="primary" onClick={handleConfirmCut}
                                disabled={isLoading} sx={{textTransform: 'none', fontSize: '0.85rem', px: 2.5}}>
                            {isLoading ? 'Processing…' : 'Confirm cut'}
                        </Button>
                    </Box>
                </Card>
            )}

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
                    {deletePreview.map((r, idx) => (
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
                            <Box>{r.shift_name}</Box><Box>{r.start}</Box><Box>{r.end}</Box><Box>{r.total}</Box>
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

export default CutDeleteCase;
