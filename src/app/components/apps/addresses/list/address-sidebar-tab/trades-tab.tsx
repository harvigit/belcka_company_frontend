'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, TextField, Typography, useMediaQuery, Autocomplete
} from '@mui/material';
import { Stack } from '@mui/system';
import { IconChevronRight, IconFilter, IconSearch, IconX } from '@tabler/icons-react';
import api from '@/utils/axios';
import Image from 'next/image';
import SkeletonLoader from '@/app/components/SkeletonLoader';

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
    const [fetchWork, setFetchWork] = useState(false);

    const fetchTradeTabData = async () => {
        setFetchWork(true)
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
        setFetchWork(false)
    };

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get(`get-company-resources?flag=tradeList&company_id=${companyId}`);
            if (res.data?.IsSuccess) {
                setFilterOptions(res.data.info || []);
            } else {
                setFilterOptions([]);
            }
        } catch {
            setFilterOptions([]);
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

    /** ✅ Apply both search and filter */
    const filteredData = useMemo(() => {
        let data = [...tabData];

        if (filters.type) {
            data = data.filter((item) => item.trade_id?.toString() === filters.type);
        }

        if (searchUser.trim()) {
            const search = searchUser.trim().toLowerCase();
            data = data.filter(
                (item) =>
                    item.user_name?.toLowerCase().includes(search) ||
                    item.trade_name?.toLowerCase().includes(search)
            );
        }

        return data;
    }, [searchUser, tabData, filters]);

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
                    sx={{ width: { xs: "100%", sm: "80%" }, mb: { xs: 2, sm: 0 } }}
                />
                <Button variant="contained" onClick={() => setOpen(true)}>
                    <IconFilter width={18} />
                </Button>
            </Stack>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle
                    sx={{ m: 0, position: "relative", overflow: "visible" }}
                >
                    Filters
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        size="large"
                        sx={{
                            position: "absolute",
                            right: 12,
                            top: 8,
                            color: (theme) => theme.palette.grey[900],
                            backgroundColor: "transparent",
                            zIndex: 10,
                            width: 50,
                            height: 50,
                        }}
                    >
                        <IconX size={40} style={{ width: 40, height: 40 }} />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Autocomplete
                            options={filterOptions}
                            getOptionLabel={(opt: any) => opt.name || ""}
                            value={
                                filterOptions.find(
                                    (opt) => opt.id.toString() === tempFilters.type
                                ) || null
                            }
                            onChange={(_, newValue) => {
                                setTempFilters({
                                    ...tempFilters,
                                    type: newValue ? newValue.id.toString() : "",
                                });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Trade Type"
                                    placeholder="Search trade type..."
                                    fullWidth
                                />
                            )}
                            clearOnEscape
                            fullWidth
                        />
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => {
                            setFilters({ type: "" });
                            setTempFilters({ type: "" });
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

            {/* Data List */}
            {fetchWork ? (
                <SkeletonLoader columns={[{ name: "Id" }]} rowCount={1} />
            ) : filteredData.length > 0 ? (
                filteredData.map((trade, idx) => (
                    <Box key={idx} mb={1}>
                        <Box
                            sx={{
                                position: 'relative',
                                border: '1px solid #e0e0e0',
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
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
                                {/* <IconButton>
                                    <IconChevronRight fontSize="small" />
                                </IconButton> */}
                            </Stack>
                        </Box>
                    </Box>
                ))
            ) : (
                <Box
                    sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "calc(50vh - 100px)",
                    }}
                >
                    <Image
                    src="/images/svgs/no-data.webp"
                    alt="No data"
                    style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                    }}
                    width={250}
                    height={250}
                    />
                </Box>
                )}
        </Box>
    );
};
