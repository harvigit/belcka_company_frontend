import React from 'react';
import {
    Drawer, Box, Grid, IconButton, Typography, Button,
} from '@mui/material';
import IconArrowLeft from '@mui/icons-material/ArrowBack';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface FormData {
    name: string;
    company_id: string | number;
    is_transport_category: boolean;
}

interface CreateExpenseCategoryProps {
    open: boolean;
    onClose: () => void;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    handleSubmit: (e: React.FormEvent) => void;
    isSaving: boolean;
}

const CreateExpenseCategory: React.FC<CreateExpenseCategoryProps> = ({
                                                                         open,
                                                                         onClose,
                                                                         formData,
                                                                         setFormData,
                                                                         handleSubmit,
                                                                         isSaving,
                                                                     }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTransportToggle = () => {
        setFormData((prev) => ({ ...prev, is_transport_category: !prev.is_transport_category }));
    };

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
                <Box height="100%">
                    <form onSubmit={handleSubmit} className="address-form">
                        <Grid container>
                            <Grid size={{ lg: 12, xs: 12 }}>
                                <Box display="flex" alignContent="center" alignItems="center" flexWrap="wrap">
                                    <IconButton onClick={onClose}>
                                        <IconArrowLeft />
                                    </IconButton>
                                    <Typography variant="h6" fontWeight={700}>
                                        Add Expense Category
                                    </Typography>
                                </Box>

                                <Typography variant="body2" mt={2}>Name</Typography>
                                <CustomTextField
                                    id="name"
                                    name="name"
                                    className="custom_input"
                                    placeholder="Enter name.."
                                    value={formData.name}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                />

                                <Box
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    mt={2}
                                    px={1.5}
                                    py={1.5}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        backgroundColor: 'background.paper',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body2" fontWeight={500}>
                                            Transport category
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Mark this as a transport expense
                                        </Typography>
                                    </Box>
                                    <IOSSwitch
                                        checked={formData.is_transport_category}
                                        onChange={handleTransportToggle}
                                    />
                                </Box>
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', justifyContent: 'start', gap: 2, mt: 2 }}>
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
                                variant="contained"
                                size="large"
                                sx={{ backgroundColor: 'transparent', borderRadius: 3, color: 'GrayText' }}
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

export default CreateExpenseCategory;
