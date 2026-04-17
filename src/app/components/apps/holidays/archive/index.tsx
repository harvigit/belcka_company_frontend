'use client';

import React, {useEffect, useState} from 'react';
import {
    Drawer,
    Box,
    Grid,
    IconButton,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import IconArrowLeft from '@mui/icons-material/ArrowBack';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import {IconArrowBackUp, IconTrash} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import {AxiosResponse} from 'axios';
import dayjs from 'dayjs';

interface ArchiveHolidayProps {
    open: boolean;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

export type HolidayItem = {
    id: number;
    company_id: number;
    company_name: string;
    added_by: number;
    added_by_name: string;
    title: string;
    start_date: string;
    end_date: string;
    total_day: string;
    created_at: string;
};

const ArchiveHoliday: React.FC<ArchiveHolidayProps> = ({open, onClose, onWorkUpdated}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<HolidayItem[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
        id: number;
        action: 'restore' | 'delete';
    } | null>(null);

    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null};

    const fetchArchivedHolidays = async () => {
        try {
            setLoading(true);
            const res: AxiosResponse<any> = await api.get(
                `holiday/archive-list?company_id=${user.company_id}`,
            );
            if (res.data?.info) {
                setData(res.data.info);
            }
        } catch (err) {
            console.error('Failed to fetch archived holidays', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchArchivedHolidays();
    }, [open]);

    const handleConfirmAction = async () => {
        if (!selectedItem) return;
        try {
            const payload = {id: selectedItem.id};

            if (selectedItem.action === 'restore') {
                const response: AxiosResponse<any> = await api.post(
                    'holiday/unarchive',
                    payload,
                );
                if (response.data.IsSuccess) {
                    toast.success(response.data.message);
                    onWorkUpdated?.();
                } else {
                    toast.error(response.data.message || 'Failed to restore holiday');
                }
            } else if (selectedItem.action === 'delete') {
                const response: AxiosResponse<any> = await api.post(
                    'holiday/delete',
                    payload,
                );
                if (response.data.IsSuccess) {
                    toast.success(response.data.message);
                    onWorkUpdated?.();
                } else {
                    toast.error(response.data.message || 'Failed to delete holiday');
                }
            }

            fetchArchivedHolidays();
        } catch (err) {
            console.error('Action failed', err);
            toast.error('Something went wrong!');
        }
    };

    const formatDate = (date: string) =>
        dayjs(date, 'DD/MM/YYYY').isValid() ? dayjs(date, 'DD/MM/YYYY').format('DD/MM/YYYY') : '-';

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: 420,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 420,
                    padding: 2,
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <Box sx={{flex: 1, overflowY: 'auto', paddingRight: 1}}>
                <Grid container>
                    <Grid size={{xs: 12, lg: 12}}>
                        {/* Header */}
                        <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                            <IconButton onClick={onClose}>
                                <IconArrowLeft/>
                            </IconButton>
                            <Typography variant="h6" fontWeight={700}>
                                Archived Holidays
                            </Typography>
                        </Box>

                        {/* Empty state */}
                        {!loading && data.length === 0 && (
                            <Typography color="textSecondary" textAlign="center" mt={4}>
                                No archived holidays found.
                            </Typography>
                        )}

                        {/* List */}
                        {data.map((item) => (
                            <Box
                                key={item.id}
                                mt={2}
                                p={2}
                                sx={{border: '1px solid #999', borderRadius: '15px'}}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                >
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(item.start_date)} — {formatDate(item.end_date)}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="textSecondary"
                                            display="block"
                                        >
                                            Total Days: {item.total_day}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="textSecondary"
                                            display="block"
                                        >
                                            Added by: {item.added_by_name}
                                        </Typography>
                                    </Box>

                                    <Box display="flex" gap={0.5}>
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            title="Restore"
                                            onClick={() => {
                                                setSelectedItem({id: item.id, action: 'restore'});
                                                setOpenDialog(true);
                                            }}
                                        >
                                            <IconArrowBackUp size={18}/>
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            title="Delete"
                                            onClick={() => {
                                                setSelectedItem({id: item.id, action: 'delete'});
                                                setOpenDialog(true);
                                            }}
                                        >
                                            <IconTrash size={18}/>
                                        </IconButton>
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Grid>
                </Grid>
            </Box>

            {/* Footer close button */}
            <Box mt={2}>
                <Button
                    color="inherit"
                    onClick={onClose}
                    variant="contained"
                    size="large"
                    sx={{backgroundColor: 'transparent', borderRadius: 3, color: 'GrayText'}}
                >
                    Close
                </Button>
            </Box>

            {/* Confirm dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>
                    {selectedItem?.action === 'restore' ? 'Restore Holiday' : 'Delete Holiday'}
                </DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">
                        Are you sure you want to{' '}
                        <strong>{selectedItem?.action}</strong> this holiday?
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
                        color="error"
                        variant="contained"
                        onClick={() => {
                            handleConfirmAction();
                            setOpenDialog(false);
                        }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Drawer>
    );
};

export default ArchiveHoliday;
