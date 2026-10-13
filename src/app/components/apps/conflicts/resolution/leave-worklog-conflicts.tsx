import React, {useState, useMemo, useCallback} from 'react';
import {Box, Typography, Card, Button, Menu, Tooltip} from '@mui/material';
import {
    IconArrowsSplit,
    IconScissors,
    IconTrash,
    IconChevronDown,
    IconChevronUp,
    IconCircleCheck,
} from '@tabler/icons-react';
import {DateTime} from 'luxon';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import {
    Conflict,
    ConflictItem,
    parseDT,
    formatHM,
    calcDiffHM,
    getItemLabel,
    canDeleteItem,
    deleteConflictItem,
} from '../sections/timesheet-conflicts';

// Leave vs worklog conflict: the leave is never edited — Split/Cut only change the worklog.

interface LeaveWorklogCaseProps {
    conflict: Conflict;
    onClose: () => void;
}

type ActionType = 'split' | 'cut';

interface PreviewRow {
    label: string;
    start: DateTime;
    end: DateTime;
    worklog_id: number; // 0 = new worklog segment
    is_leave: boolean;
}

interface Candidate {
    type: ActionType;
    worklog: ConflictItem;
    leave: ConflictItem;
    rows: PreviewRow[];
}

const getRange = (item: ConflictItem): {start: DateTime; end: DateTime} | null => {
    const start = parseDT(item.start);
    let end = parseDT(item.end);
    if (!start.isValid || !end.isValid) return null;
    if (end < start) end = end.plus({days: 1});
    return {start, end};
};

const buildCandidates = (items: ConflictItem[]): Candidate[] => {
    const leaves = items.filter((i) => i.is_leave);
    const worklogs = items.filter((i) => !i.is_leave && i.worklog_id);
    const candidates: Candidate[] = [];

    for (const worklog of worklogs) {
        const w = getRange(worklog);
        if (!w) continue;

        for (const leave of leaves) {
            const l = getRange(leave);
            if (!l || !(w.start < l.end && l.start < w.end)) continue;

            const leaveRow: PreviewRow = {label: getItemLabel(leave), start: l.start, end: l.end, worklog_id: 0, is_leave: true};
            const worklogRow = (start: DateTime, end: DateTime, worklogId: number): PreviewRow => ({
                label: worklog.shift_name, start, end, worklog_id: worklogId, is_leave: false,
            });

            if (w.start < l.start && w.end > l.end) {
                candidates.push({
                    type: 'split',
                    worklog,
                    leave,
                    rows: [
                        worklogRow(w.start, l.start, worklog.worklog_id!),
                        leaveRow,
                        worklogRow(l.end, w.end, 0),
                    ],
                });
            } else if (w.start < l.start || w.end > l.end) {
                const keep = w.start < l.start
                    ? worklogRow(w.start, l.start, worklog.worklog_id!)
                    : worklogRow(l.end, w.end, worklog.worklog_id!);
                candidates.push({
                    type: 'cut',
                    worklog,
                    leave,
                    rows: [keep, leaveRow].sort((a, b) => a.start.toMillis() - b.start.toMillis()),
                });
            }
        }
    }

    return candidates;
};

const btnSx = {
    textTransform: 'none',
    fontSize: '0.74rem',
    fontWeight: 500,
    borderRadius: '6px',
    px: 1,
    py: 0.5,
    whiteSpace: 'nowrap',
    minWidth: 0,
} as const;

const menuPaperSx = {
    mt: 1,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    minWidth: 320,
    maxWidth: 400,
};

const LeaveWorklogCase: React.FC<LeaveWorklogCaseProps> = ({conflict, onClose}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuType, setMenuType] = useState<ActionType | 'delete' | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [deleteItem, setDeleteItem] = useState<ConflictItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const candidates = useMemo(() => buildCandidates(conflict.items), [conflict.items]);
    const splitCandidates = useMemo(() => candidates.filter((c) => c.type === 'split'), [candidates]);
    const cutCandidates = useMemo(() => candidates.filter((c) => c.type === 'cut'), [candidates]);
    const worklogIds = useMemo(
        () => conflict.items.map((i) => Number(i.worklog_id)).filter((id) => id > 0),
        [conflict.items]
    );

    const closeMenu = useCallback(() => {
        setAnchorEl(null);
        setMenuType(null);
    }, []);

    const resetPreviews = useCallback(() => {
        setSelectedCandidate(null);
        setDeleteItem(null);
    }, []);

    const selectCandidate = useCallback((candidate: Candidate) => {
        setDeleteItem(null);
        setSelectedCandidate(candidate);
        closeMenu();
    }, [closeMenu]);

    // Single candidate → open preview directly, several → let the user pick from a menu
    const handleActionClick = useCallback((e: React.MouseEvent<HTMLElement>, type: ActionType) => {
        const list = type === 'split' ? splitCandidates : cutCandidates;
        if (list.length === 1) {
            selectCandidate(list[0]);
            return;
        }
        setAnchorEl(e.currentTarget);
        setMenuType(type);
    }, [splitCandidates, cutCandidates, selectCandidate]);

    const handleDeleteClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
        setMenuType('delete');
    }, []);

    const runAction = useCallback(async (action: () => Promise<any>, errorLabel: string) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await action();
            if (res?.data && res.data.IsSuccess === false) {
                toast.error(res.data.message || errorLabel);
                return;
            }
            resetPreviews();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || errorLabel);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, resetPreviews, onClose]);

    const handleConfirmCandidate = useCallback(() => {
        if (!selectedCandidate) return;
        const {worklog, rows, type} = selectedCandidate;
        const worklogRows = rows.filter((r) => !r.is_leave);

        if (type === 'cut') {
            const cutData = worklogRows.map((r) => ({
                user_id: worklog.user_id,
                worklog_id: r.worklog_id,
                shift_id: worklog.shift_id,
                start_time: formatHM(r.start),
                end_time: formatHM(r.end),
                total_time: calcDiffHM(r.start, r.end),
            }));
            runAction(() => api.post('/time-clock/cut-worklog', {cut_data: cutData}), 'Failed to cut worklog');
            return;
        }

        const splitData = worklogRows.map((r) => ({
            user_id: worklog.user_id,
            worklog_id: r.worklog_id,
            shift_name: worklog.shift_name,
            shift_id: Number(worklog.shift_id) || 0,
            date: worklog.date,
            formatted_date: conflict.formatted_date,
            start: formatHM(r.start),
            end: formatHM(r.end),
            total: calcDiffHM(r.start, r.end),
        }));
        runAction(() => api.post('/time-clock/split-worklog', {split_data: splitData}), 'Failed to split worklog');
    }, [selectedCandidate, conflict.formatted_date, runAction]);

    const handleConfirmDelete = useCallback(() => {
        if (!deleteItem) return;
        runAction(() => deleteConflictItem(deleteItem), 'Failed to delete');
    }, [deleteItem, runAction]);

    const handleResolve = useCallback(() => {
        if (worklogIds.length === 0) return;
        runAction(async () => {
            const res = await api.post('/time-clock/resolve-worklog-conflict', {worklog_ids: worklogIds});
            if (res.data?.IsSuccess) toast.success(res.data.message || 'Conflict resolved successfully');
            return res;
        }, 'Failed to resolve conflict');
    }, [worklogIds, runAction]);

    const renderActionButton = (type: ActionType, list: Candidate[], disabledHint: string) => {
        const isSplit = type === 'split';
        const button = (
            <Button
                size="small"
                variant="outlined"
                color="primary"
                disabled={list.length === 0 || isLoading}
                startIcon={isSplit ? <IconArrowsSplit size={15}/> : <IconScissors size={15}/>}
                endIcon={list.length > 1
                    ? (anchorEl && menuType === type ? <IconChevronUp size={15}/> : <IconChevronDown size={15}/>)
                    : undefined}
                onClick={(e) => handleActionClick(e, type)}
                sx={btnSx}
            >
                {isSplit ? 'Split' : 'Cut'}
            </Button>
        );

        if (list.length > 0) return button;

        return (
            <Tooltip title={disabledHint} arrow>
                <span>{button}</span>
            </Tooltip>
        );
    };

    const previewRows = selectedCandidate?.rows ?? null;

    return (
        <>
            <Box sx={{display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center'}}>
                {renderActionButton('split', splitCandidates, 'Split needs the worklog to start before and end after the leave')}
                {renderActionButton('cut', cutCandidates, 'No part of the worklog falls outside the leave')}
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={isLoading}
                    startIcon={<IconTrash size={15}/>}
                    endIcon={anchorEl && menuType === 'delete' ? <IconChevronUp size={15}/> : <IconChevronDown size={15}/>}
                    onClick={handleDeleteClick}
                    sx={btnSx}
                >
                    Delete
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={isLoading || worklogIds.length === 0}
                    startIcon={<IconCircleCheck size={15}/>}
                    onClick={handleResolve}
                    sx={btnSx}
                >
                    {isLoading ? 'Processing…' : 'Resolve'}
                </Button>
            </Box>

            {/* Split / Cut picker (only when more than one worklog–leave pair qualifies) */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && (menuType === 'split' || menuType === 'cut')}
                onClose={closeMenu}
                PaperProps={{sx: menuPaperSx}}
                transformOrigin={{horizontal: 'left', vertical: 'top'}}
                anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
            >
                <Box sx={{p: 1.5, display: 'flex', flexDirection: 'column', gap: 1}}>
                    <Typography sx={{fontSize: '0.875rem', color: '#333', fontWeight: 500}}>
                        {menuType === 'split' ? 'Split the worklog around the leave:' : 'Cut the leave hours from the worklog:'}
                    </Typography>
                    {(menuType === 'split' ? splitCandidates : cutCandidates).map((c) => (
                        <Box
                            key={`${c.worklog.worklog_id}-${c.leave.user_leave_id}`}
                            sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                p: 1.5, borderRadius: '6px', backgroundColor: '#D8E3F2',
                            }}
                        >
                            <Box>
                                <Typography sx={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize'}}>
                                    {c.worklog.shift_name} {c.worklog.start} – {c.worklog.end}
                                </Typography>
                                <Typography sx={{fontSize: '0.7rem', color: '#666'}}>
                                    {getItemLabel(c.leave)} {c.leave.start} – {c.leave.end}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => selectCandidate(c)}
                                sx={{textTransform: 'none', fontSize: '0.75rem', borderRadius: '6px', ml: 2}}
                            >
                                {menuType === 'split' ? 'Split' : 'Cut'}
                            </Button>
                        </Box>
                    ))}
                </Box>
            </Menu>

            {/* Delete picker */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && menuType === 'delete'}
                onClose={closeMenu}
                PaperProps={{sx: menuPaperSx}}
                transformOrigin={{horizontal: 'left', vertical: 'top'}}
                anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
            >
                <Box sx={{p: 1}}>
                    <Typography sx={{fontSize: '0.875rem', mb: 1, px: 1, color: '#333', fontWeight: 500}}>
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
                                <Typography sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5, textTransform: 'capitalize'}}>
                                    {getItemLabel(item)}
                                </Typography>
                                <Typography sx={{fontSize: '0.7rem', color: '#666'}}>
                                    {item.start} → {item.end}
                                </Typography>
                            </Box>
                            {canDeleteItem(item) && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => {
                                        setSelectedCandidate(null);
                                        setDeleteItem(item);
                                        closeMenu();
                                    }}
                                    sx={{textTransform: 'none', fontSize: '0.75rem', borderRadius: '6px', px: 2, py: 0.5, minWidth: 70}}
                                >
                                    Delete
                                </Button>
                            )}
                        </Box>
                    ))}
                </Box>
            </Menu>

            {/* Split / Cut preview */}
            {selectedCandidate && previewRows && (
                <Card sx={{mt: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', p: 2, border: '1px solid #e0e0e0'}}>
                    <Typography sx={{mb: 1.5, fontSize: '0.95rem', fontWeight: 700}}>
                        {conflict.formatted_date} • {selectedCandidate.type === 'split' ? 'Split' : 'Cut'} Preview
                    </Typography>
                    <Box sx={{
                        display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', px: 1, mb: 1,
                        color: '#666', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                        <Box>Shift</Box><Box>Start</Box><Box>End</Box><Box>Total</Box>
                    </Box>
                    {previewRows.map((r, idx) => (
                        <Box key={idx} sx={{
                            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', alignItems: 'center',
                            px: 1, py: 0.75, borderRadius: '6px', mb: 1, fontWeight: 500, fontSize: '0.9rem',
                            textTransform: 'capitalize',
                            backgroundColor: r.is_leave ? '#FEE2E2' : '#D8E3F2',
                            border: `1px solid ${r.is_leave ? '#FECACA' : '#e0e0e0'}`,
                        }}>
                            <Box>{r.label}</Box>
                            <Box>{formatHM(r.start)}</Box>
                            <Box>{formatHM(r.end)}</Box>
                            <Box>{calcDiffHM(r.start, r.end)}</Box>
                        </Box>
                    ))}
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1}}>
                        <Button size="small" onClick={resetPreviews} sx={{textTransform: 'none', fontSize: '0.85rem', color: '#666'}}>
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleConfirmCandidate}
                            disabled={isLoading}
                            sx={{textTransform: 'none', fontSize: '0.85rem', px: 2.5}}
                        >
                            {isLoading ? 'Processing…' : selectedCandidate.type === 'split' ? 'Confirm split' : 'Confirm cut'}
                        </Button>
                    </Box>
                </Card>
            )}

            {/* Delete preview */}
            {deleteItem && (
                <Card sx={{mt: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', p: 2, border: '1px solid #e0e0e0'}}>
                    <Typography sx={{mb: 1.5, fontSize: '0.95rem', fontWeight: 700}}>
                        {conflict.formatted_date} • Delete Preview
                    </Typography>
                    <Box sx={{
                        display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', px: 1, mb: 1,
                        color: '#666', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                        <Box>Type</Box><Box>Start</Box><Box>End</Box><Box>Total</Box>
                    </Box>
                    <Box sx={{
                        display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', alignItems: 'center',
                        px: 1, py: 0.75, borderRadius: '6px', mb: 1, fontWeight: 500, fontSize: '0.9rem',
                        backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
                    }}>
                        <Box>{getItemLabel(deleteItem)}</Box>
                        <Box>{deleteItem.start}</Box>
                        <Box>{deleteItem.end}</Box>
                        <Box>{(() => {
                            const range = getRange(deleteItem);
                            return range ? calcDiffHM(range.start, range.end) : '--';
                        })()}</Box>
                    </Box>
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1}}>
                        <Button size="small" onClick={resetPreviews} sx={{textTransform: 'none', fontSize: '0.85rem', color: '#666'}}>
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={handleConfirmDelete}
                            disabled={isLoading}
                            sx={{textTransform: 'none', fontSize: '0.8rem', fontWeight: 500, borderRadius: '6px', px: 2, py: 0.5}}
                        >
                            {isLoading ? 'Processing…' : 'Confirm delete'}
                        </Button>
                    </Box>
                </Card>
            )}
        </>
    );
};

export default LeaveWorklogCase;
