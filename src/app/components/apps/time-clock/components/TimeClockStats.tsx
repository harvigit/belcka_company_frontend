import React from 'react';
import { Box, Stack, Typography, IconButton, Popover, TextField, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { IconEye } from '@tabler/icons-react';
import {TimeClockDetailResponse} from '@/app/components/apps/time-clock/types/timeClock';

interface TimeClockStatsProps {
    headerDetail: TimeClockDetailResponse | null;
    currency: string;
    formatHour: (val: string | number | null | undefined, isPricework?: boolean) => string;
    table: any;
    search: string;
    setSearch: (value: string) => void;
    anchorEl: HTMLElement | null;
    handlePopoverOpen: (event: React.MouseEvent<HTMLElement>) => void;
    handlePopoverClose: () => void;
    userHasRatePermission: boolean;
    amountColumns: string[];
}

const TimeClockStats: React.FC<TimeClockStatsProps> = ({
                                                           headerDetail,
                                                           currency,
                                                           formatHour,
                                                           table,
                                                           search,
                                                           setSearch,
                                                           anchorEl,
                                                           handlePopoverOpen,
                                                           handlePopoverClose,
                                                           userHasRatePermission,
                                                           amountColumns,
                                                       }) => {
    const headerDetails = [
        { value: formatHour(headerDetail?.payable_hours), label: 'Payable Hours' },
        { value: `${currency}${headerDetail?.total_payable_amount || 0}`, label: 'Total Payable Amount' },
    ];

    return (
        <Box
            sx={{
                p: 2,
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
            }}
        >
            <Stack direction="row" spacing={4} alignItems="center">
                <Stack direction="row" spacing={6} alignItems="center">
                    {headerDetails.map((stat, index) => (
                        <Box key={index} textAlign="center">
                            <Typography variant="h6" fontWeight={700} color="#8b939c">
                                {stat.value}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {stat.label}
                            </Typography>
                        </Box>
                    ))}
                </Stack>

                <Box sx={{ position: 'relative' }}>
                    <IconButton onClick={handlePopoverOpen} color='primary'>
                        <IconEye />
                    </IconButton>

                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: {
                                width: 280,
                                mt: 1,
                                p: 1,
                                borderRadius: 2,
                                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                                border: '1px solid #e5e7eb',
                                maxHeight: 'min(420px, calc(100vh - 140px))',
                                overflow: 'hidden',
                            }
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder="Search columns..."
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{
                                mb: 1,
                                '& .MuiInputBase-root': {
                                    borderRadius: 1.5,
                                    backgroundColor: '#fff',
                                },
                            }}
                        />

                        <Box
                            sx={{
                                maxHeight: 'calc(min(420px, calc(100vh - 140px)) - 64px)',
                                overflowY: 'auto',
                                pr: 0.5,
                            }}
                        >
                            <FormGroup sx={{ gap: 0.25 }}>
                                {table
                                    .getAllLeafColumns()
                                    .filter((col: any) => {
                                        const excludedColumns = ['conflicts'];
                                        if (excludedColumns.includes(col.id)) return false;

                                        if (!userHasRatePermission && amountColumns.includes(col.id)) return false;

                                        return col.id.toLowerCase().includes(search.toLowerCase());
                                    })
                                    .map((col: any) => (
                                        <FormControlLabel
                                            key={col.id}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={col.getIsVisible()}
                                                    onChange={col.getToggleVisibilityHandler()}
                                                    disabled={col.id === 'conflicts'}
                                                    sx={{
                                                        p: 0.5,
                                                        mr: 1,
                                                    }}
                                                />
                                            }
                                            label={
                                                col.columnDef.meta?.label ||
                                                (typeof col.columnDef.header === 'string' && col.columnDef.header.trim() !== ''
                                                    ? col.columnDef.header
                                                    : col.id
                                                        .replace(/([A-Z])/g, ' $1')
                                                        .replace(/^./, (str: string) => str.toUpperCase())
                                                        .trim())
                                            }
                                            sx={{
                                                m: 0,
                                                px: 0.75,
                                                py: 0.375,
                                                width: '100%',
                                                borderRadius: 1.5,
                                                alignItems: 'center',
                                                textTransform: 'none',
                                                '&:hover': {
                                                    backgroundColor: '#f8fafc',
                                                },
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: '14px',
                                                    lineHeight: 1.35,
                                                    whiteSpace: 'nowrap',
                                                },
                                            }}
                                        />
                                    ))}
                            </FormGroup>
                        </Box>
                    </Popover>
                </Box>
            </Stack>
        </Box>
    );
};

export default TimeClockStats;
