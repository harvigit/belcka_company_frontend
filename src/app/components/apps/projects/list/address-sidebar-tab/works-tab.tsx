'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    Avatar, Box, Button, Chip, IconButton, InputAdornment,
    TextField, Typography, Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { Stack } from '@mui/system';
import { IconChevronRight, IconSearch, IconTrash } from '@tabler/icons-react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';

interface WorksTabProps {
    addressId: number,
    companyId: number
}

export const WorksTab = ({ addressId, companyId }: WorksTabProps) => {
    const [tabData, setTabData] = useState<any[]>([]);
    const [searchUser, setSearchUser] = useState<string>('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number>(0);

    const fetchWorkTabData = async () => {
        try {
            const res = await api.get('/project/get-works', {
                params: { address_id: addressId, company_id: companyId }
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

    const truncateText = (text: string, maxLength: number = 12) => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    useEffect(() => {
        if (addressId) {
            fetchWorkTabData();
        }
    }, [addressId]);

    const filteredData = useMemo(() => {
        const search = searchUser.trim().toLowerCase();
        if (!search) return tabData;
        return tabData.filter(
            (item) =>
                item.user_name?.toLowerCase().includes(search) ||
                item.work_name?.toLowerCase().includes(search)
        );
    }, [searchUser, tabData]);

    const handleTaskDelete = async () => {
        try {
            const payload = {
                task_ids: String(selectedIds),
            };
            const response = await api.post(
                "company-tasks/delete",
                payload
            );
            if(response.data.IsSuccess == true){
                toast.success(response.data.message);
                await fetchWorkTabData();
            }
        } catch (error) {
        } finally {
        setOpenDialog(false);
        }
    }
    return (
        <Box>
            {/* Search bar and filter button */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} sx={{ flexWrap: 'wrap' }}>
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
                    sx={{ width: { xs: '100%', sm: '80%' }, mb: { xs: 2, sm: 0 } }}
                />
                {/*<Button variant="contained" onClick={() => setOpen(true)}>*/}
                {/*    <IconFilter width={18} />*/}
                {/*</Button>*/}
            </Stack>

            {/* List of works */}
            {filteredData.length > 0 ? (
                filteredData.map((work, idx) => (
                    <Box key={idx} mb={2} sx={{ display: 'flex', flexDirection: 'column' }}>
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
                                flexWrap: 'wrap',
                                '&:hover': {
                                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -10,
                                    left: 16,
                                    right: 16,
                                    display: 'flex',
                                    gap: 1,
                                    flexWrap: 'wrap',
                                    zIndex: 1,
                                }}
                            >
                                <Tooltip title={work.trade_name || ''} arrow>
                                    <Box
                                        sx={{
                                            backgroundColor: '#FF7A00',
                                            border: '1px solid #FF7A00',
                                            color: '#fff',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            px: 1,
                                            py: 0.2,
                                            borderRadius: '999px',
                                            maxWidth: '80px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {truncateText(work.trade_name)}
                                    </Box>
                                </Tooltip>

                                <Box
                                    sx={{
                                        backgroundColor: '#7523D3',
                                        border: '1px solid #7523D3',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        px: 1,
                                        py: 0.2,
                                        borderRadius: '999px',
                                    }}
                                >
                                    {work.duration}
                                </Box>

                                <Box
                                    sx={{
                                        backgroundColor: work.repeatable_job === 'Task' ? '#32A852' : '#FF008C',
                                        border: work.repeatable_job === 'Task' ? '1px solid #32A852' : '1px solid #FF008C',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        px: 1,
                                        py: 0.2,
                                        borderRadius: '999px',
                                    }}
                                >
                                    {work.repeatable_job === 'Task' ? work.rate : 'Job'}
                                </Box>

                                <Box
                                    sx={{
                                        backgroundColor: work.status_color,
                                        border: `1px solid ${work.status_color}`,
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        px: 1,
                                        py: 0.2,
                                        borderRadius: '999px',
                                    }}
                                >
                                    {work.status_text}
                                </Box>
                            </Box>

                            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', mt: 1 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                                        {work.name}
                                    </Typography>
                                </Box>

                                {work.is_checklog == false && (
                                    <IconButton color="error" 
                                        onClick={() => {
                                         setOpenDialog(true)
                                         setSelectedIds(work.id)
                                        }}>
                                        <IconTrash width={18} />
                                    </IconButton>
                                )}

                                {parseFloat(work.total_work_hours) > 0 && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography fontWeight="bold" fontSize="1.25rem">
                                            {formatHour(work.total_work_hours)} H
                                        </Typography>
                                        <IconButton>
                                            <IconChevronRight fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                )}
                            </Stack>
                        </Box>
                    </Box>
                ))
            ) : (
                <Typography variant="body2" color="text.secondary">
                    No works found for this address.
                </Typography>
            )}

             {/* delete work */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">
                    Are you sure you want to delete this task?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                    onClick={() => setOpenDialog(false)}
                    variant="outlined"
                    color="primary"
                    >
                    Cancel
                    </Button>
                    <Button
                    onClick={() => handleTaskDelete()}
                    variant="outlined"
                    color="error"
                    >
                    Delete
                    </Button>
                </DialogActions>
                </Dialog>
        </Box>
    );
};
