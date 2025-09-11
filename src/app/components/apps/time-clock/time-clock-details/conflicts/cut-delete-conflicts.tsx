import React, { useState, useMemo, useCallback } from "react";
import {
    Box,
    Typography,
    Card,
    Button,
    Menu,
} from "@mui/material";
import {
    IconScissors,
    IconTrash,
    IconChevronDown,
    IconChevronUp,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import {
    Conflict,
    ConflictItem,
    parseDT,
    formatHM,
    calcDiffHM,
} from "./conflicts";
import { DateTime } from "luxon";

interface CutDeleteConflictsProps {
    conflict: Conflict;
    index: number;
    fetchTimeClockData: (start: string, end: string) => Promise<void>;
    startDate: string; 
    endDate: string;   
}

interface CutPreviewRow {
    shift_name: string;
    start: string;
    end: string;
    total: string;
    worklog_id?: number;
    user_id?: number;
}

interface DeletePreviewRow {
    shift_name: string;
    start: string;
    end: string;
    total: string;
}

const useMenuState = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuType, setMenuType] = useState<"cut" | "delete" | null>(null);
    const [cutPreviewOpen, setCutPreviewOpen] = useState(false);
    const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);

    const handleMenuClose = useCallback(() => {
        setAnchorEl(null);
        setMenuType(null);
        // Only reset previews when explicitly needed
    }, []);

    const handleMenuOpen = useCallback(
        (e: React.MouseEvent<HTMLElement>, shift_name: "cut" | "delete") => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
            setMenuType(shift_name);
        },
        []
    );

    const handleOpenDeletePreview = useCallback(() => {
        setAnchorEl(null);
        setMenuType(null);
        setDeletePreviewOpen(true);
    }, []);

    return {
        anchorEl,
        menuType,
        cutPreviewOpen,
        deletePreviewOpen,
        setCutPreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleMenuOpen,
        handleOpenDeletePreview,
    };
};

const CutDeleteConflicts: React.FC<CutDeleteConflictsProps> = ({
                                                                   conflict,
                                                                   index,
                                                                   fetchTimeClockData,
                                                                   startDate,
                                                                   endDate,
                                                               }) => {
    const {
        anchorEl,
        menuType,
        cutPreviewOpen,
        deletePreviewOpen,
        setCutPreviewOpen,
        setDeletePreviewOpen,
        handleMenuClose,
        handleMenuOpen,
        handleOpenDeletePreview,
    } = useMenuState();

    const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);

    // Determine which worklog is longer
    const longerWorklog = useMemo(() => {
        if (conflict.items.length !== 2) {
            console.warn("Expected exactly 2 conflict items, got:", conflict.items.length);
            return null;
        }
        const [item1, item2] = conflict.items;
        const parsedTimes = [
            { item: item1, start: parseDT(item1.start), end: parseDT(item1.end) },
            { item: item2, start: parseDT(item2.start), end: parseDT(item2.end) },
        ];

        if (!parsedTimes.every((t) => t.start.isValid && t.end.isValid)) {
            console.error("Invalid date/time in conflict items:", parsedTimes);
            return null;
        }

        const durations = parsedTimes.map((t) => ({
            item: t.item,
            duration: t.end.diff(t.start, "minutes").minutes,
        }));

        return durations[0].duration >= durations[1].duration
            ? durations[0].item
            : durations[1].item;
    }, [conflict.items]);

    // Cut preview rows
    const cutPreview = useMemo(() => {
        if (!selectedItem || conflict.items.length !== 2) {
            console.warn("Cut preview skipped: selectedItem or conflict items invalid", {
                selectedItem,
                itemCount: conflict.items.length,
            });
            return null;
        }

        const shorterItem = conflict.items.find(
            (item) => item.worklog_id !== selectedItem.worklog_id
        );
        if (!shorterItem) {
            console.error("Shorter item not found for worklog_id:", selectedItem.worklog_id);
            return null;
        }

        const times = {
            selectedStart: parseDT(selectedItem.start),
            selectedEnd: parseDT(selectedItem.end),
            shorterStart: parseDT(shorterItem.start),
            shorterEnd: parseDT(shorterItem.end),
        };

        if (!Object.values(times).every((dt) => dt.isValid)) {
            console.error("Invalid date/time in cut preview:", times);
            return null;
        }

        const { selectedStart, selectedEnd, shorterStart, shorterEnd } = times;
        const rows: CutPreviewRow[] = [];

        // Add segment before shorter item's start
        if (selectedStart < shorterStart) {
            rows.push({
                shift_name: selectedItem.shift_name,
                start: formatHM(selectedStart),
                end: formatHM(shorterStart),
                total: calcDiffHM(selectedStart, shorterStart),
                worklog_id: selectedItem.worklog_id,
                user_id: selectedItem.user_id,
            });
        }

        // Add segment after shorter item's end
        if (shorterEnd < selectedEnd) {
            rows.push({
                shift_name: selectedItem.shift_name,
                start: formatHM(shorterEnd),
                end: formatHM(selectedEnd),
                total: calcDiffHM(shorterEnd, selectedEnd),
                worklog_id: selectedItem.worklog_id,
                user_id: selectedItem.user_id,
            });
        }

        // Add shorter item
        rows.push({
            shift_name: shorterItem.shift_name,
            start: formatHM(shorterStart),
            end: formatHM(shorterEnd),
            total: calcDiffHM(shorterStart, shorterEnd),
            worklog_id: shorterItem.worklog_id,
            user_id: shorterItem.user_id,
        });

        // Sort by start time
        return rows.sort((a, b) => {
            const timeA = parseDT(`${conflict.formatted_date} ${a.start}`);
            const timeB = parseDT(`${conflict.formatted_date} ${b.start}`);
            if (!timeA.isValid || !timeB.isValid) {
                console.error("Invalid sort time:", { timeA, timeB });
                return 0;
            }
            return timeA < timeB ? -1 : 1;
        });
    }, [selectedItem, conflict.items, conflict.formatted_date]);

    // Delete preview
    const deletePreview = useMemo(() => {
        if (!selectedItem) {
            console.warn("Delete preview skipped: no selected item");
            return null;
        }
        const startDT = parseDT(selectedItem.start);
        const endDT = parseDT(selectedItem.end);
        if (!startDT.isValid || !endDT.isValid) {
            console.error("Invalid date/time in delete preview:", { startDT, endDT });
            return null;
        }
        return [
            {
                shift_name: selectedItem.shift_name,
                start: formatHM(startDT),
                end: formatHM(endDT),
                total: calcDiffHM(startDT, endDT),
            },
        ];
    }, [selectedItem]);

    // Prepare cut API payload
    const prepareCutData = useCallback(() => {
        if (!cutPreview || !selectedItem) {
            console.error("Cannot prepare cut data: invalid cutPreview or selectedItem");
            return null;
        }
        return cutPreview
            .filter((row) => row.worklog_id)
            .map((row) => ({
                user_id: row.user_id,
                worklog_id: row.worklog_id,
                start_time: row.start,
                end_time: row.end,
                total_time: row.total,
            }));
    }, [cutPreview, selectedItem]);

    const handleCutWorklog = useCallback(
        (worklogId: number) => {
            const currentItem = conflict.items.find(
                (item) => item.worklog_id === worklogId
            );
            if (currentItem) {
                setSelectedItem(currentItem);
                setCutPreviewOpen(true);
                handleMenuClose();
            } else {
                console.error("No conflict item found for worklog_id:", worklogId);
            }
        },
        [conflict.items, handleMenuClose]
    );

    const handleDeletePreview = useCallback(
        (worklogId: number) => {
            const itemToDelete = conflict.items.find(
                (item) => item.worklog_id === worklogId
            );
            if (itemToDelete) {
                setSelectedItem(itemToDelete);
                handleOpenDeletePreview();
            } else {
                console.error("No conflict item found for delete worklog_id:", worklogId);
            }
        },
        [conflict.items, handleOpenDeletePreview]
    );

    const handleConfirmCut = useCallback(async () => {
        if (!selectedItem?.worklog_id) {
            console.error("No selected worklog_id for cut");
            return;
        }
        try {
            const cutData = prepareCutData();
            if (!cutData) {
                console.error("No cut data prepared");
                return;
            }

            await api.post("/time-clock/cut-worklog", { cut_data: cutData });

            await fetchTimeClockData(startDate, endDate);

            setCutPreviewOpen(false);
            setSelectedItem(null);
            handleMenuClose();
        } catch (error) {
            console.error("Error saving cut action:", error);
            setCutPreviewOpen(false);
            setSelectedItem(null);
            handleMenuClose();
        }
    }, [
        selectedItem,
        prepareCutData,
        fetchTimeClockData,
        startDate,
        endDate,
        handleMenuClose,
    ]);

    const handleCancelCut = useCallback(() => {
        setCutPreviewOpen(false);
        setSelectedItem(null);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!selectedItem?.worklog_id) {
            console.error("No selected worklog_id for delete");
            return;
        }
        try {
            await api.post("/time-clock/delete-worklog", {
                worklog_id: selectedItem.worklog_id,
            });
            
            await fetchTimeClockData(startDate, endDate);
            
            setDeletePreviewOpen(false);
            setSelectedItem(null);
            handleMenuClose();
        } catch (error) {
            console.error("Error saving delete action:", error);
            setDeletePreviewOpen(false);
            setSelectedItem(null);
            handleMenuClose();
        }
    }, [
        selectedItem,
        fetchTimeClockData,
        startDate,
        endDate,
        handleMenuClose,
    ]);

    const handleCancelDelete = useCallback(() => {
        setDeletePreviewOpen(false);
        setSelectedItem(null);
    }, []);

    return (
        <>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                    size="small"
                    startIcon={<IconScissors size={16} />}
                    endIcon={
                        anchorEl && menuType === "cut" ? (
                            <IconChevronUp size={16} />
                        ) : (
                            <IconChevronDown size={16} />
                        )
                    }
                    onClick={(e) => handleMenuOpen(e, "cut")}
                    variant="outlined"
                    color="primary"
                    sx={{
                        textTransform: "none",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        borderRadius: "6px",
                        px: 2,
                        py: 0.5,
                    }}
                >
                    Cut start/end
                </Button>
                <Button
                    size="small"
                    startIcon={<IconTrash size={16} />}
                    endIcon={
                        anchorEl && menuType === "delete" ? (
                            <IconChevronUp size={16} />
                        ) : (
                            <IconChevronDown size={16} />
                        )
                    }
                    onClick={(e) => handleMenuOpen(e, "delete")}
                    variant="outlined"
                    color="error"
                    sx={{
                        textTransform: "none",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        borderRadius: "6px",
                        px: 2,
                        py: 0.5,
                    }}
                >
                    Delete
                </Button>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && menuType === "cut"}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 1,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        minWidth: "320px",
                        maxWidth: "400px",
                    },
                }}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: "0.875rem",
                            mb: 2,
                            color: "#333",
                            fontWeight: 500,
                        }}
                    >
                        Cut the overlapping hours from the longer worklog:
                    </Typography>
                    {longerWorklog ? (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                p: 1.5,
                                borderRadius: "6px",
                                border: "1px solid #D8E3F2",
                                backgroundColor: "#D8E3F2",
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontSize: "0.8rem",
                                        mr: 1,
                                        color: "#666",
                                    }}
                                >
                                    Cut from
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        color: "#333",
                                        mr: 1,
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {longerWorklog.shift_name}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontSize: "0.75rem",
                                        color: "#666",
                                        backgroundColor: "#fff",
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: "4px",
                                        border: "1px solid #e0e0e0",
                                    }}
                                >
                                    {longerWorklog.start} – {longerWorklog.end}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => longerWorklog.worklog_id && handleCutWorklog(longerWorklog.worklog_id)}
                                disabled={!longerWorklog.worklog_id}
                                sx={{
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    px: 2,
                                    py: 0.5,
                                    minWidth: "60px",
                                    ml: 2,
                                }}
                            >
                                Cut
                            </Button>
                        </Box>
                    ) : (
                        <Typography variant="body2" sx={{ color: "#666", fontStyle: "italic" }}>
                            No valid worklog found for cutting
                        </Typography>
                    )}
                </Box>
            </Menu>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && menuType === "delete" && !deletePreviewOpen}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 1,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        minWidth: "320px",
                        maxWidth: "400px",
                    },
                }}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
            >
                <Box sx={{ p: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: "0.875rem",
                            mb: 1,
                            px: 1,
                            color: "#333",
                            fontWeight: 500,
                        }}
                    >
                        Select which shift to delete:
                    </Typography>
                    {conflict.items.map((item, i) => (
                        <Box
                            key={i}
                            sx={{
                                fontSize: "0.8rem",
                                py: 1.5,
                                px: 1,
                                borderRadius: "6px",
                                mx: 0.5,
                                mb: 0.5,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                "&:hover": { backgroundColor: "#f5f5f5" },
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    sx={{
                                        fontSize: "0.8rem",
                                        fontWeight: 500,
                                        mb: 0.5,
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {item.shift_name}
                                </Typography>
                                <Typography sx={{ fontSize: "0.7rem", color: "#666" }}>
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
                                        textTransform: "none",
                                        fontSize: "0.75rem",
                                        borderRadius: "6px",
                                        px: 2,
                                        py: 0.5,
                                        minWidth: "70px",
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                        </Box>
                    ))}
                </Box>
            </Menu>
            {cutPreviewOpen && cutPreview && (
                <Card
                    sx={{
                        mt: 2,
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                        p: 2,
                        border: "1px solid #e0e0e0",
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{ mb: 1.5, fontSize: "0.95rem", fontWeight: 700 }}
                    >
                        {conflict.formatted_date} • Cut Preview
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                            px: 1,
                            mb: 1,
                            color: "#666",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                        }}
                    >
                        <Box>Shift</Box>
                        <Box>Start</Box>
                        <Box>End</Box>
                        <Box>Total</Box>
                    </Box>
                    {cutPreview.map((r, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                                alignItems: "center",
                                px: 1,
                                py: 0.75,
                                borderRadius: "6px",
                                mb: 1,
                                backgroundColor: "#D8E3F2",
                                color: "#000",
                                fontWeight: 500,
                                fontSize: "0.9rem",
                                border: "1px solid #e0e0e0",
                            }}
                        >
                            <Box>{r.shift_name}</Box>
                            <Box>{r.start}</Box>
                            <Box>{r.end}</Box>
                            <Box>{r.total}</Box>
                        </Box>
                    ))}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={handleCancelCut}
                            sx={{ textTransform: "none", fontSize: "0.85rem" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={handleConfirmCut}
                            sx={{
                                textTransform: "none",
                                fontSize: "0.85rem",
                                px: 2.5,
                            }}
                        >
                            Confirm cut
                        </Button>
                    </Box>
                </Card>
            )}
            {deletePreviewOpen && deletePreview && (
                <Card
                    sx={{
                        mt: 2,
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                        p: 2,
                        border: "1px solid #e0e0e0",
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{ mb: 1.5, fontSize: "0.95rem", fontWeight: 700 }}
                    >
                        {conflict.formatted_date} • Delete Preview
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                            px: 1,
                            mb: 1,
                            color: "#666",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                        }}
                    >
                        <Box>Type</Box>
                        <Box>Start</Box>
                        <Box>End</Box>
                        <Box>Total</Box>
                    </Box>
                    {deletePreview.map((r, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                                alignItems: "center",
                                px: 1,
                                py: 0.75,
                                borderRadius: "6px",
                                mb: 1,
                                backgroundColor: "#ffebee",
                                color: "#000",
                                fontWeight: 500,
                                fontSize: "0.9rem",
                                border: "1px solid #ffcdd2",
                            }}
                        >
                            <Box>{r.shift_name}</Box>
                            <Box>{r.start}</Box>
                            <Box>{r.end}</Box>
                            <Box>{r.total}</Box>
                        </Box>
                    ))}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 1 }}>
                        <Button
                            size="small"
                            onClick={handleCancelDelete}
                            sx={{ textTransform: "none", fontSize: "0.85rem", color: "#666" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={handleConfirmDelete}
                            sx={{
                                textTransform: "none",
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                borderRadius: "6px",
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

export default CutDeleteConflicts;
