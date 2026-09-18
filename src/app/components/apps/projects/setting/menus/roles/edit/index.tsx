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

interface EditProjectRoleProps {
  id: number | null;
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  companyId: number | null;
}

const EditProjectRole: React.FC<EditProjectRoleProps> = ({
  id,
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  companyId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (!id || !open) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(
        `project-roles/get?company_id=${companyId}&id=${id}`,
      );

      if (res.data?.info?.[0]) {
        const role = res.data.info[0];
        setFormData({
          id: role.id,
          name: role.name || "",
          company_id: role.company_id || "",
        });
      } else {
        setError("Role not found");
      }
    } catch (err: any) {
      console.error("Failed to fetch project role", err);
      setError(err?.response?.data?.message || "Failed to load role");
    } finally {
      setLoading(false);
    }
  }, [id, open, setFormData, companyId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

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
          <form onSubmit={handleSubmit} className="address-form">
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
                    Edit Role
                  </Typography>
                </Box>

                {loading && (
                  <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                  </Box>
                )}

                {!loading && error && (
                  <Typography variant="body2" color="error" mt={2}>
                    {error}
                  </Typography>
                )}

                {!loading && !error && (
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

export default EditProjectRole;
