import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  InputLabel,
  Autocomplete,
  Avatar,
  Dialog,
  DialogContent,
  Slider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface CategoryFormData {
  id: number;
  company_id: any;
  name: string;
  category_id?: number | null;
  category_name?: string | null;
}

interface EditCategoryProps {
  open: boolean;
  companyId: number | null;
  supplierId: number | null;
  onClose: () => void;
  isSaving: boolean;
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  EditSubTaskCategory: (e: React.FormEvent) => void;
}

const EditSubTaskCategory: React.FC<EditCategoryProps> = ({
  open,
  onClose,
  companyId,
  supplierId,
  isSaving,
  EditSubTaskCategory,
  formData,
  setFormData,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get(`task-categories/get?company_id=${companyId}`);
      if (res.data) setCategories(res.data.info);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const fetchSupplier = async () => {
    if (!supplierId || !companyId) return;
    try {
      const res = await api.get(
        `task-sub-categories/get?company_id=${companyId}&id=${supplierId}`,
      );
      if (res.data?.info) {
        const data = res.data.info[0];

        setFormData({
          id: data.id,
          company_id: data.company_id,
          name: data.name,
          category_id: data.category_id,
          category_name: data.category_name,
        });

        if (data.thumb_url) {
          setPreview(data.thumb_url);
        }
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
  };

  useEffect(() => {
    if (open) {
      setPreview(null);
      fetchCategories();
      fetchSupplier();
    }
  }, [open, supplierId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
              Edit Category
            </Typography>
          </Box>

          <Box height="100%" px={2}>
            <form onSubmit={EditSubTaskCategory} className="category-form">
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
                  onChange={(e, val) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: val ? val.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select category"
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

export default EditSubTaskCategory;
