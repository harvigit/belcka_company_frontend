import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Autocomplete,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface CategoryFormData {
  id: number;
  company_id: any;
  name: string;
  category_id?: number | null;
  category_name?: string | null;
}

interface CreateTaskSubCategoryProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const CreateTaskSubCategory: React.FC<CreateTaskSubCategoryProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  companyId,
}) => {
  const [categories, setCategories] = useState<any[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchCategories = async () => {
    try {
      const url = `task-categories/get?company_id=${companyId}`;

      const res = await api.get(url);
      if (res.data) setCategories(res.data.info);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [open]);

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          width: 480,
          "& .MuiDrawer-paper": { width: 480, backgroundColor: "#f9f9f9" },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box display="flex" alignItems="center" p={1}>
            <IconButton onClick={onClose}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Add Category
            </Typography>
          </Box>

          <Box height="100%" px={2}>
            <form
              className="category-form"
              onSubmit={handleSubmit}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            >
              <Box className="form_inputs">
                <Typography variant="body2">Name</Typography>
                <CustomTextField
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleChange}
                />

                <Typography variant="body2" mt={2}>
                  Parent Category
                </Typography>
                <Autocomplete
                  fullWidth
                  options={categories}
                  value={
                    categories.find((t) => t.id === formData.category_id) ??
                    null
                  }
                  onChange={(_, newValue: any) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: newValue?.id ?? null,
                    }))
                  }
                  getOptionLabel={(option: any) => option.name}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select parent category"
                    />
                  )}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  gap: 2,
                  mt: "auto",
                  mb: 2,
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
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  color="inherit"
                  onClick={onClose}
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: "transparent",
                    borderRadius: 3,
                    color: "GrayText",
                  }}
                >
                  Close
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default CreateTaskSubCategory;
