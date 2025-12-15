import React from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

interface FormData {
  name: string;
  trade_category_id: string | number | null;
  company_id: string | number;
}

interface CreateTradeCategoryProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  companyId: number | null;
  isSaving: boolean;
}

const CreateTradeCategory: React.FC<CreateTradeCategoryProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  companyId,
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

  return (
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
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                >
                  <IconButton onClick={onClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h5" fontWeight={700}>
                    Add category
                  </Typography>
                </Box>

                <Typography variant="h5" mt={2}>
                  Name
                </Typography>
                <CustomTextField
                  id="name"
                  name="name"
                  placeholder="Enter address name.."
                  value={formData.name}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                mt: 3,
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
  );
};

export default CreateTradeCategory;
