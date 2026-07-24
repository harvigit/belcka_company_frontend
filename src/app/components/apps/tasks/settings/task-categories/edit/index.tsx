import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";

interface FormData {
  id: number;
  name: string;
  company_id: string | number;
}

interface EditTaskCategoryProps {
  id: number | null;
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  EditTaskCategory: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const EditTaskCategory: React.FC<EditTaskCategoryProps> = ({
  id,
  open,
  onClose,
  formData,
  setFormData,
  EditTaskCategory,
  isSaving,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch category data when drawer opens with a valid id
  const fetchCategory = useCallback(async () => {
    if (!id || !open) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`task-categories/get?id=${id}`);

      if (res.data?.info?.[0]) {
        const task = res.data.info[0];

        setFormData({
          id: task.id,
          name: task.name || "",
          company_id: task.company_id || "",
        });
      } else {
        setError("Category not found");
      }
    } catch (err: any) {
      console.error("Failed to fetch task category", err);
      setError(err?.response?.data?.message || "Failed to load category");
    } finally {
      setLoading(false);
    }
  }, [id, open, setFormData]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
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
          <form onSubmit={EditTaskCategory} className="address-form">
            <Grid container>
              <Grid size={{ lg: 12, xs: 12 }}>
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                >
                  <IconButton onClick={handleClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" fontWeight={700}>
                    Edit Category
                  </Typography>
                </Box>

                {loading && (
                  <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                  </Box>
                )}

                {!loading && (
                  <>
                    <Typography variant="body2" mt={2}>
                      Name
                    </Typography>
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
                  </>
                )}
              </Grid>
            </Grid>

            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                mt: 2,
              }}
            >
              <Button
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={isSaving || loading}
                sx={{ borderRadius: 3 }}
                className="drawer_buttons"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                color="inherit"
                onClick={handleClose}
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
  );
};

export default EditTaskCategory;
