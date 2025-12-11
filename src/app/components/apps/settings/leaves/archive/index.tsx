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

interface ArchiveLeaveProps {
    open: boolean;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

export type LeaveList = {
    id: number;
    name: string;
    type: string;
};

const ArchiveLeave: React.FC<ArchiveLeaveProps> = ({
                                                       open,
                                                       onClose,
                                                       onWorkUpdated,
                                                   }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<LeaveList[]>([]);
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
        id: number;
        action: 'restore' | 'delete';
    } | null>(null);

    // Fetch data
    const fetchArchiveAddress = async () => {
        try {
            setLoading(true);
            const res = await api.get(
                `company-leaves/archive-list?company_id=${user.company_id}`
            );
            if (res.data?.info) {
                setData(res.data.info);
            }
        } catch (err) {
            console.error('Failed to fetch archive addresses', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(open == true){
            fetchArchiveAddress();
        }
    }, [open]);

    const handleConfirmAction = async () => {
        if (!selectedItem) return;

        try {
            const payload = {
                id: selectedItem.id,
            };
            if (selectedItem.action === 'restore') {
                let response = await api.post('company-leaves/unarchive', payload);
                if (response.data.IsSuccess == true) {
                    toast.success(response.data.message);
                    onWorkUpdated?.();
                }
            } else if (selectedItem.action === 'delete') {
                let response = await api.post(`/company-leaves/delete`, payload);
                if (response.data.IsSuccess == true) {
                    toast.success(response.data.message);
                }
            }

            fetchArchiveAddress();
        } catch (err) {
            console.error('Action failed', err);
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: 400,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 400,
                    padding: 2,
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: 1,
                }}
            >
                <Box className="leave-form">
                    <Grid container mt={3}>
                        <Grid size={{xs: 12, lg: 12}}>
                            <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                                <IconButton onClick={onClose}>
                                    <IconArrowLeft/>
                                </IconButton>
                                <Typography variant="h5" fontWeight={700}>
                                    Archive Leave List
                                </Typography>
                            </Box>

                            {data.map((item, index) => (
                                <Box
                                    key={index}
                                    mt={2}
                                    p={2}
                                    position="relative"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{
                                        border: '1px solid #999999',
                                        borderRadius: '15px',
                                    }}
                                >
                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        width="100%"
                                        height="20px"
                                    >
                                       <Box display={"flex"} alignItems={"center"} gap={1}>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                            Name:
                                            </Typography>
                                            <Typography
                                            color="textSecondary"
                                            variant="body1"
                                            fontWeight={600}
                                            className="multi-ellipsis"
                                            fontSize={"14px !important"}
                                            >
                                            {item.name}
                                            </Typography>
                                        </Box>
                                        <Box display={"flex"} alignItems={"center"} gap={1}>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                            Type:
                                            </Typography>
                                            <Typography
                                            color="textSecondary"
                                            variant="body1"
                                            fontWeight={600}
                                            className="multi-ellipsis"
                                            fontSize={"14px !important"}
                                            >
                                            {item.type}
                                            </Typography>
                                        </Box>
                                        <Box display={'flex'} fontSize="10px">
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => {
                                                    setSelectedItem({id: item.id, action: 'restore'});
                                                    setOpenDialog(true);
                                                }}
                                            >
                                                <IconArrowBackUp/>
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => {
                                                    setSelectedItem({id: item.id, action: 'delete'});
                                                    setOpenDialog(true);
                                                }}
                                            >
                                                <IconTrash/>
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            <Box mt={2}>
                <Button
                    color="inherit"
                    onClick={onClose}
                    variant="contained"
                    size="large"
                    sx={{
                        backgroundColor: 'transparent',
                        borderRadius: 3,
                        color: 'GrayText',
                    }}
                >
                    Close
                </Button>
            </Box>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>
                    {selectedItem?.action === 'restore'
                        ? 'Restore Leave'
                        : 'Confirm Deletion'}
                </DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">
                        Are you sure you want to <strong>{selectedItem?.action}</strong>{' '}
                        this leave?
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

export default ArchiveLeave;
