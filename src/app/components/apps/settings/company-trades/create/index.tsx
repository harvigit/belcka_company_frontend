import React, { useEffect, useState } from "react";
import {
    Drawer,
    Box,
    Grid,
    IconButton,
    Typography,
    Button,
    Autocomplete, TextField, InputAdornment,
} from '@mui/material';
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import {IconUsers} from '@tabler/icons-react';

interface FormData {
  name: string;
  trade_category_id: string | number | null;
  company_id: string | number;
    max_members: number;
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
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Fetch data
  const fetchCategories = async () => {
    try {
      const res = await api.get(
        `trade/trade-categories?company_id=${companyId}`
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  };

  useEffect(() => {
    if (open == true) {
      fetchCategories();
    }
  }, [open]);

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
                  <Typography variant="h6" color="inherit" fontWeight={700}>
                    Add Trade
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
                  inputProps={{ maxLength: 50 }}
                  fullWidth
                />

                <Typography variant="h5" mt={2}>
                  Select Trade category
                </Typography>
                <Autocomplete
                  fullWidth
                  id="trade_category_id"
                  options={data}
                  value={
                    data?.find(
                      (trade) => trade.id === formData.trade_category_id
                    ) ?? null
                  }
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      trade_category_id: newValue ? newValue.id : null,
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Trades" />
                  )}
                />

                  <Typography variant="h5" mt={3}>
                      Max Members
                  </Typography>
                  <TextField
                      name="max_members"
                      type="number"
                      placeholder="Enter max members limit..."
                      fullWidth
                      size="small"
                      value={formData?.max_members ?? ""}
                      onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev: any) => ({
                              ...prev,
                              max_members: val === "" ? "" : Math.min(1000, Math.max(1, parseInt(val))),
                          }));
                      }}
                      inputProps={{ min: 1, max: 1000 }}
                      InputProps={{
                          startAdornment: (
                              <InputAdornment position="start">
                                  <IconUsers size={16} />
                              </InputAdornment>
                          ),
                      }}
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

export default CreateTrade;
