'use client';

import React, { useState } from "react";
import {
    Box,
    Button,
    Popover,
    Typography,
    Stack,
} from "@mui/material";
import { DayPicker, DateRange } from "react-day-picker";
import { format } from "date-fns";
import { CalendarMonth } from "@mui/icons-material";

import "react-day-picker/dist/style.css";
import "../../global.css";

type Props = {
    from: Date | null;
    to: Date | null;
    onChange: (range: { from: Date | null; to: Date | null }) => (range: { from: Date | null; to: Date | null }) => void;
    onApply?: (range: { from: Date | null; to: Date | null }) => void;
};

const DateRangePickerBox: React.FC<Props> = ({ from, to, onChange, onApply }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [tempRange, setTempRange] = useState<DateRange>({
        from: from ?? undefined,
        to: to ?? undefined,
    });

    const open = Boolean(anchorEl);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleOk = () => {
        const selected = { from: tempRange.from ?? null, to: tempRange.to ?? null };
        onChange(selected);
        if (onApply && selected.from && selected.to) {
            onApply(selected);
        }
        handleClose();
    };

    const handleCancel = () => {
        setTempRange({ from: from ?? undefined, to: to ?? undefined });
        handleClose();
    };

    const formatRangeLabel = () => {
        if (from && to) {
            return `${format(from, "dd MMM yyyy")} ~ ${format(to, "dd MMM yyyy")}`;
        }
        return "Select Date Range";
    };

    return (
        <>
            <Button
                onClick={handleOpen}
                variant="outlined"
                disableRipple
                sx={{
                    minWidth: 230,
                    justifyContent: "space-between",
                    borderRadius: "6px",
                    color: "#555",
                    borderColor: "#ccc",
                    textTransform: "none",
                    fontWeight: 400,
                    backgroundColor: "transparent",
                    '&:hover': {
                        backgroundColor: "transparent",
                        borderColor: "#ccc",
                        color: "#555",
                    },
                    '&:hover .MuiButton-startIcon': {
                        color: "#777"
                    }
                }}
                startIcon={<CalendarMonth sx={{ color: "#777" }} />}
            >
                {formatRangeLabel()}
            </Button>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleCancel}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography fontWeight={600} mb={1}>
                        {tempRange.from
                            ? `From ${format(tempRange.from, "dd MMM yyyy")}`
                            : "From —"}
                        <br />
                        {tempRange.to
                            ? `To ${format(tempRange.to, "dd MMM yyyy")}`
                            : "To —"}
                    </Typography>

                    <DayPicker
                        mode="range"
                        selected={tempRange}
                        onSelect={(range) => setTempRange(range ?? { from: undefined, to: undefined })}
                        numberOfMonths={1}
                        className="custom-day-picker"
                    />

                    <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}>
                        <Button onClick={handleCancel}>Cancel</Button>
                        <Button variant="contained" onClick={handleOk}>
                            OK
                        </Button>
                    </Stack>
                </Box>
            </Popover>
        </>
    );
};

export default DateRangePickerBox;
