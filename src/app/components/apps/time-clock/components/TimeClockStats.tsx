import React from 'react';
import { Box, Stack, Typography, IconButton, Popover, TextField, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { IconTableColumn } from '@tabler/icons-react';
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
                                                       }) => {
    const headerDetails = [
        { value: formatHour(headerDetail?.payable_hours), label: 'Payable Hours' },
        { value: `${currency}${headerDetail?.total_payable_amount || 0}`, label: 'Total Payable Amount' },
    ];

    return (
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

            <Stack>
                <IconButton onClick={handlePopoverOpen}>
                    <IconTableColumn />
                </IconButton>
                <Popover
                    open={Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    onClose={handlePopoverClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
                >
                    <TextField
                        size="small"
                        placeholder="Search"
                        fullWidth
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ mb: 1 }}
                    />
                    <FormGroup>
                        {table
                            .getAllLeafColumns()
                            .filter((col: any) => {
                                const excludedColumns = ['conflicts'];
                                if (excludedColumns.includes(col.id)) return false;

                                return col.id.toLowerCase().includes(search.toLowerCase());
                            })
                            .map((col: any) => (
                                <FormControlLabel
                                    key={col.id}
                                    control={
                                        <Checkbox
                                            checked={col.getIsVisible()}
                                            onChange={col.getToggleVisibilityHandler()}
                                            disabled={col.id === 'conflicts'}
                                        />
                                    }
                                    sx={{ textTransform: 'none' }}
                                    label={
                                        col.columnDef.meta?.label ||
                                        (typeof col.columnDef.header === 'string' && col.columnDef.header.trim() !== ''
                                                ? col.columnDef.header
                                                : col.id
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .replace(/^./, (str: string) => str.toUpperCase())
                                                    .trim()
                                        )
                                    }
                                />
                            ))}
                    </FormGroup>
                </Popover>
            </Stack>
        </Box>
    );
};

export default TimeClockStats;
