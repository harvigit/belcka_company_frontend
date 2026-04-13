import React, { useEffect, useState } from "react";
import {
    Drawer,
    Box,
    Grid,
    IconButton,
    Typography,
    Button,
    Autocomplete,
} from '@mui/material';
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import CreateTradeCategory from "@/app/components/apps/trade-categories/create";

interface FormData {
    name: string;
    trade_category_id: string | number | null;
    company_id: string | number;
    max_members: number;
}

interface CategoryFormData {
    name: string;
    trade_category_id: string | number | null;
    company_id: string | number;
}

interface CreateTradeProps {
    open: boolean;
    onClose: () => void;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    handleSubmit: (e: React.FormEvent) => void;
    companyId: number | null;
    isSaving: boolean;
}

const CreateTrade: React.FC<CreateTradeProps> = ({
                                                     open,
                                                     onClose,
                                                     formData,
                                                     setFormData,
                                                     handleSubmit,
                                                     companyId,
                                                     isSaving,
                                                 }) => {
    const [data, setData] = useState<any[]>([]);

    const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
    const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
        name: "",
        trade_category_id: null,
        company_id: companyId ?? "",
    });
    const [isSavingCategory, setIsSavingCategory] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get(`trade/trade-categories?company_id=${companyId}`);
            if (res.data) setData(res.data.info);
        } catch (err) {
            console.error("Failed to fetch trades", err);
        }
    };

    useEffect(() => {
        if (open) fetchCategories();
    }, [open]);

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingCategory(true);
        try {
            await api.post(`trade/create-trade-category`, {
                ...categoryFormData,
                company_id: companyId,
            });
            setCategoryDrawerOpen(false);
            setCategoryFormData({ name: "", trade_category_id: null, company_id: companyId ?? "" });
            await fetchCategories();
        } catch (err) {
            console.error("Failed to save category", err);
        } finally {
            setIsSavingCategory(false);
        }
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                sx={{
                    width: 350,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: 350,
                        padding: 2,
                        backgroundColor: "#f9f9f9",
                    },
                }}
            >
                <Box display="flex" flexDirection="column" height="100%">
                    <Box height={"100%"}>
                        <form onSubmit={handleSubmit} className="address-form">
                            <Grid container>
                                <Grid size={{ lg: 12, xs: 12 }}>
                                    <Box display={"flex"} alignContent={"center"} alignItems={"center"} flexWrap={"wrap"}>
                                        <IconButton onClick={onClose}>
                                            <IconArrowLeft />
                                        </IconButton>
                                        <Typography variant="h6" color="inherit" fontWeight={700}>
                                            Add Trade
                                        </Typography>
                                    </Box>

                                    <Typography variant="body2" mt={2}>
                                        Name
                                    </Typography>
                                    <CustomTextField
                                        id="name"
                                        name="name"
                                        className="custom_input"
                                        placeholder="Enter trade name.."
                                        value={formData.name}
                                        onChange={handleChange}
                                        variant="outlined"
                                        inputProps={{ maxLength: 50 }}
                                        fullWidth
                                    />

                                    <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
                                        <Typography variant="body2">
                                            Select Trade category
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => setCategoryDrawerOpen(true)}
                                            title="Add new category"
                                            sx={{ p: 0.5 }}
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                    </Box>

                                    <Autocomplete
                                        fullWidth
                                        id="trade_category_id"
                                        options={data}
                                        value={data?.find((trade) => trade.id === formData.trade_category_id) ?? null}
                                        onChange={(event, newValue) => {
                                            setFormData({ ...formData, trade_category_id: newValue ? newValue.id : null });
                                        }}
                                        getOptionLabel={(option) => option.name}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        renderInput={(params) => (
                                            <CustomTextField {...params} placeholder="Trades" />
                                        )}
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ display: "flex", justifyContent: "start", gap: 2, mt: 3 }}>
                                <Button
                                    color="primary"
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={isSaving}
                                    sx={{ borderRadius: 3 }}
                                    className="drawer_buttons"
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                    color="inherit"
                                    onClick={onClose}
                                    variant="contained"
                                    size="large"
                                    sx={{ backgroundColor: "transparent", borderRadius: 3, color: "GrayText" }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Drawer>

            <CreateTradeCategory
                open={categoryDrawerOpen}
                onClose={() => setCategoryDrawerOpen(false)}
                formData={categoryFormData}
                setFormData={setCategoryFormData}
                handleSubmit={handleCategorySubmit}
                companyId={companyId}
                isSaving={isSavingCategory}
            />
        </>
    );
};

export default CreateTrade;
