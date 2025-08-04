'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem,
    TextField, Typography, useMediaQuery
} from '@mui/material';
import { Stack } from '@mui/system';
import {IconChevronRight, IconFilter, IconSearch, IconX} from '@tabler/icons-react';
import api from '@/utils/axios';
import {number} from 'yup';

interface TradesTabProps {
    companyId: number;
    addressId: number;
    projectId: number;
}

type FilterState = {
    type: string;
};

export const TradesTab = ({ companyId, addressId, projectId }: TradesTabProps) => {
    const [tabData, setTabData] = useState<any[]>([]);
    const [searchUser, setSearchUser] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const [filters, setFilters] = useState<FilterState>({ type: '' });
    const [tempFilters, setTempFilters] = useState<FilterState>(filters);
    const [filterOptions, setFilterOptions] = useState<any[]>([]);

    const fetchTradeTabData = async () => {
        try {
            const res = await api.get('/trade/get-checklogs', {
                params: { project_id: projectId, address_id: addressId }
            });

            if (res.data?.IsSuccess) {
                setTabData(res.data.info || []);
            } else {
                setTabData([]);
            }
        } catch {
            setTabData([]);
        }
    };

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '-';
        const num = parseFloat(val.toString());
        if (isNaN(num)) return '-';

        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (addressId && projectId) {
            fetchTradeTabData();
        }

        if (open) {
            fetchFilterOptions();
        }
    }, [addressId, projectId, open]);

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('/trade/web-company-trades', {
                params: { company_id: companyId }
            });
            if (res.data?.IsSuccess) {
                setFilterOptions(res.data.company_trades || []);
            } else {
                setFilterOptions([]);
            }
        } catch {
            setFilterOptions([]);
        }
    };

    const filteredData = useMemo(() => {
        const search = searchUser.trim().toLowerCase();
        if (!search) return tabData;
        return tabData.filter(
            (item) =>
                item.user_name?.toLowerCase().includes(search) ||
                item.trade_name?.toLowerCase().includes(search)
        );
    }, [searchUser, tabData]);

    const isMobile = useMediaQuery('(max-width:600px)');

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <TextField
                    placeholder="Search..."
                    size="small"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconSearch size={16} />
                            </InputAdornment>
                        )
                    }}
                    sx={{ width: '80%' }}
                />
                <Button variant="contained" onClick={() => setOpen(true)}>
                    <IconFilter width={18} />
                </Button>
            </Stack>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullScreen={isMobile}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: isMobile ? 0 : 3,
                        p: isMobile ? 2 : 4,
                        m: isMobile ? 0 : 'auto',
                        width: isMobile ? '100%' : 400,
                    }
                }}
            >
                <DialogTitle sx={{ position: 'relative', p: 0, mb: 2 }}>
                    <Typography variant="h6" fontWeight={600} p={2}>
                        Filters
                    </Typography>
                    <IconButton
                        onClick={() => setOpen(false)}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            zIndex: 1,
                        }}
                    >
                        <IconX size={24} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    <TextField
                        fullWidth
                        select
                        label="Type"
                        value={tempFilters.type}
                        onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })}
                        size="small"
                        SelectProps={{
                            MenuProps: {
                                PaperProps: {
                                    sx: {
                                        maxHeight: 300,
                                    },
                                },
                            },
                        }}
                        sx={{
                            mb: 3,
                            '& .MuiInputBase-root': {
                                borderRadius: 2,
                            },
                        }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {filterOptions.map((opt) => (
                            <MenuItem key={opt.id} value={opt.id}>
                                {opt.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>

                <DialogActions sx={{ px: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                        onClick={() => {
                            setFilters({ type: '' });
                            setTempFilters({ type: '' });
                            setOpen(false);
                        }}
                        color="inherit"
                    >
                        Clear
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setFilters(tempFilters);
                            setOpen(false);
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            {filteredData.length > 0 ? (
                filteredData.map((trade, idx) => (
                    <Box key={idx} mb={1}>
                        <Box
                            sx={{
                                position: 'relative',
                                border: '1px solid #ccc',
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -10,
                                    right: 8,
                                    backgroundColor: '#007aff',
                                    color: 'white',
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {trade.total_checklogs}
                            </Box>

                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -10,
                                    left: 16,
                                    backgroundColor: '#FF7A00',
                                    border: '1px solid #FF7A00',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: '999px',
                                }}
                            >
                                {trade.trade_name}
                            </Box>

                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar
                                    src={trade.user_thumb_image || '/default-avatar.png'}
                                    alt={trade.user_name}
                                    sx={{ width: 56, height: 56 }}
                                />
                                <Box>
                                    <Typography fontWeight="bold">{trade.user_name}</Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography fontWeight="bold" fontSize="1.25rem">
                                    {formatHour(trade.total_work_hours)} H
                                </Typography>
                                <IconButton>
                                    <IconChevronRight fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Box>
                ))
            ) : (
                <Typography variant="body2" color="text.secondary">
                    No trades found for this address.
                </Typography>
            )}
        </Box>
    );
};
