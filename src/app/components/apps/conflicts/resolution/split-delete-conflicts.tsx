import React, {useState, useMemo, useCallback} from 'react';
import {Box, Typography, Card, Button, Menu} from '@mui/material';
import {IconArrowsSplit, IconTrash, IconChevronDown, IconChevronUp} from '@tabler/icons-react';
import api from '@/utils/axios';
import {Conflict, ConflictItem, parseDT} from '../sections/timesheet-conflicts';
import {DateTime} from 'luxon';

interface SplitDeleteCaseProps {
    conflict: Conflict;
    index: number;
    startDate: string;
    endDate: string;
    onClose: () => void; // called after successful API action → triggers parent refresh
}

interface SplitRow {
    user_id: number;
    worklog_id: number;
    shift_name: string;
    shift_id: number;
    date: string;
    formatted_date: string;
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

export const formatHM = (dt: DateTime): string => dt.toFormat('HH:mm');

export const calcDiffHM = (start: DateTime, end: DateTime): string => {
    const diff = end.diff(start, ['hours', 'minutes']);
    const h = Math.floor(diff.hours);
    const m = Math.floor(diff.minutes);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

const SplitDeleteCase: React.FC<SplitDeleteCaseProps> = ({conflict, onClose}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [splitPreviewOpen, setSplitPreviewOpen] = useState(false);
    const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // ── Menu helpers ──────────────────────────────────────────────────────────
    const openDeleteMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    }, []);

    const closeMenu = useCallback(() => {
        setAnchorEl(null);
    }, []);

    // ── Derived: outer/inner items ────────────────────────────────────────────
    const splitData = useMemo(() => {
        if (conflict.items.length !== 2) return null;
        const [item1, item2] = conflict.items;

        const s1 = parseDT(item1.start);
        const e1 = parseDT(item1.end);
        const s2 = parseDT(item2.start);
        const e2 = parseDT(item2.end);

        if (!s1.isValid || !e1.isValid || !s2.isValid || !e2.isValid) return null;

        if (s1 <= s2 && e1 >= e2) return {outerItem: item1, innerItem: item2};
        if (s2 <= s1 && e2 >= e1) return {outerItem: item2, innerItem: item1};

        return null; // partial overlap — not a split-delete case
    }, [conflict.items]);

    // ── Split preview rows ────────────────────────────────────────────────────
    const splitPreview = useMemo((): SplitRow[] | null => {
        if (!splitData) return null;
        const {outerItem, innerItem} = splitData;

        const outerUserId = Number(outerItem.user_id) || 0;
        const innerUserId = Number(innerItem.user_id) || 0;
        const outerWorklogId = Number(outerItem.worklog_id) || 0;
        const innerWorklogId = Number(innerItem.worklog_id) || 0;

        if (!outerUserId || !innerUserId) return null;

        const os = parseDT(outerItem.start);
        const oe = parseDT(outerItem.end);
        const is = parseDT(innerItem.start);
        const ie = parseDT(innerItem.end);

        if (!os.isValid || !oe.isValid || !is.isValid || !ie.isValid) return null;

        const rows: SplitRow[] = [];

        // Segment before inner starts
        if (os < is) {
            rows.push({
                user_id: outerUserId,
                worklog_id: outerWorklogId,
                shift_name: outerItem.shift_name,
                shift_id: Number(outerItem.shift_id) || 0,
                date: outerItem.date,
                formatted_date: conflict.formatted_date,
                start: formatHM(os),
                end: formatHM(is),
                total: calcDiffHM(os, is),
            });
        }

        // Inner item (kept as-is)
        rows.push({
            user_id: innerUserId,
            worklog_id: innerWorklogId,
            shift_name: innerItem.shift_name,
            shift_id: Number(innerItem.shift_id) || 0,
            date: innerItem.date,
            formatted_date: conflict.formatted_date,
            start: formatHM(is),
            end: formatHM(ie),
            total: calcDiffHM(is, ie),
        });

        // Segment after inner ends
        if (ie < oe) {
            rows.push({
                user_id: outerUserId,
                worklog_id: 0, // new segment — no existing worklog_id
                shift_name: outerItem.shift_name,
                shift_id: Number(outerItem.shift_id) || 0,
                date: outerItem.date,
                formatted_date: conflict.formatted_date,
                start: formatHM(ie),
                end: formatHM(oe),
                total: calcDiffHM(ie, oe),
            });
        }

        return rows;
    }, [splitData, conflict.formatted_date]);

    // ── Delete preview row ────────────────────────────────────────────────────
    const deletePreview = useMemo((): DeletePreviewRow[] | null => {
        if (!selectedItem) return null;
        const s = parseDT(selectedItem.start);
        const e = parseDT(selectedItem.end);
        if (!s.isValid || !e.isValid) return null;
        return [{type: selectedItem.shift_name, start: formatHM(s), end: formatHM(e), total: calcDiffHM(s, e)}];
    }, [selectedItem]);

    // ── Confirm split ─────────────────────────────────────────────────────────
    const handleConfirmSplit = useCallback(async () => {
        if (!splitPreview || isLoading) return;
        setIsLoading(true);
        try {
            const res = await api.post('/time-clock/split-worklog', {split_data: splitPreview});
            if (!res.data.IsSuccess) {
                console.error('Split failed:', res.data.message);
            }
            setSplitPreviewOpen(false);
            setSelectedItem(null);
            onClose(); // ← notify parent: conflict resolved
        } catch (error) {
            console.error('Error splitting worklog:', error);
            setSplitPreviewOpen(false);
            setSelectedItem(null);
        } finally {
            setIsLoading(false);
        }
    }, [splitPreview, isLoading, onClose]);

    const handleCancelSplit = useCallback(() => {
        setSplitPreviewOpen(false);
        setSelectedItem(null);
    }, []);

    // ── Open delete preview ───────────────────────────────────────────────────
    const handleOpenDeletePreview = useCallback((worklogId: number) => {
        const item = conflict.items.find((i) => i.worklog_id === worklogId);
        if (!item) return;
        setSelectedItem(item);
        setDeletePreviewOpen(true);
        closeMenu();
    }, [conflict.items, closeMenu]);

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
                    startIcon={<IconArrowsSplit size={16}/>}
                    disabled={!splitData}
                    onClick={() => {
                        if (splitData) {
                            setSelectedItem(splitData.outerItem);
                            setSplitPreviewOpen(true);
                        }
                    }}
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        px: 2,
                        py: 0.5
                    }}
                >
                    Split Containing
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<IconTrash size={16}/>}
                    endIcon={anchorEl ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                    onClick={openDeleteMenu}
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

            {/* Delete menu */}
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
                        Select which shift to delete:
                    </Typography>
                    {conflict.items.map((item, i) => (
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

            {/* Split preview card */}
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
                                <Box>Shift</Box><Box>Start</Box><Box>End</Box><Box>Total</Box>
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
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    textTransform: 'capitalize'
                                }}>
                                    <Box>{r.shift_name}</Box><Box>{r.start}</Box><Box>{r.end}</Box><Box>{r.total}</Box>
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
                            disabled={!splitPreview || splitPreview.length === 0 || isLoading}
                            sx={{textTransform: 'none', fontSize: '0.85rem', px: 2.5}}
                        >
                            {isLoading ? 'Processing…' : 'Confirm split'}
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
                            <Box>{r.type}</Box><Box>{r.start}</Box><Box>{r.end}</Box><Box>{r.total}</Box>
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

export default SplitDeleteCase;
