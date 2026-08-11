'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Box, Button, Popover, Stack, Divider } from "@mui/material";
import { DayPicker, DateRange } from "react-day-picker";
import {
    format,
    startOfWeek,
    endOfWeek,
    subWeeks,
    startOfMonth,
    endOfMonth,
    subMonths,
    addDays,
} from "date-fns";
import { CalendarMonth } from "@mui/icons-material";
import "react-day-picker/dist/style.css";
import "../../global.css";
import { useTranslation } from "react-i18next";

type PayrollCycle = '1_week' | '2_week' | '4_week' | '1_month' | '3_month' | string;

type Props = {
    from:      Date | null;
    to:        Date | null;
    onChange:  (range: { from: Date | null; to: Date | null }) => void;
    onApply?:  (range: { from: Date | null; to: Date | null }) => void;
    payrollCycle?: PayrollCycle;
    buttonLabelAlign?: 'left' | 'space-between';
    buttonMinWidth?: number | string;
};

const generatePayrollRanges = (cycle: PayrollCycle, count = 10): { from: Date; to: Date }[] => {
    const today      = new Date();
    const normalized = cycle?.replace(/s$/, '');
    const ranges: { from: Date; to: Date }[] = [];

    if (normalized === '1_week') {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        for (let i = 0; i < count; i++) {
            const from = subWeeks(weekStart, i);
            ranges.push({ from, to: endOfWeek(from, { weekStartsOn: 1 }) });
        }
    } else if (normalized === '2_week') {
        const weekStart            = startOfWeek(today, { weekStartsOn: 1 });
        const daysSinceEpochMonday = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
        const blockOffset          = daysSinceEpochMonday % 2 === 0 ? 0 : 7;
        const blockStart           = addDays(weekStart, -blockOffset);
        for (let i = 0; i < count; i++) {
            const from = addDays(blockStart, -i * 14);
            ranges.push({ from, to: addDays(from, 13) });
        }
    } else if (normalized === '1_month') {
        for (let i = 0; i < count; i++) {
            const ref = subMonths(today, i);
            ranges.push({ from: startOfMonth(ref), to: endOfMonth(ref) });
        }
    } else if (normalized === '3_month') {
        for (let i = 0; i < count; i++) {
            const ref = subMonths(today, i * 3);
            ranges.push({ from: startOfMonth(ref), to: endOfMonth(subMonths(ref, -2)) });
        }
    }

    return ranges;
};

const DateRangePickerBox: React.FC<Props> = ({
    from,
    to,
    onChange,
    onApply,
    payrollCycle,
    buttonLabelAlign = 'space-between',
    buttonMinWidth = 230,
}) => {
    const { t } = useTranslation();
    const today     = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(today,   { weekStartsOn: 1 });

    const [anchorEl,            setAnchorEl]            = useState<null | HTMLElement>(null);
    const [tempRange,           setTempRange]           = useState<DateRange>({ from: from ?? weekStart, to: to ?? weekEnd });
    const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
    const [calendarMonth,       setCalendarMonth]       = useState<Date>(from ?? weekStart);

    const open = Boolean(anchorEl);

    const presetRanges = useMemo(() => {
        if (!payrollCycle) return [];
        return generatePayrollRanges(payrollCycle);
    }, [payrollCycle]);

    useEffect(() => {
        setTempRange({ from: from ?? weekStart, to: to ?? weekEnd });
        setCalendarMonth(from ?? weekStart);
    }, [from, to]);

    const handleOpen   = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose  = () => setAnchorEl(null);

    const handleOk = () => {
        const selected = { from: tempRange.from ?? null, to: tempRange.to ?? null };
        onChange(selected);
        if (onApply && selected.from && selected.to) onApply(selected);
        handleClose();
    };

    const handleCancel = () => {
        setTempRange({ from: from ?? weekStart, to: to ?? weekEnd });
        setSelectedPresetIndex(null);
        handleClose();
    };

    const handlePresetClick = (range: { from: Date; to: Date }, index: number) => {
        setTempRange({ from: range.from, to: range.to });
        setSelectedPresetIndex(index);
        setCalendarMonth(range.from);
    };

    const formatRangeLabel = () => from && to ? 
        `${format(from, "dd MMM yyyy")} ~ ${format(to, "dd MMM yyyy")}` : "Select Date Range";

    const formatPresetLabel = (range: { from: Date; to: Date }) =>
        `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`;

    return (
        <>
            <Button
                onClick={handleOpen}
                variant="outlined"
                disableRipple
                sx={{
                    minWidth: buttonMinWidth,
                    justifyContent: buttonLabelAlign === 'left' ? "flex-start" : "space-between",
                    borderRadius: "6px",
                    color: "#555",
                    borderColor: "#ccc",
                    textTransform: "none",
                    fontWeight: 400,
                    backgroundColor: "transparent",
                    ...(buttonLabelAlign === 'left' ? { textAlign: "left" } : {}),
                    '&:hover': { backgroundColor: "transparent", borderColor: "#ccc", color: "#555" },
                    '&:hover .MuiButton-startIcon': { color: "#777" },
                    ...(buttonLabelAlign === 'left' ? { '& .MuiButton-startIcon': {
                        ml: 0,
                        mr: 1,
                    } } : {}),
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
                PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}
            >
                <Box sx={{ display: 'flex' }}>

                    {payrollCycle && presetRanges.length > 0 && (
                        <>
                            <Box sx={{
                                width: 200, maxHeight: 380, overflowY: 'auto',
                                borderRight: '1px solid #e5e7eb', py: 1,
                                '&::-webkit-scrollbar': { width: '4px' },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { background: '#d1d5db', borderRadius: '4px' },
                            }}>
                                {presetRanges.map((range, index) => {
                                    const isSelected = selectedPresetIndex === index;
                                    return (
                                        <Box key={index} onClick={() => handlePresetClick(range, index)} sx={{
                                            px: 2, py: 1.2, cursor: 'pointer', fontSize: 13,
                                            fontWeight: isSelected ? 600 : 400,
                                            color: isSelected ? '#1976d2' : '#374151',
                                            backgroundColor: isSelected ? '#eaf5ff' : 'transparent',
                                            borderLeft: isSelected ? '3px solid #1976d2' : '3px solid transparent',
                                            transition: 'all 0.15s ease',
                                            '&:hover': { backgroundColor: isSelected ? '#eaf5ff' : '#f9fafb', color: isSelected ? '#1976d2' : '#111827' },
                                        }}>
                                            {formatPresetLabel(range)}
                                        </Box>
                                    );
                                })}
                            </Box>
                            <Divider orientation="vertical" flexItem />
                        </>
                    )}

                    {/* Calendar */}
                    <Box sx={{ p: 2 }}>
                        <DayPicker
                            mode="range"
                            selected={tempRange}
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            onSelect={(range) => {
                                setTempRange(range ?? { from: undefined, to: undefined });
                                setSelectedPresetIndex(null);
                            }}
                            numberOfMonths={payrollCycle && presetRanges.length > 0 ? 2 : 1}
                            className="custom-day-picker"
                            weekStartsOn={1}
                        />
                        <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}>
                            <Button onClick={handleCancel}>{t('Cancel')}</Button>
                            <Button variant="contained" onClick={handleOk}>{t('OK')}</Button>
                        </Stack>
                    </Box>
                </Box>
            </Popover>
        </>
    );
};

export default DateRangePickerBox;
