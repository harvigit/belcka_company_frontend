import React from 'react';
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
import { Stack } from '@mui/system';

const typeMap: Record<string, string> = {
    paid: 'Paid',
    unpaid: 'Unpaid',
};

interface FormData {
    name: string;
    company_id: string | number;
    type: string;
}

interface CreateLeaveProps {
    open: boolean;
    onClose: () => void;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    handleSubmit: (e: React.FormEvent) => void;
    isSaving: boolean;
}

const CreateLeave: React.FC<CreateLeaveProps> = ({
                                                     open,
                                                     onClose,
                                                     formData,
                                                     setFormData,
                                                     handleSubmit,
                                                     isSaving,
                                                 }) => {
    const handleTextChange = (
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

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: 450,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 450,
                    backgroundColor: '#f9f9f9',
                },
            }}
        >
            <Box display="flex" flexDirection="column" height="100%">
                <Box
                    display="flex"
                    alignItems="center"
                    flexWrap="wrap"
                >
                    <IconButton onClick={onClose} aria-label="close drawer">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5" fontWeight={700}>
                        Add Leave
                    </Typography>
                </Box>

                <Divider />

                <Box height="100%" p={2}>
                    <form onSubmit={handleSubmit} className="address-form">
                        <Box>
                            <Typography variant="h6" mt={2}>
                                Name
                            </Typography>
                            <CustomTextField
                                id="name"
                                name="name"
                                placeholder="Enter name..."
                                value={formData.name}
                                onChange={handleTextChange}
                                variant="outlined"
                                fullWidth
                                required
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

export default CreateLeave;
