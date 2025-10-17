import React, { useEffect, useState } from 'react';
import {
    Drawer,
    Box,
    IconButton,
    Typography,
    Button,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
    Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import api from '@/utils/axios';
import { Stack } from '@mui/system';
import { LeaveList } from '../list';

const typeMap: Record<string, string> = {
    paid: 'Paid',
    unpaid: 'Unpaid',
};

interface FormData {
    id: number;
    name: string;
    company_id: string | number;
    type: string;
}

interface EditLeaveProps {
    id: number | null;
    open: boolean;
    onClose: () => void;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    EditLeave: (e: React.FormEvent) => void;
    isSaving: boolean;
}

const EditLeave: React.FC<EditLeaveProps> = ({
                                                 id,
                                                 open,
                                                 onClose,
                                                 formData,
                                                 setFormData,
                                                 EditLeave,
                                                 isSaving,
                                             }) => {
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSelectChange = (e: SelectChangeEvent<string>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const [data, setData] = useState<LeaveList[]>([]);

    // Fetch data
    useEffect(() => {
        if (id) {
            const fetchTasks = async () => {
                try {
                    const res = await api.get(`company-leaves/get?leave_id=${id}`);
                    if (res.data && res.data.info) {
                        const task = res.data.info[0];
                        setData(task);
                        setFormData({
                            id: task.id,
                            name: task.name || '',
                            company_id: task.company_id || '',
                            type: task.type || '',
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch task', err);
                }
            };
            fetchTasks();
        }
    }, [id, setFormData]);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: 350,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 350,
                    padding: 2,
                    backgroundColor: '#f9f9f9',
                },
            }}
        >
            <Box display="flex" flexDirection="column" height="100%">
                <Box display="flex" alignItems="center" flexWrap="wrap">
                    <IconButton onClick={onClose} aria-label="close drawer">
                        <ArrowBackIcon /> {/* Consistent with CreateLeave */}
                    </IconButton>
                    <Typography variant="h5" fontWeight={700}>
                        Edit Leave
                    </Typography>
                </Box>

                <Divider />

                <Box height="100%" p={2}>
                    <form onSubmit={EditLeave} className="address-form">
                        <Box> {/* Replaced Grid with Box */}
                            <Typography variant="h6" mt={2}>
                                Name
                            </Typography>
                            <CustomTextField
                                id="name"
                                name="name"
                                placeholder="Enter name..."
                                value={formData.name}
                                onChange={handleChange}
                                variant="outlined"
                                fullWidth
                            />

                            <Stack mt={2}>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color="#1a1a1a"
                                    component="label"
                                    htmlFor="type"
                                >
                                    Leave Type
                                </Typography>
                                <FormControl fullWidth>
                                    <Select
                                        id="type"
                                        name="type"
                                        value={formData.type || ''}
                                        onChange={handleSelectChange}
                                        displayEmpty
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#bdbdbd',
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#50ABFF',
                                            },
                                        }}
                                        renderValue={(value) =>
                                            value ? (
                                                <Typography sx={{ fontSize: '14px' }} component="span">
                                                    {typeMap[value] || 'Select leave type'}
                                                </Typography>
                                            ) : (
                                                <Typography color="#999" component="span">
                                                    Select leave type
                                                </Typography>
                                            )
                                        }
                                    >
                                        {Object.entries(typeMap).map(([key, label]) => (
                                            <MenuItem key={key} value={key}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'start',
                                gap: 2,
                                mt: 'auto',
                            }}
                        >
                            <Button
                                color="primary"
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={isSaving}
                                sx={{ borderRadius: 3 }}
                                className="drawer_buttons"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                                color="inherit"
                                onClick={onClose}
                                variant="outlined"
                                size="large"
                                sx={{
                                    borderRadius: 3,
                                    color: 'GrayText',
                                }}
                            >
                                Close
                            </Button>
                        </Box>
                    </form>
                </Box>
            </Box>
        </Drawer>
    );
};

export default EditLeave;
